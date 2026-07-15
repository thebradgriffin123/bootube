'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Password complexity strength evaluation
  const passwordReqs = {
    length: password.length >= 8,
    casing: /[a-z]/.test(password) && /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^a-zA-Z0-9]/.test(password),
  };
  const isPasswordStrong = Object.values(passwordReqs).every(Boolean);

  // Verify that an active session exists (Supabase should have auto-set it from the URL hash)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Your password reset link is invalid, expired, or has already been used. Please request a new one.');
      }
    };
    checkSession();
  }, []);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPasswordError(null);
    setConfirmError(null);
    setShowValidation(true);

    // 1. Password complexity check
    if (!isPasswordStrong) {
      setPasswordError('Password does not meet the complexity requirements.');
      return;
    }

    // 2. Match check
    if (password !== confirmPassword) {
      setConfirmError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
        // Clear active session to force them to sign in with their new password
        await supabase.auth.signOut();
        setTimeout(() => {
          router.push('/login');
        }, 3000);
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
          <h2 className="text-xl font-bold text-white mt-4">Create new password</h2>
          <p className="text-xs text-gray-400 mt-1">Please enter your new secure password below.</p>
        </div>

        {/* Form Card */}
        <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
          {success ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-xl text-cyan-400 mx-auto mb-4">
                ✅
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Password Updated!</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Your password has been changed successfully. Redirecting you to login...
              </p>
            </div>
          ) : (
            <form onSubmit={handlePasswordReset} className="space-y-5">
              
              {error && (
                <div className="p-3 rounded-lg bg-red-950/20 border border-red-500/20 text-xs text-red-400">
                  ⚠️ {error}
                </div>
              )}

              {/* Only show password inputs if we don't have a initial load error */}
              {!error || (error && !error.includes('expired')) ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2">New password</label>
                    <input 
                      type="password" 
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordError) setPasswordError(null);
                      }}
                      placeholder="••••••••"
                      className={`w-full bg-white/[0.03] border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 transition-all ${
                        passwordError || (showValidation && !isPasswordStrong)
                          ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/50'
                          : 'border-white/10 focus:border-cyan-500/50 focus:ring-cyan-500/50'
                      }`}
                    />
                    {passwordError && (
                      <p className="text-red-400 text-[11px] mt-1.5 flex items-center gap-1">
                        ⚠️ {passwordError}
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
                    <label className="block text-xs font-bold text-gray-400 mb-2">Confirm new password</label>
                    <input 
                      type="password" 
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (confirmError) setConfirmError(null);
                      }}
                      placeholder="••••••••"
                      className={`w-full bg-white/[0.03] border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 transition-all ${
                        confirmError || (showValidation && password !== confirmPassword)
                          ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/50'
                          : 'border-white/10 focus:border-cyan-500/50 focus:ring-cyan-500/50'
                      }`}
                    />
                    {(confirmError || (showValidation && password !== confirmPassword)) && (
                      <p className="text-red-400 text-[11px] mt-1.5 flex items-center gap-1">
                        ⚠️ {confirmError || 'Passwords do not match.'}
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
                        Updating password...
                      </>
                    ) : 'Update Password'}
                  </button>
                </>
              ) : (
                <div className="text-center pt-2">
                  <Link 
                    href="/forgot-password" 
                    className="inline-block px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl transition-colors"
                  >
                    Request New Link
                  </Link>
                </div>
              )}

              <div className="text-center pt-2">
                <Link 
                  href="/login" 
                  className="text-xs font-semibold text-gray-400 hover:text-white transition-colors"
                >
                  ← Back to Login
                </Link>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
}
