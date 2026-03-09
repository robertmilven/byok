import ffmpeg from 'fluent-ffmpeg'
import { path } from '@ffmpeg-installer/ffmpeg'
import * as fs from 'fs'
import { join } from 'path'
import { logger } from '../utils/logger'
import { FileManager } from './FileManager'
import { AssetsRepository } from '../db/repositories/assets.repo'
import type { Story, Clip } from '../../shared/types'

ffmpeg.setFfmpegPath(path)

export class StoryCompiler {
    private fileManager: FileManager
    private assetsRepo: AssetsRepository

    constructor() {
        this.fileManager = FileManager.getInstance()
        this.assetsRepo = new AssetsRepository()
    }

    async compile(story: Story): Promise<{ success: boolean; outputPath?: string; error?: string }> {
        const tempDir = join(app.getPath('temp'), `story_${story.id}`)
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

        const outputDir = this.fileManager.getProjectDir(story.project_id)
        const finalPath = join(outputDir, 'videos', `story_${story.id}_${Date.now()}.mp4`)

        try {
            logger.info(`Starting compilation for story: ${story.name} (${story.id})`)

            // 1. Process each clip into a standard format (e.g. 1080p MP4)
            const processedClips: string[] = []

            for (const [index, clip] of story.clips.entries()) {
                const asset = this.assetsRepo.get(clip.asset_id)
                if (!asset) {
                    logger.warn(`Asset ${clip.asset_id} not found for clip ${clip.id}, skipping.`)
                    continue
                }

                const inputPath = this.fileManager.absolutePath(asset.file_path)
                const clipOutputPath = join(tempDir, `clip_${index}.mp4`)

                await this.processClip(inputPath, clip, clipOutputPath)
                processedClips.push(clipOutputPath)
            }

            if (processedClips.length === 0) {
                throw new Error('No valid clips found in story')
            }

            // 2. Concatenate all processed clips
            await this.concatenateClips(processedClips, finalPath)

            logger.info(`Story compiled successfully: ${finalPath}`)

            // 3. Clean up temp files
            this.cleanup(tempDir)

            return { success: true, outputPath: finalPath }
        } catch (err: any) {
            logger.error(`Compilation failed: ${err.message}`)
            return { success: false, error: err.message }
        }
    }

    private processClip(inputPath: string, clip: Clip, outputPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const command = ffmpeg(inputPath)

            // Basic normalization: 1920x1080, 30fps
            command
                .size('1920x1080')
                .autopad()
                .fps(30)
                .videoCodec('libx264')
                .audioCodec('aac')
                .format('mp4')

            if (clip.type === 'image') {
                // If image, loop it for the duration
                command.inputOptions(['-loop 1', `-t ${clip.duration_ms / 1000}`])
            } else {
                // If video, trim or use full length
                // command.setDuration(clip.duration_ms / 1000)
            }

            command
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .save(outputPath)
        })
    }

    private concatenateClips(clipPaths: string[], outputPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const command = ffmpeg()

            clipPaths.forEach(path => {
                command.input(path)
            })

            command
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .mergeToFile(outputPath)
        })
    }

    private cleanup(dir: string): void {
        try {
            fs.rmSync(dir, { recursive: true, force: true })
        } catch (err) {
            logger.error(`Failed to cleanup temp dir ${dir}: ${err}`)
        }
    }
}

// Need 'app' from electron for temp path
import { app } from 'electron'
