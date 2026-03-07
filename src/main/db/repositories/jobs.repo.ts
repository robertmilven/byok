import { nanoid } from 'nanoid'
import { getDb } from '../connection'
import type { Job } from '../../../shared/types'

export class JobsRepository {
    list(projectId?: string, limit = 100): Job[] {
        const db = getDb()
        if (projectId) {
            return db
                .prepare('SELECT * FROM jobs WHERE project_id = ? ORDER BY created_at DESC LIMIT ?')
                .all(projectId, limit) as Job[]
        }
        return db.prepare('SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?').all(limit) as Job[]
    }

    listByStatus(status: Job['status']): Job[] {
        const db = getDb()
        return db.prepare('SELECT * FROM jobs WHERE status = ? ORDER BY created_at ASC').all(status) as Job[]
    }

    get(id: string): Job | null {
        return (getDb().prepare('SELECT * FROM jobs WHERE id = ?').get(id) as Job) ?? null
    }

    create(data: Omit<Job, 'id' | 'created_at' | 'retry_count'>): Job {
        const db = getDb()
        const job: Job = {
            id: nanoid(),
            retry_count: 0,
            created_at: Date.now(),
            ...data
        }
        db.prepare(`
      INSERT INTO jobs (id, project_id, type, status, provider, model, prompt_data, raw_prompt,
        parameters, reference_ids, result_assets, cost_usd, tokens_used, api_request_id,
        error_message, retry_count, fallback_chain, created_at, started_at, completed_at, duration_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            job.id, job.project_id, job.type, job.status, job.provider, job.model,
            job.prompt_data, job.raw_prompt ?? null, job.parameters ?? null,
            job.reference_ids ?? null, job.result_assets ?? null, job.cost_usd ?? null,
            job.tokens_used ?? null, job.api_request_id ?? null, job.error_message ?? null,
            job.retry_count, job.fallback_chain ?? null, job.created_at,
            job.started_at ?? null, job.completed_at ?? null, job.duration_ms ?? null
        )
        return job
    }

    updateStatus(
        id: string,
        status: Job['status'],
        extra?: Partial<Pick<Job, 'error_message' | 'result_assets' | 'cost_usd' | 'api_request_id' | 'started_at' | 'completed_at' | 'duration_ms'>>
    ): void {
        const db = getDb()
        const fields = ['status = ?']
        const values: unknown[] = [status]

        if (extra?.error_message !== undefined) { fields.push('error_message = ?'); values.push(extra.error_message) }
        if (extra?.result_assets !== undefined) { fields.push('result_assets = ?'); values.push(extra.result_assets) }
        if (extra?.cost_usd !== undefined) { fields.push('cost_usd = ?'); values.push(extra.cost_usd) }
        if (extra?.api_request_id !== undefined) { fields.push('api_request_id = ?'); values.push(extra.api_request_id) }
        if (extra?.started_at !== undefined) { fields.push('started_at = ?'); values.push(extra.started_at) }
        if (extra?.completed_at !== undefined) { fields.push('completed_at = ?'); values.push(extra.completed_at) }
        if (extra?.duration_ms !== undefined) { fields.push('duration_ms = ?'); values.push(extra.duration_ms) }

        values.push(id)
        db.prepare(`UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }

    incrementRetry(id: string): void {
        getDb().prepare('UPDATE jobs SET retry_count = retry_count + 1 WHERE id = ?').run(id)
    }

    delete(id: string): void {
        getDb().prepare('DELETE FROM jobs WHERE id = ?').run(id)
    }
}
