'use client';

import React from 'react';
import Link from 'next/link';

export default function TermsPage() {
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

      {/* Terms of Use Content */}
      <main className="max-w-3xl mx-auto w-full px-6 pt-32 pb-24 flex-grow relative z-10">
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 md:p-10 shadow-xl space-y-8">
          <div>
            <h1 className="text-3xl font-black text-white">Terms of Use</h1>
            <p className="text-xs text-cyan-400 font-semibold mt-1">Last updated: July 16, 2026</p>
          </div>

          <div className="space-y-6 text-sm text-gray-300 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">1. Agreement to Terms</h2>
              <p>
                By downloading, installing, or using the BooTube browser extension or mobile application (collectively, the &quot;Service&quot;), provided by Mythic Makers LLC (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you agree to be bound by these Terms of Use. If you do not agree to these terms, do not install or use the Service.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">2. License Grant</h2>
              <p>
                We grant you a limited, non-exclusive, non-transferable, revocable license to use the Service solely for your personal, non-commercial purposes in accordance with these Terms.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">3. User Conduct and Restrictions</h2>
              <p>
                You agree not to modify, reverse engineer, decompile, or disassemble the Service. You shall not use the Service to bypass, modify, or interfere with security features or content encryption of any streaming platform, or use it for any unlawful purpose.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">4. Subscriptions, Payments, and Refunds</h2>
              <p>
                The Service offers both a Free tier (including blasphemy filtering) and a Premium subscription ($3.99/month). Billing is processed on a recurring monthly basis. You can cancel your subscription at any time. Refund requests are subject to manual or automated eligibility reviews and can be initiated directly within your account portal.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">5. Disclaimer of Warranties</h2>
              <p>
                The Service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. Because third-party streaming services (such as YouTube, Disney+, Hulu, and Plex) frequently update their code and players, we do not warrant that the Service will remain uninterrupted, error-free, or compatible with all video formats or platform updates indefinitely.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">6. Limitation of Liability</h2>
              <p>
                In no event shall Mythic Makers LLC, its officers, or employees be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use or inability to use the Service.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">7. Governing Law</h2>
              <p>
                These Terms of Use shall be governed by and construed in accordance with the laws of the State of Utah, USA, without regard to its conflict of law principles.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">8. Contact Information</h2>
              <p>
                If you have any questions about these Terms of Use, please contact us at <a href="mailto:support@mythic-makers.com" className="text-cyan-400 hover:underline">support@mythic-makers.com</a>.
              </p>
            </section>
          </div>
        </div>
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

    </div>
  );
}
