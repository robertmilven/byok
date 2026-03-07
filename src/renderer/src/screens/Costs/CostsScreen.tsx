import React from 'react'
import { useState, useEffect } from 'react'
import { IPC } from '../../../../shared/ipc-channels'
import type { CostSummary } from '../../../../shared/types'

export function CostsScreen(): JSX.Element {
    const [summary, setSummary] = useState<CostSummary | null>(null)

    useEffect(() => {
        const load = async () => {
            try {
                const s = await window.api.invoke<CostSummary>(IPC.COSTS_SUMMARY, {})
                setSummary(s)
            } catch { }
        }
        load()
    }, [])

    const exportCsv = async () => {
        const csv = await window.api.invoke<string>(IPC.COSTS_EXPORT_CSV, {})
        const blob = new Blob([csv], { type: 'text/csv' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = 'byok-studio-costs.csv'
        a.click()
    }

    return (
        <div style={{ height: '100%', overflowY: 'auto', padding: 32 }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                    <h1>Cost Dashboard</h1>
                    <button className="btn btn-secondary" onClick={exportCsv}>Export CSV</button>
                </div>

                {summary && (
                    <>
                        {/* Total */}
                        <div className="card" style={{ marginBottom: 20, textAlign: 'center', padding: 32 }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>Total Spend (All Time)</p>
                            <p style={{ fontSize: 40, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-light)' }}>
                                ${summary.total.toFixed(2)}
                            </p>
                            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
                                {summary.entries.length} generations
                            </p>
                        </div>

                        {/* By Provider */}
                        {Object.keys(summary.byProvider).length > 0 && (
                            <div className="card" style={{ marginBottom: 16 }}>
                                <h3 style={{ marginBottom: 14, fontSize: 13 }}>By Provider</h3>
                                {Object.entries(summary.byProvider).map(([provider, cost]) => (
                                    <div key={provider} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                                        <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{provider}</span>
                                        <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-light)' }}>${cost.toFixed(4)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* By Model */}
                        {Object.keys(summary.byModel).length > 0 && (
                            <div className="card">
                                <h3 style={{ marginBottom: 14, fontSize: 13 }}>By Model</h3>
                                {Object.entries(summary.byModel).map(([model, cost]) => (
                                    <div key={model} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>{model}</span>
                                        <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-light)' }}>${cost.toFixed(4)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {summary.entries.length === 0 && (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                                <p>No cost entries yet. Generate some images to see your spend.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

