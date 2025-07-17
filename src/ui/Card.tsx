"use client";
import React from "react";

export default function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white dark:bg-gray-950 shadow-xl border border-gray-200 dark:border-gray-800 p-6 ${className}`}>
      {children}
    </div>
  );
} 