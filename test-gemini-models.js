const fs = require('fs')

async function testGeneration() {
    try {
        const vaultPath = 'C:\\Users\\clawb\\AppData\\Roaming\\byok-ai-studio\\vault.json'
        const vaultData = JSON.parse(fs.readFileSync(vaultPath, 'utf8'))

        // Quick local app script to decrypt
        // Wait, safeStorage requires electron. 
    } catch (e) {
        console.error(e)
    }
}
testGeneration()
