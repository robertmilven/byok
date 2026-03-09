import React, { useState, useEffect } from 'react'
import { Sparkles, Image as ImageIcon } from 'lucide-react'
import type { PromptData, ProviderInfo } from '../../../../shared/types'
import { IPC } from '../../../../shared/ipc-channels'

interface Props {
    onGenerate: (data: {
        promptData: PromptData
        provider: string
        model: string
        count: number
    }) => void
    loading?: boolean
    referenceAsset?: { id: string; dataUrl: string } | null
    onClearReference?: () => void
}

const ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4']

export function VideoBuilder({ onGenerate, loading, referenceAsset, onClearReference }: Props) {
    const [promptData, setPromptData] = useState<PromptData>({
        subject: '',
        aspectRatio: '16:9',
    })

    // Video Specific Settings
    const [duration, setDuration] = useState('5s')

    const [providers, setProviders] = useState<ProviderInfo[]>([])
    const [selectedProvider, setSelectedProvider] = useState('')
    const [selectedModel, setSelectedModel] = useState('')
    const [estimate, setEstimate] = useState(0)

    useEffect(() => {
        const fetchProviders = async () => {
            try {
                const list: ProviderInfo[] = await (window as any).api.invoke(IPC.PROVIDERS_LIST)

                // Filter models to ONLY include video capable models
                const videoProviders = list.map(p => ({
                    ...p,
                    models: p.models.filter(() => p.capabilities.includes('text-to-video') || p.capabilities.includes('image-to-video'))
                })).filter(p => p.models.length > 0)

                setProviders(videoProviders)
                if (videoProviders.length > 0) {
                    setSelectedProvider(videoProviders[0].slug)
                    if (videoProviders[0].models.length > 0) {
                        setSelectedModel(videoProviders[0].models[0].id)
                    }
                }
            } catch { }
        }
        fetchProviders()
    }, [])

    useEffect(() => {
        const fetchEstimate = async () => {
            if (!selectedProvider || !selectedModel) return
            try {
                const result = await (window as any).api.invoke(IPC.GENERATION_ESTIMATE, {
                    provider: selectedProvider,
                    model: selectedModel,
                    count: 1, // Video UI usually only generates 1 video at a time
                    parameters: {
                        aspectRatio: promptData.aspectRatio,
                        duration // Pass duration for accurate pricing
                    }
                })
                setEstimate(result.estimate)
            } catch {
                setEstimate(0)
            }
        }
        fetchEstimate()
    }, [selectedProvider, selectedModel, promptData.aspectRatio, duration])

    useEffect(() => {
        if (referenceAsset) {
            setPromptData(p => ({ ...p, assetReferenceId: referenceAsset.id }))
        } else {
            setPromptData(p => ({ ...p, assetReferenceId: undefined }))
        }
    }, [referenceAsset])

    const update = (field: keyof PromptData, value: string) => {
        setPromptData((p) => ({ ...p, [field]: value || undefined }))
    }

    const currentProvider = providers.find((p) => p.slug === selectedProvider)
    const models = currentProvider?.models ?? []

    const handleGenerate = () => {
        if (!promptData.subject?.trim() && !referenceAsset) return

        // Pass duration as additional details for now since it's unstructured
        const finalPromptData = {
            ...promptData,
            additionalDetails: duration
        }

        onGenerate({ promptData: finalPromptData, provider: selectedProvider, model: selectedModel, count: 1 })
    }

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                height: '100%',
                overflowY: 'auto',
                padding: '20px',
                background: 'var(--bg-01)'
            }}
        >
            {/* Main Prompt */}
            <div className="form-field">
                <label className="label">Motion Description</label>
                <textarea
                    className="textarea"
                    rows={4}
                    placeholder="Describe the motion and scene (e.g., 'A slow cinematic pan across a neon city street as rain falls')"
                    value={promptData.subject}
                    onChange={(e) => update('subject', e.target.value)}
                    style={{ userSelect: 'text' }}
                />
            </div>

            {/* Reference Image Drag and Drop */}
            <div className="form-field">
                <label className="label">Start Frame Image (Optional)</label>
                <div
                    style={{
                        padding: referenceAsset ? 10 : 24,
                        border: '2px dashed var(--border)',
                        borderRadius: 12,
                        background: 'var(--bg-02)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                    }}
                >
                    {referenceAsset ? (
                        <div style={{ display: 'flex', gap: 14, alignItems: 'center', width: '100%' }}>
                            <div style={{ position: 'relative', width: 96, height: 96, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
                                <img src={referenceAsset.dataUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <div style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: 4, fontSize: 10, color: 'white' }}>
                                    Start Frame
                                </div>
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <h4 style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--text-primary)' }}>Using Reference Image</h4>
                                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 12px' }}>This image will be used as the first frame of the generated video.</p>
                                <button onClick={onClearReference} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>
                                    Remove Reference
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                            <ImageIcon size={24} />
                            <p style={{ margin: 0, fontSize: 13 }}>Click an image in the gallery to use it as a starting frame.</p>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Aspect Ratio */}
                <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                    <label className="label">Aspect Ratio</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {ASPECT_RATIOS.map((ar) => (
                            <button
                                key={ar}
                                onClick={() => update('aspectRatio', ar)}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: 6,
                                    border: `1px solid ${promptData.aspectRatio === ar ? 'var(--accent)' : 'var(--border)'}`,
                                    background: promptData.aspectRatio === ar ? 'var(--accent-dim)' : 'var(--bg-02)',
                                    color: promptData.aspectRatio === ar ? 'var(--accent-light)' : 'var(--text-secondary)',
                                    fontSize: 12,
                                    cursor: 'pointer',
                                    fontWeight: promptData.aspectRatio === ar ? 600 : 400,
                                    transition: 'all 0.12s',
                                }}
                            >
                                {ar}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Duration */}
                <div className="form-field">
                    <label className="label">Duration</label>
                    <select className="select" value={duration} onChange={(e) => setDuration(e.target.value)}>
                        <option value="5s">5 Seconds (Standard)</option>
                        <option value="10s">10 Seconds (Extended)</option>
                    </select>
                </div>
            </div>

            <div className="divider" style={{ margin: '8px 0' }} />

            {/* Provider + Model */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-field">
                    <label className="label">Provider</label>
                    <select
                        className="select"
                        value={selectedProvider}
                        onChange={(e) => {
                            setSelectedProvider(e.target.value)
                            const p = providers.find((pr) => pr.slug === e.target.value)
                            if (p && p.models.length > 0) setSelectedModel(p.models[0].id)
                        }}
                    >
                        {providers.map((p) => (
                            <option key={p.slug} value={p.slug}>
                                {p.displayName}{!p.hasKey ? ' (no key)' : ''}
                            </option>
                        ))}
                        {providers.length === 0 && <option value="" disabled>No video providers found</option>}
                    </select>
                </div>
                <div className="form-field">
                    <label className="label">Model</label>
                    <select className="select" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
                        {models.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Generate Action */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    background: 'var(--bg-02)',
                    borderRadius: 12,
                    padding: 16,
                    border: '1px solid var(--border)',
                    marginTop: 'auto'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Estimated cost</span>
                    <span style={{ color: 'var(--accent-light)', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', fontSize: 14 }}>
                        ${estimate.toFixed(4)}
                    </span>
                </div>

                <button
                    className="btn btn-primary btn-lg"
                    onClick={handleGenerate}
                    disabled={loading || (!promptData.subject?.trim() && !referenceAsset)}
                    style={{
                        width: '100%',
                        justifyContent: 'center',
                        opacity: loading || (!promptData.subject?.trim() && !referenceAsset) ? 0.5 : 1,
                        cursor: loading || (!promptData.subject?.trim() && !referenceAsset) ? 'not-allowed' : 'pointer',
                        height: 44,
                        fontSize: 14
                    }}
                >
                    {loading ? (
                        <>
                            <div style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                            Rendering Video...
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            Generate Video
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
