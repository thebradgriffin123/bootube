'use client';

import React from 'react';
import Link from 'next/link';
import HowItWorks from '@/components/HowItWorks';

export default function HowItWorksPreviewPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans select-none relative">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-white/5 bg-[#050505]/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <img 
              src="/boo-tube-icon.svg" 
              alt="BooTube Logo" 
              className="h-8 w-auto transition-transform duration-300 group-hover:scale-105 filter drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]"
            />
          </Link>
          <Link href="/" className="text-xs font-bold text-gray-400 hover:text-white transition-colors">
            ← Back to Home
          </Link>
        </div>
      </nav>

      {/* Interactive Showcase Section */}
      <main className="flex-grow">
        <HowItWorks />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6 bg-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center">
            <img src="/boo-tube-icon.svg" alt="BooTube Logo" className="h-6 w-auto" />
          </div>

          <div className="flex flex-wrap justify-center gap-8 text-xs text-gray-500">
            <Link href="/privacy" className="hover:text-gray-300">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-gray-300">Terms of Use</Link>
            <Link href="/support" className="hover:text-gray-300">Support Desk</Link>
            <a href="https://chromewebstore.google.com/detail/BooTube/bfocenkbkchffgnogonjhmlfpgnhbloa" target="_blank" className="hover:text-gray-300">Chrome Store</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
