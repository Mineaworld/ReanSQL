import type { NextApiRequest, NextApiResponse } from 'next';
import { GeminiProvider } from '../../lib/ai/providers/gemini';

const geminiProvider = new GeminiProvider();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { type, questionText, userSql } = req.body;
  if (!type) return res.status(400).json({ message: 'Missing type in request body' });

  if (type === 'hint') {
    const shortSql = userSql ? userSql.slice(0, 200) : '';
    const prompt = `You are an SQL tutor. Give a concise, helpful hint for this SQL question :\n"${questionText}"` +
      (shortSql ? `\nUser's attempt (truncated): ${shortSql}` : '');
    try {
      const hint = await geminiProvider.generateAnswer(prompt);
      res.status(200).json({ hint });
    } catch (err) {
      console.error('GeminiProvider error:', err);
      res.status(500).json({ message: 'Failed to get hint from Gemini.' });

    }
  } else if (type === 'chat') {
    res.status(200).json({ message: 'Chat feature coming soon.' });
  } else {
    res.status(400).json({ message: 'Unknown type in request body' });
  }
}