import type { BrowserWindow } from 'electron'
import { nanoid } from 'nanoid'
import type { ProviderRegistry } from '../providers/registry'
import { JobsRepository } from '../db/repositories/jobs.repo'
import { AssetsRepository } from '../db/repositories/assets.repo'
import { CostsRepository } from '../db/repositories/costs.repo'
import { ProjectsRepository } from '../db/repositories/projects.repo'
import { KeyVault } from '../services/KeyVault'
import { FileManager } from '../services/FileManager'
import type { Job, Asset } from '../../shared/types'
import { IPC } from '../../shared/ipc-channels'
import { logger } from '../utils/logger'

interface QueueEntry {
    jobId: string
    provider: string
    retries: number
}

const MAX_RETRIES = 3
const RETRY_DELAYS = [5000, 30000, 120000]

export class QueueManager {
    private static instance: QueueManager
    private queue: QueueEntry[] = []
    private running: Map<string, boolean> = new Map() // provider -> busy slots
    private concurrencyPerProvider: Record<string, number> = {}
    private maxConcurrentPerProvider = 2
    private jobsRepo = new JobsRepository()
    private assetsRepo = new AssetsRepository()
    private costsRepo = new CostsRepository()
    private projectsRepo = new ProjectsRepository()
    private fileManager = FileManager.getInstance()
    private vault = KeyVault.getInstance()
    private mainWindow: BrowserWindow | null = null
    private registry: ProviderRegistry | null = null

    private constructor() { }

    static getInstance(): QueueManager {
        if (!QueueManager.instance) {
            QueueManager.instance = new QueueManager()
        }
        return QueueManager.instance
    }

    init(mainWindow: BrowserWindow | null, registry: ProviderRegistry): void {
        this.mainWindow = mainWindow
        this.registry = registry
        // Re-queue any jobs that were "running" when app was closed
        this.recoverJobs()
    }

    private recoverJobs(): void {
        const stuck = this.jobsRepo.listByStatus('running')
        logger.info(`Recovering ${stuck.length} stuck running jobs`)
        for (const job of stuck) {
            this.jobsRepo.updateStatus(job.id, 'queued')
            this.queue.push({ jobId: job.id, provider: job.provider, retries: job.retry_count })
        }
        // Also push back any queued jobs from a previous session
        const queued = this.jobsRepo.listByStatus('queued')
        for (const job of queued) {
            if (!this.queue.find(e => e.jobId === job.id)) {
                this.queue.push({ jobId: job.id, provider: job.provider, retries: job.retry_count })
            }
        }
        this.processNext()
    }

    enqueue(job: Job): void {
        this.queue.push({ jobId: job.id, provider: job.provider, retries: 0 })
        this.pushEvent('job:queued', job)
        this.processNext()
    }

    private processNext(): void {
        if (!this.registry) return

        for (const entry of [...this.queue]) {
            const providerRunning = this.concurrencyPerProvider[entry.provider] ?? 0
            if (providerRunning >= this.maxConcurrentPerProvider) continue

            // Remove from queue
            this.queue = this.queue.filter(e => e.jobId !== entry.jobId)

            // Increment concurrency
            this.concurrencyPerProvider[entry.provider] = providerRunning + 1

            // Run
            this.runJob(entry).finally(() => {
                // Decrement concurrency and process next
                this.concurrencyPerProvider[entry.provider] = Math.max(
                    0,
                    (this.concurrencyPerProvider[entry.provider] ?? 1) - 1
                )
                this.processNext()
            })
        }
    }

