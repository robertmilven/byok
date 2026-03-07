import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { IpcChannel } from '../shared/ipc-channels'

// Custom APIs exposed to renderer
const api = {
    invoke: <T = unknown>(channel: IpcChannel, payload?: unknown): Promise<T> => {
        return ipcRenderer.invoke(channel, payload)
    },
    on: (channel: string, listener: (...args: unknown[]) => void) => {
        ipcRenderer.on(channel, (_event, ...args) => listener(...args))
    },
    off: (channel: string, listener: (...args: unknown[]) => void) => {
        ipcRenderer.removeListener(channel, listener as Parameters<typeof ipcRenderer.removeListener>[1])
    },
    once: (channel: string, listener: (...args: unknown[]) => void) => {
        ipcRenderer.once(channel, (_event, ...args) => listener(...args))
    }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electron', electronAPI)
        contextBridge.exposeInMainWorld('api', api)
    } catch (error) {
        console.error(error)
    }
} else {
    // @ts-ignore (define in dts)
    window.electron = electronAPI
    // @ts-ignore (define in dts)
    window.api = api
}
