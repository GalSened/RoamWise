/// <reference types="vite/client" />
import Groq from 'groq-sdk';

const apiKey = import.meta.env.VITE_GROQ_API_KEY;

let groq: Groq | null = null;

if (apiKey) {
    groq = new Groq({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true // Allowed since this is a client-side app
    });
} else {
    console.warn('VITE_GROQ_API_KEY is missing. AI features will be limited.');
}

export class GroqProvider {
    async generateCompletion(prompt: string): Promise<string> {
        if (!groq) {
            return "AI generation unavailable (Missing API Key)";
        }

        try {
            const completion = await groq.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'llama-3.3-70b-versatile',
            });

            return completion.choices[0]?.message?.content || "No response generated";
        } catch (error) {
            console.error("Groq API Error:", error);
            return "Error generating response";
        }
    }
}

export const groqProvider = new GroqProvider();
