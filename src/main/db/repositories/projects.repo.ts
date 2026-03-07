import { nanoid } from 'nanoid'
import { getDb } from '../connection'
import type { Project } from '../../../shared/types'

export class ProjectsRepository {
    list(includeArchived = false): Project[] {
        const db = getDb()
        const query = includeArchived
            ? 'SELECT * FROM projects ORDER BY updated_at DESC'
            : 'SELECT * FROM projects WHERE archived = 0 ORDER BY updated_at DESC'
        return db.prepare(query).all() as Project[]
    }

    get(id: string): Project | null {
        const db = getDb()
        return (db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project) ?? null
    }

    create(name: string, description?: string): Project {
        const db = getDb()
        const now = Date.now()
        const project: Project = {
            id: nanoid(),
            name,
            description,
            created_at: now,
            updated_at: now,
            archived: 0,
            tags: '[]'
        }
        db.prepare(
            'INSERT INTO projects (id, name, description, created_at, updated_at, archived, tags) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(project.id, project.name, project.description ?? null, project.created_at, project.updated_at, 0, '[]')
        return project
    }

    update(id: string, data: Partial<Pick<Project, 'name' | 'description' | 'cover_image' | 'tags'>>): void {
        const db = getDb()
        const fields: string[] = []
        const values: unknown[] = []

        if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
        if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description) }
        if (data.cover_image !== undefined) { fields.push('cover_image = ?'); values.push(data.cover_image) }
        if (data.tags !== undefined) { fields.push('tags = ?'); values.push(data.tags) }

        if (fields.length === 0) return
        fields.push('updated_at = ?')
        values.push(Date.now(), id)

        db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }

    archive(id: string, archived: boolean): void {
        const db = getDb()
        db.prepare('UPDATE projects SET archived = ?, updated_at = ? WHERE id = ?').run(
            archived ? 1 : 0,
            Date.now(),
            id
        )
    }

    delete(id: string): void {
        const db = getDb()
        db.prepare('DELETE FROM projects WHERE id = ?').run(id)
    }
}