    private async runJob(entry: QueueEntry): Promise<void> {
        const job = this.jobsRepo.get(entry.jobId)
        if (!job) return

        const startedAt = Date.now()
        this.jobsRepo.updateStatus(job.id, 'running', { started_at: startedAt })
        job.status = 'running'
        job.started_at = startedAt
        this.pushEvent('job:started', job)

        try {
            const adapter = this.registry!.getOrThrow(job.provider)
            const apiKey = this.vault.getKey(job.provider)
            if (!apiKey) throw new Error(`No API key configured for ${job.provider}`)

            await adapter.initialize(apiKey)

            const promptData = JSON.parse(job.prompt_data)
            const parameters = job.parameters ? JSON.parse(job.parameters) : {}

            const result = await adapter.generate({
                jobId: job.id,
                prompt: job.raw_prompt ?? '',
                parameters: { ...parameters, aspectRatio: promptData.aspectRatio },
                model: job.model,
                count: parameters.count ?? 1
            })

            // Save all output assets
            const assetIds: string[] = []
            for (let i = 0; i < result.outputs.length; i++) {
                const output = result.outputs[i]
                const filename = this.fileManager.generateFilename(output.mimeType, i)
                const { relativePath, fileSize } = this.fileManager.saveAsset(
                    output.buffer,
                    job.project_id,
                    'image',
                    filename
                )

                const asset = this.assetsRepo.create({
                    project_id: job.project_id,
                    job_id: job.id,
                    type: 'image',
                    file_path: relativePath,
                    file_name: filename,
                    file_size: fileSize,
                    mime_type: output.mimeType,
                    width: output.width,
                    height: output.height,
                    metadata: JSON.stringify({ promptData, model: job.model, provider: job.provider })
                })
                assetIds.push(asset.id)

                // Set first asset as project cover if not already set
                const project = this.projectsRepo.get(job.project_id)
                if (project && !project.cover_image) {
                    this.projectsRepo.update(job.project_id, { cover_image: relativePath })
                }
            }

            const completedAt = Date.now()
            const costUsd = result.actualCostUsd ?? 0

            this.jobsRepo.updateStatus(job.id, 'completed', {
                result_assets: JSON.stringify(assetIds),
                cost_usd: costUsd,
                completed_at: completedAt,
                duration_ms: completedAt - startedAt,
                api_request_id: result.apiRequestId
            })

            // Log cost
            if (costUsd > 0) {
                this.costsRepo.create({
                    job_id: job.id,
                    project_id: job.project_id,
                    provider: job.provider,
                    model: job.model,
                    type: 'image',
                    cost_usd: costUsd
                })
            }

            const updatedJob = this.jobsRepo.get(job.id)!
            this.pushEvent('job:completed', updatedJob)
            logger.info(`Job ${job.id} completed. Cost: $${costUsd.toFixed(4)}`)
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error)
            logger.error(`Job ${job.id} failed: ${msg}`)

            if (entry.retries < MAX_RETRIES) {
                const delay = RETRY_DELAYS[entry.retries] ?? 120000
                this.jobsRepo.incrementRetry(job.id)
                this.jobsRepo.updateStatus(job.id, 'queued', { error_message: `Retry ${entry.retries + 1}: ${msg}` })

                logger.info(`Retrying job ${job.id} in ${delay}ms (attempt ${entry.retries + 1}/${MAX_RETRIES})`)
                setTimeout(() => {
                    this.queue.push({ jobId: job.id, provider: job.provider, retries: entry.retries + 1 })
                    this.processNext()
                }, delay)
            } else {
                this.jobsRepo.updateStatus(job.id, 'failed', { error_message: msg })
                const failedJob = this.jobsRepo.get(job.id)!
                this.pushEvent('job:failed', failedJob)
            }
        }
    }

    cancel(jobId: string): void {
        this.queue = this.queue.filter(e => e.jobId !== jobId)
        this.jobsRepo.updateStatus(jobId, 'cancelled')
        const job = this.jobsRepo.get(jobId)
        if (job) this.pushEvent('job:cancelled', job)
    }

    retry(jobId: string): void {
        const job = this.jobsRepo.get(jobId)
        if (!job || job.status !== 'failed') return
        this.jobsRepo.updateStatus(jobId, 'queued')
        this.jobsRepo.incrementRetry(jobId) // reset retry count direction
        this.queue.push({ jobId, provider: job.provider, retries: 0 })
        this.pushEvent('job:queued', this.jobsRepo.get(jobId)!)
        this.processNext()
    }

    getQueueState(): { pending: number; running: number } {
        const pending = this.queue.length
        const running = Object.values(this.concurrencyPerProvider).reduce((a, b) => a + b, 0)
        return { pending, running }
    }

    private pushEvent(type: string, job: Job): void {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(IPC.QUEUE_EVENT, { type, job })
        }
    }
}
