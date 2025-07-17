"use client";
import React from "react";

interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
}

export default function ProgressBar({ value, label }: ProgressBarProps) {
  return (
    <div className="w-full">
      {label && <div className="flex items-center justify-between mb-1"><span className="text-xs text-gray-400">{label}</span><span className="text-xs text-gray-400">{value}%</span></div>}
      <div className="w-full h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-3 bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${value}%` }}
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        />
      </div>
    </div>
  );
} 