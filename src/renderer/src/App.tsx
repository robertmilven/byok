import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { StatusBar } from './components/StatusBar'
import { GenerateScreen } from './screens/Generate/GenerateScreen'
import { DashboardScreen } from './screens/Dashboard/DashboardScreen'
import { QueueScreen } from './screens/Queue/QueueScreen'
import { CostsScreen } from './screens/Costs/CostsScreen'
import { SettingsScreen } from './screens/Settings/SettingsScreen'
import { LibraryScreen } from './screens/Library/LibraryScreen'
import { useQueueStore } from './stores/queueStore'
import { useEffect } from 'react'

function App(): JSX.Element {
    const addEvent = useQueueStore((s) => s.addEvent)

    // Listen for queue push events from main process (only in Electron context)
    useEffect(() => {
        if (!window.api) return
        window.api.on('queue:event', addEvent)
        return () => window.api?.off('queue:event', addEvent)
    }, [addEvent])

    return (
        <div className="app-shell">
            <Sidebar />
            <TopBar />
            <main style={{ gridArea: 'content', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Routes>
                    <Route path="/" element={<DashboardScreen />} />
                    <Route path="/generate" element={<GenerateScreen />} />
                    <Route path="/generate/:projectId" element={<GenerateScreen />} />
                    <Route path="/queue" element={<QueueScreen />} />
                    <Route path="/costs" element={<CostsScreen />} />
                    <Route path="/settings" element={<SettingsScreen />} />
                    <Route path="/library" element={<LibraryScreen />} />
                </Routes>
            </main>
            <StatusBar />
        </div>
    )
}

export default App

