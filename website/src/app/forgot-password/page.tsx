'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#050505] flex items-center justify-center px-6 overflow-hidden">
      
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-cyan-950/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-red-950/10 blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center group">
            <img 
              src="/boo-tube-icon.svg" 
              alt="BooTube Logo" 
              className="h-9 w-auto transition-transform duration-300 group-hover:scale-105 filter drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]"
            />
          </Link>
          <h2 className="text-xl font-bold text-white mt-4">Reset your password</h2>
          <p className="text-xs text-gray-400 mt-1">We'll send you a secure link to reset your password.</p>
        </div>

        {/* Form Card */}
        <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
          {success ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-xl text-cyan-400 mx-auto mb-4">
                ✉️
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Check your email</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                We have sent a secure link to <strong className="text-cyan-400">{email}</strong>. 
                Please click the link in that email to reset your password.
              </p>
              <div className="mt-8">
                <Link 
                  href="/login" 
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  ← Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResetRequest} className="space-y-5">
              
              {error && (
                <div className="p-3 rounded-lg bg-red-950/20 border border-red-500/20 text-xs text-red-400">
                  ⚠️ {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending reset link...
                  </>
                ) : 'Send Reset Link'}
              </button>

              <div className="text-center pt-2">
                <Link 
                  href="/login" 
                  className="text-xs font-semibold text-gray-400 hover:text-white transition-colors"
                >
                  ← Cancel and return to Login
                </Link>
              </div>

            </form>
          )}
        </div>

        <div className="text-center mt-8">
          <Link href="/" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            ← Back to Home
          </Link>
        </div>

      </div>
    </div>
  );
}
