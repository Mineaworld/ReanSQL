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
          <header className="border-b border-gray-200 bg-white">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex h-16 items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src="/ReanSQL.svg" alt="ReanSQL Logo" className="h-8 w-8" />
                  <span className="text-xl text-black font-semibold">ReanSQL</span>
                </div>
                {/* Navigation Menu */}
                <nav className="flex gap-6">
                  <Link href="/" className="text-gray-700 hover:text-blue-700 font-medium transition-colors cursor-pointer">Home</Link>
                  <Link href="/practice" className="text-gray-700 hover:text-blue-700 font-medium transition-colors cursor-pointer">Practice</Link>
                  <Link href="/review" className="text-gray-700 hover:text-blue-700 font-medium transition-colors cursor-pointer">Review</Link>
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
