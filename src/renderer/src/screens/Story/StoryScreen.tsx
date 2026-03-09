import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Film, Save, Play, Download } from 'lucide-react'
import { useProjectStore } from '../../stores/projectStore'
import { IPC } from '../../../../shared/ipc-channels'
import type { Story, Asset, Clip } from '../../../../shared/types'

export function StoryScreen() {
    const { activeProject } = useProjectStore()
    const [stories, setStories] = useState<Story[]>([])
    const [selectedStory, setSelectedStory] = useState<Story | null>(null)
    const [assets, setAssets] = useState<Asset[]>([])
    const [loading, setLoading] = useState(false)
    const [loadedAssetIds] = useState<Set<string>>(new Set())

    useEffect(() => {
        if (activeProject) {
            fetchStories()
            fetchAssets()
        }
    }, [activeProject])

    const fetchStories = async () => {
        if (!activeProject) return
        try {
            const list = await (window as any).api.invoke(IPC.STORIES_LIST, { projectId: activeProject.id })
            setStories(list)
        } catch (err) {
            console.error('Failed to fetch stories:', err)
        }
    }

    const fetchAssets = async () => {
        if (!activeProject) return
        try {
            const list = await (window as any).api.invoke(IPC.ASSETS_LIST, { projectId: activeProject.id })
            setAssets(list)

            // Background load dataUrls
            for (const asset of list) {
                if (loadedAssetIds.has(asset.id)) continue
                try {
                    const res = await (window as any).api.invoke(IPC.ASSETS_READ_FILE, { id: asset.id })
                    if (res?.data) {
                        const dataUrl = `data:${res.mimeType};base64,${res.data}`
                        setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, dataUrl } : a))
                        loadedAssetIds.add(asset.id)
                    }
                } catch { }
            }
        } catch (err) {
            console.error('Failed to fetch assets:', err)
        }
    }

    const handleCreateStory = async () => {
        if (!activeProject) return
        const newStory: Partial<Story> = {
            project_id: activeProject.id,
            name: `New Story ${stories.length + 1}`,
            clips: []
        }
        try {
            const saved = await (window as any).api.invoke(IPC.STORIES_UPSERT, newStory)
            setStories([saved, ...stories])
            setSelectedStory(saved)
        } catch (err) {
            console.error('Failed to create story:', err)
        }
    }

    const handleSaveStory = async () => {
        if (!selectedStory) return
        setLoading(true)
        try {
            await (window as any).api.invoke(IPC.STORIES_UPSERT, selectedStory)
            fetchStories()
        } catch (err) {
            console.error('Failed to save story:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteStory = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm('Are you sure you want to delete this story?')) return
        try {
            await (window as any).api.invoke(IPC.STORIES_DELETE, { id })
            setStories(stories.filter(s => s.id !== id))
            if (selectedStory?.id === id) setSelectedStory(null)
        } catch (err) {
            console.error('Failed to delete story:', err)
        }
    }

    const addClip = (asset: Asset) => {
        if (!selectedStory) return
        const newClip: Clip = {
            id: Math.random().toString(36).substr(2, 9),
            asset_id: asset.id,
            type: asset.type as 'image' | 'video',
            duration_ms: asset.type === 'video' ? (asset.duration_ms || 5000) : 3000,
            order: selectedStory.clips.length
        }
        setSelectedStory({
            ...selectedStory,
            clips: [...selectedStory.clips, newClip]
        })
    }

    const removeClip = (clipId: string) => {
        if (!selectedStory) return
        const updatedClips = selectedStory.clips
            .filter(c => c.id !== clipId)
            .map((c, i) => ({ ...c, order: i }))
        setSelectedStory({
            ...selectedStory,
            clips: updatedClips
        })
    }

    const handleExport = async () => {
        if (!selectedStory) return
        setLoading(true)
        try {
            const result = await (window as any).api.invoke(IPC.STORIES_EXPORT, { id: selectedStory.id })
            alert(result.message || 'Export started')
        } catch (err) {
            console.error('Failed to export story:', err)
        } finally {
            setLoading(false)
        }
    }

    if (!activeProject) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                Please select or create a project first.
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
            {/* Sidebar: Stories List */}
            <div style={{ width: 250, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-02)' }}>
                <div style={{ padding: 16, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: 14 }}>Stories</h3>
                    <button onClick={handleCreateStory} className="btn btn-sm btn-ghost" title="New Story">
                        <Plus size={16} />
                    </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                    {stories.map(story => (
                        <div
                            key={story.id}
                            onClick={() => setSelectedStory(story)}
                            style={{
                                padding: '10px 12px',
                                borderRadius: 8,
                                cursor: 'pointer',
                                background: selectedStory?.id === story.id ? 'var(--bg-elevated)' : 'transparent',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 4,
                                transition: 'all 0.15s'
                            }}
                        >
                            <span style={{ fontSize: 13, color: selectedStory?.id === story.id ? 'var(--text-primary)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {story.name}
                            </span>
                            <button onClick={(e) => handleDeleteStory(story.id, e)} className="btn btn-xs btn-ghost text-muted hover-danger" style={{ padding: 4 }}>
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content: Story Editor */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {selectedStory ? (
                    <>
                        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-01)' }}>
                            <input
                                value={selectedStory.name}
                                onChange={(e) => setSelectedStory({ ...selectedStory, name: e.target.value })}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 16, fontWeight: 600, padding: 0, outline: 'none', width: '200px' }}
                            />
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={handleSaveStory} disabled={loading} className="btn btn-secondary btn-sm">
                                    <Save size={14} /> Save
                                </button>
                                <button onClick={handleExport} disabled={loading} className="btn btn-primary btn-sm">
                                    <Download size={14} /> Export MP4
                                </button>
                            </div>
                        </div>

                        {/* Editor Layout */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 20, gap: 20 }}>
                            {/* Preview Section */}
                            <div style={{ flex: 1, background: '#000', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                {selectedStory.clips.length > 0 ? (
                                    <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                                        <Play size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                                        <p>Preview player coming soon</p>
                                    </div>
                                ) : (
                                    <div style={{ color: 'var(--text-muted)' }}>Drag assets here to start your story</div>
                                )}
                            </div>

                            {/* Timeline Track */}
                            <div style={{ height: 180, background: 'var(--bg-02)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>TIMELINE</div>
                                <div style={{ flex: 1, padding: 16, display: 'flex', gap: 12, overflowX: 'auto', alignItems: 'center' }}>
                                    {selectedStory.clips.map((clip, index) => {
                                        const asset = assets.find(a => a.id === clip.asset_id)
                                        return (
                                            <div
                                                key={clip.id}
                                                style={{
                                                    width: 120,
                                                    height: 90,
                                                    flexShrink: 0,
                                                    background: 'var(--bg-elevated)',
                                                    borderRadius: 8,
                                                    position: 'relative',
                                                    border: '1px solid var(--border)',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                {asset ? (
                                                    <img src={asset.dataUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={16} /></div>
                                                )}
                                                <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 4 }}>
                                                    <button onClick={() => removeClip(clip.id)} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: 4, padding: 2, cursor: 'pointer' }}>
                                                        <Trash2 size={10} />
                                                    </button>
                                                </div>
                                                <div style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: 9, padding: '2px 4px', borderRadius: 4 }}>
                                                    {index + 1} | {(clip.duration_ms / 1000).toFixed(1)}s
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {selectedStory.clips.length === 0 && (
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                                            Timeline is empty. Add assets from the gallery below.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Gallery Drawer */}
                        <div style={{ height: 250, borderTop: '1px solid var(--border)', background: 'var(--bg-02)', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>AVAILABLE ASSETS</div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
                                    {assets.map(asset => (
                                        <div
                                            key={asset.id}
                                            onClick={() => addClip(asset)}
                                            style={{
                                                aspectRatio: '16/9',
                                                borderRadius: 8,
                                                overflow: 'hidden',
                                                cursor: 'pointer',
                                                border: '1px solid var(--border)',
                                                position: 'relative'
                                            }}
                                        >
                                            <img src={asset.dataUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <div className="hover-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(var(--accent-rgb), 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                                                <Plus size={20} color="white" />
                                            </div>
                                            <style>{`
                                                div:hover > .hover-overlay { opacity: 1 !important; }
                                            `}</style>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 16 }}>
                        <Play size={48} opacity={0.2} />
                        <p>Select a story to edit or create a new one</p>
                        <button onClick={handleCreateStory} className="btn btn-primary">
                            <Plus size={16} /> Create New Story
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
