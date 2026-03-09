import React, { useState, useEffect } from 'react'
import { IPC } from '../../../../shared/ipc-channels'

export function LibraryThumbnail({ id }: { id: string }) {
    const [src, setSrc] = useState<string | null>(null)

    useEffect(() => {
        let mounted = true
            ; (window as any).api.invoke(IPC.LIBRARY_READ_FILE, { id }).then((res: any) => {
                if (mounted && res.data) {
                    setSrc(`data:${res.mimeType};base64,${res.data}`)
                }
            })
        return () => { mounted = false }
    }, [id])

    if (!src) {
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                ...
            </div>
        )
    }

    return (
        <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Library Item" />
    )
}
