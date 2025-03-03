import axios from 'axios';
import { llmConfig } from '../config/llm';

export class LLMService {
    private apiUrl: string;
    private apiKey: string;

    constructor() {
        this.apiUrl = llmConfig.apiUrl;
        this.apiKey = llmConfig.apiKey;
    }

    public async sendPrompt(prompt: string): Promise<string> {
        try {
            const response = await axios.post(this.apiUrl, {
                prompt: prompt,
                max_tokens: 150, // Adjust as necessary
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
            });

            return response.data.choices[0].text.trim();
        } catch (error) {
            console.error('Error sending prompt to LLM:', error);
            throw new Error('Failed to get response from LLM');
        }
    }
}