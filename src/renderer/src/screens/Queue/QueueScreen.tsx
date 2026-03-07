import React from 'react'
import { useState, useEffect } from 'react'
import { IPC } from '../../../../shared/ipc-channels'
import type { Job } from '../../../../shared/types'
import { useProjectStore } from '../../stores/projectStore'

const STATUS_COLORS: Record<string, string> = {
    queued: 'badge-blue',
    running: 'badge-yellow',
    completed: 'badge-green',
    failed: 'badge-red',
    cancelled: 'badge-purple',
}

export function QueueScreen(): JSX.Element {
    const { activeProject } = useProjectStore()
    const [jobs, setJobs] = useState<Job[]>([])

    const fetchJobs = async () => {
        try {
            const list = await window.api.invoke<Job[]>(IPC.QUEUE_LIST, {
                projectId: activeProject?.id
            })
            setJobs(list)
        } catch { }
    }

    useEffect(() => {
        fetchJobs()
        const interval = setInterval(fetchJobs, 3000)
        return () => clearInterval(interval)
    }, [activeProject?.id])

    const retry = async (jobId: string) => {
        await window.api.invoke(IPC.QUEUE_RETRY, { jobId })
        fetchJobs()
    }

    const cancel = async (jobId: string) => {
        await window.api.invoke(IPC.QUEUE_CANCEL, { jobId })
        fetchJobs()
    }

    return (
        <div style={{ height: '100%', overflowY: 'auto', padding: 32 }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
                <h1 style={{ marginBottom: 24 }}>Render Queue</h1>

                {jobs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                        <p style={{ fontSize: 14 }}>No jobs in queue</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {jobs.map((job) => {
                            const promptData = (() => { try { return JSON.parse(job.prompt_data) } catch { return {} } })()
                            return (
                                <div key={job.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                                    <span className={`badge ${STATUS_COLORS[job.status] ?? 'badge-purple'}`}>
                                        {job.status}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {promptData.subject ?? 'Untitled'}
                                        </p>
                                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                            {job.provider} / {job.model} · {new Date(job.created_at).toLocaleTimeString()}
                                        </p>
                                    </div>
                                    {job.cost_usd != null && (
                                        <span style={{ color: 'var(--accent-light)', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>
                                            ${job.cost_usd.toFixed(4)}
                                        </span>
                                    )}
                                    {job.duration_ms && (
                                        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                                            {(job.duration_ms / 1000).toFixed(1)}s
                                        </span>
                                    )}
                                    {job.status === 'failed' && (
                                        <button className="btn btn-secondary btn-sm" onClick={() => retry(job.id)}>
                                            Retry
                                        </button>
                                    )}
                                    {(job.status === 'queued') && (
                                        <button
                                            className="btn btn-sm"
                                            onClick={() => cancel(job.id)}
                                            style={{ background: 'rgba(239,68,68,0.15)', color: '#ef9090', border: '1px solid rgba(239,68,68,0.3)' }}
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

