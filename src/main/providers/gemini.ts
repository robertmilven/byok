import type { ProviderAdapter, ProviderCapability, ModelInfo, GenerationRequest, GenerationResult } from './types'
import { logger } from '../utils/logger'

export class GeminiAdapter implements ProviderAdapter {
    readonly slug = 'gemini'
    readonly displayName = 'Google Gemini'
    private apiKey: string | null = null

    async initialize(apiKey: string): Promise<void> {
        this.apiKey = apiKey
        logger.info('Gemini adapter initialized')
        fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
            .then(res => res.json())
            .then(data => {
                const im = data.models?.filter((m: any) => m.name.includes('imagen'))
                logger.error('IMAGEN MODELS DISCOVERED: ' + JSON.stringify(im))
            }).catch(e => logger.error('Error fetching models: ' + e))
    }

    async testConnection(): Promise<{ ok: boolean; error?: string }> {
        if (!this.apiKey) return { ok: false, error: 'API key not set' }
        try {
            // Test connection by fetching models
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`)
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}))
                throw new Error(errorData.error?.message || `HTTP ${res.status} ${res.statusText}`)
            }
            return { ok: true }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e)
            return { ok: false, error: msg }
        }
    }

    getCapabilities(): ProviderCapability[] {
        return [
            { type: 'text-to-image', models: this.getModels() }
        ]
    }



    estimateCost(request: Pick<GenerationRequest, 'model' | 'parameters' | 'count'>): number {
        const cost = request.model?.includes('fast') ? 0.015 : 0.03
        return cost * (request.count ?? 1)
    }

    getModels(): ModelInfo[] {
        return [
            {
                id: 'gemini-3.1-flash-image-preview',
                name: 'Gemini 3.1 Flash (Nano Banana 2)',
                capabilities: ['text-to-image'],
                maxResolution: { w: 1536, h: 1536 },
                aspectRatios: ['1:1', '16:9', '9:16', '3:4', '4:3'],
                pricing: [{ costPerUnit: 0.03, unit: 'image' }],
                parameters: []
            },
            {
                id: 'imagen-4.0-generate-001',
                name: 'Imagen 4',
                capabilities: ['text-to-image'],
                maxResolution: { w: 1536, h: 1536 },
                aspectRatios: ['1:1', '16:9', '9:16', '3:4', '4:3'],
                pricing: [{ costPerUnit: 0.03, unit: 'image' }],
                parameters: []
            },
            {
                id: 'imagen-4.0-fast-generate-001',
                name: 'Imagen 4 Fast',
                capabilities: ['text-to-image'],
                maxResolution: { w: 1536, h: 1536 },
                aspectRatios: ['1:1', '16:9', '9:16', '3:4', '4:3'],
                pricing: [{ costPerUnit: 0.015, unit: 'image' }],
                parameters: []
            },
            {
                id: 'gemini-2.5-flash-image',
                name: 'Gemini 2.5 Flash Image',
                capabilities: ['text-to-image'],
                maxResolution: { w: 1536, h: 1536 },
                aspectRatios: ['1:1', '16:9', '9:16', '3:4', '4:3'],
                pricing: [{ costPerUnit: 0.015, unit: 'image' }],
                parameters: []
            }
        ];
    }

    async generate(request: GenerationRequest): Promise<GenerationResult> {
        if (!this.apiKey) throw new Error('Gemini API key not initialized')

        const count = request.count ?? 1
        const aspectRatio = (request.parameters?.aspectRatio as string) ?? '1:1'
        const model = request.model || 'imagen-4.0-generate-001'

        // Determine which endpoint to use based on model capabilities
        const isFlashImage = model.includes('flash-image')
        const endpoint = isFlashImage ? 'generateContent' : 'predict';
        const apiVersion = 'v1beta';
        const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:${endpoint}?key=${this.apiKey}`;

        // Build request body appropriate for the endpoint
        const body = isFlashImage
            ? {
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: request.prompt }]
                    }
                ]
            }
            : {
                instances: [
                    { prompt: request.prompt }
                ],
                parameters: {
                    sampleCount: Math.min(count, 4),
                    aspectRatio: aspectRatio,
                    outputOptions: {
                        mimeType: 'image/png'
                    }
                }
            }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })

        if (!response.ok) {
            const errorText = await response.text()
            let errMsg = `HTTP ${response.status} ${response.statusText}`
            try {
                const errorJson = JSON.parse(errorText)
                if (errorJson.error?.message) {
                    errMsg = errorJson.error.message
                }
            } catch (e) {
                if (errorText.trim()) errMsg += `: ${errorText.substring(0, 100)}`
            }
            throw new Error(`Gemini API Error: ${errMsg}`)
        }

        const data = await response.json()

        // Parse response based on endpoint
        const predictions = isFlashImage ? data.candidates : data.predictions
        if (!predictions || !Array.isArray(predictions)) {
            throw new Error('Unexpected response format from Gemini API')
        }

        const outputs: { buffer: Buffer, mimeType: string, width: number, height: number }[] = []
        const { w, h } = this.aspectRatioToApproximatedPixels(aspectRatio)

        for (const item of predictions) {
            // Flash image models return inlineData inside parts[0]
            if (isFlashImage) {
                const part = item.content?.parts?.[0]
                const b64Data = part?.inlineData?.data || part?.inlineData?.bytesBase64
                if (b64Data) {
                    outputs.push({
                        buffer: Buffer.from(b64Data, 'base64'),
                        mimeType: part.inlineData.mimeType || 'image/png',
                        width: w,
                        height: h
                    })
                }
            } else {
                if (!item.bytesBase64) continue
                outputs.push({
                    buffer: Buffer.from(item.bytesBase64, 'base64'),
                    mimeType: item.mimeType || 'image/png',
                    width: w,
                    height: h
                })
            }
        }

        return {
            outputs,
            actualCostUsd: this.estimateCost(request)
        }
    }

    private aspectRatioToApproximatedPixels(ratio: string): { w: number, h: number } {
        // Imagen 3 outputs standard resolutions based on aspect ratio.
        // We approximate here for the UI metadata.
        switch (ratio) {
            case '16:9': return { w: 1536, h: 864 }
            case '9:16': return { w: 864, h: 1536 }
            case '4:3': return { w: 1536, h: 1152 }
            case '3:4': return { w: 1152, h: 1536 }
            case '1:1':
            default:
                return { w: 1024, h: 1024 } // Base resolution
        }
    }
}
