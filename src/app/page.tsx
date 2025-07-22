'use client';
import React from 'react';
import Link from 'next/link';
import { AcademicCapIcon, DocumentArrowUpIcon, CodeBracketIcon, ChartBarIcon, ArrowPathIcon, ChatBubbleLeftRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { motion, easeInOut } from 'framer-motion';
import Aurora from '../ui/Aurora';

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease: easeInOut },
  viewport: { once: true }
});

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <Aurora
        className="fixed inset-0 z-0"
        colorStops={["#3b82f6", "#a5b4fc", "#93c5fd", "#ddd6fe", "#60a5fa"]}
        blend={0.5}
        amplitude={1.0}
        speed={0.5}
      />
      <main className="relative min-h-screen flex flex-col items-center justify-start py-16 px-4 z-10">
        {/* Hero Section */}
        <motion.section {...fadeIn(0)} className="w-full max-w-2xl text-center mb-20">
          <span className="inline-flex items-center gap-2 mb-4">
            <AcademicCapIcon className="h-10 w-10 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <span className="text-2xl font-bold text-blue-700 dark:text-blue-300 tracking-tight">ReanSQL</span>
          </span>
          <h1 className="text-5xl font-extrabold text-gray-900 dark:text-gray-100 mb-4 leading-tight tracking-tight">Practice SQL Smarter</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-xl mx-auto">Upload your own SQL exercises, get instant feedback, and learn with AI-powered hints.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/practice">
              <button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 text-white font-semibold rounded-lg shadow transition-all duration-200 transform hover:scale-105 active:scale-100 cursor-pointer">Start Practicing</button>
            </Link>
            <label htmlFor="file-upload-home" className="px-8 py-3 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 font-semibold rounded-lg shadow hover:bg-blue-50 dark:hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 transition-all duration-200 transform hover:scale-105 active:scale-100 cursor-pointer">
                    Upload PDF
              <input id="file-upload-home" type="file" accept=".pdf" className="sr-only" disabled />
                  </label>
                </div>
        </motion.section>

        {/* How It Works Section */}
        <motion.section {...fadeIn(0.1)} className="w-full max-w-3xl mb-20">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-10 text-center tracking-tight">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="flex flex-col items-center">
              <DocumentArrowUpIcon className="h-12 w-12 text-blue-600 dark:text-blue-400 mb-2" aria-hidden="true" />
              <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-1 text-lg">1. Upload PDF</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center text-base">Bring your own SQL exercises by uploading a PDF file.</p>
            </div>
            <div className="flex flex-col items-center">
              <CodeBracketIcon className="h-12 w-12 text-blue-600 dark:text-blue-400 mb-2" aria-hidden="true" />
              <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-1 text-lg">2. Practice</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center text-base">Answer questions in a smart code editor with instant feedback and AI hints.</p>
                </div>
            <div className="flex flex-col items-center">
              <ChartBarIcon className="h-12 w-12 text-blue-600 dark:text-blue-400 mb-2" aria-hidden="true" />
              <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-1 text-lg">3. Track Progress</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center text-base">See your improvement and review answers anytime.</p>
            </div>
          </div>
        </motion.section>

        {/* Features Section */}
        <motion.section {...fadeIn(0.2)} className="w-full max-w-5xl mb-20">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-10 text-center tracking-tight">Why ReanSQL?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 flex flex-col items-center transition-all hover:shadow-lg">
              <AcademicCapIcon className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-2" aria-hidden="true" />
              <span className="font-semibold text-blue-700 dark:text-blue-300 mb-1 text-lg">AI-generated Answers</span>
              <span className="text-gray-600 dark:text-gray-400 text-center text-base">Get instant, accurate SQL solutions and explanations powered by AI.</span>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 flex flex-col items-center transition-all hover:shadow-lg">
              <CodeBracketIcon className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-2" aria-hidden="true" />
              <span className="font-semibold text-blue-700 dark:text-blue-300 mb-1 text-lg">Advanced Code Editor</span>
              <span className="text-gray-600 dark:text-gray-400 text-center text-base">Practice in a syntax-highlighted, user-friendly SQL editor.</span>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 flex flex-col items-center transition-all hover:shadow-lg">
              <ChartBarIcon className="h-8 w-8 text-green-500 dark:text-green-400 mb-2" aria-hidden="true" />
              <span className="font-semibold text-green-700 dark:text-green-300 mb-1 text-lg">Progress Tracking</span>
              <span className="text-gray-600 dark:text-gray-400 text-center text-base">Visualize your learning journey and achievements.</span>
        </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 flex flex-col items-center transition-all hover:shadow-lg">
              <ArrowPathIcon className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-2" aria-hidden="true" />
              <span className="font-semibold text-blue-700 dark:text-blue-300 mb-1 text-lg">Randomized Questions</span>
              <span className="text-gray-600 dark:text-gray-400 text-center text-base">Never get bored—questions appear in a new order each time.</span>
              </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 flex flex-col items-center transition-all hover:shadow-lg">
              <MagnifyingGlassIcon className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-2" aria-hidden="true" />
              <span className="font-semibold text-blue-700 dark:text-blue-300 mb-1 text-lg">Review Mode</span>
              <span className="text-gray-600 dark:text-gray-400 text-center text-base">Browse, search, and mark questions as understood or for review.</span>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 flex flex-col items-center transition-all hover:shadow-lg">
              <ChatBubbleLeftRightIcon className="h-8 w-8 text-green-500 dark:text-green-400 mb-2" aria-hidden="true" />
              <span className="font-semibold text-green-700 dark:text-green-300 mb-1 text-lg">AI Assistance</span>
              <span className="text-gray-600 dark:text-gray-400 text-center text-base">Get hints and explanations from an AI-powered chat assistant.</span>
              </div>
          </div>
        </motion.section>

        {/* Quick Access Section */}
        <motion.section {...fadeIn(0.3)} className="w-full max-w-2xl flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Link href="/practice">
            <button className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 text-white font-semibold rounded-lg shadow transition-all duration-200 transform hover:scale-105 active:scale-100 cursor-pointer">Go to Practice</button>
          </Link>
          <Link href="/review">
            <button className="w-full sm:w-auto px-8 py-3 bg-green-500 hover:bg-green-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-500 text-white font-semibold rounded-lg shadow transition-all duration-200 transform hover:scale-105 active:scale-100 cursor-pointer">Review Questions</button>
          </Link>
        </motion.section>
      </main>
    </div>
  );
}