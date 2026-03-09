import { ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'
import type { ProviderRegistry } from '../providers/registry'
import { IPC } from '../../shared/ipc-channels'
import { KeyVault } from '../services/KeyVault'
import { PromptCompiler } from '../services/PromptCompiler'
import { ProjectsRepository } from '../db/repositories/projects.repo'
import { JobsRepository } from '../db/repositories/jobs.repo'
import { AssetsRepository } from '../db/repositories/assets.repo'
import { CostsRepository } from '../db/repositories/costs.repo'
import { libraryRepo } from '../db/repositories/library.repo'
import { StoriesRepository } from '../db/repositories/stories.repo'
import { StoryCompiler } from '../services/StoryCompiler'
import { FileManager } from '../services/FileManager'
import { QueueManager } from '../queue/QueueManager'
import { logger } from '../utils/logger'

const vault = KeyVault.getInstance()
const compiler = new PromptCompiler()
const projectsRepo = new ProjectsRepository()
const jobsRepo = new JobsRepository()
const assetsRepo = new AssetsRepository()
const costsRepo = new CostsRepository()
const storiesRepo = new StoriesRepository()
const storyCompiler = new StoryCompiler()
const fileManager = FileManager.getInstance()

export function registerAllIpcHandlers(
    mainWindow: BrowserWindow | null,
    registry: ProviderRegistry
): void {
    const queue = QueueManager.getInstance()
    queue.init(mainWindow, registry)

    // ─── Key Vault ────────────────────────────────────────────────────────────

    ipcMain.handle(IPC.VAULT_SET, (_e, { provider, key }: { provider: string; key: string }) => {
        vault.setKey(provider, key)
        return { ok: true }
    })

    ipcMain.handle(IPC.VAULT_GET, (_e, { provider }: { provider: string }) => {
        const key = vault.getKey(provider)
        return { key: key ? '●'.repeat(Math.min(key.length, 32)) : null, hasKey: !!key }
    })

    ipcMain.handle(IPC.VAULT_DELETE, (_e, { provider }: { provider: string }) => {
        vault.deleteKey(provider)
        return { ok: true }
    })

    ipcMain.handle(IPC.VAULT_LIST, () => {
        return vault.listProviders()
    })

    // ─── Providers ────────────────────────────────────────────────────────────

    ipcMain.handle(IPC.PROVIDERS_LIST, () => {
        return registry.getAll().map((a) => ({
            slug: a.slug,
            displayName: a.displayName,
            enabled: true,
            hasKey: vault.hasKey(a.slug),
            models: a.getModels(),
            capabilities: a.getCapabilities().map((c) => c.type)
        }))
    })

    ipcMain.handle(IPC.PROVIDERS_MODELS, (_e, { slug }: { slug: string }) => {
        return registry.getModels(slug)
    })

    ipcMain.handle(IPC.PROVIDERS_TEST, async (_e, { slug }: { slug: string }) => {
        const adapter = registry.get(slug)
        if (!adapter) return { ok: false, error: 'Provider not found' }
        const apiKey = vault.getKey(slug)
        if (!apiKey) return { ok: false, error: 'No API key configured' }
        await adapter.initialize(apiKey)
        return await adapter.testConnection()
    })

    // ─── Generation ───────────────────────────────────────────────────────────

    ipcMain.handle(IPC.GENERATION_ESTIMATE, (_e, { provider, model, count, parameters }: { provider: string; model: string; count: number; parameters?: Record<string, unknown> }) => {
        const adapter = registry.get(provider)
        if (!adapter) return { estimate: 0 }
        const estimate = adapter.estimateCost({ model, parameters: parameters ?? {}, count })
        return { estimate }
    })

    ipcMain.handle(IPC.GENERATION_CREATE, async (_e, payload: {
        projectId: string
        promptData: import('../../shared/types').PromptData
        provider: string
        model: string
        count: number
        parameters?: Record<string, unknown>
    }) => {
        const { projectId, promptData, provider, model, count, parameters } = payload

        // Compile the prompt
        const rawPrompt = compiler.compile(promptData)

        // Create job record
        const job = jobsRepo.create({
            project_id: projectId,
            type: 'image',
            status: 'queued',
            provider,
            model,
            prompt_data: JSON.stringify(promptData),
            raw_prompt: rawPrompt,
            parameters: JSON.stringify({ ...(parameters ?? {}), count }),
        })

        // Enqueue
        queue.enqueue(job)
        logger.info(`Job enqueued: ${job.id} (${provider}/${model})`)

        return { jobId: job.id, status: 'queued' }
    })

    ipcMain.handle(IPC.GENERATION_CANCEL, (_e, { jobId }: { jobId: string }) => {
        queue.cancel(jobId)
        return { ok: true }
    })

    // ─── Projects ─────────────────────────────────────────────────────────────

    ipcMain.handle(IPC.PROJECTS_LIST, (_e, { includeArchived }: { includeArchived?: boolean }) => {
        return projectsRepo.list(includeArchived)
    })

    ipcMain.handle(IPC.PROJECTS_CREATE, (_e, { name, description }: { name: string; description?: string }) => {
        return projectsRepo.create(name, description)
    })

    ipcMain.handle(IPC.PROJECTS_GET, (_e, { id }: { id: string }) => {
        return projectsRepo.get(id)
    })

    ipcMain.handle(IPC.PROJECTS_UPDATE, (_e, { id, ...data }: { id: string; name?: string; description?: string }) => {
        projectsRepo.update(id, data)
        return projectsRepo.get(id)
    })

    ipcMain.handle(IPC.PROJECTS_DELETE, (_e, { id }: { id: string }) => {
        projectsRepo.delete(id)
        return { ok: true }
    })

    ipcMain.handle(IPC.PROJECTS_ARCHIVE, (_e, { id, archived }: { id: string; archived: boolean }) => {
        projectsRepo.archive(id, archived)
        return { ok: true }
    })

    // ─── Assets ───────────────────────────────────────────────────────────────

    ipcMain.handle(IPC.ASSETS_LIST, (_e, { projectId, type }: { projectId: string; type?: string }) => {
        return assetsRepo.list(projectId, type)
    })

    ipcMain.handle(IPC.ASSETS_GET, (_e, { id }: { id: string }) => {
        return assetsRepo.get(id)
    })

    ipcMain.handle(IPC.ASSETS_DELETE, (_e, { id }: { id: string }) => {
        const asset = assetsRepo.get(id)
        if (asset) {
            try { fileManager.deleteAsset(asset.file_path) } catch { }
            assetsRepo.delete(id)
        }
        return { ok: true }
    })

    ipcMain.handle(IPC.ASSETS_FAVORITE, (_e, { id, favorite }: { id: string; favorite: boolean }) => {
        assetsRepo.setFavorite(id, favorite)
        return { ok: true }
    })

    ipcMain.handle(IPC.ASSETS_READ_FILE, (_e, { id }: { id: string }) => {
        const asset = assetsRepo.get(id)
        if (!asset) return { data: null }
        try {
            const buffer = fileManager.readAsset(asset.file_path)
            return { data: buffer.toString('base64'), mimeType: asset.mime_type ?? 'image/png' }
        } catch {
            return { data: null }
        }
    })

    ipcMain.handle(IPC.ASSETS_SHOW_IN_FOLDER, (_e, { id }: { id: string }) => {
        const asset = assetsRepo.get(id)
        if (asset) {
            const { shell } = require('electron')
            const absolutePath = fileManager.absolutePath(asset.file_path)
            shell.showItemInFolder(absolutePath)
        }
        return { ok: true }
    })

    ipcMain.handle(IPC.ASSETS_SAVE_AS, async (e, { id }: { id: string }) => {
        const asset = assetsRepo.get(id)
        if (!asset) return { ok: false }

        const absolutePath = fileManager.absolutePath(asset.file_path)
        const ext = asset.mime_type === 'image/jpeg' ? 'jpg' : 'png'
        const { dialog, BrowserWindow } = require('electron')

        const { canceled, filePath } = await dialog.showSaveDialog(BrowserWindow.fromWebContents(e.sender)!, {
            title: 'Save Image As',
            defaultFileName: `image-${id}.${ext}`,
            filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }]
        })

        if (!canceled && filePath) {
            const fs = require('fs')
            fs.copyFileSync(absolutePath, filePath)
        }
        return { ok: true }
    })

    ipcMain.handle(IPC.ASSETS_CONTEXT_MENU, async (e, { id }: { id: string }) => {
        const asset = assetsRepo.get(id)
        if (!asset) return null

        return new Promise((resolve) => {
            const { Menu, BrowserWindow } = require('electron')
            let actionPicked = false

            const handleAction = (action: string) => {
                actionPicked = true
                resolve(action)
            }

            const menu = Menu.buildFromTemplate([
                { label: 'Show in Explorer', click: () => handleAction('showInFolder') },
                { label: 'Copy Image', click: () => handleAction('copy') },
                { label: 'Save As...', click: () => handleAction('saveAs') },
                { type: 'separator' },
                { label: asset.favorite ? 'Unfavorite' : 'Favorite', click: () => handleAction('favorite') },
                { label: 'Delete', click: () => handleAction('delete') }
            ])

            menu.once('menu-will-close', () => {
                setTimeout(() => { if (!actionPicked) resolve(null) }, 100)
            })
            menu.popup({ window: BrowserWindow.fromWebContents(e.sender)! })
        })
    })

    // ─── Queue ────────────────────────────────────────────────────────────────

    ipcMain.handle(IPC.QUEUE_LIST, (_e, { projectId }: { projectId?: string }) => {
        return jobsRepo.list(projectId, 200)
    })

    ipcMain.handle(IPC.QUEUE_RETRY, (_e, { jobId }: { jobId: string }) => {
        queue.retry(jobId)
        return { ok: true }
    })

    ipcMain.handle(IPC.QUEUE_CANCEL, (_e, { jobId }: { jobId: string }) => {
        queue.cancel(jobId)
        return { ok: true }
    })

    // ─── Costs ────────────────────────────────────────────────────────────────

    ipcMain.handle(IPC.COSTS_SUMMARY, (_e, payload: { projectId?: string; startDate?: number; endDate?: number }) => {
        return costsRepo.summary(payload?.projectId, payload?.startDate, payload?.endDate)
    })

    ipcMain.handle(IPC.COSTS_EXPORT_CSV, (_e, { projectId }: { projectId?: string }) => {
        return costsRepo.exportCsv(projectId)
    })

    // ─── Settings ─────────────────────────────────────────────────────────────

    ipcMain.handle(IPC.SETTINGS_GET, () => {
        const db = require('../db/connection').getDb()
        return db.prepare('SELECT * FROM app_settings WHERE id = 1').get()
    })

    ipcMain.handle(IPC.SETTINGS_SET, (_e, settings: Record<string, unknown>) => {
        const db = require('../db/connection').getDb()
        const fields = Object.keys(settings).map(k => `${k} = ?`).join(', ')
        const values = [...Object.values(settings), 1]
        if (fields) db.prepare(`UPDATE app_settings SET ${fields} WHERE id = ?`).run(...values)
        return { ok: true }
    })

    // ─── Library ──────────────────────────────────────────────────────────────

    ipcMain.handle(IPC.LIBRARY_LIST, (_e, { type }: { type?: string }) => {
        return libraryRepo.list(type)
    })

    ipcMain.handle(IPC.LIBRARY_ADD, async (_e, { name, type, filePath, tags }: { name: string; type: string; filePath: string; tags?: string[] }) => {
        const fs = require('fs')
        if (!fs.existsSync(filePath)) throw new Error('Source file not found')

        const buffer = fs.readFileSync(filePath)
        // Extract original extension or default to png
        const extMatch = filePath.match(/\.[^/.]+$/)
        const ext = extMatch ? extMatch[0] : '.png'
        const filename = `library_${Date.now()}${ext}`

        fileManager.saveAsset(buffer, 'library', 'reference', filename)
        // Library items live in the AIStudio/library folder. 
        // We override the auto-generated relative path to point to the dedicated library directory.
        const targetRelativePath = `library/${type === 'character' ? 'characters' : 'styles'}/${filename}`
        fs.writeFileSync(fileManager.absolutePath(targetRelativePath), buffer)

        return libraryRepo.add({
            name,
            type,
            file_path: targetRelativePath,
            tags: tags ? JSON.stringify(tags) : undefined
        })
    })

    ipcMain.handle(IPC.LIBRARY_DELETE, (_e, { id }: { id: string }) => {
        const item = libraryRepo.get(id)
        if (item) {
            try { fileManager.deleteAsset(item.file_path) } catch { }
            libraryRepo.delete(id)
        }
        return { ok: true }
    })

    ipcMain.handle(IPC.LIBRARY_READ_FILE, (_e, { id }: { id: string }) => {
        const item = libraryRepo.get(id)
        if (!item) return { data: null }
        try {
            const buffer = fileManager.readAsset(item.file_path)

            let mimeType = 'image/png'
            if (item.file_path.endsWith('.jpg') || item.file_path.endsWith('.jpeg')) mimeType = 'image/jpeg'

            return { data: buffer.toString('base64'), mimeType }
        } catch {
            return { data: null }
        }
    })

    // ─── Stories ──────────────────────────────────────────────────────────────

    ipcMain.handle(IPC.STORIES_LIST, (_e, { projectId }: { projectId: string }) => {
        return storiesRepo.list(projectId)
    })

    ipcMain.handle(IPC.STORIES_GET, (_e, { id }: { id: string }) => {
        return storiesRepo.get(id)
    })

    ipcMain.handle(IPC.STORIES_UPSERT, (_e, story: import('../../shared/types').Story) => {
        return storiesRepo.upsert(story)
    })

    ipcMain.handle(IPC.STORIES_DELETE, (_e, { id }: { id: string }) => {
        storiesRepo.delete(id)
        return { ok: true }
    })

    ipcMain.handle(IPC.STORIES_EXPORT, async (_e, { id, format: _format }: { id: string; format?: 'mp4' }) => {
        const story = storiesRepo.get(id)
        if (!story) return { ok: false, error: 'Story not found' }

        logger.info(`Starting export for story ${story.name} (${id})`)
        const result = await storyCompiler.compile(story)

        if (result.success) {
            // Create asset record for the compiled story
            const path = require('path')
            const filename = path.basename(result.outputPath!)

            return { ok: true, status: 'completed', message: `Exported to ${filename}`, path: result.outputPath }
        } else {
            return { ok: false, error: result.error }
        }
    })

    logger.info('All IPC handlers registered')
}
