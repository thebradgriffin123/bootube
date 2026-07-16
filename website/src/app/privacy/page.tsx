'use client';

import React from 'react';
import Link from 'next/link';

export default function PrivacyPage() {
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

      {/* Privacy Policy Content */}
      <main className="max-w-3xl mx-auto w-full px-6 pt-32 pb-24 flex-grow relative z-10">
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 md:p-10 shadow-xl space-y-8">
          <div>
            <h1 className="text-3xl font-black text-white">Privacy Policy</h1>
            <p className="text-xs text-cyan-400 font-semibold mt-1">Last updated: July 3, 2026</p>
          </div>

          <div className="space-y-6 text-sm text-gray-300 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">1. What Data We Collect</h2>
              <p>
                BooTube collects absolutely no personal data, browsing history, or metrics. The only data collected is the list of censored words you manually add to your blocklist and your basic UI toggle preferences (e.g., whether the Blur effect is enabled).
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">2. How Data Is Stored</h2>
              <p>
                Your custom blocklist and application preferences are stored locally on your device using local sandboxed storage. We do not maintain any cloud databases or external backups of your preferences.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">3. How Data Is Used</h2>
              <p>
                Your blocklist is used exclusively to scan the local closed-caption text of YouTube, Hulu, Disney+, and Plex videos on your device to determine when to mute or blur the video player.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">4. Third-Party Services</h2>
              <p>
                This application does not use any third-party services, analytics trackers, or external APIs. All scanning and censoring algorithms run completely client-side in your local environment.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">5. Data Sharing</h2>
              <p>
                BooTube does NOT transmit any data off your device. Your blocklist and preferences are never shared with the developer, Google, or any third party.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">6. Data Retention and Deletion</h2>
              <p>
                Data is retained locally on your machine for as long as the application is installed. You can delete all your stored data at any time by uninstalling the application or clearing your custom blocklist inside the settings menu.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">7. Contact Information</h2>
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
