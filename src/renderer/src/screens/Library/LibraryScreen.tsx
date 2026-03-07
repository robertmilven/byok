import React from 'react'
export function LibraryScreen(): JSX.Element {
    return (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48 }}>📚</div>
            <h2 style={{ color: 'var(--text-secondary)' }}>Character Library</h2>
            <p style={{ fontSize: 13 }}>Save faces, outfits, and styles as references. Coming in v1.1.</p>
        </div>
    )
}

