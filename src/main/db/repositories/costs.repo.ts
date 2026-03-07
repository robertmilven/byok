import { nanoid } from 'nanoid'
import { getDb } from '../connection'
import type { CostEntry, CostSummary } from '../../../shared/types'

export class CostsRepository {
    create(data: Omit<CostEntry, 'id' | 'created_at'>): CostEntry {
        const db = getDb()
        const entry: CostEntry = {
            id: nanoid(),
            created_at: Date.now(),
            ...data
        }
        db.prepare(
            'INSERT INTO cost_entries (id, job_id, project_id, provider, model, type, cost_usd, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(entry.id, entry.job_id, entry.project_id, entry.provider, entry.model, entry.type, entry.cost_usd, entry.created_at)
        return entry
    }

    summary(projectId?: string, startDate?: number, endDate?: number): CostSummary {
        const db = getDb()
        let query = 'SELECT * FROM cost_entries WHERE 1=1'
        const params: unknown[] = []

        if (projectId) { query += ' AND project_id = ?'; params.push(projectId) }
        if (startDate) { query += ' AND created_at >= ?'; params.push(startDate) }
        if (endDate) { query += ' AND created_at <= ?'; params.push(endDate) }

        const entries = db.prepare(query).all(...params) as CostEntry[]

        const total = entries.reduce((sum, e) => sum + e.cost_usd, 0)
        const byProvider: Record<string, number> = {}
        const byModel: Record<string, number> = {}
        const byProject: Record<string, number> = {}

        for (const e of entries) {
            byProvider[e.provider] = (byProvider[e.provider] ?? 0) + e.cost_usd
            byModel[e.model] = (byModel[e.model] ?? 0) + e.cost_usd
            byProject[e.project_id] = (byProject[e.project_id] ?? 0) + e.cost_usd
        }

        return { total, byProvider, byModel, byProject, entries }
    }

    todayTotal(): number {
        const db = getDb()
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)
        const result = db
            .prepare('SELECT SUM(cost_usd) as total FROM cost_entries WHERE created_at >= ?')
            .get(startOfDay.getTime()) as { total: number | null }
        return result.total ?? 0
    }

    exportCsv(projectId?: string): string {
        const summary = this.summary(projectId)
        const header = 'date,provider,model,type,cost_usd,job_id'
        const rows = summary.entries.map((e) =>
            [new Date(e.created_at).toISOString(), e.provider, e.model, e.type, e.cost_usd.toFixed(4), e.job_id].join(',')
        )
        return [header, ...rows].join('\n')
    }
}
