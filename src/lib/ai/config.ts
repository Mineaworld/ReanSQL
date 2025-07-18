// Get Gemini API keys from env, split by comma, trim whitespace
export const geminiApiKeys = process.env.GEMINI_API_KEYS ?
    process.env.GEMINI_API_KEYS.split(',').
    map(g => g.trim()).filter(Boolean) : [];

if (geminiApiKeys.length === 0) {
  throw new Error(
    'No AI API keys found! Please set GEMINI_API_KEYS in your .env.local file.'
  );
} 