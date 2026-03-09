import type { ProviderAdapter, ProviderCapability, ModelInfo, GenerationRequest, GenerationResult } from './types'

export class FalAdapter implements ProviderAdapter {
    readonly slug = 'fal'
    readonly displayName = 'Fal.ai'
    private apiKey?: string

    async initialize(apiKey: string): Promise<void> {
        this.apiKey = apiKey
    }

    async testConnection(): Promise<{ ok: boolean; error?: string }> {
        if (!this.apiKey) {
            return { ok: false, error: 'API key not configured' }
        }
        try {
            // A simple API call to verify the key. For Fal, we can test by calling an endpoint we know or just validating format.
            // But doing a small request to one of their aliased models is an easy way.
            const res = await fetch(`https://fal.run/fal-ai/flux-dev`, {
                method: 'GET', // A GET on a predict endpoint will 405 Method Not Allowed but 401 if unauthorized.
                headers: {
                    'Authorization': `Key ${this.apiKey}`
                }
            })
            if (res.status === 401 || res.status === 403) {
                return { ok: false, error: 'Invalid API key' }
            }
            return { ok: true }
        } catch (e: any) {
            return { ok: false, error: e.message }
        }
    }

    getCapabilities(): ProviderCapability[] {
        const models = this.getModels()
        return [
            { type: 'text-to-image', models: models.filter(m => m.capabilities.includes('text-to-image')) },
            { type: 'image-to-image', models: models.filter(m => m.capabilities.includes('image-to-image')) },
            { type: 'text-to-video', models: models.filter(m => m.capabilities.includes('text-to-video')) },
            { type: 'image-to-video', models: models.filter(m => m.capabilities.includes('image-to-video')) }
        ]
    }

    getModels(): ModelInfo[] {
        return [
            {
                id: 'fal-ai/flux-pro',
                name: 'FLUX.1 [pro]',
                capabilities: ['text-to-image'],
                maxResolution: { w: 2048, h: 2048 },
                aspectRatios: ['1:1', '16:9', '9:16'],
                pricing: [{ costPerUnit: 0.05, unit: 'image' }],
                parameters: []
            },
            {
                id: 'fal-ai/flux-dev',
                name: 'FLUX.1 [dev]',
                capabilities: ['text-to-image'],
                maxResolution: { w: 2048, h: 2048 },
                aspectRatios: ['1:1', '16:9', '9:16'],
                pricing: [{ costPerUnit: 0.025, unit: 'image' }],
                parameters: []
            },
            {
                id: 'fal-ai/flux/dev/image-to-image',
                name: 'FLUX.1 [dev] Image-to-Image',
                capabilities: ['image-to-image'],
                maxResolution: { w: 2048, h: 2048 },
                aspectRatios: ['1:1', '16:9', '9:16'],
                pricing: [{ costPerUnit: 0.025, unit: 'image' }],
                parameters: []
            },
            {
                id: 'fal-ai/minimax-video',
                name: 'Minimax Video',
                capabilities: ['text-to-video', 'image-to-video'],
                maxResolution: { w: 1280, h: 720 },
                aspectRatios: ['16:9'],
                pricing: [{ costPerUnit: 0.20, unit: 'second' }],
                parameters: []
            },
            {
                id: 'fal-ai/runway-gen3/turbo/image-to-video',
                name: 'Runway Gen-3 Turbo',
                capabilities: ['image-to-video'],
                maxResolution: { w: 1280, h: 768 },
                aspectRatios: ['16:9'],
                pricing: [{ costPerUnit: 0.25, unit: 'second' }],
                parameters: []
            },
            {
                id: 'fal-ai/kling-video/v1/standard/text-to-video',
                name: 'Kling 1.5 Standard',
                capabilities: ['text-to-video'],
                maxResolution: { w: 1280, h: 720 },
                aspectRatios: ['16:9', '9:16', '1:1'],
                pricing: [{ costPerUnit: 0.20, unit: 'second' }],
                parameters: []
            },
            {
                id: 'fal-ai/kling-video/v1/standard/image-to-video',
                name: 'Kling 1.5 Standard (I2V)',
                capabilities: ['image-to-video'],
                maxResolution: { w: 1280, h: 720 },
                aspectRatios: ['16:9', '9:16', '1:1'],
                pricing: [{ costPerUnit: 0.20, unit: 'second' }],
                parameters: []
            },
            {
                id: 'fal-ai/luma-dream-machine',
                name: 'Luma Dream Machine',
                capabilities: ['text-to-video', 'image-to-video'],
                maxResolution: { w: 1280, h: 720 },
                aspectRatios: ['16:9'],
                pricing: [{ costPerUnit: 0.32, unit: 'second' }],
                parameters: []
            }
        ]
    }

