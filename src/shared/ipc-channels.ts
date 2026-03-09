// Typed IPC channel definitions — used by both main (handlers) and renderer (invoke)

export const IPC = {
    // Key Vault
    VAULT_SET: 'vault:set',
    VAULT_GET: 'vault:get',
    VAULT_DELETE: 'vault:delete',
    VAULT_LIST: 'vault:list',

    // Providers
    PROVIDERS_LIST: 'providers:list',
    PROVIDERS_MODELS: 'providers:models',
    PROVIDERS_TEST: 'providers:test',

    // Generation
    GENERATION_CREATE: 'generation:create',
    GENERATION_CANCEL: 'generation:cancel',
    GENERATION_ESTIMATE: 'generation:estimate',

    // Queue
    QUEUE_LIST: 'queue:list',
    QUEUE_RETRY: 'queue:retry',
    QUEUE_CANCEL: 'queue:cancel',
    QUEUE_EVENT: 'queue:event', // main → renderer push

    // Projects
    PROJECTS_LIST: 'projects:list',
    PROJECTS_CREATE: 'projects:create',
    PROJECTS_GET: 'projects:get',
    PROJECTS_UPDATE: 'projects:update',
    PROJECTS_DELETE: 'projects:delete',
    PROJECTS_ARCHIVE: 'projects:archive',

    // Assets
    ASSETS_LIST: 'assets:list',
    ASSETS_GET: 'assets:get',
    ASSETS_DELETE: 'assets:delete',
    ASSETS_FAVORITE: 'assets:favorite',
    ASSETS_READ_FILE: 'assets:readFile', // returns base64 for display
    ASSETS_SHOW_IN_FOLDER: 'assets:showInFolder',
    ASSETS_SAVE_AS: 'assets:saveAs',
    ASSETS_CONTEXT_MENU: 'assets:contextMenu',

    // Presets
    PRESETS_LIST: 'presets:list',
    PRESETS_CREATE: 'presets:create',
    PRESETS_DELETE: 'presets:delete',

    // Costs
    COSTS_SUMMARY: 'costs:summary',
    COSTS_EXPORT_CSV: 'costs:exportCsv',

    // Settings
    SETTINGS_GET: 'settings:get',
    SETTINGS_SET: 'settings:set',

    // Library
    LIBRARY_LIST: 'library:list',
    LIBRARY_ADD: 'library:add',
    LIBRARY_DELETE: 'library:delete',
    LIBRARY_READ_FILE: 'library:readFile',

    // Stories
    STORIES_LIST: 'stories:list',
    STORIES_GET: 'stories:get',
    STORIES_UPSERT: 'stories:upsert',
    STORIES_DELETE: 'stories:delete',
    STORIES_EXPORT: 'stories:export',
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]

// Typed payloads for each channel
export interface IpcPayloads {
    [IPC.VAULT_SET]: { provider: string; key: string }
    [IPC.VAULT_GET]: { provider: string }
    [IPC.VAULT_DELETE]: { provider: string }
    [IPC.VAULT_LIST]: void
    [IPC.PROVIDERS_LIST]: void
    [IPC.PROVIDERS_MODELS]: { slug: string }
    [IPC.PROVIDERS_TEST]: { slug: string }
    [IPC.GENERATION_CREATE]: {
        projectId: string
        promptData: import('./types').PromptData
        provider: string
        model: string
        count: number
        parameters?: Record<string, unknown>
    }
    [IPC.GENERATION_CANCEL]: { jobId: string }
    [IPC.GENERATION_ESTIMATE]: {
        provider: string
        model: string
        count: number
        parameters?: Record<string, unknown>
    }
    [IPC.QUEUE_LIST]: { projectId?: string }
    [IPC.QUEUE_RETRY]: { jobId: string }
    [IPC.QUEUE_CANCEL]: { jobId: string }
    [IPC.PROJECTS_LIST]: { includeArchived?: boolean }
    [IPC.PROJECTS_CREATE]: { name: string; description?: string }
    [IPC.PROJECTS_GET]: { id: string }
    [IPC.PROJECTS_UPDATE]: { id: string; name?: string; description?: string }
    [IPC.PROJECTS_DELETE]: { id: string }
    [IPC.PROJECTS_ARCHIVE]: { id: string; archived: boolean }
    [IPC.ASSETS_LIST]: { projectId: string; type?: string }
    [IPC.ASSETS_GET]: { id: string }
    [IPC.ASSETS_DELETE]: { id: string }
    [IPC.ASSETS_FAVORITE]: { id: string; favorite: boolean }
    [IPC.ASSETS_READ_FILE]: { id: string }
    [IPC.ASSETS_SHOW_IN_FOLDER]: { id: string }
    [IPC.ASSETS_SAVE_AS]: { id: string }
    [IPC.ASSETS_CONTEXT_MENU]: { id: string }
    [IPC.PRESETS_LIST]: void
    [IPC.PRESETS_CREATE]: { name: string; category?: string; promptData: import('./types').PromptData }
    [IPC.PRESETS_DELETE]: { id: string }
    [IPC.COSTS_SUMMARY]: { projectId?: string; startDate?: number; endDate?: number }
    [IPC.COSTS_EXPORT_CSV]: { projectId?: string }
    [IPC.SETTINGS_GET]: void
    [IPC.SETTINGS_SET]: Partial<import('./types').AppSettings>
    [IPC.LIBRARY_LIST]: { type?: string }
    [IPC.LIBRARY_ADD]: { name: string; type: string; filePath: string; tags?: string[] }
    [IPC.LIBRARY_DELETE]: { id: string }
    [IPC.LIBRARY_READ_FILE]: { id: string }
    [IPC.STORIES_LIST]: { projectId: string }
    [IPC.STORIES_GET]: { id: string }
    [IPC.STORIES_UPSERT]: import('./types').Story
    [IPC.STORIES_DELETE]: { id: string }
    [IPC.STORIES_EXPORT]: { id: string; format?: 'mp4' }
}
