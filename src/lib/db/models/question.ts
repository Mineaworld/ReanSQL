import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  pdfSource: {
    type: String,
    required: true,
  },
  questionText: {
    type: String,
    required: true,
  },
  expectedResult: {
    type: String,
    required: false,
    default: '',
  },
  aiAnswer: {
    type: String,
    required: false,
    default: '',
  },
  explanation: {
    type: String,
    required: false,
    default: '',
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
  category: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Question = mongoose.models.Question || mongoose.model('Question', questionSchema); 