    estimateCost(request: Pick<GenerationRequest, 'model' | 'parameters' | 'count'>): number {
        if (request.model.includes('luma')) return 0.32 * (request.count ?? 1)
        if (request.model.includes('runway')) return 0.25 * (request.count ?? 1)
        if (request.model.includes('minimax') || request.model.includes('kling')) return 0.20 * (request.count ?? 1)
        if (request.model.includes('pro')) return 0.05 * (request.count ?? 1)
        return 0.025 * (request.count ?? 1)
    }

    private aspectRatioToImageSize(aspectRatio: string = '1:1'): { width: number; height: number } {
        // Fal API expects typical standard dimensions.
        if (aspectRatio === '16:9') return { width: 1920, height: 1080 }
        if (aspectRatio === '9:16') return { width: 1080, height: 1920 }

        // 1:1 default 
        return { width: 1024, height: 1024 }
    }

    async generate(request: GenerationRequest): Promise<GenerationResult> {
        if (!this.apiKey) throw new Error('Fal AI API key not initialized')

        const count = request.count ?? 1
        const aspectRatio = (request.parameters?.aspectRatio as string) ?? '1:1'
        const model = request.model || 'fal-ai/flux-dev'
        const url = `https://fal.run/${model}`

        const size = this.aspectRatioToImageSize(aspectRatio)

        const body: Record<string, unknown> = {
            prompt: request.prompt,
            image_size: {
                width: size.width,
                height: size.height
            },
            num_images: count,
            output_format: 'png'
        }

        if (request.referenceImages && request.referenceImages.length > 0) {
            body.image_url = `data:image/jpeg;base64,${request.referenceImages[0].toString('base64')}`
        }

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Key ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })

        if (!res.ok) {
            const errText = await res.text()
            throw new Error(`Fal API Error: ${res.statusText} - ${errText}`)
        }

        const data = await res.json()

        const outputs: Array<{ buffer: Buffer; mimeType: string; width: number; height: number }> = []

        let mediaAssets: any[] = []
        if (data.images && Array.isArray(data.images)) {
            mediaAssets = data.images
        } else if (data.video) {
            mediaAssets = [data.video]
        } else if (data.video_url) {
            mediaAssets = [{ url: data.video_url, content_type: 'video/mp4' }]
        } else if (data.url) {
            mediaAssets = [{ url: data.url, content_type: 'video/mp4' }]
        } else {
            throw new Error(`Unexpected structure from Fal API: ${JSON.stringify(data)}`);
        }

        for (const asset of mediaAssets) {
            const assetRes = await fetch(asset.url);
            if (!assetRes.ok) {
                throw new Error(`Failed to download asset from Fal: ${assetRes.statusText}`);
            }
            const arrayBuffer = await assetRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const fallbackMime = asset.url.endsWith('.mp4') ? 'video/mp4' : 'image/png'

            outputs.push({
                buffer,
                mimeType: assetRes.headers.get('content-type') || asset.content_type || fallbackMime,
                width: asset.width || size.width,
                height: asset.height || size.height
            })
        }

        return {
            outputs
        }
    }
}
