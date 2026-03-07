import type { ProviderAdapter, ProviderCapability, ModelInfo, GenerationRequest, GenerationResult } from './types'

export class FalAdapter implements ProviderAdapter {
    readonly slug = 'fal'
    readonly displayName = 'Fal.ai'

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
            }
        ]
    }

    estimateCost(request: Pick<GenerationRequest, 'model' | 'parameters' | 'count'>): number {
        if (request.model.includes('pro')) return 0.05 * (request.count ?? 1)
        return 0.025 * (request.count ?? 1)
    }

    async generate(request: GenerationRequest): Promise<GenerationResult> {
        throw new Error('Not implemented yet')
    }
}
