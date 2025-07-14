import React from 'react';

export default function ReviewPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-10 mt-20 border border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-blue-700 dark:text-blue-300 mb-4">Review Mode</h1>
        <p className="text-gray-700 dark:text-gray-200 text-lg">This is a placeholder for the Review Mode. Here you will be able to browse, search, and filter all parsed questions, view AI-generated answers and explanations, and mark questions as understood or needing review.</p>
        <p className="mt-4 text-gray-500 dark:text-gray-400">(Feature coming soon!)</p>
      </div>
    </div>
  );
} 