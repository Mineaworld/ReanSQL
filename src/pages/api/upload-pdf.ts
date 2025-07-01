import type { NextApiRequest, NextApiResponse } from 'next';
import pdfParse from 'pdf-parse';
import Busboy from 'busboy';
import connectDB from '@/lib/db/mongodb';
import { Question } from '@/lib/db/models/question';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export const config = {
    api: {
        bodyParser: false,
    },
};

// Helper to call Gemini for answer or explanation
type GeminiType = 'answer' | 'explanation';
async function getGeminiContent(questionText: string, type: GeminiType): Promise<string> {
  if (!GEMINI_API_KEY) return '';
  let prompt = '';
  if (type === 'answer') {
    prompt = `You are an expert Oracle SQL tutor. Write the correct Oracle SQL query for this question below.\nQuestion: ${questionText}`;
  } else {
    prompt = `You are an expert Oracle SQL tutor. Explain the correct answer for this question in a English simple words, concise, beginner-friendly way.\nQuestion: ${questionText}`;
  }

  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEMINI_API_KEY,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export default async function handler(req:NextApiRequest, res:NextApiResponse) {
    if(req.method !== 'POST') {
        return res.status(405).json({message: 'Method not allowed'});
    }
    // Parse incoming pdf file
    const bb = Busboy({headers: req.headers});
    const pdfBuffer: Buffer[] = [];

    bb.on('file', (fieldname: string, file: NodeJS.ReadableStream) => {
        file.on('data', (data: Buffer) => {
            pdfBuffer.push(data);
        });
    });

    bb.on('finish', async () => {
        const buffer = Buffer.concat(pdfBuffer);
        try {
          const data = await pdfParse(buffer);
          const rawText = data.text;

          // 1. Split rawText into questions
          const questions = rawText
            .split(/\n\s*\n/) // split by empty lines
            .map(q => q.trim())
            .filter(q => q.length > 0);

          await connectDB();

          // 3. Each question call Gemini for answer & explanation then store in DB
          const results = [];
          for (const questionText of questions) {
            const aiAnswer = await getGeminiContent(questionText, 'answer');
            const explanation = await getGeminiContent(questionText, 'explanation');
            // Store in MongoDB
            const doc = await Question.create({
              pdfSource: 'uploaded',
              questionText,
              aiAnswer,
              explanation,
            });
            results.push({
              _id: doc._id,
              questionText,
              aiAnswer,
              explanation,
            });
          }

          // Return the stored questions
          res.status(200).json({ questions: results });
        } catch (err) {
          console.error('PDF upload/parse error:', err);
          res.status(500).json({ error: 'Failed to parse PDF or store questions' });
        }
      });
    req.pipe(bb);
}