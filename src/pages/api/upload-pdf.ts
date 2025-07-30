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
    let hasFile = false;

    bb.on('file', (fieldname: string, file: NodeJS.ReadableStream) => {
        hasFile = true;
        file.on('data', (data: Buffer) => {
            pdfBuffer.push(data);
        });
        
        file.on('error', (err) => {
            console.error('File processing error:', err);
            res.status(500).json({ error: 'File processing failed' });
        });
    });

    bb.on('finish', async () => {
        if (!hasFile) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const buffer = Buffer.concat(pdfBuffer);
        try {
          console.log('Parsing PDF...');
          const data = await pdfParse(buffer);
          const rawText = data.text;
          console.log('PDF parsed successfully, text length:', rawText.length);

          // Split rawText into questions using improved logic
          const parsedQuestions = parseQuestionsForDB(rawText);
          console.log('Questions parsed:', parsedQuestions.length);

          if (parsedQuestions.length === 0) {
            return res.status(400).json({ error: 'No questions found in PDF' });
          }

          console.log('Connecting to database...');
          await connectDB();
          console.log('Database connected successfully');

          // Each question: call GeminiProvider for answer & explanation then store in DB (parallelized)
          console.log('Generating AI answers for', parsedQuestions.length, 'questions...');
          
          // Process questions sequentially to avoid overwhelming the API
          const results = [];
          let successCount = 0;
          let failureCount = 0;
          
          for (let index = 0; index < parsedQuestions.length; index++) {
            const { questionText } = parsedQuestions[index];
            console.log(`Processing question ${index + 1}/${parsedQuestions.length}`);
            
            // Add a small delay between questions to help with rate limiting
            if (index > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
            }
            
            try {
              const answerPrompt = `You are an expert Oracle SQL tutor with many years also in the SQL Developer role.
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
              console.log(`Question ${index + 1} processed and stored successfully`);
              results.push({
                _id: doc._id,
                questionText,
                aiAnswer,
                explanation,
              });
              successCount++;
            } catch (err) {
              console.error(`Failed to process question ${index + 1}:`, err);
              failureCount++;
              
              // If we have too many failures, stop processing
              if (failureCount > Math.ceil(parsedQuestions.length / 2)) {
                console.error('Too many failures, stopping processing');
                break;
              }
              
              // Add a placeholder for failed questions
              results.push({
                _id: `failed_${index}`,
                questionText,
                aiAnswer: '/* Failed to generate answer due to API limits */',
                explanation: 'Failed to generate explanation due to API rate limits. Please try again later.',
              });
            }
          }

          console.log(`Processing complete. Success: ${successCount}, Failures: ${failureCount}`);
          
          if (successCount === 0) {
            // If all questions failed due to API limits, store them without AI answers
            console.log('All API calls failed. Storing questions without AI answers for manual practice.');
            const fallbackResults = parsedQuestions.map(({ questionText }, index) => ({
              _id: `manual_${index}`,
              questionText,
              aiAnswer: '/* Manual practice mode - no AI answer available */',
              explanation: 'This question is in manual practice mode. You can practice writing SQL queries, but AI-generated answers are not available due to API rate limits.',
            }));
            
            // Store questions in database without AI answers
            for (const { questionText } of parsedQuestions) {
              await Question.create({
                pdfSource: 'uploaded_manual',
                questionText,
                aiAnswer: '/* Manual practice mode */',
                explanation: 'Manual practice mode - AI answers not available due to rate limits.',
              });
            }
            
            return res.status(200).json({ 
              questions: fallbackResults,
              message: 'Questions stored in manual practice mode due to API rate limits. You can practice writing SQL, but AI answers are not available.'
            });
          }
          
          // Return the stored questions
          res.status(200).json({ 
            questions: results,
            message: `Successfully processed ${successCount} questions${failureCount > 0 ? ` (${failureCount} failed due to API limits)` : ''}`
          });
        } catch (err) {
          console.error('PDF upload/parse error:', err);
          res.status(500).json({ error: 'Failed to parse PDF or store questions' });
        }
      });

    bb.on('error', (err) => {
        console.error('Busboy error:', err);
        res.status(500).json({ error: 'File upload failed' });
    });

    req.pipe(bb);
}