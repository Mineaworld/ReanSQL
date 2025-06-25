import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/db/mongodb';
// Placeholder: import { Submission } from '@/lib/db/models/submission';
import mongoose from 'mongoose';

// Temporary Submission schema/model if not present
const submissionSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  submittedCode: {
    type: String,
    required: true,
  },
  isCorrect: {
    type: Boolean,
    default: false,
  },
  attemptCount: {
    type: Number,
    default: 1,
  },
  errorDetails: {
    type: String,
    default: '',
  },
  executionTime: {
    type: Number,
    default: 0,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});
const Submission = mongoose.models.Submission || mongoose.model('Submission', submissionSchema);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  try {
    await connectDB();
    const { questionId, submittedCode } = req.body;
    if (!questionId || !submittedCode) {
      return res.status(400).json({ message: 'Missing questionId or submittedCode' });
    }
    const submission = await Submission.create({
      questionId,
      submittedCode,
      // You can add more fields here (userId, etc.)
    });
    res.status(201).json({ submission });
  } catch (error) {
    console.error('Error saving submission:', error);
    res.status(500).json({ message: 'Failed to save submission' });
  }
} 