import React from 'react'
import { useState, useEffect } from 'react'
import { Sparkles, ChevronDown } from 'lucide-react'
import type { PromptData, ProviderInfo } from '../../../../shared/types'
import {
    SHOT_TYPES,
    LIGHTING_OPTIONS,
    MOOD_OPTIONS,
    CAMERA_GEAR,
    FOCAL_LENGTHS,
    FILM_STOCKS,
    ASPECT_RATIOS
} from '../../../../shared/prompt-options'
import { IPC } from '../../../../shared/ipc-channels'

interface Props {
    onGenerate: (data: {
        promptData: PromptData
        provider: string
        model: string
        count: number
    }) => void
    loading?: boolean
}

const COUNT_OPTIONS = [1, 2, 4]

export function PromptBuilder({ onGenerate, loading }: Props): JSX.Element {
    const [promptData, setPromptData] = useState<PromptData>({
        subject: '',
        aspectRatio: '1:1',
    })
    const [providers, setProviders] = useState<ProviderInfo[]>([])
    const [selectedProvider, setSelectedProvider] = useState('openai')
    const [selectedModel, setSelectedModel] = useState('dall-e-3')
    const [count, setCount] = useState(1)
    const [estimate, setEstimate] = useState(0)

    useEffect(() => {
        const fetchProviders = async () => {
            try {
                const list = await window.api.invoke<ProviderInfo[]>(IPC.PROVIDERS_LIST)
                setProviders(list)
                if (list.length > 0) {
                    setSelectedProvider(list[0].slug)
                    if (list[0].models.length > 0) setSelectedModel(list[0].models[0].id)
                }
            } catch { }
        }
        fetchProviders()
    }, [])

    useEffect(() => {
        const fetchEstimate = async () => {
            try {
                const result = await window.api.invoke<{ estimate: number }>(IPC.GENERATION_ESTIMATE, {
                    provider: selectedProvider,
                    model: selectedModel,
                    count,
                    parameters: { aspectRatio: promptData.aspectRatio }
                })
                setEstimate(result.estimate)
            } catch {
                setEstimate(0)
            }
        }
        fetchEstimate()
    }, [selectedProvider, selectedModel, count, promptData.aspectRatio])

    const update = (field: keyof PromptData, value: string) => {
        setPromptData((p) => ({ ...p, [field]: value || undefined }))
    }

    const currentProvider = providers.find((p) => p.slug === selectedProvider)
    const models = currentProvider?.models ?? []

    const handleGenerate = () => {
        if (!promptData.subject.trim()) return
        onGenerate({ promptData, provider: selectedProvider, model: selectedModel, count })
    }

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                height: '100%',
                overflowY: 'auto',
                padding: '16px 14px',
            }}
        >
            {/* Subject */}
            <div className="form-field">
                <label className="label">Subject / Description</label>
                <textarea
                    className="textarea"
                    rows={4}
                    placeholder="A portrait of a weathered fisherman in golden hour light..."
                    value={promptData.subject}
                    onChange={(e) => update('subject', e.target.value)}
                    style={{ userSelect: 'text' }}
                />
            </div>

            {/* Shot Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-field">
                    <label className="label">Shot Type</label>
                    <select className="select" value={promptData.shotType ?? ''} onChange={(e) => update('shotType', e.target.value)}>
                        <option value="">-- Any --</option>
                        {SHOT_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                </div>
                <div className="form-field">
                    <label className="label">Lighting</label>
                    <select className="select" value={promptData.lighting ?? ''} onChange={(e) => update('lighting', e.target.value)}>
                        <option value="">-- Any --</option>
                        {LIGHTING_OPTIONS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                </div>
                <div className="form-field">
                    <label className="label">Mood</label>
                    <select className="select" value={promptData.mood ?? ''} onChange={(e) => update('mood', e.target.value)}>
                        <option value="">-- Any --</option>
                        {MOOD_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                </div>
                <div className="form-field">
                    <label className="label">Camera Gear</label>
                    <select className="select" value={promptData.cameraGear ?? ''} onChange={(e) => update('cameraGear', e.target.value)}>
                        <option value="">-- Any --</option>
                        {CAMERA_GEAR.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                </div>
                <div className="form-field">
                    <label className="label">Focal Length</label>
                    <select className="select" value={promptData.focalLength ?? ''} onChange={(e) => update('focalLength', e.target.value)}>
                        <option value="">-- Any --</option>
                        {FOCAL_LENGTHS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                </div>
                <div className="form-field">
                    <label className="label">Film Stock</label>
                    <select className="select" value={promptData.filmStock ?? ''} onChange={(e) => update('filmStock', e.target.value)}>
                        <option value="">-- Any --</option>
                        {FILM_STOCKS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Aspect Ratio */}
            <div className="form-field">
                <label className="label">Aspect Ratio</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {ASPECT_RATIOS.map((ar) => (
                        <button
                            key={ar.value}
                            onClick={() => update('aspectRatio', ar.value)}
                            style={{
                                padding: '4px 10px',
                                borderRadius: 6,
                                border: `1px solid ${promptData.aspectRatio === ar.value ? 'var(--accent)' : 'var(--border)'}`,
                                background: promptData.aspectRatio === ar.value ? 'var(--accent-dim)' : 'var(--bg-02)',
                                color: promptData.aspectRatio === ar.value ? 'var(--accent-light)' : 'var(--text-secondary)',
                                fontSize: 11,
                                cursor: 'pointer',
                                fontWeight: promptData.aspectRatio === ar.value ? 600 : 400,
                                transition: 'all 0.12s',
                            }}
                        >
                            {ar.value}
                        </button>
                    ))}
                </div>
            </div>

            {/* Negative Prompt */}
            <div className="form-field">
                <label className="label">Negative Prompt</label>
                <textarea
                    className="textarea"
                    rows={2}
                    placeholder="blurry, low quality, watermark..."
                    value={promptData.negativePrompt ?? ''}
                    onChange={(e) => update('negativePrompt', e.target.value)}
                    style={{ userSelect: 'text' }}
                />
            </div>

            <div className="divider" />

            {/* Provider + Model */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
                        {providers.length === 0 && <option disabled>No providers</option>}
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

            {/* Cost estimate + Count + Generate */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    background: 'var(--bg-02)',
                    borderRadius: 10,
                    padding: 12,
                    border: '1px solid var(--border)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Estimated cost</span>
                    <span style={{ color: 'var(--accent-light)', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>
                        ${estimate.toFixed(4)}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12, marginRight: 4 }}>Count:</span>
                    {COUNT_OPTIONS.map((n) => (
                        <button
                            key={n}
                            onClick={() => setCount(n)}
                            style={{
                                width: 36,
                                height: 30,
                                borderRadius: 7,
                                border: `1px solid ${count === n ? 'var(--accent)' : 'var(--border)'}`,
                                background: count === n ? 'var(--accent-dim)' : 'var(--bg-03)',
                                color: count === n ? 'var(--accent-light)' : 'var(--text-secondary)',
                                fontWeight: count === n ? 600 : 400,
                                fontSize: 13,
                                cursor: 'pointer',
                                transition: 'all 0.12s',
                            }}
                        >
                            {n}
                        </button>
                    ))}

                    <button
                        className="btn btn-primary btn-lg"
                        onClick={handleGenerate}
                        disabled={loading || !promptData.subject.trim()}
                        style={{
                            flex: 1,
                            justifyContent: 'center',
                            opacity: loading || !promptData.subject.trim() ? 0.5 : 1,
                            cursor: loading || !promptData.subject.trim() ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loading ? (
                            <>
                                <div style={{ width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles size={14} />
                                Generate
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

