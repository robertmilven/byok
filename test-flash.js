const fs = require('fs');
const { GeminiAdapter } = require('./src/main/providers/gemini');

async function main() {
    const vaultPath = 'C:\\Users\\clawb\\AppData\\Roaming\\byok-ai-studio\\vault.json';
    const vault = JSON.parse(fs.readFileSync(vaultPath, 'utf8'));
    const apiKey = vault.gemini;
    const adapter = new GeminiAdapter();
    await adapter.initialize(apiKey);
    try {
        const result = await adapter.generate({
            prompt: 'A cute cat sitting on a windowsill',
            model: 'gemini-3.1-flash-image-preview',
            count: 1,
            parameters: { aspectRatio: '1:1' }
        });
        console.log('Generated outputs:', result.outputs.length);
        // Save first image to file
        if (result.outputs.length > 0) {
            fs.writeFileSync('flash_output.png', result.outputs[0].buffer);
            console.log('Saved image to flash_output.png');
        }
    } catch (e) {
        console.error('Error during generation:', e);
    }
}

main();
