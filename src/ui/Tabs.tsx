"use client";
import React from "react";

interface Tab {
  label: string;
  value: string;
}

interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function Tabs({ tabs, value, onChange, className = "" }: TabsProps) {
  return (
    <div className={`flex gap-2 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          className={`px-4 py-2 rounded-lg font-semibold transition-all text-base focus:outline-none focus:ring-2 focus:ring-blue-400 ${
            value === tab.value
              ? "bg-blue-700 text-white shadow-lg scale-105"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-blue-900"
          }`}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
} 