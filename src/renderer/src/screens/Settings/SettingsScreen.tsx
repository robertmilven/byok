import React from 'react'
import { useState, useEffect } from 'react'
import { Check, X, Eye, EyeOff } from 'lucide-react'
import { IPC } from '../../../../shared/ipc-channels'
import type { ProviderInfo } from '../../../../shared/types'

export function SettingsScreen(): JSX.Element {
    const [activeTab, setActiveTab] = useState<'keys' | 'providers' | 'appearance'>('keys')
    const [providers, setProviders] = useState<ProviderInfo[]>([])
    const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
    const [showKey, setShowKey] = useState<Record<string, boolean>>({})
    const [testResults, setTestResults] = useState<Record<string, { ok: boolean; error?: string } | null>>({})
    const [testing, setTesting] = useState<Record<string, boolean>>({})
    const [saving, setSaving] = useState<Record<string, boolean>>({})

    useEffect(() => {
        const load = async () => {
            const list = await window.api.invoke<ProviderInfo[]>(IPC.PROVIDERS_LIST)
            setProviders(list)
        }
        load()
    }, [])

    const saveKey = async (slug: string) => {
        const key = apiKeys[slug]
        if (!key?.trim()) return
        setSaving((p) => ({ ...p, [slug]: true }))
        await window.api.invoke(IPC.VAULT_SET, { provider: slug, key: key.trim() })
        setApiKeys((p) => ({ ...p, [slug]: '' }))
        setSaving((p) => ({ ...p, [slug]: false }))
        const list = await window.api.invoke<ProviderInfo[]>(IPC.PROVIDERS_LIST)
        setProviders(list)
    }

    const removeKey = async (slug: string) => {
        await window.api.invoke(IPC.VAULT_DELETE, { provider: slug })
        const list = await window.api.invoke<ProviderInfo[]>(IPC.PROVIDERS_LIST)
        setProviders(list)
        setTestResults((p) => ({ ...p, [slug]: null }))
    }

    const testKey = async (slug: string) => {
        setTesting((p) => ({ ...p, [slug]: true }))
        const result = await window.api.invoke<{ ok: boolean; error?: string }>(IPC.PROVIDERS_TEST, { slug })
        setTestResults((p) => ({ ...p, [slug]: result }))
        setTesting((p) => ({ ...p, [slug]: false }))
    }

    const TABS = [
        { id: 'keys', label: 'API Keys' },
        { id: 'providers', label: 'Providers' },
        { id: 'appearance', label: 'Appearance' },
    ]

    return (
        <div style={{ height: '100%', overflowY: 'auto', padding: 32 }}>
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
                <h1 style={{ marginBottom: 24 }}>Settings</h1>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id as typeof activeTab)}
                            style={{
                                padding: '8px 16px',
                                background: 'transparent',
                                color: activeTab === t.id ? 'var(--accent-light)' : 'var(--text-muted)',
                                border: 'none',
                                borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                                cursor: 'pointer',
                                fontWeight: activeTab === t.id ? 600 : 400,
                                fontSize: 13,
                                transition: 'all 0.12s',
                                marginBottom: -1,
                            }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* API Keys Tab */}
                {activeTab === 'keys' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {providers.map((provider) => (
                            <div key={provider.slug} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <h3 style={{ fontSize: 14, fontWeight: 600 }}>{provider.displayName}</h3>
                                        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                                            {provider.models.length} model{provider.models.length !== 1 ? 's' : ''} available
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {provider.hasKey && testResults[provider.slug] && (
                                            <span className={`badge ${testResults[provider.slug]?.ok ? 'badge-green' : 'badge-red'}`}>
                                                {testResults[provider.slug]?.ok ? '✓ Connected' : '✗ Failed'}
                                            </span>
                                        )}
                                        {provider.hasKey && (
                                            <span className="badge badge-purple">Key saved</span>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 8 }}>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <input
                                            className="input"
                                            type={showKey[provider.slug] ? 'text' : 'password'}
                                            placeholder={provider.hasKey ? '••••••••••••••••••••••••' : `Enter ${provider.displayName} API key...`}
                                            value={apiKeys[provider.slug] ?? ''}
                                            onChange={(e) => setApiKeys((p) => ({ ...p, [provider.slug]: e.target.value }))}
                                            onKeyDown={(e) => e.key === 'Enter' && saveKey(provider.slug)}
                                            style={{ paddingRight: 38, userSelect: 'text' }}
                                        />
                                        <button
                                            onClick={() => setShowKey((p) => ({ ...p, [provider.slug]: !p[provider.slug] }))}
                                            style={{
                                                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                                background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'
                                            }}
                                        >
                                            {showKey[provider.slug] ? <EyeOff size={13} /> : <Eye size={13} />}
                                        </button>
                                    </div>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => saveKey(provider.slug)}
                                        disabled={saving[provider.slug] || !apiKeys[provider.slug]?.trim()}
                                    >
                                        {saving[provider.slug] ? '...' : 'Save'}
                                    </button>
                                    {provider.hasKey && (
                                        <>
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => testKey(provider.slug)}
                                                disabled={testing[provider.slug]}
                                            >
                                                {testing[provider.slug] ? '...' : 'Test'}
                                            </button>
                                            <button
                                                className="btn btn-sm"
                                                onClick={() => removeKey(provider.slug)}
                                                style={{ background: 'rgba(239,68,68,0.15)', color: '#ef9090', border: '1px solid rgba(239,68,68,0.3)' }}
                                            >
                                                <X size={12} />
                                            </button>
                                        </>
                                    )}
                                </div>

                                {testResults[provider.slug] && !testResults[provider.slug]?.ok && (
                                    <p style={{ color: 'var(--red)', fontSize: 12 }}>
                                        Error: {testResults[provider.slug]?.error}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'providers' && (
                    <div className="card" style={{ color: 'var(--text-secondary)' }}>
                        <p>Provider configuration coming in v1.1</p>
                    </div>
                )}

                {activeTab === 'appearance' && (
                    <div className="card" style={{ color: 'var(--text-secondary)' }}>
                        <p>Theme and appearance options coming in v1.1</p>
                    </div>
                )}
            </div>
        </div>
    )
}

