'use client';

import React from 'react';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#08080a] via-[#050505] to-[#030304] text-gray-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black overflow-hidden">
      
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

      {/* Privacy Policy Content */}
      <main className="max-w-3xl mx-auto w-full px-6 pt-32 pb-24 flex-grow relative z-10">
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 md:p-10 shadow-xl space-y-8">
          <div>
            <h1 className="text-3xl font-black text-white">Privacy Policy</h1>
            <p className="text-xs text-cyan-400 font-semibold mt-1">Last updated: October 28, 2026</p>
          </div>

          <div className="space-y-6 text-sm text-gray-300 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">1. 100% Local Subtitle Scanning &amp; Zero Viewing History</h2>
              <p>
                BooTube is built on a strict privacy-first architecture. All closed-caption parsing, profanity/blasphemy detection, audio muting, and video blurring across all 13 supported streaming platforms (YouTube, Netflix, Disney+, Hulu, Max, Prime Video, Paramount+, Peacock, Plex, Fandango at Home, Spotify, Facebook, and X) execute <strong>100% locally on your device</strong>. We never collect, log, or transmit your browsing history, video titles, watch activity, or subtitle contents.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">2. Information We Collect (Optional Accounts &amp; Billing)</h2>
              <p>
                You can use BooTube&apos;s Free Plan without creating an account. If you choose to create an account or upgrade to BooTube Premium, we collect only the minimum information required to provide cloud sync and subscription management:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-300">
                <li><strong>Account Credentials:</strong> Your email address and encrypted authentication token (managed via Supabase Auth).</li>
                <li><strong>Synced Filter Preferences:</strong> Your custom blocked words, category toggles, blur settings, and mute buffer preferences so they stay in sync across your devices.</li>
                <li><strong>Billing Details:</strong> Subscription payment processing is handled directly by <strong>Stripe</strong>. BooTube never stores or has access to your raw credit card number.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">3. How Your Information Is Stored &amp; Protected</h2>
              <p>
                Local extension and app settings are stored inside your browser or device&apos;s sandboxed local storage. For signed-in users, account profiles and custom word lists are stored securely in our encrypted Supabase database protected by Row-Level Security (RLS).
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">4. No Selling or Sharing of Personal Data</h2>
              <p>
                We never sell, rent, or trade your personal data to advertisers, data brokers, or third parties. Trusted infrastructure providers (Supabase for authentication/database, Stripe for payment processing, and Resend for transactional account emails) process data strictly to operate the Service on your behalf.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">5. Data Retention &amp; One-Click Account Deletion</h2>
              <p>
                Local device preferences remain on your device until you clear them or uninstall BooTube. If you have a BooTube account, you can permanently delete your account, cloud preferences, and active subscription data at any time directly from your <Link href="/account" className="text-cyan-400 hover:underline">Account Portal</Link>.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">6. Contact Information</h2>
              <p>
                For any privacy inquiries or questions regarding this policy, please contact us at <a href="mailto:support@mythic-makers.com" className="text-cyan-400 hover:underline">support@mythic-makers.com</a>.
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
            <a href="https://chromewebstore.google.com/detail/BooTube/bfocenkbkchffgnogonjhmlfpgnhbloa" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">Chrome Store</a>
            <a href="https://addons.mozilla.org/firefox/addon/addon@bootube.app/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">Firefox Add-ons</a>
            <a href="https://play.google.com/store/apps/details?id=com.bootube.app" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">Google Play</a>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-white/5 text-center text-[10px] text-gray-500 leading-relaxed">
          <p className="mb-4">
            &copy; 2026 BooTube. Built for a cleaner internet.
          </p>
          <p className="max-w-4xl mx-auto italic">
            Disclaimer: BooTube is an independent browser extension and mobile application. It is not affiliated with, sponsored by, or endorsed by Google LLC (YouTube), Netflix, Inc., Disney Enterprises, Inc. (Disney+), Hulu LLC, Warner Bros. Discovery (Max / HBO Max), Amazon.com, Inc. (Prime Video), Paramount Global (Paramount+), NBCUniversal (Peacock), Plex, Inc., Fandango Media, LLC (Fandango at Home), Spotify AB, Meta Platforms, Inc. (Facebook), X Corp., or any other third-party streaming service mentioned. All trademarks and registered trademarks are the property of their respective owners.
          </p>
        </div>
      </footer>

    </div>
  );
}
