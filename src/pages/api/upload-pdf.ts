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

// Post-process to extract only the summary and bullet/numbered points
function extractSummaryAndBullets(text: string): string {
  const lines = text.split('\n');
  let summary = '';
  const bulletLines = [];
  let foundFirstList = false;
  const isBulletOrNumbered = (line: string) => line.trim().startsWith('-') || /^\d+\./.test(line.trim());
  for (const line of lines) {
    if (!summary && line.trim() && !isBulletOrNumbered(line)) {
      summary = line.trim();
    }
    if (isBulletOrNumbered(line)) {
      foundFirstList = true;
      bulletLines.push(line.trim().replace(/^\d+\./, '-'));
    } else if (foundFirstList && line.trim() === '') {
      bulletLines.push('');
    } else if (foundFirstList && !isBulletOrNumbered(line)) {
      break;
    }
  }
  // Fallback: If no bullet points found, split the rest into sentences as bullets
  if (bulletLines.length === 0 && text) {
    const rest = text.replace(summary, '').trim();
    const sentences = rest.split(/(?<=[.?!])\s+/).filter(Boolean);
    for (const sentence of sentences) {
      if (sentence.trim()) bulletLines.push('- ' + sentence.trim());
    }
  }
  return [summary, ...bulletLines].filter(Boolean).join('\n');
}
async function getAgenticBulletPointExplanation(prompt: string, aiProvider: typeof geminiProvider) {
  // Step 1: Get Gemini's initial explanation
  const initialExplanation = await aiProvider.generateAnswer(prompt);

  // Step 2: Reformat with a follow-up prompt
  const reformatPrompt = `Reformat the following explanation into ONLY a summary sentence and a Markdown bullet list. Do NOT include any paragraphs, preambles, or extra text.\n\nSample Output:\nThis query retrieves all employees in department 10.\n\n- \`SELECT *\`: Selects all columns from the employees table.\n- \`FROM employees\`: Specifies the table to query.\n- \`WHERE department_id = 10\`: Filters results to only those in department 10.\n\nExplanation to reformat:\n${initialExplanation}`;

  let bulletExplanation = await aiProvider.generateAnswer(reformatPrompt);
  let explanation = extractSummaryAndBullets(bulletExplanation);

  // Step 3: If still not a bullet list, try a final correction prompt
  if (!explanation.includes('- ')) {
    const finalCorrectionPrompt = `You did not follow the instructions. Please output ONLY a summary sentence and a Markdown bullet list, nothing else.`;
    bulletExplanation = await aiProvider.generateAnswer(finalCorrectionPrompt + '\n\n' + bulletExplanation);
    explanation = extractSummaryAndBullets(bulletExplanation);
  }
  return explanation;
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
            // First, get the answer
            const aiAnswerRaw = await geminiProvider.generateAnswer(answerPrompt);
            // Remove SQL comments from AI answer
            function stripSqlComments(sql: string) {
              // Remove multi-line comments
              const noBlock = sql.replace(/\/\*[\s\S]*?\*\//g, '');
              // Remove single-line comments
              const noLine = noBlock.replace(/--.*$/gm, '');
              return noLine.trim();
            }
            const aiAnswer = stripSqlComments(aiAnswerRaw);
            const explanationPrompt = `You are an Oracle SQL tutor.\n\nONLY output a summary sentence and a Markdown bullet list. Do NOT include any paragraphs, preambles, or extra text.\n\nFormat: Markdown bullet list only. No paragraphs, no preamble, no extra sentences.\n\nSample Output:\nThis query retrieves all employees in department 10.\n\n- \`SELECT *\`: Selects all columns from the employees table.\n- \`FROM employees\`: Specifies the table to query.\n- \`WHERE department_id = 10\`: Filters results to only those in department 10.\n\nSQL Query:\n${aiAnswer}`;
            const explanation = await getAgenticBulletPointExplanation(explanationPrompt, geminiProvider);
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