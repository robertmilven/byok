// All shared domain types mirroring the SQLite schema

export interface Project {
    id: string
    name: string
    description?: string
    cover_image?: string
    created_at: number
    updated_at: number
    archived: number // 0 | 1
    tags?: string // JSON array
}

export interface Job {
    id: string
    project_id: string
    type: 'image' | 'video' | 'inpaint' | 'variation'
    status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
    provider: string
    model: string
    prompt_data: string // JSON
    raw_prompt?: string
    parameters?: string // JSON
    reference_ids?: string // JSON array
    result_assets?: string // JSON array of asset IDs
    cost_usd?: number
    tokens_used?: number
    api_request_id?: string
    error_message?: string
    retry_count: number
    fallback_chain?: string // JSON
    created_at: number
    started_at?: number
    completed_at?: number
    duration_ms?: number
}

export interface Asset {
    id: string
    project_id?: string
    job_id?: string
    type: 'image' | 'video' | 'reference' | 'mask'
    file_path: string
    file_name: string
    file_size?: number
    mime_type?: string
    width?: number
    height?: number
    duration_ms?: number
    thumbnail?: string
    metadata?: string // JSON
    favorite: number // 0 | 1
    tags?: string // JSON array
    dataUrl?: string
}

export interface Preset {
    id: string
    name: string
    category?: string
    prompt_data: string // JSON
    built_in: number // 0 | 1
    created_at: number
    updated_at: number
}

export interface LibraryItem {
    id: string
    name: string
    type: 'face' | 'outfit' | 'object' | 'scene' | 'style'
    file_path: string
    thumbnail?: string
    tags?: string // JSON array
    description?: string
    usage_count: number
    created_at: number
}

export interface CostEntry {
    id: string
    job_id: string
    project_id: string
    provider: string
    model: string
    type: 'image' | 'video' | 'inpaint'
    cost_usd: number
    created_at: number
}

export interface ProviderModel {
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
}

export interface ProviderInfo {
    slug: string
    displayName: string
    enabled: boolean
    hasKey: boolean
    models: ProviderModel[]
    capabilities: string[]
}

// Structured prompt data from the builder
export interface PromptData {
    subject: string
    shotType?: string
    lighting?: string
    mood?: string
    cameraGear?: string
    focalLength?: string
    filmStock?: string
    aspectRatio: string
    negativePrompt?: string
    additionalDetails?: string
    libraryReferenceId?: string
    assetReferenceId?: string
}

// Cost summary for dashboard
export interface CostSummary {
    total: number
    byProvider: Record<string, number>
    byModel: Record<string, number>
    byProject: Record<string, number>
    entries: CostEntry[]
}

// Storyboard / Story Compilation
export interface Story {
    id: string
    project_id: string
    name: string
    clips: Clip[]
    created_at: number
}

export interface Clip {
    id: string
    asset_id: string
    type: 'image' | 'video'
    duration_ms: number // For images, how long to show. For videos, the clip length.
    order: number
}

// Queue event pushed from main to renderer
export interface QueueEvent {
    type: 'job:queued' | 'job:started' | 'job:completed' | 'job:failed' | 'job:cancelled'
    job: Job
    asset?: Asset
}

// Settings stored in the DB/config
export interface AppSettings {
    theme: 'dark' | 'light' | 'system'
    defaultProvider: string
    defaultModel: string
    outputDirectory: string
    logLevel: 'error' | 'warn' | 'info' | 'debug'
    maxConcurrentJobs: number
    confirmCostAbove?: number // USD — show dialog if estimate exceeds this
}
