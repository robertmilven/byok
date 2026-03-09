import { getDb } from '../connection'
import * as crypto from 'crypto'
import { logger } from '../../utils/logger'

export interface LibraryItem {
    id: string
    name: string
    type: string
    file_path: string
    thumbnail?: string
    tags?: string
    description?: string
    usage_count: number
    created_at: number
}

export class LibraryRepository {
    list(type?: string): LibraryItem[] {
        try {
            const db = getDb()
            if (type) {
                const stmt = db.prepare(`
                    SELECT * FROM library_items 
                    WHERE type = ? 
                    ORDER BY created_at DESC
                `)
                return stmt.all(type) as LibraryItem[]
            } else {
                const stmt = db.prepare(`
                    SELECT * FROM library_items 
                    ORDER BY created_at DESC
                `)
                return stmt.all() as LibraryItem[]
            }
        } catch (e) {
            logger.error('Failed to list library items', e as Error)
            return []
        }
    }

    add(item: Omit<LibraryItem, 'id' | 'created_at' | 'usage_count'>): LibraryItem {
        const fullItem: LibraryItem = {
            ...item,
            id: crypto.randomUUID(),
            created_at: Date.now(),
            usage_count: 0
        }

        try {
            const db = getDb()
            const stmt = db.prepare(`
                INSERT INTO library_items (
                    id, name, type, file_path, thumbnail, tags, description, usage_count, created_at
                ) VALUES (
                    @id, @name, @type, @file_path, @thumbnail, @tags, @description, @usage_count, @created_at
                )
            `)
            stmt.run(fullItem)
            return fullItem
        } catch (e) {
            logger.error('Failed to add library item', e as Error)
            throw e
        }
    }

    get(id: string): LibraryItem | undefined {
        try {
            const db = getDb()
            const stmt = db.prepare(`SELECT * FROM library_items WHERE id = ?`)
            return stmt.get(id) as LibraryItem | undefined
        } catch (e) {
            logger.error(`Failed to get library item ${id}`, e as Error)
            return undefined
        }
    }

    incrementUsage(id: string): void {
        try {
            const db = getDb()
            const stmt = db.prepare(`
                UPDATE library_items 
                SET usage_count = usage_count + 1 
                WHERE id = ?
            `)
            stmt.run(id)
        } catch (e) {
            logger.error(`Failed to increment usage for library item ${id}`, e as Error)
        }
    }

    delete(id: string): void {
        try {
            const db = getDb()
            const stmt = db.prepare(`DELETE FROM library_items WHERE id = ?`)
            stmt.run(id)
        } catch (e) {
            logger.error(`Failed to delete library item ${id}`, e as Error)
            throw e
        }
    }
}

export const libraryRepo = new LibraryRepository()
