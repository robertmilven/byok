import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './styles/globals.css'

class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { error: Error | null }
> {
    constructor(props: { children: React.ReactNode }) {
        super(props)
        this.state = { error: null }
    }
    static getDerivedStateFromError(error: Error) {
        return { error }
    }
    render() {
        if (this.state.error) {
            return (
                <div style={{
                    padding: 40, color: '#ff6b6b', fontFamily: 'monospace',
                    background: '#0a0a15', minHeight: '100vh', whiteSpace: 'pre-wrap', wordBreak: 'break-word'
                }}>
                    <h2 style={{ color: '#ff9090', marginBottom: 16 }}>🔴 Render Error</h2>
                    <strong>{this.state.error.message}</strong>
                    <pre style={{ marginTop: 16, fontSize: 11, color: '#ff9090aa' }}>{this.state.error.stack}</pre>
                </div>
            )
        }
        return this.props.children
    }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <ErrorBoundary>
            <HashRouter>
                <App />
            </HashRouter>
        </ErrorBoundary>
    </React.StrictMode>
)

