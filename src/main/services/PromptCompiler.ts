import type { PromptData } from '../../shared/types'
import {
    SHOT_TYPES,
    LIGHTING_OPTIONS,
    MOOD_OPTIONS,
    CAMERA_GEAR,
    FOCAL_LENGTHS,
    FILM_STOCKS
} from '../../shared/prompt-options'

export class PromptCompiler {
    compile(data: PromptData): string {
        const parts: string[] = []

        // Core subject
        if (data.subject) parts.push(data.subject)

        // Shot type
        if (data.shotType) {
            const option = SHOT_TYPES.find((s) => s.value === data.shotType)
            if (option) parts.push(`${option.label} shot`)
        }

        // Lighting
        if (data.lighting) {
            const option = LIGHTING_OPTIONS.find((l) => l.value === data.lighting)
            if (option) parts.push(`lit with ${option.label} lighting`)
        }

        // Mood
        if (data.mood) {
            const option = MOOD_OPTIONS.find((m) => m.value === data.mood)
            if (option) parts.push(`${option.label} mood`)
        }

        // Camera gear
        if (data.cameraGear) {
            const option = CAMERA_GEAR.find((c) => c.value === data.cameraGear)
            if (option) parts.push(`shot on ${option.label}`)
        }

        // Focal length
        if (data.focalLength) {
            const option = FOCAL_LENGTHS.find((f) => f.value === data.focalLength)
            if (option) parts.push(`${option.label} lens`)
        }

        // Film stock
        if (data.filmStock) {
            const option = FILM_STOCKS.find((f) => f.value === data.filmStock)
            if (option) parts.push(`${option.label} film grain and color`)
        }

        // Additional details
        if (data.additionalDetails) parts.push(data.additionalDetails)

        // Professional photography suffix
        parts.push('highly detailed, professional photography, 8K resolution')

        return parts.join(', ')
    }

    compileNegative(data: PromptData): string {
        const defaults = [
            'blurry',
            'low quality',
            'artifacts',
            'watermark',
            'text',
            'deformed',
            'ugly',
            'bad anatomy'
        ]

        if (data.negativePrompt) {
            return `${data.negativePrompt}, ${defaults.join(', ')}`
        }

        return defaults.join(', ')
    }
}
