import type { NextApiRequest, NextApiResponse } from 'next';
import pdfParse from 'pdf-parse';
import Busboy from 'busboy';
import connectDB from '@/lib/db/mongodb';
import { Question } from '@/lib/db/models/question';
import { GeminiProvider } from '../../lib/ai/providers/gemini';

export const config = {
    api: {
        bodyParser: false,
    },
};

// Instantiate the GeminiProvider (uses all available keys with failover)
const geminiProvider = new GeminiProvider();

// Helper to split PDF text into questions (copied from previous frontend logic)
function parseQuestionsForDB(text: string) {
  const questionRegex = /^([0-9]+[.)])\s*(.*)/;
  const lines = text.split(/\r?\n/);
  const questions: { questionText: string }[] = [];
  let current: { questionText: string } | null = null;
  for (const line of lines) {
    const match = line.match(questionRegex);
    if (match) {
      if (current) questions.push(current);
      // Start a new question, use the whole line as the question text
      current = { questionText: line.trim() };
    } else if (current && line.trim()) {
      // Append wrapped lines and notes to the current question text
      current.questionText += ' ' + line.trim();
    }
  }
  if (current) questions.push(current);
  return questions;
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

          // Split rawText into questions using improved logic
          const parsedQuestions = parseQuestionsForDB(rawText);

          await connectDB();

          // Each question: call GeminiProvider for answer & explanation then store in DB (parallelized)
          const results = await Promise.all(parsedQuestions.map(async ({ questionText }) => {

            const answerPrompt = `You are an expert Oracle SQL tutor with 10 years also in the SQL Developer role.
             Write the correct Oracle SQL\nquery for this question below.\nQuestion: ${questionText}`;
            const explanationPrompt = `You are an expert Oracle SQL tutor.
             Explain the correct answer for this question\nin simple English words, concise, 
             beginner-friendly way. But not too long or difficult to get.\nQuestion: ${questionText}`;
            // Use GeminiProvider for both answer and explanation
            const [aiAnswerRaw, explanation] = await Promise.all([
              geminiProvider.generateAnswer(answerPrompt),
              geminiProvider.generateAnswer(explanationPrompt),
            ]);
            // Remove SQL comments from AI answer
            function stripSqlComments(sql: string) {
              // Remove multi-line comments
              const noBlock = sql.replace(/\/\*[\s\S]*?\*\//g, '');
              // Remove single-line comments
              const noLine = noBlock.replace(/--.*$/gm, '');
              return noLine.trim();
            }
            const aiAnswer = stripSqlComments(aiAnswerRaw);
            // Store in MongoDB
            const doc = await Question.create({
              pdfSource: 'uploaded',
              questionText,
              aiAnswer,
              explanation,
            });
            return {
              _id: doc._id,
              questionText,
              aiAnswer,
              explanation,
            };
          }));

          // Return the stored questions
          res.status(200).json({ questions: results });
        } catch (err) {
          console.error('PDF upload/parse error:', err);
          res.status(500).json({ error: 'Failed to parse PDF or store questions' });
        }
      });
    req.pipe(bb);
}