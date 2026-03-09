import type { ProviderAdapter, ProviderCapability, ModelInfo, GenerationRequest, GenerationResult } from './types'

export class ReplicateAdapter implements ProviderAdapter {
    readonly slug = 'replicate'
    readonly displayName = 'Replicate'

    private apiKey?: string

    async initialize(apiKey: string): Promise<void> {
        this.apiKey = apiKey
    }

    async testConnection(): Promise<{ ok: boolean; error?: string }> {
        if (!this.apiKey) {
            return { ok: false, error: 'API key not configured' }
        }

        try {
            const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
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
                id: 'black-forest-labs/flux-schnell',
                name: 'FLUX.1 [schnell]',
                capabilities: ['text-to-image'],
                maxResolution: { w: 1024, h: 1024 },
                aspectRatios: ['1:1', '16:9', '9:16'],
                pricing: [{ costPerUnit: 0.003, unit: 'image' }],
                parameters: []
            },
            {
                id: 'black-forest-labs/flux-dev',
                name: 'FLUX.1 [dev]',
                capabilities: ['text-to-image', 'image-to-image'],
                maxResolution: { w: 1024, h: 1024 },
                aspectRatios: ['1:1', '16:9', '9:16'],
                pricing: [{ costPerUnit: 0.03, unit: 'image' }],
                parameters: []
            },
            {
                id: 'minimax/video-01',
                name: 'Minimax Video 01',
                capabilities: ['text-to-video', 'image-to-video'],
                maxResolution: { w: 1280, h: 720 },
                aspectRatios: ['16:9'],
                pricing: [{ costPerUnit: 0.20, unit: 'second' }],
                parameters: []
            },
            {
                id: 'luma/ray',
                name: 'Luma Ray',
                capabilities: ['text-to-video', 'image-to-video'],
                maxResolution: { w: 1280, h: 720 },
                aspectRatios: ['16:9', '9:16', '1:1'],
                pricing: [{ costPerUnit: 0.32, unit: 'second' }],
                parameters: []
            }
        ]
    }

    estimateCost(request: Pick<GenerationRequest, 'model' | 'parameters' | 'count'>): number {
        if (request.model.includes('ray')) return 0.32 * (request.count ?? 1)
        if (request.model.includes('video-01')) return 0.20 * (request.count ?? 1)
        if (request.model.includes('schnell')) return 0.003 * (request.count ?? 1)
        return 0.03 * (request.count ?? 1)
    }

    async generate(request: GenerationRequest): Promise<GenerationResult> {
        if (!this.apiKey) {
            throw new Error('Replicate API key not initialized')
        }

        // The exact model handle in Replicate (e.g. black-forest-labs/flux-schnell)
        const model = request.model || 'black-forest-labs/flux-schnell'
        const aspectRatio = request.parameters?.aspectRatio || '1:1'

        const url = `https://api.replicate.com/v1/models/${model}/predictions`
        const body: Record<string, unknown> = {
            input: {
                prompt: request.prompt,
                aspect_ratio: aspectRatio,
                output_format: 'png',
                num_outputs: request.count ?? 1
            }
        }

        if (request.referenceImages && request.referenceImages.length > 0) {
            (body.input as any).image = `data:image/jpeg;base64,${request.referenceImages[0].toString('base64')}`;
            (body.input as any).prompt_strength = 0.8; // Standard default for image-to-image
        }

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'Prefer': 'wait' // Replicate's header to wait longer for the first response
            },
            body: JSON.stringify(body)
        })

        if (!res.ok) {
            const errText = await res.text()
            throw new Error(`Replicate API Error: ${res.statusText} - ${errText}`)
        }

        let prediction = await res.json()

        // Wait for asynchronous processing if it hasn't finished
        if (prediction.status === 'starting' || prediction.status === 'processing') {
            const pollUrl = prediction.urls.get
            let attempts = 0
            while (
                (prediction.status === 'starting' || prediction.status === 'processing') &&
                attempts < 300
            ) {
                await new Promise(resolve => setTimeout(resolve, 2000))

                const pollRes = await fetch(pollUrl, {
                    headers: { 'Authorization': `Bearer ${this.apiKey}` }
                })

                if (!pollRes.ok) throw new Error(`Replicate Polling Error: ${pollRes.statusText}`)
                prediction = await pollRes.json()
                attempts++
            }
        }

        if (prediction.status === 'failed' || prediction.status === 'canceled') {
            throw new Error(`Replicate prediction failed: ${prediction.error || prediction.status}`)
        }

        if (prediction.status !== 'succeeded') {
            throw new Error(`Replicate API timed out while generating image.`)
        }

        const outputs: Array<{ buffer: Buffer; mimeType: string; width: number; height: number }> = []

        let width = 1024, height = 1024;
        if (aspectRatio === '16:9') { width = 1920; height = 1080; }
        if (aspectRatio === '9:16') { width = 1080; height = 1920; }

        let outputUrls: string[] = []
        if (Array.isArray(prediction.output)) {
            outputUrls = prediction.output
        } else if (typeof prediction.output === 'string') {
            outputUrls = [prediction.output]
        }

        if (outputUrls.length === 0) {
            throw new Error('Replicate generated successfully but returned no image URLs.')
        }

        for (const outUrl of outputUrls) {
            const imgRes = await fetch(outUrl)
            if (!imgRes.ok) throw new Error(`Failed to download Replicate generated media: ${imgRes.statusText}`)
            const arrayBuffer = await imgRes.arrayBuffer()
            const mimeType = imgRes.headers.get('content-type') || 'image/png'
            outputs.push({
                buffer: Buffer.from(arrayBuffer),
                mimeType,
                width,
                height
            })
        }

        return {
            outputs,
            apiRequestId: prediction.id
        }
    }
}
