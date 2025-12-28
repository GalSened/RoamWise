import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';

async function testGroq() {
    console.log('Testing Groq API...');

    // Manually read .env since we are running in Node
    const envPath = path.resolve(process.cwd(), 'frontend', '.env');
    let apiKey = '';

    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        const match = content.match(/VITE_GROQ_API_KEY=(.*)/);
        if (match) {
            apiKey = match[1].trim();
        }
    }

    if (!apiKey) {
        console.error('API Key not found in frontend/.env');
        return;
    }

    console.log('API Key found (starts with):', apiKey.substring(0, 5) + '...');

    const groq = new Groq({
        apiKey: apiKey
    });

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: 'Say hello to RoamWise developers in one sentence.' }],
            model: 'llama-3.3-70b-versatile',
        });

        console.log('Response:', completion.choices[0]?.message?.content);
    } catch (error) {
        console.error("Groq API Error:", error);
    }
}

testGroq();
