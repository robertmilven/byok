import React, { useState, useEffect, useRef } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { IPC } from '../../../../shared/ipc-channels'
import { LibraryThumbnail } from './LibraryThumbnail'

export function LibraryScreen() {
    const [characters, setCharacters] = useState<any[]>([])
    const [showNew, setShowNew] = useState(false)
    const [newName, setNewName] = useState('')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const fetchCharacters = async () => {
        const res = await (window as any).api.invoke(IPC.LIBRARY_LIST, { type: 'character' })
        setCharacters(res as any[])
    }

    useEffect(() => {
        fetchCharacters()
    }, [])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0])
        }
    }

    const handleUpload = async () => {
        if (!newName.trim() || !selectedFile) return
        setUploading(true)
        try {
            // @ts-ignore - Electron File object has 'path'
            const filePath = selectedFile.path
            await (window as any).api.invoke(IPC.LIBRARY_ADD, {
                name: newName.trim(),
                type: 'character',
                filePath
            })
            setShowNew(false)
            setNewName('')
            setSelectedFile(null)
            fetchCharacters()
        } catch (e) {
            console.error('Failed to upload character', e)
            alert('Failed to add character library item.')
        } finally {
            setUploading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this character from the library?')) {
            await (window as any).api.invoke(IPC.LIBRARY_DELETE, { id })
            fetchCharacters()
        }
    }

    return (
        <div style={{ height: '100%', overflowY: 'auto', padding: 32 }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                    <div>
                        <h1 style={{ marginBottom: 4 }}>Character Library</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                            {characters.length} saved character{characters.length !== 1 ? 's' : ''} for persistent image references
                        </p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowNew(true)}>
                        <Plus size={14} />
                        Add Character
                    </button>
                </div>

                {/* Upload Inline */}
                {showNew && (
                    <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                            className="input"
                            placeholder="Character name (e.g. Cyberpunk Hero)"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            autoFocus
                            style={{ userSelect: 'text', flex: 1, minWidth: 200 }}
                        />
                        <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleFileSelect}
                        />
                        <button
                            className="btn btn-secondary"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {selectedFile ? selectedFile.name : 'Select Image...'}
                        </button>
                        <button className="btn btn-primary" onClick={handleUpload} disabled={uploading || !newName.trim() || !selectedFile}>
                            {uploading ? 'Adding...' : 'Add to Library'}
                        </button>
                        <button className="btn btn-ghost" onClick={() => { setShowNew(false); setNewName(''); setSelectedFile(null) }}>
                            Cancel
                        </button>
                    </div>
                )}

                {/* Character Grid */}
                {characters.length === 0 && !showNew ? (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
                        <h3 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>No characters yet</h3>
                        <p style={{ fontSize: 13, marginBottom: 20 }}>Upload a reference image of a character to use them consistently across prompts.</p>
                        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
                            <Plus size={14} /> Add Character
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                        {characters.map((c) => (
                            <CharacterCard
                                key={c.id}
                                character={c}
                                onDelete={() => handleDelete(c.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function CharacterCard({ character, onDelete }: { character: any; onDelete: () => void }) {
    const [hovered, setHovered] = useState(false)

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="card"
            style={{
                position: 'relative',
                transition: 'all 0.15s',
                border: `1px solid ${hovered ? 'var(--border-accent)' : 'var(--border)'}`,
                transform: hovered ? 'translateY(-2px)' : 'none',
                boxShadow: hovered ? '0 8px 24px rgba(124,58,237,0.15)' : 'none',
                padding: 12
            }}
        >
            {hovered && (
                <button
                    onClick={onDelete}
                    style={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        background: 'rgba(0,0,0,0.6)',
                        border: 'none',
                        color: '#ff4444',
                        padding: 6,
                        borderRadius: 4,
                        cursor: 'pointer',
                        zIndex: 10
                    }}
                >
                    <Trash2 size={16} />
                </button>
            )}

            {/* Thumbnail */}
            <div
                style={{
                    height: 200,
                    borderRadius: 8,
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    background: 'var(--bg-elevated)'
                }}
            >
                <LibraryThumbnail id={character.id} />
            </div>

            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>
                {character.name}
            </h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Used {character.usage_count} time{character.usage_count !== 1 ? 's' : ''}
            </p>
        </div>
    )
}
