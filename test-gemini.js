const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');

app.whenReady().then(async () => {
    try {
        const vaultPath = 'C:\\Users\\clawb\\AppData\\Roaming\\byok-ai-studio\\vault.json';
        if (!fs.existsSync(vaultPath)) {
            console.log("No vault.json found at " + vaultPath);
            app.quit();
            return;
        }
        const data = JSON.parse(fs.readFileSync(vaultPath, 'utf8'));
        const geminiEncrypted = data['gemini'];
        if (!geminiEncrypted) {
            console.log("No gemini key in vault");
            app.quit();
            return;
        }

        const key = safeStorage.decryptString(Buffer.from(geminiEncrypted, 'base64'));

        console.log("Fetching models...");
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const modelsData = await res.json();

        const myModel = modelsData.models?.find((m) => m.name.includes('imagen-3.0-generate-001'));
        console.log("MODEL INFO:", JSON.stringify(myModel, null, 2));

    } catch (e) {
        console.error("Error:", e);
    }
    app.quit();
});
