import React from 'react'
import { useState, useEffect, useRef } from 'react'
import { Heart, Trash2, Download, X, FolderOpen } from 'lucide-react'
import type { Asset } from '../../../../shared/types'
import { IPC } from '../../../../shared/ipc-channels'

interface Props {
    assets: Asset[]
    onDelete?: (id: string) => void
    onFavorite?: (id: string, favorite: boolean) => void
}

interface AssetWithData extends Asset {
    dataUrl?: string
}

export function GalleryGrid({ assets, onDelete, onFavorite }: Props): JSX.Element {
    const [withData, setWithData] = useState<AssetWithData[]>([])
    const [selected, setSelected] = useState<AssetWithData | null>(null)
    const loadedRef = useRef<Set<string>>(new Set())

    useEffect(() => {
        // Load image data for new assets
        const load = async () => {
            const updates: AssetWithData[] = []
            for (const asset of assets) {
                if (loadedRef.current.has(asset.id)) continue
                try {
                    const result = await window.api?.invoke<{ data: string; mimeType: string }>(
                        IPC.ASSETS_READ_FILE,
                        { id: asset.id }
                    )
                    if (result.data) {
                        loadedRef.current.add(asset.id)
                        updates.push({
                            ...asset,
                            dataUrl: `data:${result.mimeType};base64,${result.data}`
                        })
                    }
                } catch { }
            }

            if (updates.length > 0) {
                setWithData((prev) => {
                    const updated = new Map(prev.map((a) => [a.id, a]))
                    for (const u of updates) updated.set(u.id, u)
                    return assets.map((a) => updated.get(a.id) ?? a)
                })
            } else {
                setWithData(assets)
            }
        }
        load()
    }, [assets])

    if (assets.length === 0) {
        return (
            <div
                style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    color: 'var(--text-muted)',
                }}
            >
                <div
                    style={{
                        width: 64,
                        height: 64,
                        borderRadius: 16,
                        background: 'var(--bg-elevated)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 28,
                    }}
                >
                    🎨
                </div>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>No images yet</p>
                    <p style={{ fontSize: 12 }}>Enter a prompt and click Generate to get started</p>
                </div>
            </div>
        )
    }

    return (
        <>
            <div
                style={{
                    padding: 12,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: 10,
                    overflowY: 'auto',
                    height: '100%',
                    alignContent: 'start',
                }}
            >
                {withData.map((asset) => (
                    <GalleryItem
                        key={asset.id}
                        asset={asset}
                        onClick={() => setSelected(asset)}
                        onDelete={onDelete}
                        onFavorite={onFavorite}
                        onContextMenu={async () => {
                            const action = await window.api?.invoke<string | null>(IPC.ASSETS_CONTEXT_MENU, { id: asset.id })
                            if (action === 'delete' && onDelete) onDelete(asset.id)
                            if (action === 'favorite' && onFavorite) onFavorite(asset.id, !asset.favorite)
                        }}
                    />
                ))}
            </div>

            {/* Lightbox */}
            {selected && (
                <Lightbox
                    asset={selected}
                    onClose={() => setSelected(null)}
                    onDelete={onDelete ? (id) => { onDelete(id); setSelected(null) } : undefined}
                    onFavorite={onFavorite}
                />
            )}
        </>
    )
}

function GalleryItem({
    asset,
    onClick,
    onDelete,
    onFavorite,
    onContextMenu
}: {
    asset: AssetWithData,
    onClick: () => void,
    onDelete?: (id: string) => void,
    onFavorite?: (id: string, favorite: boolean) => void,
    onContextMenu?: () => void
}): JSX.Element {
    const [hovered, setHovered] = useState(false)

    return (
        <div
            onClick={onClick}
            onContextMenu={(e) => {
                e.preventDefault()
                if (onContextMenu) onContextMenu()
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                position: 'relative',
                borderRadius: 10,
                overflow: 'hidden',
                cursor: 'pointer',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                aspectRatio: '1 / 1',
                transition: 'transform 0.15s, border-color 0.15s',
                transform: hovered ? 'scale(1.02)' : 'scale(1)',
                borderColor: hovered ? 'var(--border-accent)' : 'var(--border)',
            }}
        >
            {asset.dataUrl ? (
                <img
                    src={asset.dataUrl}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    draggable={false}
                />
            ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                </div>
            )}

            {/* Hover overlay */}
            {hovered && (
                <div
                    style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        padding: 8,
                        gap: 6,
                        pointerEvents: 'none'
                    }}
                >
                    <div style={{ pointerEvents: 'auto', display: 'flex', gap: 6 }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); window.api?.invoke(IPC.ASSETS_SAVE_AS, { id: asset.id }) }}
                            style={{
                                width: 28, height: 28, borderRadius: 7, border: 'none',
                                background: 'rgba(255,255,255,0.1)', color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                            }}
                            title="Save As"
                        >
                            <Download size={13} />
                        </button>
                        {onFavorite && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onFavorite(asset.id, !asset.favorite) }}
                                style={{
                                    width: 28, height: 28, borderRadius: 7, border: 'none',
                                    background: 'rgba(255,255,255,0.1)', color: asset.favorite ? '#f97316' : 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                }}
                                title={asset.favorite ? "Unfavorite" : "Favorite"}
                            >
                                <Heart size={13} fill={asset.favorite ? '#f97316' : 'none'} />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(asset.id) }}
                                style={{
                                    width: 28, height: 28, borderRadius: 7, border: 'none',
                                    background: 'rgba(239,68,68,0.3)', color: '#ef9090',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                }}
                                title="Delete"
                            >
                                <Trash2 size={13} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Favorite indicator */}
            {!!asset.favorite && (
                <div style={{ position: 'absolute', top: 6, right: 6 }}>
                    <Heart size={12} fill="#f97316" color="#f97316" />
                </div>
            )}
        </div>
    )
}

