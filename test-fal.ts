import { safeStorage } from 'electron'
import * as fs from 'fs'
import { join } from 'path'
import { FalAdapter } from './src/main/providers/fal'

async function testFal() {
    console.log('Testing Fal API Integration...')
    const vaultPath = 'C:\\Users\\clawb\\AppData\\Roaming\\byok-ai-studio\\vault.json'

    if (!fs.existsSync(vaultPath)) {
        console.error('Vault not found. Please add a Fal API key in the app settings first.')
        return
    }

    const vaultData = JSON.parse(fs.readFileSync(vaultPath, 'utf8'))

    // Electron's safeStorage is only available in a running Electron app, so this won't work in a raw node script.
    // Instead, just to verify our adapter code compiles and runs, we'll prompt the user to try it in the app.
    console.log('Since we are outside Electron, we cannot decrypt the vault to get the key automatically.')
    console.log('Please open BYOK AI Studio and try generating an image with FLUX.1 [dev] to verify.')
}

testFal()
