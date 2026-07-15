'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Track focus/blur interactions
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  
  const [showValidation, setShowValidation] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Email validation regex check
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Password complexity strength evaluation
  const passwordReqs = {
    length: password.length >= 8,
    casing: /[a-z]/.test(password) && /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^a-zA-Z0-9]/.test(password),
  };
  const isPasswordStrong = Object.values(passwordReqs).every(Boolean);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowValidation(true);
    setEmailTouched(true);
    setPasswordTouched(true);
    setConfirmTouched(true);

    // 1. Email check
    if (!isEmailValid) return;

    // 2. Password complexity check
    if (!isPasswordStrong) return;

    // 3. Match check
    if (password !== confirmPassword) return;

    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (signUpError) {
        console.error("Supabase signup error:", signUpError);
        const msg = signUpError.message;
        setError(msg && msg !== '{}' ? msg : 'Sign up failed. Please check your connection or try again.');
      } else {
        setSuccess(true);
      }
    } catch (err: unknown) {
      console.error("Signup exception caught:", err);
      setError(err instanceof Error && err.message !== '{}' ? err.message : 'An unexpected error occurred.');
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
          <h2 className="text-xl font-bold text-white mt-4">Create your account</h2>
          <p className="text-xs text-gray-400 mt-1">Get started with custom, clean streaming.</p>
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
                We sent a verification link to <strong className="text-white">{email}</strong>. Please confirm your email address to continue to your dashboard.
              </p>
              <Link 
                href="/login"
                className="mt-6 inline-block w-full text-center py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-100 transition-all"
              >
                Go to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSignup} noValidate className="space-y-5">
              
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
                  onBlur={() => setPasswordTouched(true)}
                  placeholder="••••••••"
                  className={`w-full bg-white/[0.03] border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 transition-all ${
                    (passwordTouched || showValidation) && !isPasswordStrong
                      ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/50'
                      : 'border-white/10 focus:border-cyan-500/50 focus:ring-cyan-500/50'
                  }`}
                />
                {(passwordTouched || showValidation) && !isPasswordStrong && (
                  <p className="text-red-400 text-xs mt-1.5">
                    Password does not meet complexity requirements.
                  </p>
                )}

                {/* Password strength checklist */}
                <div className="mt-2.5 p-3 rounded-lg bg-white/[0.01] border border-white/5 space-y-1.5 text-[11px]">
                  <div className="text-gray-400 font-semibold mb-1">Password requirements:</div>
                  <div className="flex items-center gap-2">
                    <span className={passwordReqs.length ? "text-cyan-400 font-bold" : "text-gray-600"}>
                      {passwordReqs.length ? "✓" : "○"}
                    </span>
                    <span className={passwordReqs.length ? "text-gray-300" : "text-gray-500"}>At least 8 characters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={passwordReqs.casing ? "text-cyan-400 font-bold" : "text-gray-600"}>
                      {passwordReqs.casing ? "✓" : "○"}
                    </span>
                    <span className={passwordReqs.casing ? "text-gray-300" : "text-gray-500"}>Uppercase & lowercase letters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={passwordReqs.number ? "text-cyan-400 font-bold" : "text-gray-600"}>
                      {passwordReqs.number ? "✓" : "○"}
                    </span>
                    <span className={passwordReqs.number ? "text-gray-300" : "text-gray-500"}>At least one number (0-9)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={passwordReqs.special ? "text-cyan-400 font-bold" : "text-gray-600"}>
                      {passwordReqs.special ? "✓" : "○"}
                    </span>
                    <span className={passwordReqs.special ? "text-gray-300" : "text-gray-500"}>At least one special character (!@#$)</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2">Confirm password</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setConfirmTouched(true)}
                  placeholder="••••••••"
                  className={`w-full bg-white/[0.03] border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 transition-all ${
                    (confirmTouched || showValidation) && password !== confirmPassword
                      ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/50'
                      : 'border-white/10 focus:border-cyan-500/50 focus:ring-cyan-500/50'
                  }`}
                />
                {(confirmTouched || showValidation) && password !== confirmPassword && (
                  <p className="text-red-400 text-xs mt-1.5">
                    Passwords do not match.
                  </p>
                )}
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
                    Creating account...
                  </>
                ) : 'Sign Up'}
              </button>

            </form>
          )}

          <div className="mt-6 text-center text-xs text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-cyan-400 font-bold hover:underline">
              Sign In
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