function Lightbox({
    asset,
    onClose,
    onDelete,
    onFavorite
}: {
    asset: AssetWithData,
    onClose: () => void,
    onDelete?: (id: string) => void,
    onFavorite?: (id: string, favorite: boolean) => void
}): JSX.Element {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (onDelete && confirm('Delete this image?')) onDelete(asset.id)
            } else if (e.key.toLowerCase() === 'f') {
                if (onFavorite) onFavorite(asset.id, !asset.favorite)
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault()
                window.api?.invoke(IPC.ASSETS_SAVE_AS, { id: asset.id })
            }
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [onClose, onDelete, onFavorite, asset.id, asset.favorite])

    const promptData = asset.metadata ? JSON.parse(asset.metadata)?.promptData : null

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 40,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    display: 'flex', gap: 20,
                    maxWidth: 1100, maxHeight: '90vh',
                    width: '100%',
                }}
            >
                {/* Image */}
                <div style={{ flex: 1, minWidth: 0, borderRadius: 16, overflow: 'hidden', background: 'var(--bg-02)' }}>
                    {asset.dataUrl && (
                        <img
                            src={asset.dataUrl}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                        />
                    )}
                </div>

                {/* Metadata Panel */}
                <div
                    style={{
                        width: 260, flexShrink: 0,
                        background: 'var(--bg-surface)',
                        borderRadius: 16, padding: 20,
                        border: '1px solid var(--border)',
                        display: 'flex', flexDirection: 'column', gap: 14,
                        overflowY: 'auto',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600 }}>Details</h3>
                        <button
                            onClick={onClose}
                            style={{ background: 'var(--bg-elevated)', border: 'none', color: 'var(--text-secondary)', borderRadius: 7, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {promptData?.subject && (
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prompt</p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.6, userSelect: 'text' }}>{promptData.subject}</p>
                        </div>
                    )}

                    {asset.width && asset.height && (
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resolution</p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{asset.width} × {asset.height}</p>
                        </div>
                    )}

                    {asset.file_size && (
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>File Size</p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{(asset.file_size / 1024).toFixed(1)} KB</p>
                        </div>
                    )}

                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{new Date(asset.created_at).toLocaleString()}</p>
                    </div>

                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => window.api?.invoke(IPC.ASSETS_SHOW_IN_FOLDER, { id: asset.id })}
                                style={{ flex: 1, justifyContent: 'center' }}
                            >
                                <FolderOpen size={13} />
                                Folder
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => window.api?.invoke(IPC.ASSETS_SAVE_AS, { id: asset.id })}
                                style={{ flex: 1, justifyContent: 'center' }}
                            >
                                <Download size={13} />
                                Save
                            </button>
                        </div>
                        {onFavorite && (
                            <button
                                className="btn btn-secondary"
                                onClick={() => onFavorite(asset.id, !asset.favorite)}
                                style={{ justifyContent: 'center', color: asset.favorite ? '#f97316' : undefined }}
                            >
                                <Heart size={13} fill={asset.favorite ? '#f97316' : 'none'} />
                                {asset.favorite ? 'Unfavorite' : 'Favorite'}
                            </button>
                        )}
                        {onDelete && (
                            <button
                                className="btn"
                                onClick={() => onDelete(asset.id)}
                                style={{ justifyContent: 'center', background: 'rgba(239,68,68,0.15)', color: '#ef9090', border: '1px solid rgba(239,68,68,0.3)' }}
                            >
                                <Trash2 size={13} />
                                Delete
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

