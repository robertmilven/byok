import { app } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import { logger } from '../utils/logger'

interface VaultData {
    [provider: string]: string // encrypted base64
}

export class KeyVault {
    private static instance: KeyVault
    private vaultPath: string
    private safeStorage: Electron.SafeStorage

    private constructor() {
        const userDataPath = app.getPath('userData')
        this.vaultPath = join(userDataPath, 'vault.json')
        this.safeStorage = require('electron').safeStorage
    }

    static getInstance(): KeyVault {
        if (!KeyVault.instance) {
            KeyVault.instance = new KeyVault()
        }
        return KeyVault.instance
    }

    private readVault(): VaultData {
        try {
            if (!fs.existsSync(this.vaultPath)) return {}
            const raw = fs.readFileSync(this.vaultPath, 'utf-8')
            return JSON.parse(raw)
        } catch {
            return {}
        }
    }

    private writeVault(data: VaultData): void {
        fs.writeFileSync(this.vaultPath, JSON.stringify(data, null, 2), 'utf-8')
    }

    setKey(provider: string, key: string): void {
        if (!this.safeStorage.isEncryptionAvailable()) {
            throw new Error('Encryption not available on this system')
        }
        const encrypted = this.safeStorage.encryptString(key)
        const vault = this.readVault()
        vault[provider] = encrypted.toString('base64')
        this.writeVault(vault)
        logger.info(`Key stored for provider: ${provider}`)
    }

    getKey(provider: string): string | null {
        if (!this.safeStorage.isEncryptionAvailable()) return null
        const vault = this.readVault()
        const encrypted = vault[provider]
        if (!encrypted) return null
        try {
            const buffer = Buffer.from(encrypted, 'base64')
            return this.safeStorage.decryptString(buffer)
        } catch (e) {
            logger.error(`Failed to decrypt key for provider: ${provider}`, e)
            return null
        }
    }

    deleteKey(provider: string): void {
        const vault = this.readVault()
        delete vault[provider]
        this.writeVault(vault)
        logger.info(`Key deleted for provider: ${provider}`)
    }

    listProviders(): string[] {
        const vault = this.readVault()
        return Object.keys(vault)
    }

    hasKey(provider: string): boolean {
        const vault = this.readVault()
        return provider in vault
    }
}
