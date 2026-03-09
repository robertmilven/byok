import React, { useState, useEffect } from 'react'
import { IPC } from '../../../../shared/ipc-channels'
import type { Asset, PromptData } from '../../../../shared/types'
import { useProjectStore } from '../../stores/projectStore'
import { useQueueStore } from '../../stores/queueStore'
import { GalleryGrid } from '../../components/Gallery/GalleryGrid'
import { VideoBuilder } from '../../components/PromptBuilder/VideoBuilder'
import { useLocation } from 'react-router-dom'

export function VideoScreen() {
    const location = useLocation()
    const { activeProject } = useProjectStore()
    const { running } = useQueueStore()
    const [assets, setAssets] = useState<Asset[]>([])
    const [generating, setGenerating] = useState(false)
    const [referenceAsset, setReferenceAsset] = useState<{ id: string; dataUrl: string } | null>(null)

    const projectId = activeProject?.id

    // Pre-load reference asset if passed via navigation
    useEffect(() => {
        if (location.state?.referenceAsset) {
            setReferenceAsset(location.state.referenceAsset)
        }
    }, [location.state])

    const fetchAssets = async () => {
        try {
            if (!projectId) {
                setAssets([])
                return
            }
            const list = await (window as any).api.invoke(IPC.ASSETS_LIST, {
                projectId,
                // We'll show all assets in the gallery to drop into the prompt builder
            })
            setAssets(list)
        } catch { }
    }

    useEffect(() => {
        fetchAssets()
    }, [projectId, running]) // Refresh when running jobs finish or project changes

    const handleDelete = async (assetId: string) => {
        try {
            await (window as any).api.invoke(IPC.ASSETS_DELETE, { id: assetId })
            fetchAssets()
        } catch { }
    }

    const handleFavorite = async (assetId: string, favorite: boolean) => {
        try {
            await (window as any).api.invoke(IPC.ASSETS_FAVORITE, { id: assetId, favorite })
            fetchAssets()
        } catch { }
    }

    const handleGenerateVideo = async ({
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
        if (!projectId) return
        setGenerating(true)
        try {
            await (window as any).api.invoke(IPC.GENERATION_CREATE, {
                projectId,
                provider,
                model,
                promptData,
                count
            })
        } finally {
            setGenerating(false)
        }
    }

    if (!projectId) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                Please select or create a project first.
            </div>
        )
    }

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div
                style={{
                    height: 56,
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 20px',
                    justifyContent: 'space-between'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <span style={{ fontSize: 16 }}>🎬</span>
                    </div>
                    <div>
                        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                            Video Studio
                        </h2>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                            Animate your images or create videos from scratch.
                        </p>
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <VideoBuilder
                        onGenerate={handleGenerateVideo}
                        loading={generating || running > 0}
                        referenceAsset={referenceAsset}
                        onClearReference={() => setReferenceAsset(null)}
                    />
                </div>
                <div style={{ width: 500, borderLeft: '1px solid var(--border)', background: 'var(--bg-01)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-02)' }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Asset Selection</h3>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>Gallery assets available for reference</p>
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <GalleryGrid
                            assets={assets}
                            onDelete={handleDelete}
                            onFavorite={handleFavorite}
                            onCreateVideo={(asset) => setReferenceAsset({ id: asset.id, dataUrl: asset.dataUrl! })}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
