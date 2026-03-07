// Provider adapter interface — all providers implement this
import type { PromptData } from '../../shared/types'

export interface ProviderCapability {
    type:
    | 'text-to-image'
    | 'image-to-image'
    | 'inpaint'
    | 'variation'
    | 'image-to-video'
    | 'video-interpolation'
    | 'lip-sync'
    models: ModelInfo[]
}

export interface ModelInfo {
    id: string
    name: string
    capabilities: string[]
    maxResolution: { w: number; h: number }
    aspectRatios: string[]
    pricing: PricingRule[]
    parameters: ParameterSchema[]
}

export interface PricingRule {
    condition?: string
    costPerUnit: number
    unit: 'image' | 'second' | 'megapixel' | 'step'
}

export interface ParameterSchema {
    name: string
    type: 'number' | 'string' | 'boolean' | 'select'
    default: unknown
    min?: number
    max?: number
    options?: string[]
    label?: string
    description?: string
}

export interface GenerationRequest {
    jobId: string
    prompt: string
    negativePrompt?: string
    referenceImages?: Buffer[]
    maskImage?: Buffer
    parameters: Record<string, unknown>
    model: string
    count?: number
}

export interface GenerationResult {
    outputs: OutputAsset[]
    apiRequestId?: string
    tokensUsed?: number
    actualCostUsd?: number
    rawResponse?: unknown
}

export interface OutputAsset {
    buffer: Buffer
    mimeType: string
    width?: number
    height?: number
    durationMs?: number
    seed?: number
}

// Every provider implements this interface
export interface ProviderAdapter {
    readonly slug: string
    readonly displayName: string

    // Lifecycle
    initialize(apiKey: string, config?: Record<string, unknown>): Promise<void>
    testConnection(): Promise<{ ok: boolean; error?: string }>

    // Capabilities
    getCapabilities(): ProviderCapability[]
    getModels(): ModelInfo[]
    estimateCost(request: Pick<GenerationRequest, 'model' | 'parameters' | 'count'>): number

    // Generation
    generate(request: GenerationRequest): Promise<GenerationResult>

    // Polling (for async providers like Runway, Luma)
    checkStatus?(apiRequestId: string): Promise<'pending' | 'running' | 'completed' | 'failed'>
    fetchResult?(apiRequestId: string): Promise<GenerationResult>

    // Cancellation
    cancel?(apiRequestId: string): Promise<void>
}
