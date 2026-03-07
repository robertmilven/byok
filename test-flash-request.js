const fs = require('fs');
const fetch = require('node-fetch');

async function main() {
    const vaultPath = 'C:\\Users\\clawb\\AppData\\Roaming\\byok-ai-studio\\vault.json';
    const vault = JSON.parse(fs.readFileSync(vaultPath, 'utf8'));
    const apiKey = vault.gemini;
    const model = 'gemini-3.1-flash-image-preview';
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
    const body = {
        contents: [{ role: 'user', parts: [{ text: 'A cute cat sitting on a windowsill' }] }]
    };
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
            const part = data.candidates[0].content.parts[0];
            if (part.inlineData && part.inlineData.bytesBase64) {
                const buffer = Buffer.from(part.inlineData.bytesBase64, 'base64');
                fs.writeFileSync('flash_image.png', buffer);
                console.log('Saved image to flash_image.png');
            }
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

main();
