import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { type, questionText, userSql } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ message: 'API key not found' });

  if (!type) return res.status(400).json({ message: 'Missing type in request body' });

  if (type === 'hint') {
    const shortSql = userSql ? userSql.slice(0, 200) : '';
    const prompt = `You are an SQL tutor. Give a concise, helpful hint for this SQL question :\n"${questionText}"` +
      (shortSql ? `\nUser's attempt (truncated): ${shortSql}` : '');
    try {
      const geminiRes = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              thinkingConfig: {
                thinkingBudget: 0
              }
            }
          }),
        }
      );
      const data = await geminiRes.json();
      console.log('Gemini API response:', data);
      if (!geminiRes.ok) {
        return res.status(500).json({ message: data.error?.message || 'Gemini API error' });
      }
      const hint = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No hint available.';
      res.status(200).json({ hint });
    } catch {
      res.status(500).json({ message: 'Failed to get hint from Gemini.' });
    }
  } else if (type === 'chat') {
    // Placeholder for chat logic
    res.status(200).json({ message: 'Chat feature coming soon.' });
  } else {
    res.status(400).json({ message: 'Unknown type in request body' });
  }
}