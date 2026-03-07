import type { ProviderAdapter, ModelInfo, ProviderCapability } from './types'
import { logger } from '../utils/logger'

export class ProviderRegistry {
    private static instance: ProviderRegistry
    private adapters: Map<string, ProviderAdapter> = new Map()

    private constructor() { }

    static getInstance(): ProviderRegistry {
        if (!ProviderRegistry.instance) {
            ProviderRegistry.instance = new ProviderRegistry()
        }
        return ProviderRegistry.instance
    }

    register(adapter: ProviderAdapter): void {
        this.adapters.set(adapter.slug, adapter)
        logger.info(`Provider registered: ${adapter.displayName} (${adapter.slug})`)
    }

    get(slug: string): ProviderAdapter | null {
        return this.adapters.get(slug) ?? null
    }

    getOrThrow(slug: string): ProviderAdapter {
        const adapter = this.adapters.get(slug)
        if (!adapter) throw new Error(`Provider not found: ${slug}`)
        return adapter
    }

    getAll(): ProviderAdapter[] {
        return Array.from(this.adapters.values())
    }

    getForCapability(type: string): ProviderAdapter[] {
        return this.getAll().filter((adapter) =>
            adapter.getCapabilities().some((cap) => cap.type === type)
        )
    }

    getModels(slug: string): ModelInfo[] {
        const adapter = this.adapters.get(slug)
        if (!adapter) return []
        return adapter.getModels()
    }

    getAllCapabilities(): ProviderCapability[] {
        return this.getAll().flatMap((adapter) => adapter.getCapabilities())
    }
}
