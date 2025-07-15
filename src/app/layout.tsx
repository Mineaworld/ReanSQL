import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReanSQL - SQL Practice App",
  description: "Practice your SQL skills by uploading PDFs and solving exercises with AI assistance",
  icons: {
    icon: "/ReanSQL.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}
      >
        <main className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-30 backdrop-blur-lg bg-white/40 dark:bg-[#18181b]/60 border-b border-gray-200 dark:border-gray-800 shadow-md transition-all">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex h-16 items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src="/ReanSQL.svg" alt="ReanSQL Logo" className="h-8 w-8" />

                  <a href="\"><span className="text-xl text-black dark:text-white font-extrabold tracking-tight select-none">ReanSQL</span></a>
                </div>
                {/* Navigation Menu */}
                <nav className="flex gap-2 sm:gap-4 md:gap-6">
                  <Link href="/" className="px-3 py-1.5 rounded-lg font-semibold text-gray-700 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400">Home</Link>
                  <Link href="/practice" className="px-3 py-1.5 rounded-lg font-semibold text-gray-700 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400">Practice</Link>
                  <Link href="/review" className="px-3 py-1.5 rounded-lg font-semibold text-gray-700 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400">Review</Link>
                </nav>
              </div>
            </div>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
