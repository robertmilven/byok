import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Wand2, Library, BarChart2, Clock, Settings, Film } from 'lucide-react'

const NAV_ITEMS = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Wand2, label: 'Generate', path: '/generate' },
    { icon: Film, label: 'Video Studio', path: '/video' },
    { icon: Library, label: 'Library', path: '/library' },
    { icon: BarChart2, label: 'Costs', path: '/costs' },
    { icon: Clock, label: 'Queue', path: '/queue' },
    { icon: Settings, label: 'Settings', path: '/settings' },
]

export function Sidebar(): JSX.Element {
    const navigate = useNavigate()
    const location = useLocation()

    return (
        <aside
            style={{
                gridArea: 'sidebar',
                width: 'var(--sidebar-w)',
                background: 'var(--bg-01)',
                borderRight: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: 'calc(var(--topbar-h) + 16px)',
                paddingBottom: '16px',
                gap: 4,
                '-webkit-app-region': 'no-drag'
            }}
        >
            {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
                const isActive = path === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(path)

                return (
                    <button
                        key={path}
                        onClick={() => navigate(path)}
                        title={label}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isActive ? 'var(--accent-dim)' : 'transparent',
                            color: isActive ? 'var(--accent-light)' : 'var(--text-muted)',
                            border: isActive ? '1px solid var(--border-accent)' : '1px solid transparent',
                            transition: 'all 0.15s',
                            cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                            if (!isActive) {
                                const el = e.currentTarget
                                el.style.background = 'var(--bg-elevated)'
                                el.style.color = 'var(--text-primary)'
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isActive) {
                                const el = e.currentTarget
                                el.style.background = 'transparent'
                                el.style.color = 'var(--text-muted)'
                            }
                        }}
                    >
                        <Icon size={18} strokeWidth={1.5} />
                    </button>
                )
            })}
        </aside>
    )
}

