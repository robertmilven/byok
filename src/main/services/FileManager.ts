import { app } from 'electron'
import * as fs from 'fs'
import { join } from 'path'
import { logger } from '../utils/logger'

export class FileManager {
    private static instance: FileManager
    private baseDir: string

    private constructor() {
        this.baseDir = join(app.getPath('home'), 'AIStudio')
        this.ensureDir(this.baseDir)
        this.ensureDir(join(this.baseDir, 'library', 'characters'))
        this.ensureDir(join(this.baseDir, 'library', 'styles'))
        this.ensureDir(join(this.baseDir, 'library', 'presets'))
    }

    static getInstance(): FileManager {
        if (!FileManager.instance) {
            FileManager.instance = new FileManager()
        }
        return FileManager.instance
    }

    private ensureDir(path: string): void {
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path, { recursive: true })
        }
    }

    getProjectDir(projectId: string): string {
        return join(this.baseDir, 'projects', projectId)
    }

    ensureProjectDirs(projectId: string): void {
        const base = this.getProjectDir(projectId)
        this.ensureDir(join(base, 'images'))
        this.ensureDir(join(base, 'videos'))
        this.ensureDir(join(base, 'references'))
    }

    saveAsset(
        buffer: Buffer,
        projectId: string,
        type: 'image' | 'video' | 'reference',
        filename: string
    ): { absolutePath: string; relativePath: string; fileSize: number } {
        this.ensureProjectDirs(projectId)

        const subdir = type === 'image' ? 'images' : type === 'video' ? 'videos' : 'references'
        const absolutePath = join(this.getProjectDir(projectId), subdir, filename)

        fs.writeFileSync(absolutePath, buffer)

        const relativePath = join('projects', projectId, subdir, filename)

        logger.debug(`Asset saved: ${relativePath}`)
        return { absolutePath, relativePath, fileSize: buffer.length }
    }

    readAsset(relativePath: string): Buffer {
        const absolutePath = join(this.baseDir, relativePath)
        return fs.readFileSync(absolutePath)
    }

    absolutePath(relativePath: string): string {
        return join(this.baseDir, relativePath)
    }

    deleteAsset(relativePath: string): void {
        const absolutePath = join(this.baseDir, relativePath)
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath)
            logger.debug(`Asset deleted: ${relativePath}`)
        }
    }

    generateFilename(mimeType: string, index: number = 0): string {
        const ext = mimeType === 'image/png' ? '.png' : mimeType === 'image/jpeg' ? '.jpg' : '.bin'
        const ts = Date.now()
        return `asset_${ts}_${index}${ext}`
    }
}
