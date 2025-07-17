"use client";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "success" | "danger";
  loading?: boolean;
}

const variantClasses = {
  primary: "bg-blue-700 text-white hover:bg-blue-800 focus:ring-blue-400",
  secondary: "bg-gray-700 text-gray-100 hover:bg-gray-600 focus:ring-gray-400",
  success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-400",
  danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-400",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", loading, className = "", children, ...props }, ref) => (
    <button
      ref={ref}
      className={`px-6 py-2 rounded-full font-bold shadow-md transition-all text-base focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${
        variantClasses[variant]
      } ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="inline-block animate-spin mr-2 align-middle w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>
      ) : null}
      {children}
    </button>
  )
);
Button.displayName = "Button";

export default Button; 