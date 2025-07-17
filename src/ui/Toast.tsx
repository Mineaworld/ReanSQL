"use client";
import React, { useEffect } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  open: boolean;
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ open, message, type = "info", onClose, duration = 2500 }: ToastProps) {
  useEffect(() => {
    if (open) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [open, duration, onClose]);

  if (!open) return null;

  const color =
    type === "success"
      ? "bg-green-600 text-white"
      : type === "error"
      ? "bg-red-600 text-white"
      : "bg-blue-700 text-white";

  return (
    <div className={`fixed bottom-6 right-6 z-50 px-6 py-3 rounded-lg shadow-lg ${color} animate-fade-in`}>
      <span>{message}</span>
      <button className="ml-4 text-white/80 hover:text-white font-bold" onClick={onClose} aria-label="Close toast">&times;</button>
    </div>
  );
} 