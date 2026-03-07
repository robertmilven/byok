import { nanoid } from 'nanoid'
import { getDb } from '../connection'
import type { Asset } from '../../../shared/types'

export class AssetsRepository {
    list(projectId: string, type?: string): Asset[] {
        const db = getDb()
        if (type) {
            return db
                .prepare('SELECT * FROM assets WHERE project_id = ? AND type = ? ORDER BY created_at DESC')
                .all(projectId, type) as Asset[]
        }
        return db
            .prepare('SELECT * FROM assets WHERE project_id = ? ORDER BY created_at DESC')
            .all(projectId) as Asset[]
    }

    get(id: string): Asset | null {
        return (getDb().prepare('SELECT * FROM assets WHERE id = ?').get(id) as Asset) ?? null
    }

    create(data: Omit<Asset, 'id' | 'created_at' | 'favorite'>): Asset {
        const db = getDb()
        const asset: Asset = {
            id: nanoid(),
            created_at: Date.now(),
            favorite: 0,
            ...data
        }
        db.prepare(`
      INSERT INTO assets (id, project_id, job_id, type, file_path, file_name, file_size,
        mime_type, width, height, duration_ms, thumbnail, metadata, favorite, created_at, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            asset.id, asset.project_id ?? null, asset.job_id ?? null, asset.type,
            asset.file_path, asset.file_name, asset.file_size ?? null,
            asset.mime_type ?? null, asset.width ?? null, asset.height ?? null,
            asset.duration_ms ?? null, asset.thumbnail ?? null,
            asset.metadata ?? null, asset.favorite, asset.created_at, asset.tags ?? null
        )
        return asset
    }

    setFavorite(id: string, favorite: boolean): void {
        getDb().prepare('UPDATE assets SET favorite = ? WHERE id = ?').run(favorite ? 1 : 0, id)
    }

    delete(id: string): void {
        getDb().prepare('DELETE FROM assets WHERE id = ?').run(id)
    }
}
