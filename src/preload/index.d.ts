import { ElectronAPI } from '@electron-toolkit/preload'
import type { IpcChannel } from '../shared/ipc-channels'

interface StudioAPI {
    invoke: <T = unknown>(channel: IpcChannel, payload?: unknown) => Promise<T>
    on: (channel: string, listener: (...args: unknown[]) => void) => void
    off: (channel: string, listener: (...args: unknown[]) => void) => void
    once: (channel: string, listener: (...args: unknown[]) => void) => void
}

declare global {
    interface Window {
        electron: ElectronAPI
        api?: StudioAPI
    }
}
