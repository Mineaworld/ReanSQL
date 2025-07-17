"use client";
import React from "react";

export default function AceternityLoader({ message = "Processing your PDF..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] w-full">
      <div className="relative flex items-center justify-center">
        <span className="absolute inline-flex h-16 w-16 rounded-full bg-gradient-to-tr from-blue-400 via-purple-400 to-pink-400 opacity-60 blur-xl animate-pulse"></span>
        <svg className="h-16 w-16 animate-spin text-blue-500 drop-shadow-lg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
      <div className="mt-6 text-lg font-semibold text-blue-600 dark:text-blue-200 animate-pulse text-center">
        {message}
      </div>
    </div>
  );
} 