'use client';

import React, { useEffect, useState, startTransition } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserProfile {
  id: string;
  subscription_status: string | null;
  custom_blocked_words: string[] | null;
  blur_screens: boolean;
  buffer_timer: number;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Form states
  const [customBlockedWords, setCustomBlockedWords] = useState('');
  const [blurScreens, setBlurScreens] = useState(false);
  const [bufferTimer, setBufferTimer] = useState(1);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          startTransition(() => {
            router.push('/login');
          });
          return;
        }

        setUserEmail(session.user.email ?? null);

        // Fetch profile
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          // If profile row doesn't exist yet, we can create one or handle gracefully
          setProfile({
            id: session.user.id,
            subscription_status: 'free',
            custom_blocked_words: [],
            blur_screens: false,
            buffer_timer: 1
          });
        } else if (data) {
          const mappedProfile: UserProfile = {
            id: data.id,
            subscription_status: data.subscription_status,
            custom_blocked_words: data.custom_filter_words || [],
            blur_screens: data.blur_screen_enabled || false,
            buffer_timer: data.buffer_timer_seconds ?? 1
          };
          setProfile(mappedProfile);
          setCustomBlockedWords((mappedProfile.custom_blocked_words ?? []).join(', '));
          setBlurScreens(mappedProfile.blur_screens ?? false);
          setBufferTimer(mappedProfile.buffer_timer ?? 1);
        }
      } catch (err) {
        console.error('Auth check error:', err);
        startTransition(() => {
          router.push('/login');
        });
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  const [billingLoading, setBillingLoading] = useState(false);

  const handleUpgrade = async () => {
    setBillingLoading(true);
    setNotification(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setNotification({ type: 'error', message: 'You must be logged in to upgrade.' });
        return;
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to create checkout session.');
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout redirect URL returned.');
      }
    } catch (err: any) {
      console.error('Upgrade redirection error:', err);
      setNotification({ type: 'error', message: err.message || 'Failed to redirect to checkout.' });
    } finally {
      setBillingLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setBillingLoading(true);
    setNotification(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setNotification({ type: 'error', message: 'You must be logged in to manage subscription.' });
        return;
      }

      const res = await fetch('/api/portal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to create portal session.');
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No portal redirect URL returned.');
      }
    } catch (err: any) {
      console.error('Portal redirection error:', err);
      setNotification({ type: 'error', message: err.message || 'Failed to redirect to billing portal.' });
    } finally {
      setBillingLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    const isPremium = profile.subscription_status === 'active';
    
    // Safety guard: Non-premium users cannot save premium fields
    if (!isPremium) {
      setNotification({
        type: 'error',
        message: 'Upgrade to Premium to enable custom words, video blurring, and buffer timers!'
      });
      return;
    }

    setSaving(true);
    setNotification(null);

    // Clean and split words
    const wordsArray = customBlockedWords
      .split(',')
      .map(w => w.trim())
      .filter(Boolean);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          custom_filter_words: wordsArray,
          blur_screen_enabled: blurScreens,
          buffer_timer_seconds: bufferTimer,
        })
        .eq('id', profile.id);

      if (error) {
        setNotification({ type: 'error', message: error.message });
      } else {
        setNotification({ type: 'success', message: 'Settings successfully synced to the cloud!' });
        // Update local state profile ref
        setProfile(prev => prev ? {
          ...prev,
          custom_blocked_words: wordsArray,
          blur_screens: blurScreens,
          buffer_timer: bufferTimer
        } : null);
      }
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save settings.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    startTransition(() => {
      router.push('/');
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm text-gray-500 font-medium">Securing cloud connection...</span>
        </div>
      </div>
    );
  }

  const isPremium = profile?.subscription_status === 'active';

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* Header */}
      <header className="border-b border-white/5 bg-[#050505]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <img 
              src="/boo-tube-icon.svg" 
              alt="BooTube Logo" 
              className="h-7 w-auto"
            />
          </Link>
          
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-xs text-gray-500">{userEmail}</span>
            <button 
              onClick={handleSignOut}
              className="px-4 py-2 border border-white/5 hover:border-white/10 hover:bg-white/[0.02] text-xs font-bold rounded-lg text-gray-300 transition-all cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-4xl mx-auto w-full px-6 py-12 flex-grow">
        
        {/* Title row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Filter Dashboard</h1>
            <p className="text-sm text-gray-400 mt-1">Configure your real-time censoring settings across all devices.</p>
          </div>

          {/* Tier HUD indicator */}
          <div className={`p-4 rounded-xl border flex items-center gap-4 ${isPremium ? 'border-cyan-500/20 bg-cyan-950/10' : 'border-white/5 bg-white/[0.01]'}`}>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Current Tier</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-base font-black uppercase tracking-wide ${isPremium ? 'text-cyan-400' : 'text-gray-300'}`}>
                  {isPremium ? 'Premium Plan' : 'Free Plan'}
                </span>
                <span className={`w-2.5 h-2.5 rounded-full ${isPremium ? 'bg-cyan-400 animate-pulse' : 'bg-gray-500'}`} />
              </div>
            </div>
            {!isPremium ? (
              <button 
                type="button"
                onClick={handleUpgrade}
                disabled={billingLoading}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-extrabold text-xs rounded-lg transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                {billingLoading ? 'Loading...' : 'Upgrade'}
              </button>
            ) : (
              <button 
                type="button"
                onClick={handleManageBilling}
                disabled={billingLoading}
                className="px-4 py-2 bg-white/[0.05] border border-white/10 hover:bg-white/[0.1] text-white font-extrabold text-xs rounded-lg transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                {billingLoading ? 'Loading...' : 'Manage Billing'}
              </button>
            )}
          </div>
        </div>

        {/* Global Alerts / Notification toasts */}
        {notification && (
          <div className={`p-4 rounded-xl border mb-8 flex items-center justify-between text-sm ${notification.type === 'success' ? 'bg-cyan-950/20 border-cyan-500/20 text-cyan-400' : 'bg-red-950/20 border-red-500/20 text-red-400'}`}>
            <span className="font-semibold">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="text-gray-500 hover:text-white font-bold px-2">×</button>
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="grid grid-cols-1 gap-8">

          {/* Free Tier Settings Card */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              🛡️ Standard Censoring
            </h2>
            <p className="text-xs text-gray-400 mb-6">These rules are active on all devices running BooTube.</p>
            
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-6 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div>
                  <h4 className="text-sm font-bold text-white">Mute Blasphemy</h4>
                  <p className="text-xs text-gray-400 mt-0.5">Automatically mutes religious curses and slurs in real-time.</p>
                </div>
                <span className="px-2.5 py-1 rounded bg-cyan-950/40 border border-cyan-500/20 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                  Always Active
                </span>
              </div>
              
              <div className="flex items-start justify-between gap-6 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div>
                  <h4 className="text-sm font-bold text-white">Real-Time CC Parser</h4>
                  <p className="text-xs text-gray-400 mt-0.5">Automatically analyzes and tracks HTML5 subtitle overlays.</p>
                </div>
                <span className="px-2.5 py-1 rounded bg-cyan-950/40 border border-cyan-500/20 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                  Always Active
                </span>
              </div>
            </div>
          </div>

          {/* Premium Settings Card */}
          <div className={`bg-white/[0.01] border rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden ${isPremium ? 'border-white/5' : 'border-white/5 opacity-55'}`}>
            
            {/* Lock Overlay if Free Tier */}
            {!isPremium && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-center p-6">
                <div className="w-10 h-10 rounded-full bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-center text-lg text-cyan-400 mb-3">
                  🔒
                </div>
                <h3 className="text-base font-bold text-white mb-1">Premium Filters Locked</h3>
                <p className="text-xs text-gray-400 max-w-sm mb-4">
                  Upgrade to Premium to enable custom words, visual blurring, and hold cooldown controls.
                </p>
                <a 
                  href="/#pricing" 
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black rounded-lg transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                >
                  Unlock Premium
                </a>
              </div>
            )}

            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              ⭐ Premium Customizations
            </h2>
            <p className="text-xs text-gray-400 mb-6">Manage advanced options and custom word blocks.</p>

            <div className="space-y-6">
              {/* Custom blocked words list */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Custom Word Blocklist
                </label>
                <textarea
                  disabled={!isPremium}
                  value={customBlockedWords}
                  onChange={(e) => setCustomBlockedWords(e.target.value)}
                  placeholder="enter, bad, words, separated, by, commas"
                  rows={4}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono"
                />
                <p className="text-[10px] text-gray-500 mt-2">
                  Enter specific words or phrases you want BooTube to mute. Separate each entry with a comma.
                </p>
              </div>

              <hr className="border-white/5" />

              {/* Blur toggle */}
              <div className="flex items-center justify-between gap-6">
                <div>
                  <h4 className="text-sm font-bold text-white">Visual Blurring</h4>
                  <p className="text-xs text-gray-400 mt-0.5">Blur the video player screen during a mute event.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox"
                    disabled={!isPremium}
                    checked={blurScreens}
                    onChange={(e) => setBlurScreens(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500 peer-checked:after:bg-black peer-checked:after:border-cyan-500" />
                </label>
              </div>

              <hr className="border-white/5" />

              {/* Slider / Range */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h4 className="text-sm font-bold text-white">Filter Hold Cooldown</h4>
                    <p className="text-xs text-gray-400 mt-0.5">Time to hold the mute state active after a word triggers.</p>
                  </div>
                  <span className="text-sm font-black text-cyan-400 font-mono bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded">
                    {bufferTimer}s
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="5" 
                  step="0.5"
                  disabled={!isPremium}
                  value={bufferTimer}
                  onChange={(e) => setBufferTimer(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

            </div>
          </div>

          {/* Save Button row */}
          {isPremium && (
            <div className="flex justify-end mt-4">
              <button 
                type="submit"
                disabled={saving}
                className="px-8 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.2)]"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Syncing settings...
                  </>
                ) : 'Save & Sync Settings'}
              </button>
            </div>
          )}

        </form>

      </main>
    </div>
  );
}
