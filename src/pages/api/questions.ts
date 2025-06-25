import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/db/mongodb';
import { Question } from '@/lib/db/models/question';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      await connectDB();
      const { questions, pdfSource } = req.body;
      if (!Array.isArray(questions) || !pdfSource) {
        return res.status(400).json({ message: 'Invalid request body' });
      }
      const docs = questions.map((q) => ({
        pdfSource,
        questionText: q.questionText,
        expectedResult: q.expectedResult || '',
        difficulty: q.difficulty || 'medium',
        category: q.category || '',
      }));
      const inserted = await Question.insertMany(docs);
      res.status(201).json({ questions: inserted });
    } catch (error) {
      console.error('Error saving questions:', error);
      res.status(500).json({ message: 'Failed to save questions' });
    }
  } else if (req.method === 'GET') {
    try {
      await connectDB();
      const { pdfSource } = req.query;
      const filter = pdfSource ? { pdfSource } : {};
      const questions = await Question.find(filter).sort({ createdAt: 1 });
      res.status(200).json({ questions });
    } catch (error) {
      console.error('Error fetching questions:', error);
      res.status(500).json({ message: 'Failed to fetch questions' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
} 