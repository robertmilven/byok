import React from 'react'
import { useQueueStore } from '../stores/queueStore'
import { useState, useEffect } from 'react'
import { IPC } from '../../../shared/ipc-channels'

export function StatusBar(): JSX.Element {
    const { pending, running } = useQueueStore()
    const [todayCost, setTodayCost] = useState(0)
    const [version] = useState('0.1.0')

    useEffect(() => {
        const fetchCost = async () => {
            try {
                const summary = await window.api.invoke<{ total: number }>(IPC.COSTS_SUMMARY, {})
                setTodayCost(summary.total ?? 0)
            } catch { }
        }
        fetchCost()
        const interval = setInterval(fetchCost, 30000)
        return () => clearInterval(interval)
    }, [])

    return (
        <footer
            style={{
                gridArea: 'statusbar',
                height: 'var(--statusbar-h)',
                background: 'var(--bg-01)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 'calc(var(--sidebar-w) + 12px)',
                paddingRight: 16,
                gap: 20,
                fontSize: 11,
                color: 'var(--text-muted)',
            }}
        >
            {(running > 0 || pending > 0) ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-light)' }}>
                    <div
                        style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: 'var(--accent)',
                            animation: 'pulse-glow 1.5s ease-in-out infinite'
                        }}
                    />
                    {running > 0 && <span>Generating: {running}</span>}
                    {pending > 0 && <span>· Queued: {pending}</span>}
                </div>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                    <span>Idle</span>
                </div>
            )}

            <div style={{ flex: 1 }} />

            <span>Spent today: <strong style={{ color: 'var(--text-secondary)' }}>${todayCost.toFixed(2)}</strong></span>
            <span style={{ color: 'var(--border)' }}>|</span>
            <span>v{version}</span>
        </footer>
    )
}

