import { geminiApiKeys } from '../config';
import type { AIProvider } from './base';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export class GeminiProvider implements AIProvider {
  private apiKeys: string[];

  constructor(apiKeys: string[] = geminiApiKeys) {
    this.apiKeys = apiKeys;
  }

  async generateAnswer(prompt: string): Promise<string> {
    const payload = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    };

    let lastError: unknown = null;

    for (const key of this.apiKeys) {
      try {
        console.log('Attempting Gemini API call with key:', key.substring(0, 10) + '...');
        
        const res = await fetch(`${GEMINI_API_URL}?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        // Check for quota/rate limit errors (Gemini returns 429 or 403 for quota)
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`Gemini API error (${res.status}):`, errorText);
          
          if (res.status === 429 || res.status === 403) {
            lastError = errorText;
            continue;
          }
          throw new Error(`Gemini API error: ${res.status} ${errorText}`);
        }

        const data = await res.json();
        console.log('Gemini API response structure:', Object.keys(data));
        
        // Extract the answer from the response
        const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!answer) {
          console.error('Unexpected Gemini API response structure:', JSON.stringify(data, null, 2));
          throw new Error('No answer returned from Gemini API');
        }
        
        console.log('Successfully generated answer from Gemini API');
        return answer;
      } catch (err) {
        console.error('Gemini API call failed:', err);
        lastError = err;
        continue;
      }
    }
    throw new Error(`All Gemini API keys failed. Last error: ${lastError}`);
  }
} 