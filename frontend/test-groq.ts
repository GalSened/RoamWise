import { groqProvider } from './src/core/ai/providers/GroqProvider';

async function testGroq() {
    console.log('Testing Groq API...');
    console.log('API Key present:', !!import.meta.env.VITE_GROQ_API_KEY);

    const response = await groqProvider.generateCompletion('Say hello to RoamWise developers in one sentence.');
    console.log('Response:', response);
}

testGroq();
