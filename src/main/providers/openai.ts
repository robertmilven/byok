import OpenAI from 'openai'
import type {
    ProviderAdapter,
    ProviderCapability,
    ModelInfo,
    GenerationRequest,
    GenerationResult
} from './types'
import { logger } from '../utils/logger'

export class OpenAIAdapter implements ProviderAdapter {
    readonly slug = 'openai'
    readonly displayName = 'OpenAI'
    private client: OpenAI | null = null

    async initialize(apiKey: string): Promise<void> {
        this.client = new OpenAI({ apiKey })
        logger.info('OpenAI adapter initialized')
    }

    async testConnection(): Promise<{ ok: boolean; error?: string }> {
        if (!this.client) return { ok: false, error: 'API key not set' }
        try {
            // Quick models list to verify key
            await this.client.models.list()
            return { ok: true }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e)
            return { ok: false, error: msg }
        }
    }

    getCapabilities(): ProviderCapability[] {
        return [
            {
                type: 'text-to-image',
                models: this.getModels()
            }
        ]
    }

    getModels(): ModelInfo[] {
        return [
            {
                id: 'dall-e-3',
                name: 'DALL·E 3',
                capabilities: ['text-to-image'],
                maxResolution: { w: 1792, h: 1024 },
                aspectRatios: ['1:1', '16:9', '9:16'],
                pricing: [
                    { condition: 'quality=standard', costPerUnit: 0.04, unit: 'image' },
                    { condition: 'quality=hd', costPerUnit: 0.08, unit: 'image' }
                ],
                parameters: [
                    {
                        name: 'quality',
                        type: 'select',
                        default: 'standard',
                        options: ['standard', 'hd'],
                        label: 'Quality'
                    },
                    {
                        name: 'style',
                        type: 'select',
                        default: 'vivid',
                        options: ['vivid', 'natural'],
                        label: 'Style'
                    }
                ]
            },
            {
                id: 'dall-e-2',
                name: 'DALL·E 2',
                capabilities: ['text-to-image', 'variation'],
                maxResolution: { w: 1024, h: 1024 },
                aspectRatios: ['1:1'],
                pricing: [{ costPerUnit: 0.02, unit: 'image' }],
                parameters: [
                    {
                        name: 'size',
                        type: 'select',
                        default: '1024x1024',
                        options: ['256x256', '512x512', '1024x1024'],
                        label: 'Size'
                    }
                ]
            }
        ]
    }

    estimateCost(request: Pick<GenerationRequest, 'model' | 'parameters' | 'count'>): number {
        const count = request.count ?? 1
        if (request.model === 'dall-e-3') {
            const quality = (request.parameters?.quality as string) ?? 'standard'
            return quality === 'hd' ? 0.08 * count : 0.04 * count
        }
        if (request.model === 'dall-e-2') {
            return 0.02 * count
        }
        return 0
    }

    async generate(request: GenerationRequest): Promise<GenerationResult> {
        if (!this.client) throw new Error('OpenAI client not initialized')

        const count = request.count ?? 1
        const outputs = []

        if (request.model === 'dall-e-3') {
            // DALL-E 3 only supports 1 image per request; loop for multiple
            const size = this.getSize(request.parameters)
            const quality = ((request.parameters?.quality as string) ?? 'standard') as
                | 'standard'
                | 'hd'
            const style = ((request.parameters?.style as string) ?? 'vivid') as 'vivid' | 'natural'

            for (let i = 0; i < count; i++) {
                const response = await this.client.images.generate({
                    model: 'dall-e-3',
                    prompt: request.prompt,
                    n: 1,
                    size,
                    quality,
                    style,
                    response_format: 'b64_json'
                })

                const data = response.data[0]
                if (!data.b64_json) throw new Error('No image data in response')

                const buffer = Buffer.from(data.b64_json, 'base64')
                const dimensions = this.sizeToPixels(size)

                outputs.push({
                    buffer,
                    mimeType: 'image/png',
                    width: dimensions.w,
                    height: dimensions.h,
                    seed: undefined
                })
            }
        } else if (request.model === 'dall-e-2') {
            const size = (request.parameters?.size as string) ?? '1024x1024' as '256x256' | '512x512' | '1024x1024'
            const response = await this.client.images.generate({
                model: 'dall-e-2',
                prompt: request.prompt,
                n: Math.min(count, 10),
                size: size as '256x256' | '512x512' | '1024x1024',
                response_format: 'b64_json'
            })

            for (const data of response.data) {
                if (!data.b64_json) continue
                const buffer = Buffer.from(data.b64_json, 'base64')
                const [w, h] = (size as string).split('x').map(Number)
                outputs.push({ buffer, mimeType: 'image/png', width: w, height: h })
            }
        }

        return {
            outputs,
            actualCostUsd: this.estimateCost(request)
        }
    }

    private getSize(
        parameters?: Record<string, unknown>
    ): '1024x1024' | '1792x1024' | '1024x1792' {
        // Map aspect ratio to DALL-E 3 supported sizes
        const aspectRatio = parameters?.aspectRatio as string
        if (aspectRatio === '16:9') return '1792x1024'
        if (aspectRatio === '9:16') return '1024x1792'
        return '1024x1024'
    }

    private sizeToPixels(size: string): { w: number; h: number } {
        const [w, h] = size.split('x').map(Number)
        return { w, h }
    }
}
