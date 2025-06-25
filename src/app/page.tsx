'use client';
import React, { useState } from 'react';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [pdfText, setPdfText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState<number | null>(null);
  const [sqlInput, setSqlInput] = useState('');
  const [questions, setQuestions] = useState<{ _id: string; questionText: string; expectedResult: string }[] | null>(null);
  const [feedback, setFeedback] = useState<null | { isCorrect: boolean }>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setPdfText(null);
    setError(null);
    setQuestions(null);
    setSelectedQuestionIdx(null);
    setSqlInput('');
    setFeedback(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setPdfText(data.text);
        // Parse and save questions to DB
        const parsedQuestions = parseQuestionsForDB(data.text);
        console.log('Parsed questions:', parsedQuestions);
        if (parsedQuestions.length > 0) {
          const pdfSource = file.name;
          const saveRes = await fetch('/api/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questions: parsedQuestions, pdfSource }),
          });
          if (saveRes.ok) {
            const saveData = await saveRes.json();
            setQuestions(saveData.questions);
          } else {
            setError('Failed to save questions to database.');
          }
        } else {
          setError('No questions found in PDF.');
        }
      } else {
        setError('Failed to parse PDF.');
      }
    } catch {
      setError('An error occurred while uploading.');
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (selectedQuestionIdx === null || !questions) return;
    setFeedback(null);
    const question = questions[selectedQuestionIdx];
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: question._id,
          submittedCode: sqlInput,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFeedback({ isCorrect: data.isCorrect });
      } else {
        setFeedback(null);
        setError('Failed to submit answer.');
      }
    } catch {
      setFeedback(null);
      setError('An error occurred while submitting.');
    }
  };

  const selectedQuestion =
    questions && selectedQuestionIdx !== null ? questions[selectedQuestionIdx] : null;

  return (
    <div className="flex-1 flex">
      {/* Left Panel - Questions List */}
      <div className="w-80 border-r border-gray-200 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
        <div className="p-4">
          <div className="flex flex-col gap-4">
            {/* Upload Section */}
            <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-6 text-center bg-white dark:bg-gray-800">
              <div className="flex flex-col items-center">
                <img src="/file.svg" alt="Upload" className="h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer rounded-md bg-white dark:bg-gray-700 px-4 py-2 text-sm font-semibold text-blue-700 dark:text-blue-300 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Upload PDF
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept=".pdf"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">PDF files only</p>
              </div>
            </div>
            {/* Questions List or Loading/Error/Result */}
            <div className="space-y-2">
              {loading && (
                <p className="text-blue-700 dark:text-blue-300 text-center animate-pulse font-semibold">Parsing PDF...</p>
              )}
              {error && (
                <p className="text-red-600 dark:text-red-400 text-center font-semibold bg-red-50 dark:bg-red-900 rounded p-2 border border-red-200 dark:border-red-700">{error}</p>
              )}
              {questions ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {questions.map((q, idx) => (
                    <button
                      key={q._id || idx}
                      onClick={() => setSelectedQuestionIdx(idx)}
                      className={`w-full text-left rounded p-2 border transition-colors
                        ${selectedQuestionIdx === idx
                          ? 'bg-blue-100 dark:bg-blue-900 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-100 font-bold'
                          : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-800'}
                      `}
                    >
                      <span className="block truncate">{q.questionText}</span>
                    </button>
                  ))}
                </div>
              ) : pdfText ? (
                <div className="space-y-3 max-h-96 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded p-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono shadow-inner text-sm">
                  {pdfText
                    .split(/\n\s*\n/)
                    .map((para, idx) => (
                      <p key={idx} className="whitespace-pre-wrap">{para.replace(/\n/g, ' ')}</p>
                    ))}
                </div>
              ) : !loading && !error ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Upload a PDF to see questions here
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Code Editor */}
      <div className="flex-1 flex flex-col">
        {/* Question Display */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 min-h-[120px] flex flex-col justify-center">
          {selectedQuestion ? (
            <div>
              <div className="text-blue-700 dark:text-blue-300 font-bold mb-2 text-lg">{selectedQuestion.questionText}</div>
              {selectedQuestion.expectedResult && (
                <div className="text-xs text-gray-400 dark:text-gray-600 mb-2">(Expected answer hidden for user)</div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-300">
              <img src="/globe.svg" alt="Welcome" className="h-12 w-12 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Welcome to ReanSQL</h2>
              <p>Upload a PDF with SQL exercises to get started</p>
            </div>
          )}
        </div>

        {/* Code Editor Area */}
        <div className="flex-1 bg-gray-50 dark:bg-gray-900 p-4">
          <div className="h-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <img src="/window.svg" alt="Editor" className="h-5 w-5" />
                <span className="font-mono text-sm">SQL Editor</span>
              </div>
              <button
                disabled={!selectedQuestion || !sqlInput.trim()}
                onClick={handleSubmit}
                className={`rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity
                  ${selectedQuestion && sqlInput.trim() ? 'bg-blue-600 dark:bg-blue-700 opacity-100 cursor-pointer' : 'bg-blue-600 dark:bg-blue-700 opacity-50 cursor-not-allowed'}`}
              >
                Submit
              </button>
            </div>
            <textarea
              className="flex-1 w-full font-mono text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder={selectedQuestion ? 'Write your SQL query here...' : 'Select a question to start'}
              value={sqlInput}
              onChange={e => setSqlInput(e.target.value)}
              disabled={!selectedQuestion}
              rows={10}
            />
            {feedback && (
              <div className={`mt-4 text-center font-bold text-lg ${feedback.isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {feedback.isCorrect ? 'Correct! 🎉' : 'Incorrect. Try again!'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Restore parseQuestionsForDB function for parsing questions after PDF upload
function parseQuestionsForDB(text: string) {
  const questionRegex = /^([0-9]+[.)])\s*(.*)/;
  const lines = text.split(/\r?\n/);
  const questions: { questionText: string; expectedResult: string }[] = [];
  let current: { questionText: string; expectedResult: string } | null = null;
  for (const line of lines) {
    const match = line.match(questionRegex);
    if (match) {
      if (current) questions.push(current);
      // Start a new question, use the whole line as the question text
      current = { questionText: line.trim(), expectedResult: '' };
    } else if (current && line.trim()) {
      // Append wrapped lines and notes to the current question text
      current.questionText += ' ' + line.trim();
    }
  }
  if (current) questions.push(current);
  return questions;
}
