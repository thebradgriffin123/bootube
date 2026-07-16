'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock_key';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface FaqItem {
  q: string;
  a: string;
}

export default function SupportPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [platform, setPlatform] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs: FaqItem[] = [
    {
      q: "Why isn't muting/censoring working on Plex, Disney+, or Hulu?",
      a: "Our filter engine relies on reading subtitle data to determine timing. Subtitles must be turned on in the streaming media player interface (e.g. English [CC]) for censoring to function correctly."
    },
    {
      q: "Can I adjust the length of the audio mute?",
      a: "Yes! Clicking on the BooTube toolbar icon opens your settings menu. Under 'Advanced settings', you can use the Mute buffer slider to adjust the safety cushioning (from tight 0.3s up to a wide 1.0s cushion)."
    },
    {
      q: "Is my search history or data collected?",
      a: "No. BooTube is built with a privacy-first mindset. All subtitle interception, parsing, and muting calculation runs 100% locally on your browser. Your data is never sent to external servers."
    },
    {
      q: "How do I copy a specific swear word into my list?",
      a: "For the best results, copy the word exactly as it appears in the video's Closed Captions, including any special punctuation (like trailing periods or dashes) that might be attached to the word."
    },
    {
      q: "Can I whitelist specific channels?",
      a: "Yes! If Respectful Mode's auto-detect fails to whitelist a term on a podcast, click the BooTube icon in your toolbar while watching the video and toggle the 'Trust Channel' switch to whitelist it."
    }
  ];

  // Try to load current user session to pre-populate Name and Email
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          setEmail(session.user.email || '');
          
          // Query profile to fetch display name
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', session.user.id)
            .single();

          if (session.user.email) {
            // Get name from email prefix as a fallback
            const prefix = session.user.email.split('@')[0];
            setName(prefix.charAt(0).toUpperCase() + prefix.slice(1));
          }
        }
      } catch (e) {
        console.error('Failed to pre-fill user info:', e);
      }
    };
    checkUser();
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Generate random Ticket ID
    const randomId = "BT-" + Math.floor(10000 + Math.random() * 90000);
    setTicketId(randomId);

    // Construct mailto link
    const subject = encodeURIComponent(`BooTube Support Request [${randomId}] - ${platform.toUpperCase()}`);
    const body = encodeURIComponent(
      `Ticket ID: #${randomId}\n` +
      `Name: ${name}\n` +
      `Email: ${email}\n` +
      `Platform: ${platform.toUpperCase()}\n\n` +
      `Description of the Issue:\n${description}`
    );

    // Open mail client
    window.location.href = `mailto:support@mythic-makers.com?subject=${subject}&body=${body}`;

    setModalOpen(true);
    setLoading(false);
    setDescription('');
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#08080a] via-[#050505] to-[#030304] text-gray-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black relative overflow-hidden">
      
      {/* Subtle Background Glows */}
      <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full bg-cyan-950/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full bg-blue-950/10 blur-[120px] pointer-events-none" />

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

      {/* Main Support Wrapper */}
      <main className="max-w-5xl mx-auto w-full px-6 pt-32 pb-24 flex-grow relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* Left Side: Support Ticket Form */}
        <section className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 md:p-8 shadow-xl space-y-6">
          <div>
            <h1 className="text-2xl font-black text-white">Support Ticket</h1>
            <p className="text-xs text-gray-400 mt-1">Have a question or running into an issue? Drop us a line below.</p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label htmlFor="supportName" className="block text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1.5">
                Your Name
              </label>
              <input
                type="text"
                id="supportName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                className="w-full bg-[#151821] border border-[#1f222d] rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div>
              <label htmlFor="supportEmail" className="block text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1.5">
                Your Email
              </label>
              <input
                type="email"
                id="supportEmail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                required
                className="w-full bg-[#151821] border border-[#1f222d] rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div>
              <label htmlFor="supportPlatform" className="block text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1.5">
                Streaming Platform
              </label>
              <div className="relative">
                <select
                  id="supportPlatform"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  required
                  className="w-full bg-[#151821] border border-[#1f222d] rounded-xl pl-3 pr-10 py-2.5 text-xs text-white appearance-none focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="" disabled>Select active platform</option>
                  <option value="youtube">YouTube</option>
                  <option value="disney">Disney+</option>
                  <option value="hulu">Hulu</option>
                  <option value="plex">Plex</option>
                  <option value="other">Other / Setup Issue</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <svg className="h-3 w-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="supportDesc" className="block text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1.5">
                Describe the Issue
              </label>
              <textarea
                id="supportDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Let us know what's happening. If a specific word didn't mute, let us know the platform and show/video name."
                rows={5}
                required
                className="w-full bg-[#151821] border border-[#1f222d] rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Compiling Ticket...' : 'Submit Ticket'}
            </button>
          </form>
        </section>

        {/* Right Side: Troubleshooting FAQs */}
        <section className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 md:p-8 shadow-xl space-y-6">
          <h2 className="text-xl font-black text-white">Troubleshooting FAQ</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div key={index} className="border border-white/5 rounded-xl bg-white/[0.01] overflow-hidden transition-all">
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : index)}
                    className="w-full text-left px-5 py-4 flex items-center justify-between text-xs font-bold text-white hover:bg-white/[0.02]"
                  >
                    <span>{faq.q}</span>
                    <span className="text-gray-500 font-normal">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-[11px] text-gray-400 leading-relaxed border-t border-white/5 pt-3 bg-[#050505]/40">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6 bg-black mt-auto">
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

        <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-white/5 text-center text-[10px] text-gray-600 leading-relaxed">
          <p className="mb-4">
            &copy; 2026 BooTube. Built for a cleaner internet.
          </p>
          <p className="max-w-4xl mx-auto italic">
            Disclaimer: BooTube is an independent browser extension and mobile application. It is not affiliated with, sponsored by, or endorsed by Google LLC (YouTube), Disney Enterprises, Inc. (Disney+), Hulu LLC, Plex, Inc., Fandango Media, LLC, Netflix, Inc., Amazon.com, Inc., or any other third-party streaming service mentioned. All trademarks and registered trademarks are the property of their respective owners.
          </p>
        </div>
      </footer>

      {/* Success Dialog Modal Overlay */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0e12] border border-[#1f222d] rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center space-y-4">
            <div className="text-4xl">👻</div>
            <h2 className="text-lg font-black text-white">Ticket Created!</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Your support ticket has been compiled. A member of the Mythic Makers support crew will review the request and get in touch with you shortly.
            </p>
            <div className="bg-cyan-950/30 border border-dashed border-cyan-500/30 rounded-lg p-2.5 font-mono text-sm text-cyan-400">
              #{ticketId}
            </div>
            <button
              onClick={() => setModalOpen(false)}
              className="w-full py-2 bg-white/[0.05] border border-white/10 hover:bg-white/[0.1] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Awesome
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
