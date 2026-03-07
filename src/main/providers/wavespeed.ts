import type { ProviderAdapter, ProviderCapability, ModelInfo, GenerationRequest, GenerationResult } from './types'

export class WavespeedAdapter implements ProviderAdapter {
    readonly slug = 'wavespeed'
    readonly displayName = 'Wavespeed AI'

    async initialize(apiKey: string): Promise<void> {
        // Implementation coming soon
    }

    async testConnection(): Promise<{ ok: boolean; error?: string }> {
        // Implementation coming soon
        return { ok: true }
    }

    getCapabilities(): ProviderCapability[] {
        return [
            { type: 'text-to-image', models: this.getModels() }
        ]
    }

    getModels(): ModelInfo[] {
        return [
            {
                id: 'wavespeed-vision',
                name: 'Wavespeed Vision',
                capabilities: ['text-to-image'],
                maxResolution: { w: 1024, h: 1024 },
                aspectRatios: ['1:1', '16:9', '9:16'],
                pricing: [{ costPerUnit: 0.015, unit: 'image' }],
                parameters: []
            }
        ]
    }

    estimateCost(request: Pick<GenerationRequest, 'model' | 'parameters' | 'count'>): number {
        return 0.015 * (request.count ?? 1)
    }

    async generate(request: GenerationRequest): Promise<GenerationResult> {
        throw new Error('Not implemented yet')
    }
}
