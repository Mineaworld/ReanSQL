'use client';
import React, { useState, useEffect, useRef } from 'react';

import CodeMirror from '@uiw/react-codemirror';
import * as Tooltip from '@radix-ui/react-tooltip';
import { ClipboardIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckIcon, XCircleIcon, MinusCircleIcon } from '@heroicons/react/24/solid';

import { sql } from '@codemirror/lang-sql';

import { dracula } from '@uiw/codemirror-theme-dracula';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import * as Accordion from '@radix-ui/react-accordion';

// Define the Question type for type safety
interface Question {
  _id: string;
  questionText?: string;
  question_text?: string;
  aiAnswer?: string;
  ai_answer?: string;
  explanation?: string;
}

export default function PracticePage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userCode, setUserCode] = useState('');
  const [feedback, setFeedback] = useState('');
  // --- Add for copy functionality and line/char count ---
  const [copied, setCopied] = useState(false);
  const lineCount = userCode.split('\n').length;
  const charCount = userCode.length;
  const [uploading, setUploading] = useState(false);

  // Track per-question status: 'correct', 'incorrect', or undefined
  const [questionStatus, setQuestionStatus] = useState<Record<number, 'correct' | 'incorrect' | undefined>>({});

  // --- Persist question status in localStorage ---
  useEffect(() => {
    const saved = localStorage.getItem('reansql_question_status');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setQuestionStatus(parsed);
      } catch {}
    }
  }, [questions.length]);
  useEffect(() => {
    if (questions.length > 0) {
      localStorage.setItem('reansql_question_status', JSON.stringify(questionStatus));
    }
  }, [questionStatus, questions.length]);

  const handleCopy = () => {
    navigator.clipboard.writeText(userCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  // --- End copy functionality ---

  // --- Theme and full-screen state ---
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isFullScreen, setIsFullScreen] = useState(false);

  // --- SQL formatting (very basic, for demo) ---
  function formatSQL(sql: string) {
    return sql
      .replace(/\s+/g, ' ')
      .replace(/(SELECT|FROM|WHERE|GROUP BY|ORDER BY|INSERT INTO|VALUES|UPDATE|SET|DELETE)/gi, '\n$1')
      .replace(/\n+/g, '\n')
      .trim();
  }

  // --- Toolbar handlers ---
  const handleFormat = () => setUserCode(formatSQL(userCode));
  const handleReset = () => setUserCode('');
  const handleDownload = () => {
    const blob = new Blob([userCode], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query.sql';
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleThemeToggle = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const handleFullScreenToggle = () => setIsFullScreen((v) => !v);

  // --- Editor theme ---
  const editorTheme = theme === 'dark' ? dracula : undefined;

  // --- Resizable ---
  const [editorHeight, setEditorHeight] = useState(300);
  const isResizing = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(300);
  const handleResizeStart = (e: React.MouseEvent) => {
    isResizing.current = true;
    startY.current = e.clientY;
    startHeight.current = editorHeight;
    document.body.style.cursor = 'ns-resize';
  };
  const handleResize = (e: MouseEvent) => {
    if (isResizing.current) {
      const newHeight = Math.max(120, startHeight.current + (e.clientY - startY.current));
      setEditorHeight(newHeight);
    }
  };
  const handleResizeEnd = () => {
    isResizing.current = false;
    document.body.style.cursor = '';
  };
  useEffect(() => {
    if (!isFullScreen) return;
    const move = (e: MouseEvent) => handleResize(e);
    const up = () => handleResizeEnd();
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  });

  // On mount, check localStorage for questions
  useEffect(() => {
    const saved = localStorage.getItem('reansql_questions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuestions(parsed);
        }
      } catch {}
    }
        setLoading(false);
  }, []);

  // --- Answer checking helper ---
  function normalizeSQL(sql: string) {
    return sql
      .replace(/[\s\r\n\t\u00A0]+/g, '') // remove all whitespace, tabs, newlines, non-breaking spaces
      .replace(/[;"'`]/g, '')                // remove semicolons and all quotes
      .toLowerCase();
  }

  const handleSubmit = () => {
    if (!question || !userCode.trim()) return;
    const { code: aiRawCode } = extractFirstCodeBlock(question.aiAnswer || question.ai_answer || '');
    const userNorm = normalizeSQL(userCode);
    const aiNorm = normalizeSQL(aiRawCode);
    // Debug logging
    console.log('User SQL (raw):', userCode);
    console.log('AI SQL (raw):', aiRawCode);
    console.log('User SQL (normalized):', userNorm);
    console.log('AI SQL (normalized):', aiNorm);
    if (userNorm === aiNorm) {
      setFeedback('Correct! 🎉');
      setQuestionStatus((prev) => ({ ...prev, [currentIdx]: 'correct' }));
    } else {
      setFeedback('Incorrect, try again!');
      setQuestionStatus((prev) => ({ ...prev, [currentIdx]: 'incorrect' }));
    }
  };

  // Reset feedback on question change or code edit
  useEffect(() => { setFeedback(''); }, [currentIdx]);
  useEffect(() => { setFeedback(''); }, [userCode]);

  const handleNext = () => {
    setFeedback('');
    setUserCode('');
    setCurrentIdx((idx) => (idx + 1) % questions.length);
  };

  // --- New: Question navigation ---
  const handlePrev = () => {
    setFeedback('');
    setUserCode('');
    setCurrentIdx((idx) => (idx - 1 + questions.length) % questions.length);
  };
  const handleJump = (idx: number) => {
    setFeedback('');
    setUserCode('');
    setCurrentIdx(idx);
  };

  // Upload handler for PDF
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    setQuestions([]);
    setCurrentIdx(0);
    setUserCode('');
    setFeedback('');
    setQuestionStatus({}); // Clear status when uploading new questions
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
          setQuestions(data.questions);
          localStorage.setItem('reansql_questions', JSON.stringify(data.questions));
        } else {
          setError('No questions found in PDF.');
          localStorage.removeItem('reansql_questions');
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to parse PDF.');
        localStorage.removeItem('reansql_questions');
      }
    } catch {
      setError('An error occurred while uploading.');
      localStorage.removeItem('reansql_questions');
    }
    setUploading(false);
  };

  // Accordion open state for right panel (must be before early returns)
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);
  useEffect(() => {
    setOpenAccordions([]); // Close all accordions when question changes
  }, [currentIdx]);

  // Congratulatory modal state
  const [showCongrats, setShowCongrats] = useState(false);
  useEffect(() => {
    if (
      questions.length > 0 &&
      Object.values(questionStatus).filter((s) => s === 'correct').length === questions.length
    ) {
      setShowCongrats(true);
    }
  }, [questionStatus, questions.length]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-black"><div className="p-6 text-center bg-gray-900 text-gray-100 rounded shadow">Loading...</div></div>;
  }
  if (!questions.length) {
    // Show upload prompt
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-black">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 p-10 flex flex-col items-center">
          <img src="/file.svg" alt="Upload" className="h-16 w-16 mb-4" />
          <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-2">Upload a PDF to Start Practicing</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4 text-center">Please upload a PDF file containing SQL questions. Your questions will be saved for this session.</p>
          <label htmlFor="practice-upload" className="cursor-pointer rounded-md bg-blue-700 dark:bg-blue-600 px-6 py-2 text-lg font-semibold text-white shadow-sm hover:bg-blue-800 dark:hover:bg-blue-700 transition-colors mb-2" style={{ cursor: 'pointer' }}>
            {uploading ? 'Uploading...' : 'Upload PDF'}
            <input
              id="practice-upload"
              name="practice-upload"
              type="file"
              className="sr-only"
              accept=".pdf"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
          {error && <div className="mt-2 text-red-600 dark:text-red-400 font-semibold">{error}</div>}
        </div>
      </div>
    );
  }
  if (error) {
    return <div className="flex items-center justify-center min-h-screen bg-black"><div className="p-6 text-center text-red-400 bg-gray-900 rounded shadow">{error}</div></div>;
  }
  if (!questions.length) {
    return <div className="flex items-center justify-center min-h-screen bg-black"><div className="p-6 text-center bg-gray-900 text-gray-100 rounded shadow">No questions found.</div></div>;
  }

  const question = questions[currentIdx];

  // Helper to extract first code block and explanation from markdown
  function extractFirstCodeBlock(markdown: string) {
    const codeBlockRegex = /```(?:sql)?\n([\s\S]*?)```/i;
    const match = codeBlockRegex.exec(markdown);
    if (match) {
      const code = match[1].trim();
      const before = markdown.slice(0, match.index).trim();
      const after = markdown.slice(match.index + match[0].length).trim();
      // Combine before and after for explanation
      const explanation = [before, after].filter(Boolean).join('\n\n');
      return { code, explanation };
    }
    return { code: '', explanation: markdown };
  }

  return (
    <Tooltip.Provider>
      {/* Congratulatory Modal */}
      {showCongrats && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur backdrop-brightness-75"
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border-2 border-green-300 dark:border-green-700 p-10 flex flex-col items-center max-w-md w-full mx-4 relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl font-bold focus:outline-none"
              onClick={() => setShowCongrats(false)}
              aria-label="Close congratulatory modal"
            >
              &times;
            </button>
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" fill="#bbf7d0" /><path strokeLinecap="round" strokeLinejoin="round" d="M7 13l3 3 7-7" stroke="#16a34a" strokeWidth="2.5" /></svg>
              <span className="text-2xl font-bold text-green-800 dark:text-green-200">Congratulations!</span>
            </div>
            <div className="text-lg text-gray-700 dark:text-gray-100 mb-4 text-center">You’ve answered all questions correctly.<br/>Keep practicing to master your SQL skills!</div>
            <button
              className="mt-2 px-6 py-2 rounded-full bg-green-600 text-white font-semibold shadow hover:bg-green-700 transition-all text-lg"
              onClick={() => setShowCongrats(false)}
            >
              Close
            </button>
          </div>
        </motion.div>
      )}
      <div className="flex h-[calc(100vh-4rem)] bg-[#f7fafc] dark:bg-[#18181b]">
        {/* Sidebar: Questions/Progress */}
        <aside className="w-72 min-w-[220px] max-w-xs border-r border-gray-200 dark:border-gray-800 bg-[#23272f] dark:bg-[#18181b] flex flex-col h-full p-4">
          <h2 className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-4">Questions</h2>
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">Progress</span>
              <span className="text-xs text-gray-400">{Object.values(questionStatus).filter(s => s === 'correct').length} / {questions.length}</span>
            </div>
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-3 bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${(Object.values(questionStatus).filter(s => s === 'correct').length / questions.length) * 100}%` }} />
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-2 overflow-y-auto mb-4">
            {questions.map((q, idx) => {
              const status = questionStatus[idx];
              let statusIcon, statusColor, statusLabel;
              if (status === 'correct') {
                statusIcon = <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />;
                statusColor = 'bg-green-100 dark:bg-green-900';
                statusLabel = 'Correct';
              } else if (status === 'incorrect') {
                statusIcon = <XCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />;
                statusColor = 'bg-red-100 dark:bg-red-900';
                statusLabel = 'Incorrect';
              } else {
                statusIcon = <MinusCircleIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />;
                statusColor = 'bg-gray-100 dark:bg-gray-800';
                statusLabel = 'Not answered';
              }
              return (
                <button
                  key={q._id || idx}
                  onClick={() => handleJump(idx)}
                  className={`flex items-center gap-2 text-left px-4 py-2 rounded-lg transition-all font-medium border shadow-sm relative overflow-hidden
                    ${idx === currentIdx
                      ? 'bg-blue-100 dark:bg-blue-800 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-100 ring-2 ring-blue-400 dark:ring-blue-600'
                      : `${statusColor} border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-blue-200 dark:hover:bg-blue-900 cursor-pointer hover:shadow-md`}
                  `}
                  style={{ cursor: idx === currentIdx ? 'default' : 'pointer' }}
                  tabIndex={0}
                >
                  {/* Status Icon with Tooltip and Animation */}
                  <Tooltip.Root delayDuration={100}>
                    <Tooltip.Trigger asChild>
                      <motion.span
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        className="flex items-center"
                      >
                        {statusIcon}
                      </motion.span>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content side="right" className="z-50 px-3 py-2 rounded bg-gray-900 text-white text-xs shadow-lg border border-gray-700">
                        {statusLabel}
                        <Tooltip.Arrow className="fill-gray-900" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                  <span className="truncate block">Q{idx + 1}: {q.questionText || q.question_text}</span>
                </button>
              );
            })}
          </div>
          {/* Sidebar: Pin navigation buttons to bottom */}
          <div className="mt-auto flex gap-3 pt-4">
            <button
              onClick={handlePrev}
              className="flex-1 bg-gray-700 text-gray-100 px-6 py-2 rounded-full font-bold shadow-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all"
              style={{ cursor: 'pointer' }}
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              className="flex-1 bg-blue-700 text-white px-6 py-2 rounded-full font-bold shadow-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
              style={{ cursor: 'pointer' }}
            >
              Next
            </button>
          </div>
        </aside>
        {/* Main + AI Panel */}
        <div className="flex flex-1 h-full overflow-auto">
          {/* Ensure right panel doesn't expand with content */}
          {/* Add min-w-0 to both parent and aside for flexbox truncation */}
          <main className="flex-1 flex flex-col p-4 min-w-0 max-w-full">
            {/* Toolbar */}
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
              <button onClick={handleFormat} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1 rounded hover:bg-blue-700 hover:text-white text-xs font-semibold transition-all shadow-sm" style={{ cursor: 'pointer' }}>Format SQL</button>
              <button onClick={handleReset} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1 rounded hover:bg-yellow-700 hover:text-white text-xs font-semibold transition-all shadow-sm" style={{ cursor: 'pointer' }}>Reset</button>
              <button onClick={handleDownload} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1 rounded hover:bg-green-700 hover:text-white text-xs font-semibold transition-all shadow-sm" style={{ cursor: 'pointer' }}>Download</button>
              <button onClick={handleThemeToggle} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1 rounded hover:bg-gray-400 hover:text-black text-xs font-semibold transition-all shadow-sm" style={{ cursor: 'pointer' }}>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</button>
              <button onClick={handleFullScreenToggle} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1 rounded hover:bg-purple-700 hover:text-white text-xs font-semibold transition-all shadow-sm" style={{ cursor: 'pointer' }}>{isFullScreen ? 'Exit Full Screen' : 'Full Screen'}</button>
              {/* Future UX buttons can go here */}
            </div>
            {/* Main Card */}
            <div className="w-full h-full bg-white dark:bg-[#23272f] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-4 relative flex flex-col">
              {/* Clear Questions Button */}
              <motion.button
                className="absolute top-4 right-4 bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700 transition-colors text-sm font-semibold shadow focus:outline-none focus:ring-2 focus:ring-red-400 z-10"
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  localStorage.removeItem('reansql_questions');
                  localStorage.removeItem('reansql_question_status');
                  setQuestions([]);
                  setCurrentIdx(0);
                  setUserCode('');
                  setFeedback('');
                  setQuestionStatus({});
                }}
                style={{ cursor: 'pointer' }}
              >
                Clear Questions / Upload New PDF
              </motion.button>
              <h1 className="text-3xl font-extrabold mb-6 text-blue-700 dark:text-blue-300 text-center tracking-tight">Practice Mode</h1>
              {/* Question Display */}
              <div className="mb-6">
                <div className="font-semibold mb-2 text-[#22223b] dark:text-gray-200 text-xl">Question {currentIdx + 1}:</div>
                <div className="mb-2 text-[#22223b] dark:text-gray-100 text-lg whitespace-pre-line leading-relaxed">{question.questionText || question.question_text}</div>
              </div>
              {/* Code Editor */}
              <div className="mb-4">
                <label className="block text-base font-semibold text-blue-700 dark:text-blue-200 mb-2" htmlFor="sql-editor">
                  Write your SQL here
                </label>
                <div
                  className="relative rounded-2xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 shadow-xl focus-within:border-blue-500 transition-all duration-200 min-w-0 max-w-full overflow-x-auto"
                  style={{ boxShadow: '0 4px 24px 0 rgba(0,0,0,0.10)' }}
                >
                  <CodeMirror
                    id="sql-editor"
                    value={userCode}
                    height={`${editorHeight}px`}
                    theme={editorTheme}
                    extensions={[sql()]}
                    onChange={(value: string) => setUserCode(value)}
                    basicSetup={{ lineNumbers: true, autocompletion: true }}
                    style={{
                      fontSize: '1.15rem',
                      fontFamily: 'Fira Mono, Menlo, Monaco, Consolas, monospace',
                      background: 'transparent',
                      borderRadius: '0.5rem',
                      padding: '0.75rem 1rem',
                      minHeight: '120px',
                      maxWidth: '100%',
                      overflowX: 'auto',
                    }}
                  />
                  {/* Toolbar below editor */}
                  <div className="absolute bottom-2 right-2 flex items-center gap-2 bg-gray-900 bg-opacity-80 px-2 py-1 rounded shadow-md">
                    <span className="text-xs text-gray-400 mr-2">{lineCount} lines, {charCount} chars</span>
                    <button
                      type="button"
                      className={`text-xs px-2 py-1 rounded transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 ${copied ? 'bg-green-700 text-white' : 'bg-gray-700 text-gray-200 hover:bg-blue-700 hover:text-white cursor-pointer'}`}
                      onClick={handleCopy}
                      aria-label="Copy code to clipboard"
                      style={{ cursor: 'pointer' }}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  {/* Resizer handle */}
                  <div
                    className="absolute bottom-1 right-1 w-4 h-4 cursor-ns-resize z-20"
                    style={{ userSelect: 'none' }}
                    onMouseDown={handleResizeStart}
                    aria-label="Resize editor"
                    tabIndex={0}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 14h12M6 10h8M10 6h4" stroke="#888" strokeWidth="2" strokeLinecap="round"/></svg>
                  </div>
                </div>
              </div>
              {/* Submission & Feedback */}
              <div className="flex gap-4 mt-6 mb-6 justify-center">
                <button
                  className="bg-blue-700 text-white px-8 py-2 rounded-full font-bold shadow-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base transition-all"
                  onClick={handleSubmit}
                  style={{ cursor: 'pointer' }}
                >
                  Submit
                </button>
                <button
                  className="bg-gray-700 text-gray-100 px-8 py-2 rounded-full font-bold shadow-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 text-base transition-all"
                  onClick={() => {
                    const { code, explanation } = extractFirstCodeBlock(question.aiAnswer || question.ai_answer || '');
                    setUserCode(code);
                    setFeedback(explanation);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  Show Answer
                </button>
              </div>
              {/* Feedback */}
              <motion.div
                className={`mt-4 p-4 rounded-xl text-center font-bold text-lg shadow-md border-2 transition-all
                  ${feedback.includes('Correct')
                    ? 'bg-[#e6f9ed] dark:bg-green-900 text-[#15803d] dark:text-green-200 border-green-200 dark:border-green-700'
                    : 'bg-[#fffbe6] dark:bg-yellow-900 text-[#b45309] dark:text-yellow-200 border-yellow-200 dark:border-yellow-700'}`}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {feedback}
              </motion.div>
            </div>
          </main>
          {/* Right Panel: AI Answer/Explanation Accordions */}
          <aside className="w-[350px] max-w-sm min-w-[260px] min-w-0 border-l border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4 flex flex-col">
            <Accordion.Root
              type="multiple"
              className="flex flex-col gap-2"
              value={openAccordions}
              onValueChange={setOpenAccordions}
            >
              {/* AI Answer (SQL) */}
              <Accordion.Item value="ai-answer-code">
                <Accordion.Header>
                  <Accordion.Trigger className="w-full flex items-center justify-between px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg font-semibold text-gray-900 dark:text-gray-100 shadow hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <span>Show AI Answer (SQL)</span>
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6"/></svg>
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                  {(() => {
                    const { code } = extractFirstCodeBlock(question.aiAnswer || question.ai_answer || '');
                    return code ? (
                      <div className="relative group my-4">
                        <pre className="rounded-2xl bg-[#f7fafc] dark:bg-[#18181b] p-4 overflow-x-auto max-w-full text-base font-mono shadow-lg border border-gray-200 dark:border-gray-700">
                          <code className="block min-w-0 max-w-full overflow-x-auto">{code}</code>
                        </pre>
                        <Tooltip.Root delayDuration={100}>
                          <Tooltip.Trigger asChild>
                            <button
                              className={`absolute top-2 right-2 flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 hover:bg-gray-200 dark:hover:bg-gray-700 z-10`}
                              onClick={() => {
                                navigator.clipboard.writeText(code);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 1200);
                              }}
                              aria-label="Copy SQL code"
                              style={{ cursor: 'pointer' }}
                            >
                              {copied ? (
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              ) : (
                                <ClipboardIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                              )}
                            </button>
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Content side="left" className="z-50 px-3 py-2 rounded bg-gray-900 text-white text-xs shadow-lg border border-gray-700">
                              {copied ? 'Copied!' : 'Copy to clipboard'}
                              <Tooltip.Arrow className="fill-gray-900" />
                            </Tooltip.Content>
                          </Tooltip.Portal>
                        </Tooltip.Root>
                      </div>
                    ) : null;
                  })()}
                </Accordion.Content>
              </Accordion.Item>
              {/* Explain Code */}
              <Accordion.Item value="ai-answer-explanation">
                <Accordion.Header>
                  <Accordion.Trigger className="w-full flex items-center justify-between px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg font-semibold text-gray-900 dark:text-gray-100 shadow hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <span>Explain Code</span>
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6"/></svg>
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                  <div className="prose dark:prose-invert max-w-none text-base leading-relaxed">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        code: (props: { inline?: boolean; children?: ReactNode }) =>
                          props.inline
                            ? <strong className="text-blue-700 dark:text-blue-300 font-semibold">{props.children}</strong>
                            : <code>{props.children}</code>
                      }}
                    >
                      {extractFirstCodeBlock(question.aiAnswer || question.ai_answer || '').explanation}
                    </ReactMarkdown>
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            </Accordion.Root>
          </aside>
        </div>
      </div>
    </Tooltip.Provider>
  );
} 