'use client';
import React, { useState, useEffect, useRef } from 'react';

import CodeMirror from '@uiw/react-codemirror';
import * as Tabs from '@radix-ui/react-tabs';
import * as Tooltip from '@radix-ui/react-tooltip';
import { ClipboardIcon, CheckCircleIcon, InformationCircleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckIcon, XCircleIcon, MinusCircleIcon } from '@heroicons/react/24/solid';

import { sql } from '@codemirror/lang-sql';

import { dracula } from '@uiw/codemirror-theme-dracula';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { ReactNode } from 'react';
import { motion } from 'framer-motion';

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
  const [showAnswer, setShowAnswer] = useState(false);
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
    setShowAnswer(false);
    setFeedback('');
    setUserCode('');
    setCurrentIdx((idx) => (idx + 1) % questions.length);
  };

  // --- New: Question navigation ---
  const handlePrev = () => {
    setShowAnswer(false);
    setFeedback('');
    setUserCode('');
    setCurrentIdx((idx) => (idx - 1 + questions.length) % questions.length);
  };
  const handleJump = (idx: number) => {
    setShowAnswer(false);
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
    setShowAnswer(false);
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

  // Custom CodeBlock renderer for markdown
  const CodeBlock = ({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode }) => {
    const code = Array.isArray(children) ? children.join('') : String(children);
    // Only show copy button for multi-line code blocks
    if (!inline) {
      return (
        <div className="relative group my-4">
          <pre className={`rounded bg-gray-100 dark:bg-gray-800 p-4 overflow-x-auto text-sm font-mono ${className || ''}`}> 
            <code {...props}>{children}</code>
          </pre>
          <button
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-1 rounded hover:bg-blue-700 hover:text-white text-xs flex items-center gap-1 cursor-pointer transition-opacity"
            onClick={() => navigator.clipboard.writeText(code)}
            aria-label="Copy code"
            style={{ cursor: 'pointer' }}
          >
            <ClipboardIcon className="h-4 w-4" /> Copy
          </button>
        </div>
      );
    }
    // Style inline code as bold blue text, no copy button
    return (
      <strong className="text-blue-700 dark:text-blue-300 font-semibold" {...props}>{children}</strong>
    );
  };

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
      <motion.div
        className="flex min-h-screen bg-[#f7fafc] dark:bg-[#18181b]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Left Panel: Question List & Progress */}
        <motion.aside
          className="w-80 bg-[#23272f] dark:bg-[#18181b] border-r border-gray-200 dark:border-gray-800 flex flex-col h-[calc(100vh-4rem)] p-6 rounded-r-2xl shadow-xl mt-8 ml-4 mb-8"
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{ minHeight: '600px' }}
        >
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
          <div className="mt-auto flex gap-2 pt-4">
            <button
              onClick={handlePrev}
              className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 font-semibold transition-all cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              style={{ cursor: 'pointer' }}
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 font-semibold transition-all cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              style={{ cursor: 'pointer' }}
            >
              Next
            </button>
          </div>
        </motion.aside>

        {/* Right Panel: Practice Area */}
        <main className="flex-1 flex flex-col items-center justify-center p-8">
          <motion.div
            className="w-full max-w-3xl bg-white dark:bg-[#23272f] rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 p-10 relative mt-8 mb-8"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
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
                setShowAnswer(false);
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
            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 mb-4 justify-end items-center">
              <motion.button
                onClick={handleFormat}
                className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-lg hover:bg-blue-700 hover:text-white text-xs cursor-pointer transition-all shadow-sm"
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.97 }}
                style={{ cursor: 'pointer' }}
              >
                Format SQL
              </motion.button>
              <motion.button
                onClick={handleReset}
                className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-lg hover:bg-yellow-700 hover:text-white text-xs cursor-pointer transition-all shadow-sm"
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.97 }}
                style={{ cursor: 'pointer' }}
              >
                Reset
              </motion.button>
              <motion.button
                onClick={handleDownload}
                className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-lg hover:bg-green-700 hover:text-white text-xs cursor-pointer transition-all shadow-sm"
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.97 }}
                style={{ cursor: 'pointer' }}
              >
                Download
              </motion.button>
              <motion.button
                onClick={handleThemeToggle}
                className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-lg hover:bg-gray-400 hover:text-black text-xs cursor-pointer transition-all shadow-sm"
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.97 }}
                style={{ cursor: 'pointer' }}
              >
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </motion.button>
              <motion.button
                onClick={handleFullScreenToggle}
                className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-lg hover:bg-purple-700 hover:text-white text-xs cursor-pointer transition-all shadow-sm"
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.97 }}
                style={{ cursor: 'pointer' }}
              >
                {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
              </motion.button>
            </div>
            {/* Code Editor */}
          <div className="mb-4">
              <label className="block text-base font-semibold text-blue-700 dark:text-blue-200 mb-2" htmlFor="sql-editor">
              Write your SQL here
            </label>
            <div
                className="relative rounded-2xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 shadow-xl focus-within:border-blue-500 transition-all duration-200"
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
            <div className="flex gap-4 mb-6 justify-center mt-6">
              <motion.button
                className="bg-blue-700 text-white px-8 py-2 rounded-xl hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base cursor-pointer font-bold shadow-md transition-all"
              onClick={handleSubmit}
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.97 }}
                style={{ cursor: 'pointer' }}
            >
              Submit
              </motion.button>
              <motion.button
                className="bg-gray-700 text-gray-100 px-8 py-2 rounded-xl hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 text-base cursor-pointer font-bold shadow-md transition-all"
              onClick={() => setShowAnswer(true)}
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.97 }}
                style={{ cursor: 'pointer' }}
            >
              Show Answer
              </motion.button>
              <motion.button
                className="bg-green-700 text-white px-8 py-2 rounded-xl hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-400 text-base cursor-pointer font-bold shadow-md transition-all"
              onClick={handleNext}
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.97 }}
                style={{ cursor: 'pointer' }}
            >
              Next
              </motion.button>
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
            {/* Answer Reveal */}
            {showAnswer && (
              <div className="mt-4 p-4 rounded bg-blue-50 dark:bg-blue-900 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-700">
                <Tabs.Root defaultValue="ai-answer">
                  <Tabs.List className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
                    <Tabs.Trigger value="ai-answer" className="px-4 py-2 font-semibold rounded-t focus:outline-none data-[state=active]:bg-white data-[state=active]:dark:bg-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 transition-colors">AI Answer</Tabs.Trigger>
                    <Tabs.Trigger value="step-by-step" className="px-4 py-2 font-semibold rounded-t focus:outline-none data-[state=active]:bg-white data-[state=active]:dark:bg-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 transition-colors">Step-by-Step</Tabs.Trigger>
                    <Tabs.Trigger value="simple" className="px-4 py-2 font-semibold rounded-t focus:outline-none data-[state=active]:bg-white data-[state=active]:dark:bg-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 transition-colors">Simple</Tabs.Trigger>
                    <Tabs.Trigger value="question" className="px-4 py-2 font-semibold rounded-t focus:outline-none data-[state=active]:bg-white data-[state=active]:dark:bg-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 transition-colors">Question</Tabs.Trigger>
                  </Tabs.List>
                  {/* AI Answer Tab */}
                  <Tabs.Content value="ai-answer" className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircleIcon className="h-5 w-5 text-blue-500" />
                      <span className="font-bold text-lg">AI Answer</span>
                    </div>
                    {/* Extract and show main SQL code block with copy button */}
                    {(() => {
                      const { code, explanation } = extractFirstCodeBlock(question.aiAnswer || question.ai_answer || '');
                      return (
                        <>
                          {code && (
                            <motion.div
                              className="relative group my-6"
                              initial={{ scale: 0.95, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                            >
                              <pre className="rounded-2xl bg-[#f7fafc] dark:bg-[#18181b] p-6 overflow-x-auto text-base font-mono shadow-lg border border-gray-200 dark:border-gray-700">
                                <code>{code}</code>
                              </pre>
                              <motion.button
                                className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-all text-xs font-semibold shadow focus:outline-none focus:ring-2 focus:ring-blue-400 z-10"
                                onClick={() => navigator.clipboard.writeText(code)}
                                aria-label="Copy SQL code"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                style={{ cursor: 'pointer' }}
                              >
                                <ClipboardIcon className="h-4 w-4" /> Copy
                              </motion.button>
                            </motion.div>
                          )}
                          {/* Render the rest as markdown, no copy buttons for code */}
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
                              {explanation}
                            </ReactMarkdown>
                          </div>
                        </>
                      );
                    })()}
                  </Tabs.Content>
                  {/* Step-by-Step Tab */}
                  <Tabs.Content value="step-by-step" className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <InformationCircleIcon className="h-5 w-5 text-blue-500" />
                      <span className="font-bold text-lg">Step-by-Step Explanation</span>
                    </div>
                    <div className="prose dark:prose-invert max-w-none text-base leading-relaxed">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={{ code: CodeBlock }}
                      >
                        {question.explanation || ''}
                      </ReactMarkdown>
                    </div>
                  </Tabs.Content>
                  {/* Simple Tab (fallback to explanation if no simple) */}
                  <Tabs.Content value="simple" className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <InformationCircleIcon className="h-5 w-5 text-yellow-500" />
                      <span className="font-bold text-lg">Simple Explanation</span>
                    </div>
                    <div className="prose dark:prose-invert max-w-none text-base leading-relaxed">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={{ code: CodeBlock }}
                      >
                        {question.explanation || ''}
                      </ReactMarkdown>
                    </div>
                  </Tabs.Content>
                  {/* Question Tab (if available) */}
                  <Tabs.Content value="question" className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <QuestionMarkCircleIcon className="h-5 w-5 text-green-500" />
                      <span className="font-bold text-lg">The Question</span>
                    </div>
                    <div className="prose dark:prose-invert max-w-none text-base leading-relaxed">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                      >
                        {question.questionText || question.question_text || ''}
                      </ReactMarkdown>
    </div>
                  </Tabs.Content>
                </Tabs.Root>
                <motion.button
                  className="mt-6 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-6 py-2 rounded-xl hover:bg-gray-400 dark:hover:bg-gray-600 transition-all cursor-pointer font-semibold shadow focus:outline-none focus:ring-2 focus:ring-blue-400"
                  onClick={() => setShowAnswer(false)}
                  whileHover={{ scale: 1.07 }}
                  whileTap={{ scale: 0.97 }}
                  style={{ cursor: 'pointer' }}
                >
                  Hide Answer
                </motion.button>
      </div>
            )}
          </motion.div>
        </main>
      </motion.div>
    </Tooltip.Provider>
  );
} 