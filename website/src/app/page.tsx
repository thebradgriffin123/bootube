'use client';

import React, { useState } from 'react';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "Does BooTube work on Netflix or Hulu?",
      a: "Yes! BooTube currently supports YouTube, Disney+, Hulu, Plex, and Fandango at Home (Vudu). Support for Netflix and Amazon Prime Video is coming soon."
    },
    {
      q: "Will streaming services ban my account for using this?",
      a: "Absolutely not. BooTube does not violate any terms of service, decrypt media, or block ads. It simply reads official subtitle tracks locally inside your browser/app and adjusts the volume slider in real-time."
    },
    {
      q: "Is my personal data sold to third parties?",
      a: "Never. BooTube is built with privacy-first architecture. All parsing, scanning, and muting run 100% locally on your own device. Your custom settings and blocklists stay secure in your own account."
    },
    {
      q: "What is the difference between Blasphemy and Profanity filters?",
      a: "Our free tier includes 100% free filtering for blasphemous and religious exclamations. The Premium Plan unlocks advanced profanity (vulgarity, slurs), custom word blocklists, video player blurring, and cross-device sync."
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#050505] text-gray-100 overflow-x-hidden selection:bg-cyan-500 selection:text-black">

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#050505]/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <a href="#" className="flex items-center gap-3 group">
            <img 
              src="/boo-tube-icon.svg" 
              alt="BooTube Logo" 
              className="w-9 h-9 transition-transform duration-300 group-hover:scale-110 filter drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]"
            />
            <span className="text-2xl font-black tracking-tight text-white">
              Boo<span className="text-red-500 transition-colors duration-300 group-hover:text-red-400">Tube</span>
            </span>
          </a>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Why BooTube</a>
            <a href="#compatibility" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Compatibility</a>
            <a href="#pricing" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">FAQ</a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <a href="/login" className="text-sm font-semibold hover:text-white transition-colors px-4 py-2 text-gray-300">Sign In</a>
            <a 
              href="https://chromewebstore.google.com/detail/BooTube/bfocenkbkchffgnogonjhmlfpgnhbloa" 
              target="_blank"
              className="text-sm font-bold bg-white text-black hover:bg-gray-200 transition-all px-5 py-2.5 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.15)] hover:shadow-[0_0_20px_rgba(255,255,255,0.25)]"
            >
              Get Started
            </a>
          </div>

          {/* Mobile menu trigger */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="md:hidden p-2 text-gray-400 hover:text-white focus:outline-none"
            aria-label="Toggle Menu"
          >
            <svg className="h-6 w-6 fill-none stroke-current" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-white/5 bg-[#050505] px-6 py-6 flex flex-col gap-4 animate-in slide-in-from-top-5 duration-200">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-gray-300">Why BooTube</a>
            <a href="#compatibility" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-gray-300">Compatibility</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-gray-300">Pricing</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-gray-300">FAQ</a>
            <hr className="border-white/5 my-2" />
            <a href="/login" className="text-lg font-medium text-gray-300">Sign In</a>
            <a 
              href="https://chromewebstore.google.com/detail/BooTube/bfocenkbkchffgnogonjhmlfpgnhbloa"
              className="w-full text-center py-3 bg-white text-black font-bold rounded-full"
            >
              Get Started
            </a>
          </div>
        )}
      </nav>

      {/* Netflix-Style Hero Section (Full-bleed Background) */}
      <section className="relative min-h-screen flex items-center px-6 pt-20">
        
        {/* Hero Background Image (Un-flipped) */}
        <div 
          className="absolute inset-0 bg-cover bg-center z-0"
          style={{ 
            backgroundImage: "url('/hero-bg.jpg')"
          }}
        />
        
        {/* Cinematic Uniform Overlay & Vertical Vignette (for centered text contrast) */}
        <div className="absolute inset-0 bg-black/65 z-1" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-transparent to-[#050505] z-1" />
        
        {/* Centered Content Container */}
        <div className="max-w-5xl mx-auto w-full flex flex-col items-center justify-center text-center relative z-10 py-20 md:py-28">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/45 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-8 backdrop-blur-sm">
            ✨ Now supporting YouTube, Disney+, Hulu & Plex
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.1] mb-6 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] max-w-4xl">
            Because &apos;Family Friendly&apos; shouldn&apos;t come with sudden surprises.
          </h1>
          
          <p className="text-lg md:text-xl text-gray-300 leading-relaxed mb-10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] max-w-3xl">
            Tired of scrambling for the remote? BooTube automatically mutes profanity and blasphemy in real-time. Clean up your favorite YouTube videos and podcasts, plus major streaming platforms, without cutting a single scene.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full sm:w-auto mb-6">
            <a 
              href="https://chromewebstore.google.com/detail/BooTube/bfocenkbkchffgnogonjhmlfpgnhbloa" 
              target="_blank"
              className="w-full sm:w-auto text-center px-10 py-4.5 bg-white text-black font-extrabold rounded-full shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_45px_rgba(255,255,255,0.35)] transition-all hover:bg-gray-100 text-base"
            >
              Get BooTube — It&apos;s Free
            </a>
            <a 
              href="#pricing" 
              className="w-full sm:w-auto text-center px-10 py-4.5 border border-white/15 hover:border-white/25 bg-black/45 hover:bg-black/60 backdrop-blur-sm text-white font-semibold rounded-full transition-all text-base"
            >
              View Premium Plans
            </a>
          </div>

          <p className="text-sm text-gray-400 mb-12 italic drop-shadow-[0_1px_5px_rgba(0,0,0,0.9)]">
            Blasphemy filtering is 100% free. Upgrade to filter profanity, blur screens, and add custom words for just $3.99/month.
          </p>

          {/* Centered HUD Indicator */}
          <div className="p-5 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md shadow-2xl flex items-center justify-between gap-6 max-w-[340px] w-full transform hover:scale-105 transition-transform duration-300">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
              <div>
                <h4 className="text-xs font-bold text-white tracking-wide uppercase">Active Filter</h4>
                <p className="text-[10px] text-gray-400">YouTube, Disney+, Hulu, Plex</p>
              </div>
            </div>
            <div className="px-3.5 py-2 rounded-lg bg-cyan-950/40 border border-cyan-500/20 text-[10px] font-black uppercase text-cyan-400 tracking-wider">
              🔇 Sound Muted
            </div>
          </div>

        </div>
      </section>

      {/* Section 1: Where We Work Logo Bar */}
      <section id="compatibility" className="border-t border-b border-white/5 bg-black/40 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-xs font-extrabold uppercase tracking-widest text-cyan-400/80 mb-8">
            Works Seamlessly With
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 md:gap-x-16">
            <span className="text-gray-500 hover:text-gray-300 font-bold tracking-tight text-xl md:text-2xl transition-colors cursor-default">
              YouTube
            </span>
            <span className="text-gray-500 hover:text-gray-300 font-black tracking-tighter text-xl md:text-2xl transition-colors cursor-default">
              DISNEY+
            </span>
            <span className="text-gray-500 hover:text-gray-300 font-bold tracking-tight text-xl md:text-2xl transition-colors cursor-default italic">
              hulu
            </span>
            <span className="text-gray-500 hover:text-gray-300 font-black tracking-normal text-xl md:text-2xl transition-colors cursor-default">
              PLEX
            </span>
            <span className="text-gray-500 hover:text-gray-300 font-extrabold tracking-wide text-xl md:text-2xl transition-colors cursor-default">
              Fandango
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-600 font-semibold text-lg line-through tracking-normal opacity-50 cursor-default">
                Netflix
              </span>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white/5 text-gray-500 border border-white/5">
                Soon
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-600 font-semibold text-lg line-through tracking-normal opacity-50 cursor-default">
                Prime Video
              </span>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white/5 text-gray-500 border border-white/5">
                Soon
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Why BooTube is Different */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Censoring Done Right
          </h2>
          <p className="text-gray-400">
            Unlike heavy traditional filtering platforms, BooTube is designed for the modern streaming era.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1 */}
          <div className="p-8 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-cyan-500/10 transition-all group">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-cyan-950/20 border border-cyan-500/20 text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
              🎙️
            </div>
            <h3 className="text-lg font-bold text-white mb-3">
              Built for the Modern Internet (YouTube)
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Traditional filters only work on Hollywood movies. BooTube cleans up the endless hours of YouTube-hosted podcasts, educational videos, and creators your family actually watches daily.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-8 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-red-500/10 transition-all group">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-red-950/20 border border-red-500/20 text-red-400 mb-6 group-hover:scale-110 transition-transform">
              ✂️
            </div>
            <h3 className="text-lg font-bold text-white mb-3">
              Zero Interrupted Playback
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              We don&apos;t violently cut entire scenes or pause your video. We quietly mute the specific audio track in real-time for fractions of a second while the video plays seamlessly.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-8 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-cyan-500/10 transition-all group">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-cyan-950/20 border border-cyan-500/20 text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
              ⚖️
            </div>
            <h3 className="text-lg font-bold text-white mb-3">
              Unmatched Platform Access
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Because we operate via client-side scripts, we can filter services other platforms are legally blocked from—including Disney+, Hulu, and your personal Plex server files.
            </p>
          </div>

        </div>
      </section>

      {/* Section 3: Simple Pricing Tiers */}
      <section id="pricing" className="py-24 px-6 border-t border-white/5 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Simple, Honest Pricing
            </h2>
            <p className="text-gray-400">
              Get started with essential filtering for free, or unlock advanced features with a premium plan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
            
            {/* Free Plan */}
            <div className="flex flex-col p-8 rounded-2xl border border-white/5 bg-black/40 relative">
              <h3 className="text-xl font-bold text-white mb-2">Free Plan</h3>
              <p className="text-sm text-gray-400 mb-6">Essential blasphemy censoring for everyone.</p>
              
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-black text-white">$0</span>
                <span className="text-xs text-gray-500 font-medium">/ forever</span>
              </div>

              <hr className="border-white/5 mb-8" />

              <ul className="space-y-4 mb-8 flex-grow">
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="text-cyan-400">✓</span> 100% Free Blasphemy filtering
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="text-cyan-400">✓</span> Mutes YouTube & Podcasts
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="text-cyan-400">✓</span> Mutes Disney+, Hulu, Plex & Vudu
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="text-cyan-400">✓</span> Offline real-time processing
                </li>
              </ul>

              <a 
                href="https://chromewebstore.google.com/detail/BooTube/bfocenkbkchffgnogonjhmlfpgnhbloa"
                target="_blank"
                className="w-full text-center py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl transition-all"
              >
                Add to Browser
              </a>
            </div>

            {/* Premium Plan */}
            <div className="flex flex-col p-8 rounded-2xl border border-cyan-500/20 bg-cyan-950/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-4 py-1.5 bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest rounded-bl-xl">
                Most Popular
              </div>

              <h3 className="text-xl font-bold text-white mb-2">Premium Plan</h3>
              <p className="text-sm text-gray-400 mb-6">Full customization and syncing across devices.</p>
              
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-black text-white">$3.99</span>
                <span className="text-xs text-cyan-400 font-medium">/ month</span>
              </div>

              <hr className="border-cyan-500/10 mb-8" />

              <ul className="space-y-4 mb-8 flex-grow">
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="text-cyan-400">✓</span> **Everything in Free**
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="text-cyan-400">✓</span> Full Profanity & Vulgarity filtering
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="text-cyan-400">✓</span> Custom word & phrase blocklists
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="text-cyan-400">✓</span> Smart screen blurring during alerts
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="text-cyan-400">✓</span> Video buffer timer controls
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="text-cyan-400">✓</span> **Unified account cloud sync**
                </li>
              </ul>

              <a 
                href="/signup" 
                className="w-full text-center py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.25)]"
              >
                Upgrade to Premium
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* Section 4: FAQ Accordion */}
      <section id="faq" className="py-24 px-6 max-w-4xl mx-auto">
        <h2 className="text-3xl font-extrabold text-white text-center mb-12">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = activeFaq === index;
            return (
              <div key={index} className="border border-white/5 rounded-xl bg-white/[0.01] overflow-hidden transition-all">
                <button
                  onClick={() => setActiveFaq(isOpen ? null : index)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between text-base font-bold text-white hover:bg-white/[0.02]"
                >
                  <span>{faq.q}</span>
                  <span className="text-gray-500 font-normal">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-sm text-gray-400 leading-relaxed border-t border-white/5 pt-4 bg-[#050505]/40">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6 bg-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/boo-tube-icon.svg" alt="BooTube Logo" className="w-7 h-7" />
            <span className="text-lg font-bold text-white tracking-tight">
              Boo<span className="text-red-500">Tube</span>
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-8 text-xs text-gray-500">
            <a href="/privacy" className="hover:text-gray-300">Privacy Policy</a>
            <a href="/terms" className="hover:text-gray-300">Terms of Use</a>
            <a href="/support" className="hover:text-gray-300">Support Desk</a>
            <a href="https://chromewebstore.google.com/detail/BooTube/bfocenkbkchffgnogonjhmlfpgnhbloa" target="_blank" className="hover:text-gray-300">Chrome Store</a>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-white/5 text-center text-[10px] text-gray-600 leading-relaxed">
          <p className="mb-4">
            &copy; 2026 BooTube. Built for a cleaner internet.
          </p>
          <p className="max-w-4xl mx-auto italic">
            Disclaimer: BooTube is an independent browser extension and mobile application. It is not affiliated with, sponsored by, or endorsed by Google LLC (YouTube), Disney Enterprises, Inc. (Disney+), Hulu LLC, Plex, Inc., Fandango Media, LLC, Netflix, Inc., Amazon.com, Inc., or any other third-party streaming service mentioned. All trademarks and registered trademarks are the property of their respective owners.
          </p>
        </div>
      </footer>

    </div>
  );
}
