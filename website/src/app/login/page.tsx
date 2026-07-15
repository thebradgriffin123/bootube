'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Track focus/blur interactions
  const [emailTouched, setEmailTouched] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Email validation regex check
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowValidation(true);
    setEmailTouched(true);

    if (!isEmailValid) return;

    setLoading(true);

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        setError(loginError.message);
      } else {
        router.push('/dashboard');
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
          <h2 className="text-xl font-bold text-white mt-4">Welcome back</h2>
          <p className="text-xs text-gray-400 mt-1">Sign in to manage your filters and account settings.</p>
        </div>

        {/* Form Card */}
        <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleLogin} noValidate className="space-y-5">
            
            {error && (
              <div className="p-3 rounded-lg bg-red-950/20 border border-red-500/20 text-xs text-red-400">
                ⚠️ {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2">Email address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                placeholder="name@domain.com"
                className={`w-full bg-white/[0.03] border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 transition-all ${
                  (emailTouched || showValidation) && !isEmailValid
                    ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/50'
                    : 'border-white/10 focus:border-cyan-500/50 focus:ring-cyan-500/50'
                }`}
              />
              {(emailTouched || showValidation) && !isEmailValid && (
                <p className="text-red-400 text-xs mt-1.5">
                  Please enter a valid email address.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              />
            </div>

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
                Forgot password?
              </Link>
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
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>

          </form>

          <div className="mt-6 text-center text-xs text-gray-500">
            Don&apos;t have an account yet?{' '}
            <Link href="/signup" className="text-cyan-400 font-bold hover:underline">
              Create Account
            </Link>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            ← Back to Home
          </Link>
        </div>

      </div>
    </div>
  );
}
