import React from 'react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderOpen, Archive } from 'lucide-react'
import { useProjectStore } from '../../stores/projectStore'
import type { Project } from '../../../../shared/types'

export function DashboardScreen(): JSX.Element {
    const { projects, fetchProjects, createProject, setActiveProject, archiveProject } = useProjectStore()
    const navigate = useNavigate()
    const [showNew, setShowNew] = useState(false)
    const [newName, setNewName] = useState('')
    const [creating, setCreating] = useState(false)

    useEffect(() => { fetchProjects() }, [fetchProjects])

    const handleCreate = async () => {
        if (!newName.trim()) return
        setCreating(true)
        const p = await createProject(newName.trim())
        setActiveProject(p)
        navigate('/generate')
    }

    const openProject = (p: Project) => {
        setActiveProject(p)
        navigate('/generate')
    }

    return (
        <div style={{ height: '100%', overflowY: 'auto', padding: 32 }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                    <div>
                        <h1 style={{ marginBottom: 4 }}>Projects</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                            {projects.length} active project{projects.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowNew(true)}>
                        <Plus size={14} />
                        New Project
                    </button>
                </div>

                {/* New Project Inline */}
                {showNew && (
                    <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
                        <input
                            className="input"
                            placeholder="Project name..."
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            autoFocus
                            style={{ userSelect: 'text' }}
                        />
                        <button className="btn btn-primary" onClick={handleCreate} disabled={creating || !newName.trim()}>
                            {creating ? 'Creating...' : 'Create'}
                        </button>
                        <button className="btn btn-ghost" onClick={() => { setShowNew(false); setNewName('') }}>
                            Cancel
                        </button>
                    </div>
                )}

                {/* Project Grid */}
                {projects.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
                        <h3 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>No projects yet</h3>
                        <p style={{ fontSize: 13, marginBottom: 20 }}>Create your first project to start generating images</p>
                        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
                            <Plus size={14} /> Create Project
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                        {projects.map((p) => (
                            <ProjectCard
                                key={p.id}
                                project={p}
                                onOpen={() => openProject(p)}
                                onArchive={() => archiveProject(p.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function ProjectCard({ project, onOpen, onArchive }: { project: Project; onOpen: () => void; onArchive: () => void }): JSX.Element {
    const [hovered, setHovered] = useState(false)

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="card"
            style={{
                cursor: 'pointer',
                transition: 'all 0.15s',
                border: `1px solid ${hovered ? 'var(--border-accent)' : 'var(--border)'}`,
                transform: hovered ? 'translateY(-2px)' : 'none',
                boxShadow: hovered ? '0 8px 24px rgba(124,58,237,0.15)' : 'none',
            }}
            onClick={onOpen}
        >
            {/* Cover */}
            <div
                style={{
                    height: 120,
                    borderRadius: 8,
                    background: project.cover_image
                        ? `url(${project.cover_image}) center/cover`
                        : 'linear-gradient(135deg, var(--bg-elevated), var(--bg-hover))',
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                }}
            >
                {!project.cover_image && (
                    <FolderOpen size={32} color="var(--text-muted)" strokeWidth={1} />
                )}
            </div>

            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>
                {project.name}
            </h3>
            {project.description && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {project.description}
                </p>
            )}
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {new Date(project.created_at).toLocaleDateString()}
            </p>
        </div>
    )
}

