import React from 'react'
import { useState, useEffect } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { useProjectStore } from '../stores/projectStore'
import type { Project } from '../../../shared/types'

export function TopBar(): JSX.Element {
    const { projects, activeProject, setActiveProject, createProject, fetchProjects } = useProjectStore()
    const [showDropdown, setShowDropdown] = useState(false)
    const [showNewProject, setShowNewProject] = useState(false)
    const [newName, setNewName] = useState('')
    const [creating, setCreating] = useState(false)

    useEffect(() => { fetchProjects() }, [fetchProjects])

    const handleCreate = async () => {
        if (!newName.trim()) return
        setCreating(true)
        await createProject(newName.trim())
        setNewName('')
        setShowNewProject(false)
        setCreating(false)
    }

    return (
        <header
            style={{
                gridArea: 'topbar',
                height: 'var(--topbar-h)',
                background: 'var(--bg-01)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 16,
                paddingRight: 16,
                gap: 12,
                '-webkit-app-region': 'drag',
                position: 'relative',
            }}
        >
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <div
                    style={{
                        width: 26,
                        height: 26,
                        borderRadius: 7,
                        background: 'linear-gradient(135deg, var(--accent), #a855f7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 800,
                        color: 'white',
                    }}
                >
                    B
                </div>
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
                    BYOK AI
                </span>
            </div>

            <div style={{ height: 20, width: 1, background: 'var(--border)' }} />

            {/* Project Selector */}
            <div
                style={{ position: 'relative', '-webkit-app-region': 'no-drag' }}
                onMouseLeave={() => setShowDropdown(false)}
            >
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '5px 10px',
                        borderRadius: 8,
                        background: showDropdown ? 'var(--bg-elevated)' : 'transparent',
                        color: 'var(--text-primary)',
                        border: '1px solid transparent',
                        fontWeight: 500,
                        fontSize: 13,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-elevated)'
                        e.currentTarget.style.border = '1px solid var(--border)'
                    }}
                    onMouseLeave={(e) => {
                        if (!showDropdown) {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.border = '1px solid transparent'
                        }
                    }}
                >
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Project:</span>
                    <span>{activeProject?.name ?? 'No Project'}</span>
                    <ChevronDown size={12} color="var(--text-muted)" />
                </button>

                {showDropdown && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            minWidth: 220,
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            borderRadius: 10,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                            zIndex: 1000,
                            marginTop: 4,
                            overflow: 'hidden',
                        }}
                    >
                        {projects.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => { setActiveProject(p); setShowDropdown(false) }}
                                style={{
                                    width: '100%',
                                    padding: '9px 12px',
                                    textAlign: 'left',
                                    background: activeProject?.id === p.id ? 'var(--accent-dim)' : 'transparent',
                                    color: activeProject?.id === p.id ? 'var(--accent-light)' : 'var(--text-primary)',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                    fontWeight: activeProject?.id === p.id ? 500 : 400,
                                    transition: 'background 0.1s',
                                }}
                                onMouseEnter={(e) => { if (activeProject?.id !== p.id) e.currentTarget.style.background = 'var(--bg-hover)' }}
                                onMouseLeave={(e) => { if (activeProject?.id !== p.id) e.currentTarget.style.background = 'transparent' }}
                            >
                                {p.name}
                            </button>
                        ))}

                        <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

                        {showNewProject ? (
                            <div style={{ padding: '8px 12px', display: 'flex', gap: 6 }}>
                                <input
                                    className="input"
                                    placeholder="Project name"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                    autoFocus
                                    style={{ fontSize: 12 }}
                                />
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={handleCreate}
                                    disabled={creating || !newName.trim()}
                                >
                                    {creating ? '...' : 'OK'}
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowNewProject(true)}
                                style={{
                                    width: '100%',
                                    padding: '9px 12px',
                                    textAlign: 'left',
                                    background: 'transparent',
                                    color: 'var(--accent-light)',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <Plus size={13} /> New Project
                            </button>
                        )}
                    </div>
                )}
            </div>
        </header>
    )
}

