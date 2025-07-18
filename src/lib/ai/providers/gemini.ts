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
      ]
    };

    let lastError: unknown = null;

    for (const key of this.apiKeys) {
      try {
        const res = await fetch(`${GEMINI_API_URL}?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        // Check for quota/rate limit errors (Gemini returns 429 or 403 for quota)
        if (!res.ok) {
          if (res.status === 429 || res.status === 403) {
            lastError = await res.text();
            continue;
          }
          throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
        }

        const data = await res.json();
        // Extract the answer from the response
        const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!answer) {
          throw new Error('No answer returned from Gemini API');
        }
        return answer;
      } catch (err) {
        lastError = err;
        continue;
      }
    }
    throw new Error(`All Gemini API keys failed. Last error: ${lastError}`);
  }
} 