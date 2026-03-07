import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase } from './db/connection'
import { runMigrations } from './db/migrate'
import { registerAllIpcHandlers } from './ipc'
import { ProviderRegistry } from './providers/registry'
import { OpenAIAdapter } from './providers/openai'
import { GeminiAdapter } from './providers/gemini'
import { FalAdapter } from './providers/fal'
import { WavespeedAdapter } from './providers/wavespeed'
import { ReplicateAdapter } from './providers/replicate'
import { initLogger } from './utils/logger'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        show: true,           // show immediately — don't wait for ready-to-show
        autoHideMenuBar: true,
        backgroundColor: '#080810',
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false,
            nodeIntegration: false,
            contextIsolation: true
        }
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    // Log any renderer crashes
    mainWindow.webContents.on('render-process-gone', (_event, details) => {
        console.error('Renderer process gone:', details)
    })

    mainWindow.webContents.on('did-fail-load', (_event, code, desc, url) => {
        console.error(`Failed to load: ${url} — ${code} ${desc}`)
    })

    // HMR for renderer in dev mode
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        console.log('Loading renderer from:', process.env['ELECTRON_RENDERER_URL'])
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
}

import { safeStorage } from 'electron'
import * as fs from 'fs'

// App startup
app.whenReady().then(async () => {
    try {
        const vaultPath = 'C:\\Users\\clawb\\AppData\\Roaming\\byok-ai-studio\\vault.json'
        if (fs.existsSync(vaultPath)) {
            const vaultData = JSON.parse(fs.readFileSync(vaultPath, 'utf8'))
            if (vaultData.gemini) {
                const key = safeStorage.decryptString(Buffer.from(vaultData.gemini, 'base64'))

                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${key}`
                const body = {
                    contents: [{ role: 'user', parts: [{ text: 'A drawing of a mechanical banana' }] }]
                }
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                })
                const data = await res.json()
                fs.writeFileSync('C:\\Users\\clawb\\.gemini\\antigravity\\scratch\\byok-ai-studio\\test-flash-response.json', JSON.stringify(data, null, 2))
            }
        }
    } catch (e) {
        console.error('Diagnostic error: ' + e)
    }

    // Set app user model id for windows
    electronApp.setAppUserModelId('com.byok.aistudio')

    // Default open or close DevTools by F12 in development
    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    // Initialize logger first
    initLogger()

    // Initialize database and run migrations
    initDatabase()
    runMigrations()

    // Initialize provider registry
    const registry = ProviderRegistry.getInstance()
    registry.register(new OpenAIAdapter())
    registry.register(new GeminiAdapter())
    registry.register(new FalAdapter())
    registry.register(new WavespeedAdapter())
    registry.register(new ReplicateAdapter())

    // Create window FIRST so mainWindow is not null
    createWindow()

    // Register all IPC handlers after window is created
    registerAllIpcHandlers(mainWindow, registry)

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

export function getMainWindow(): BrowserWindow | null {
    return mainWindow
}
