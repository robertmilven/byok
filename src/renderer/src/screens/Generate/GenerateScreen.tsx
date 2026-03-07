import React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { PromptBuilder } from '../../components/PromptBuilder/PromptBuilder'
import { GalleryGrid } from '../../components/Gallery/GalleryGrid'
import { useProjectStore } from '../../stores/projectStore'
import { useQueueStore } from '../../stores/queueStore'
import { IPC } from '../../../../shared/ipc-channels'
import type { Asset, PromptData } from '../../../../shared/types'

export function GenerateScreen(): JSX.Element {
    const { activeProject, projects, createProject } = useProjectStore()
    const { running } = useQueueStore()
    const [assets, setAssets] = useState<Asset[]>([])
    const [generating, setGenerating] = useState(false)

    const projectId = activeProject?.id

    const fetchAssets = useCallback(async () => {
        if (!projectId) return
        try {
            const list = await window.api.invoke<Asset[]>(IPC.ASSETS_LIST, {
                projectId,
                type: 'image'
            })
            setAssets(list)
        } catch { }
    }, [projectId])

    useEffect(() => {
        fetchAssets()
    }, [fetchAssets])

    // Refresh gallery when queue events fire (job completed)
    const events = useQueueStore((s) => s.events)
    useEffect(() => {
        const latest = events[0]
        if (latest?.type === 'job:completed') {
            fetchAssets()
            setGenerating(false)
        }
        if (latest?.type === 'job:failed') {
            setGenerating(false)
        }
    }, [events, fetchAssets])

    const handleGenerate = async ({
        promptData,
        provider,
        model,
        count
    }: {
        promptData: PromptData
        provider: string
        model: string
        count: number
    }) => {
        let pid = projectId
        if (!pid) {
            // Auto-create first project
            const p = await createProject('My First Project')
            pid = p.id
        }

        setGenerating(true)
        try {
            await window.api.invoke(IPC.GENERATION_CREATE, {
                projectId: pid,
                promptData,
                provider,
                model,
                count,
                parameters: {}
            })
        } catch (err) {
            console.error('Generation error:', err)
            setGenerating(false)
        }
    }

    const handleDelete = async (assetId: string) => {
        await window.api.invoke(IPC.ASSETS_DELETE, { id: assetId })
        setAssets((prev) => prev.filter((a) => a.id !== assetId))
    }

    const handleFavorite = async (assetId: string, favorite: boolean) => {
        await window.api.invoke(IPC.ASSETS_FAVORITE, { id: assetId, favorite })
        setAssets((prev) =>
            prev.map((a) => (a.id === assetId ? { ...a, favorite: favorite ? 1 : 0 } : a))
        )
    }

    return (
        <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
            {/* Left: Prompt Builder */}
            <div
                style={{
                    width: 320,
                    minWidth: 280,
                    maxWidth: 360,
                    background: 'var(--bg-01)',
                    borderRight: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        padding: '12px 14px 8px',
                        borderBottom: '1px solid var(--border)',
                        flexShrink: 0,
                    }}
                >
                    <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>
                        Prompt Builder
                    </h3>
                    {activeProject && (
                        <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
                            {activeProject.name}
                        </p>
                    )}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <PromptBuilder onGenerate={handleGenerate} loading={generating || running > 0} />
                </div>
            </div>

            {/* Right: Gallery */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div
                    style={{
                        padding: '12px 16px 8px',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexShrink: 0,
                    }}
                >
                    <h3 style={{ fontWeight: 600, fontSize: 13 }}>
                        Gallery{assets.length > 0 && <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontWeight: 400 }}>{assets.length} images</span>}
                    </h3>
                    {generating && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-light)', fontSize: 12 }}>
                            <div style={{ width: 12, height: 12, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                            Generating...
                        </div>
                    )}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <GalleryGrid
                        assets={assets}
                        onDelete={handleDelete}
                        onFavorite={handleFavorite}
                    />
                </div>
            </div>
        </div>
    )
}

