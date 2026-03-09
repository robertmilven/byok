import type { ProviderAdapter, ProviderCapability, ModelInfo, GenerationRequest, GenerationResult } from './types'

export class WavespeedAdapter implements ProviderAdapter {
    readonly slug = 'wavespeed'
    readonly displayName = 'Wavespeed AI'
    private apiKey?: string

    async initialize(apiKey: string): Promise<void> {
        this.apiKey = apiKey
    }

    async testConnection(): Promise<{ ok: boolean; error?: string }> {
        if (!this.apiKey) {
            return { ok: false, error: 'API key not configured' }
        }

        try {
            // Test connection by fetching available models or a basic endpoint.
            // Using a generic GET on a generic endpoint to see if auth fails.
            const res = await fetch('https://api.wavespeed.ai/api/v3/models', {
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
                id: 'flux-dev',
                name: 'FLUX.1 [dev]',
                capabilities: ['text-to-image'],
                maxResolution: { w: 2048, h: 2048 },
                aspectRatios: ['1:1', '16:9', '9:16'],
                pricing: [{ costPerUnit: 0.015, unit: 'image' }],
                parameters: []
            },
            {
                id: 'flux-schnell',
                name: 'FLUX.1 [schnell]',
                capabilities: ['text-to-image'],
                maxResolution: { w: 2048, h: 2048 },
                aspectRatios: ['1:1', '16:9', '9:16'],
                pricing: [{ costPerUnit: 0.015, unit: 'image' }],
                parameters: []
            },
            {
                id: 'nano-banana-pro',
                name: 'Nano Banana 2',
                capabilities: ['image-to-image'],
                maxResolution: { w: 1024, h: 1024 },
                aspectRatios: ['1:1'],
                pricing: [{ costPerUnit: 0.02, unit: 'image' }],
                parameters: []
            },
            {
                id: 'nano-banana-2',
                name: 'Nano Banana 2',
                capabilities: ['text-to-image', 'image-to-image'],
                maxResolution: { w: 1024, h: 1024 },
                aspectRatios: ['1:1'],
                pricing: [{ costPerUnit: 0.02, unit: 'image' }],
                parameters: []
            }
        ]
    }

    estimateCost(request: Pick<GenerationRequest, 'model' | 'parameters' | 'count'>): number {
        if (request.model === 'nano-banana-pro') return 0.02 * (request.count ?? 1)
        return 0.015 * (request.count ?? 1)
    }

    private aspectRatioToImageSizeStr(aspectRatio: string = '1:1'): string {
        if (aspectRatio === '16:9') return '1920x1080'
        if (aspectRatio === '9:16') return '1080x1920'
        return '1024x1024'
    }

    async generate(request: GenerationRequest): Promise<GenerationResult> {
        if (!this.apiKey) {
            throw new Error('Wavespeed AI API key not initialized')
        }

        const count = request.count ?? 1
        const aspectRatio = (request.parameters?.aspectRatio as string) ?? '1:1'
        const model = request.model || 'flux-dev'
        const isEditing = model === 'nano-banana-pro'

        const url = isEditing
            ? 'https://api.wavespeed.ai/api/v3/google/nano-banana-pro/edit'
            : 'https://api.wavespeed.ai/api/v3/images/generations'

        let body: any = {}

        let finalPrompt = request.prompt
        if (isEditing) {
            let inputImages: string[] = []

            // Extract URLs from prompt as a fallback mechanism
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const matches = finalPrompt.match(urlRegex);

            if (request.referenceImages && request.referenceImages.length > 0) {
                inputImages = request.referenceImages.map(buf => `data:image/png;base64,${buf.toString('base64')}`)
            } else if (matches && matches.length > 0) {
                // If the user pasted a URL in the prompt, use it as the reference image
                inputImages = [matches[0]]
                // Remote the URL from the prompt text
                finalPrompt = finalPrompt.replace(matches[0], '').trim()
            } else {
                throw new Error('Nano Banana Pro requires at least one input reference image. Attach one or paste an image URL in the prompt.')
            }

            body = {
                prompt: finalPrompt,
                enable_base64_output: true,
                enable_sync_mode: false,
                enable_web_search: false,
                output_format: 'png',
                resolution: '1k',
                images: inputImages
            }
        } else {
            body = {
                model: model,
                prompt: request.prompt,
                n: count,
                size: this.aspectRatioToImageSizeStr(aspectRatio),
                response_format: 'url'
            }
        }

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(body)
        })

        if (!res.ok) {
            const errText = await res.text()
            throw new Error(`Wavespeed API Error: ${res.statusText} - ${errText}`)
        }

        const data = await res.json()
        const outputs: Array<{ buffer: Buffer; mimeType: string; width: number; height: number }> = []

        // Map aspect ratio string back to rough dimensions for the output metadata
        let width = 1024, height = 1024;
        if (aspectRatio === '16:9') { width = 1920; height = 1080; }
        if (aspectRatio === '9:16') { width = 1080; height = 1920; }

        if (isEditing) {
            let currentStatus = data.status
            let resultData = data

            // Poll if it's async (has urls.get and is not done)
            if ((currentStatus === 'starting' || currentStatus === 'processing' || currentStatus === 'in_queue') && resultData.urls && resultData.urls.get) {
                const pollUrl = resultData.urls.get
                let attempts = 0
                while (currentStatus !== 'succeeded' && currentStatus !== 'failed' && currentStatus !== 'canceled' && attempts < 30) {
                    await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds between polls

                    const pollRes = await fetch(pollUrl, {
                        headers: {
                            'Authorization': `Bearer ${this.apiKey}`
                        }
                    })

                    if (!pollRes.ok) throw new Error(`Wavespeed polling error: ${pollRes.statusText}`)
                    resultData = await pollRes.json()
                    currentStatus = resultData.status
                    attempts++
                }
            }

            if (currentStatus === 'failed') {
                throw new Error(`Wavespeed API Edit Failed: ${resultData.error || 'Unknown error'}`)
            }
            if (currentStatus !== 'succeeded') {
                throw new Error(`Wavespeed API Edit timed out or canceled. Status: ${currentStatus}`)
            }
            if (!resultData.outputs || !Array.isArray(resultData.outputs)) {
                throw new Error(`Unexpected structure from Wavespeed API edit endpoint: ${JSON.stringify(resultData)}`);
            }

            for (const b64Data of resultData.outputs) {
                let rawBase64 = b64Data
                if (b64Data.startsWith('data:image')) {
                    rawBase64 = b64Data.split(',')[1]
                }
                const buffer = Buffer.from(rawBase64, 'base64')
                outputs.push({ buffer, mimeType: 'image/png', width, height })
            }
        } else {
            if (!data.data || !Array.isArray(data.data)) {
                throw new Error(`Unexpected structure from Wavespeed API: ${JSON.stringify(data)}`);
            }

            for (const item of data.data) {
                let buffer: Buffer
                if (item.b64_json) {
                    buffer = Buffer.from(item.b64_json, 'base64')
                } else if (item.url) {
                    const imgRes = await fetch(item.url)
                    if (!imgRes.ok) throw new Error(`Failed to fetch image from Wavespeed URL: ${imgRes.statusText}`)
                    const arrayBuffer = await imgRes.arrayBuffer()
                    buffer = Buffer.from(arrayBuffer)
                } else {
                    continue // Unrecognized format
                }

                outputs.push({ buffer, mimeType: 'image/png', width, height })
            }
        }

        if (outputs.length === 0) {
            throw new Error('Wavespeed API returned success but no valid image data was found.')
        }

        return {
            outputs
        }
    }
}
