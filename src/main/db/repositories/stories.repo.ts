import { nanoid } from 'nanoid'
import { getDb } from '../connection'
import type { Story } from '../../../shared/types'

export class StoriesRepository {
    list(projectId: string): Story[] {
        const db = getDb()
        const rows = db.prepare('SELECT * FROM stories WHERE project_id = ? ORDER BY created_at DESC').all(projectId) as any[]
        return rows.map(row => ({
            ...row,
            clips: JSON.parse(row.clips_json)
        }))
    }

    get(id: string): Story | null {
        const db = getDb()
        const row = db.prepare('SELECT * FROM stories WHERE id = ?').get(id) as any
        if (!row) return null
        return {
            ...row,
            clips: JSON.parse(row.clips_json)
        }
    }

    upsert(story: Story): Story {
        const db = getDb()
        const clipsJson = JSON.stringify(story.clips)

        const existing = story.id ? this.get(story.id) : null

        if (existing) {
            db.prepare(
                'UPDATE stories SET name = ?, clips_json = ? WHERE id = ?'
            ).run(story.name, clipsJson, story.id)
            return { ...story, clips: story.clips }
        } else {
            const newStory: Story = {
                ...story,
                id: story.id || nanoid(),
                created_at: story.created_at || Date.now()
            }
            db.prepare(
                'INSERT INTO stories (id, project_id, name, clips_json, created_at) VALUES (?, ?, ?, ?, ?)'
            ).run(newStory.id, newStory.project_id, newStory.name, clipsJson, newStory.created_at)
            return newStory
        }
    }

    delete(id: string): void {
        const db = getDb()
        db.prepare('DELETE FROM stories WHERE id = ?').run(id)
    }
}
