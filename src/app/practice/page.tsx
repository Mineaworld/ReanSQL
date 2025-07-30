'use client';
import React, { useState, useEffect, useRef } from 'react';

import CodeMirror from '@uiw/react-codemirror';
import * as Tooltip from '@radix-ui/react-tooltip';
import { ClipboardIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckIcon, XCircleIcon, MinusCircleIcon } from '@heroicons/react/24/solid';
import { ArrowLeftIcon, ArrowRightIcon, TrashIcon, SparklesIcon, RocketLaunchIcon, ArrowDownTrayIcon, SunIcon, MoonIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon, ArrowPathIcon, ChevronDownIcon, LightBulbIcon } from '@heroicons/react/24/outline';

import { sql } from '@codemirror/lang-sql';

import { dracula } from '@uiw/codemirror-theme-dracula';
import { githubLight } from '@uiw/codemirror-theme-github';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import * as Accordion from '@radix-ui/react-accordion';
import AceternityLoader from '../../ui/AceternityLoader';
import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import ProgressBar from '../../ui/ProgressBar';
import Card from '../../ui/Card';
// Tabs is not used in this page, but available for future use

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
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userCode, setUserCode] = useState('');
  // --- Add for copy functionality and line/char count ---
  const [copied, setCopied] = useState(false);
  const [aiCopied, setAiCopied] = useState(false);
  const lineCount = userCode.split('\n').length;
  const charCount = userCode.length;

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
  const editorTheme = theme === 'dark' ? dracula : githubLight;

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

  // Debug effect to monitor questions state
  useEffect(() => {
    console.log('Questions state changed:', questions.length, questions);
  }, [questions]);

  // Debug effect to monitor loading state
  useEffect(() => {
    console.log('Loading state changed:', loading);
  }, [loading]);

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
      setQuestionStatus((prev) => ({ ...prev, [currentIdx]: 'correct' }));
    } else {
      setQuestionStatus((prev) => ({ ...prev, [currentIdx]: 'incorrect' }));
    }
  };

  // Reset feedback on question change or code edit
  useEffect(() => { }, [currentIdx]);
  useEffect(() => { }, [userCode]);

  const handleNext = () => {
    setUserCode('');
    setCurrentIdx((idx) => (idx + 1) % questions.length);
  };

  // --- New: Question navigation ---
  const handlePrev = () => {
    setUserCode('');
    setCurrentIdx((idx) => (idx - 1 + questions.length) % questions.length);
  };
  const handleJump = (idx: number) => {
    setUserCode('');
    setCurrentIdx(idx);
  };

  // Upload handler for PDF
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQuestions([]);
    setCurrentIdx(0);
    setUserCode('');
    setQuestionStatus({}); // Clear status when uploading new questions
    setLoading(true); // Show loader
    setUploadProgress('Uploading PDF...');
    
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        console.log('API Response:', data); // Debug log
        if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
          console.log('Setting questions:', data.questions); // Debug log
          setQuestions(data.questions);
          localStorage.setItem('reansql_questions', JSON.stringify(data.questions));
          
          // Show success message if there's a message from the API
          if (data.message) {
            console.log('Upload success:', data.message);
            setUploadProgress(data.message);
            // Clear progress message after 3 seconds
            setTimeout(() => setUploadProgress(''), 3000);
          }
        } else {
          localStorage.removeItem('reansql_questions');
          console.error('No questions returned from API');
          setUploadProgress('No questions found in PDF');
          setTimeout(() => setUploadProgress(''), 3000);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error('Failed to parse PDF:', errData.error || 'Unknown error');
        localStorage.removeItem('reansql_questions');
        
        // Show user-friendly error message
        setUploadProgress(`Upload failed: ${errData.error || 'Unknown error occurred. Please try again.'}`);
        setTimeout(() => setUploadProgress(''), 5000);
      }
    } catch (err) {
      console.error('An error occurred while uploading:', err);
      localStorage.removeItem('reansql_questions');
      setUploadProgress('Network error occurred while uploading. Please check your connection and try again.');
      setTimeout(() => setUploadProgress(''), 5000);
    }
    setLoading(false); // Hide loader when done
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

  // Place all early returns first
  if (loading) return (
    <div className="flex flex-1 items-center justify-center min-h-[60vh]">
      <AceternityLoader message={uploadProgress || "Processing your PDF..."} />
    </div>
  );
  if (!questions || questions.length === 0) return (
    <div className="flex flex-1 items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <img src="/globe.svg" alt="Welcome" className="h-12 w-12 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-200">Welcome to Practice Mode</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-2">Upload a PDF with SQL exercises to get started.</p>
        <label htmlFor="file-upload" className="cursor-pointer inline-block rounded-md bg-white dark:bg-gray-700 px-4 py-2 text-sm font-semibold text-blue-700 dark:text-blue-300 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 mt-2">
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
    </div>
  );
  // Now it's safe to define question
  const question = questions[currentIdx];

  // For progress bar value and label:
  const correctCount = Object.values(questionStatus).filter(s => s === 'correct').length;
  const percent = Math.round((correctCount / questions.length) * 100);

  return (
    <Tooltip.Provider>
      {/* Congratulatory Modal */}
      {showCongrats && (
        <Modal
          open={showCongrats}
          onClose={() => setShowCongrats(false)}
          title="Congratulations!"
        >
          <div className="flex flex-col items-center">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" fill="#bbf7d0" /><path strokeLinecap="round" strokeLinejoin="round" d="M7 13l3 3 7-7" stroke="#16a34a" strokeWidth="2.5" /></svg>
              <span className="text-2xl font-bold text-green-800 dark:text-green-200">Congratulations!</span>
            </div>
            <div className="text-lg text-gray-700 dark:text-gray-100 mb-4 text-center">You’ve answered all questions correctly.<br/>Keep practicing to master your SQL skills!</div>
            <Button variant="success" onClick={() => setShowCongrats(false)} className="items-center">
              Close
            </Button>
          </div>
        </Modal>
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
            <ProgressBar
              value={percent}
              label={`Progress (${percent}%)`}
            />
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
                <Button
                  key={q._id || idx}
                  onClick={() => handleJump(idx)}
                  variant={idx === currentIdx ? 'primary' : 'secondary'}
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
                </Button>
              );
            })}
          </div>
          {/* Sidebar: Pin navigation buttons to bottom */}
          <div className="mt-auto flex gap-3 pt-4 mb-6">
            <Button variant="secondary" onClick={handlePrev} className="items-center">
              <ArrowLeftIcon className="w-5 h-5 mr-1 inline-block align-middle" /> Previous
            </Button>
            <Button variant="primary" onClick={handleNext} className="items-center">
              Next <ArrowRightIcon className="w-5 h-5 ml-1 inline-block align-middle" />
            </Button>
          </div>
        </aside>
        {/* Main + AI Panel */}
        <div className="flex flex-1 h-full overflow-auto">
          {/* Ensure right panel doesn't expand with content */}
          {/* Add min-w-0 to both parent and aside for flexbox truncation */}
          <main className="flex-1 flex flex-col p-4 min-w-0 max-w-full">
            {/* Practice Mode Heading and Clear/Upload Button (moved above toolbar) */}
            <div className="relative mb-6">
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 drop-shadow-lg flex items-center gap-3 justify-center">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Practice Mode
              </h1>
              <Button
                variant="secondary"
                onClick={() => {
                  localStorage.removeItem('reansql_questions');
                  localStorage.removeItem('reansql_question_status');
                  setQuestions([]);
                  setCurrentIdx(0);
                  setUserCode('');
                  setQuestionStatus({});
                }}
                className="items-center"
              >
                <TrashIcon className="w-5 h-5 mr-1 inline-block align-middle" /> Clear / Upload PDF
              </Button>
        </div>
            {/* Question Display */}
        <Card className="mb-6">
              <div className="mb-2 flex items-center gap-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-bold text-sm shadow">Q{currentIdx + 1}</span>
                <span className="text-xl font-semibold text-[#22223b] dark:text-gray-200">Practice Question</span>
              </div>
              <div className="mb-2 text-sm text-blue-600 dark:text-blue-300 flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m6.364 1.636l-1.414 1.414M22 12h-2M19.364 19.364l-1.414-1.414M12 22v-2M4.636 19.364l1.414-1.414M2 12h2M4.636 4.636l1.414 1.414" /><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" fill="#fefcbf" /></svg>
                Read the question carefully and write your SQL below!
              </div>
              <div className="bg-[#f5f7fa] dark:bg-[#23272f] rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                <p className="text-lg text-[#22223b] dark:text-gray-100 leading-relaxed whitespace-pre-line">
                  {question.questionText || question.question_text || ''}
                </p>
              </div>
        </Card>
            {/* Code Editor Label */}
            <label className="block text-base font-semibold text-blue-700 dark:text-blue-200 mb-2" htmlFor="sql-editor">
            Write your SQL here
          </label>
            {/* Toolbar (moved above code editor) */}
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
              <Button variant="secondary" onClick={handleFormat} className="items-center">
                <SparklesIcon className="w-5 h-5 mr-1 inline-block align-middle" /> Format SQL
              </Button>
              <Button variant="secondary" onClick={handleReset} className="items-center">
                <ArrowPathIcon className="w-5 h-5 mr-1 inline-block align-middle" /> Reset
              </Button>
              <Button variant="secondary" onClick={handleDownload} className="items-center">
                <ArrowDownTrayIcon className="w-5 h-5 mr-1 inline-block align-middle" /> Download
              </Button>
              <Button variant="secondary" onClick={handleThemeToggle} className="items-center">
                {theme === 'dark' ? <SunIcon className="w-5 h-5 mr-1 inline-block align-middle" /> : <MoonIcon className="w-5 h-5 mr-1 inline-block align-middle" />}
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </Button>
              <Button variant="secondary" onClick={handleFullScreenToggle} className="items-center">
                {isFullScreen ? <ArrowsPointingInIcon className="w-5 h-5 mr-1 inline-block align-middle" /> : <ArrowsPointingOutIcon className="w-5 h-5 mr-1 inline-block align-middle" />}
                {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
              </Button>
              {/* Future UX buttons can go here */}
            </div>
            {/* Code Editor */}
            <Card className="mb-4">
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
              <Button variant={copied ? 'success' : 'secondary'} onClick={handleCopy} className="items-center">
                {copied ? 'Copied!' : 'Copy'}
              </Button>
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
        </Card>
            {/* Submission & Feedback */}
            <div className="flex gap-4 mt-6 mb-10 justify-center">
          <Button variant="primary" onClick={handleSubmit} className="items-center">
            <RocketLaunchIcon className="w-5 h-5 mr-1 inline-block align-middle" /> Submit
          </Button>
          <Button variant="secondary" onClick={() => {
                  const { code } = extractFirstCodeBlock(question.aiAnswer || question.ai_answer || '');
                  setUserCode(code);
                }} className="items-center">
            <SparklesIcon className="w-5 h-5 mr-1 inline-block align-middle" /> Show Answer
          </Button>
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
                  <Accordion.Trigger className="w-full flex items-center justify-between px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg font-semibold text-gray-900 dark:text-gray-100 shadow hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 items-center">
                    <span className="flex items-center gap-2">
                      <SparklesIcon className="w-5 h-5 text-blue-500 inline-block align-middle" />
                      Show AI Answer (SQL)
                    </span>
                    <ChevronDownIcon className="w-5 h-5 text-gray-500 inline-block align-middle" />
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
                        <div className="absolute top-2 right-2 z-20">
                          <Tooltip.Root delayDuration={100}>
                            <Tooltip.Trigger asChild>
                              <Button
                                variant={aiCopied ? 'success' : 'primary'}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-md shadow bg-blue-600 hover:bg-blue-700 text-white border border-blue-400 text-xs h-7 min-w-0"
                                style={{ fontSize: '0.85rem', lineHeight: 1.1 }}
                                onClick={() => {
                                  navigator.clipboard.writeText(code);
                                  setAiCopied(true);
                                  setTimeout(() => setAiCopied(false), 1200);
                                }}
                                aria-label="Copy SQL code"
                              >
                                {aiCopied ? (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                ) : (
                                  <ClipboardIcon className="w-4 h-4" />
                                )}
                                <span className="ml-1">{aiCopied ? 'Copied!' : 'Copy'}</span>
                              </Button>
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                              <Tooltip.Content side="left" className="z-50 px-3 py-2 rounded bg-gray-900 text-white text-xs shadow-lg border border-gray-700">
                                {aiCopied ? 'Copied!' : 'Copy to clipboard'}
                                <Tooltip.Arrow className="fill-gray-900" />
                              </Tooltip.Content>
                            </Tooltip.Portal>
                          </Tooltip.Root>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </Accordion.Content>
              </Accordion.Item>
              {/* Explain Code */}
              <Accordion.Item value="ai-answer-explanation">
                <Accordion.Header>
                  <Accordion.Trigger className="w-full flex items-center justify-between px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg font-semibold text-gray-900 dark:text-gray-100 shadow hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 z-10 sticky top-0 border-b border-green-300 dark:border-green-800 items-center">
                    <span className="flex items-center gap-2">
                      <LightBulbIcon className="w-5 h-5 text-yellow-400 inline-block align-middle" />
                      Explain Code
                    </span>
                    <ChevronDownIcon className="w-5 h-5 text-gray-500 inline-block align-middle" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="explain-accordion-content overflow-auto transition-all duration-300 data-[state=open]:max-h-[800px] data-[state=closed]:max-h-0 p-0">
                  {(() => {
                    const { explanation } = extractFirstCodeBlock(question.aiAnswer || question.ai_answer || '');
                    const modelExplanation = explanation;
                    return (
                      <div
                        className="prose prose-sm dark:prose-invert w-full max-w-full overflow-x-auto text-base leading-relaxed bg-white dark:bg-green-950 rounded-lg p-4 border border-green-100 dark:border-green-800 mt-2 mb-2"
                        style={{
                          '--tw-prose-code': '#374151',
                          '--tw-prose-pre-bg': '#f3f4f6',
                        } as React.CSSProperties}
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                          components={{
                            code: (props: { inline?: boolean; children?: ReactNode }) =>
                              props.inline
                                ? <code className="bg-gray-200 dark:bg-gray-800 text-blue-700 dark:text-blue-300 rounded px-2 py-0.5 font-mono text-[0.97em]">{props.children}</code>
                                : <code>{props.children}</code>
                          }}
                        >
                          {modelExplanation}
                        </ReactMarkdown>
                      </div>
                    );
                  })()}
                </Accordion.Content>
              </Accordion.Item>
            </Accordion.Root>
          </aside>
        </div>
      </div>
    </Tooltip.Provider>
  );
} 