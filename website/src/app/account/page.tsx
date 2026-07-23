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

interface SubscriptionDetails {
  plan: 'free' | 'premium';
  nextPayment?: string;
  amount?: string;
  autoRenew?: boolean;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [subLoading, setSubLoading] = useState(true);
  
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subDetails, setSubDetails] = useState<SubscriptionDetails | null>(null);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [cancelOption, setCancelOption] = useState<'cancel_only' | 'cancel_and_refund'>('cancel_only');
  const [reasonCategory, setReasonCategory] = useState<'technical_issue' | 'missing_features' | 'too_expensive' | 'temporary_use' | 'other'>('technical_issue');
  const [userExplanation, setUserExplanation] = useState('');
  const [exitLoading, setExitLoading] = useState(false);
  const [exitError, setExitError] = useState<string | null>(null);
  const router = useRouter();

  const fetchSubscriptionDetails = async (token: string) => {
    try {
      const res = await fetch('/api/subscription', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSubDetails(data);
        if (typeof window !== 'undefined') {
          localStorage.setItem('bootube_force_sync', 'true');
        }
      } else {
        setSubDetails({ plan: 'free' });
      }
    } catch (e) {
      console.error('Error fetching subscription details:', e);
      setSubDetails({ plan: 'free' });
    } finally {
      setSubLoading(false);
    }
  };

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
          setProfile({
            id: session.user.id,
            subscription_status: 'free',
            custom_blocked_words: [],
            blur_screens: false,
            buffer_timer: 1
          });
          setSubDetails({ plan: 'free' });
          setSubLoading(false);
        } else if (data) {
          const mappedProfile: UserProfile = {
            id: data.id,
            subscription_status: data.subscription_status,
            custom_blocked_words: data.custom_filter_words || [],
            blur_screens: data.blur_screen_enabled || false,
            buffer_timer: data.buffer_timer_seconds ?? 1
          };
          setProfile(mappedProfile);
          await fetchSubscriptionDetails(session.access_token);
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

  const handleDeleteAccount = async () => {
    const emailConfirm = prompt(
      "We're sorry to see you go! 😢\n\nTo confirm deletion and prevent accidental mistakes, please type your account email below:"
    );
    
    if (!emailConfirm) return;

    if (emailConfirm.trim().toLowerCase() !== userEmail?.trim().toLowerCase()) {
      alert("The email entered does not match your account email. Account deletion cancelled.");
      return;
    }

    setDeleteLoading(true);
    setNotification(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setNotification({ type: 'error', message: 'You must be logged in to delete your account.' });
        return;
      }

      const res = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to delete account.');
      }

      // Logout and redirect
      await supabase.auth.signOut();
      startTransition(() => {
        router.push('/login?deleted=true');
      });
    } catch (err: any) {
      console.error('Account deletion error:', err);
      setNotification({ type: 'error', message: err.message || 'Failed to delete account.' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    startTransition(() => {
      router.push('/');
    });
  };

  const handleExitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setExitLoading(true);
    setExitError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('You must be logged in to submit request.');
      }

      const res = await fetch('/api/subscription/cancel-request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          request_type: cancelOption,
          reason_category: reasonCategory,
          user_explanation: userExplanation
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to submit cancellation request.');
      }

      const data = await res.json();
      setExitModalOpen(false);
      
      // Update local state to reflect success
      if (cancelOption === 'cancel_only') {
        setNotification({ type: 'success', message: 'Your auto-renewal has been cancelled successfully.' });
        if (subDetails) {
          setSubDetails({ ...subDetails, autoRenew: false });
        }
      } else {
        setNotification({ type: 'success', message: 'Your premium membership has been cancelled. Your refund request is now under review!' });
        if (subDetails) {
          setSubDetails({ ...subDetails, plan: 'free' });
        }
        if (profile) {
          setProfile({ ...profile, subscription_status: 'free' });
        }
      }
    } catch (err: any) {
      console.error('Exit submission error:', err);
      setExitError(err.message || 'An error occurred.');
    } finally {
      setExitLoading(false);
    }
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
    <div className="min-h-screen bg-gradient-to-b from-[#08080a] via-[#050505] to-[#030304] text-gray-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black relative overflow-hidden">
      
      {/* Subtle Background Glows */}
      <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full bg-cyan-950/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full bg-blue-950/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-white/5 bg-[#050505]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <img 
              src="/boo-tube-icon.svg" 
              alt="BooTube Logo" 
              className="h-8 w-auto transition-transform duration-300 group-hover:scale-105 filter drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]"
            />
          </Link>
          
          <div className="flex items-center gap-4 relative z-50">
            <div className="relative">
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-8 h-8 rounded-full border border-white bg-[#191b22] hover:bg-[#252833] text-white text-xs font-black flex items-center justify-center uppercase transition-all shadow-[0_0_8px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95 cursor-pointer outline-none"
              >
                {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
              </button>
              
              {dropdownOpen && (
                <>
                  {/* Backdrop overlay to close when clicking outside */}
                  <div 
                    className="fixed inset-0 z-40 cursor-default" 
                    onClick={() => setDropdownOpen(false)}
                  />
                  
                  <div className="absolute right-0 mt-2.5 w-56 bg-[#0d0e12] border border-[#1f222d] rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.6)] p-4 z-50 flex flex-col text-left">
                    <div className="flex flex-col items-center text-center mb-1">
                      <div className="w-12 h-12 rounded-full border-2 border-white bg-[#191b22] text-white text-lg font-black flex items-center justify-center uppercase mb-2">
                        {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="text-sm font-black text-white leading-none">Account</div>
                      <div className="text-[11px] text-gray-400 mt-1.5 word-break-all select-all">{userEmail}</div>
                    </div>
                    
                    <hr className="border-[#1f222d] my-3 w-full" />
                    
                    <button 
                      onClick={() => {
                        setDropdownOpen(false);
                        if (isPremium) {
                          handleManageBilling();
                        } else {
                          handleUpgrade();
                        }
                      }}
                      disabled={billingLoading}
                      className="flex items-center justify-center w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 text-white text-xs font-black rounded-lg cursor-pointer transition-all duration-200 outline-none"
                    >
                      {billingLoading ? (
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        isPremium ? 'Manage subscription' : 'Upgrade to premium'
                      )}
                    </button>
                    
                    <div className="bg-[#151821] border border-[#1f222d] rounded-lg p-2.5 mt-3 flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-gray-400">Account tier:</span>
                        <span className={`font-black ${isPremium ? 'bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent' : 'text-white'}`}>
                          {isPremium ? 'Premium' : 'Free'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-gray-400">App status:</span>
                        <span className="text-white font-semibold">Active</span>
                      </div>
                    </div>
                    
                    <hr className="border-[#1f222d] my-3 w-full" />
                    
                    <button 
                      onClick={() => {
                        setDropdownOpen(false);
                        handleSignOut();
                      }}
                      className="w-full text-left py-2 text-xs font-bold text-red-500 hover:text-red-400 transition-colors cursor-pointer outline-none"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-4xl mx-auto w-full px-6 py-12 flex-grow relative z-10">
        
        {/* Title row */}
        <div className="mb-10">
          <h1 className="text-3xl font-black tracking-tight text-white">Billing & Account</h1>
          <p className="text-sm text-gray-400 mt-1">Manage your premium plans, billing auto-renewals, and settings.</p>
        </div>

        {/* Global Notifications */}
        {notification && (
          <div className={`p-4 rounded-xl border mb-8 flex items-center justify-between text-sm bg-red-950/20 border-red-500/20 text-red-400`}>
            <span className="font-semibold">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="text-gray-500 hover:text-white font-bold px-2">×</button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8">
          
          {/* Subscription Status Card */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              💳 Subscription Status
            </h2>

            {subLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-white/5 rounded w-1/3"></div>
                <div className="h-4 bg-white/5 rounded w-1/4"></div>
                <div className="h-10 bg-white/5 rounded w-full mt-4"></div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Current Plan</div>
                    <div className="text-lg font-black text-white mt-1 flex items-center gap-2">
                      {subDetails?.plan === 'premium' ? (
                        <>
                          <span className="text-cyan-400 uppercase tracking-wide">BooTube Premium</span>
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                        </>
                      ) : (
                        <>
                          <span className="text-gray-400 uppercase tracking-wide">BooTube Free</span>
                          <span className="w-2.5 h-2.5 rounded-full bg-gray-500" />
                        </>
                      )}
                    </div>
                  </div>

                  {subDetails?.plan === 'premium' && (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-gray-500">
                        {subDetails.autoRenew ? 'Next Bill Date' : 'Expires On'}
                      </div>
                      <div className="text-lg font-black text-white mt-1">
                        {subDetails.nextPayment}
                      </div>
                    </div>
                  )}
                </div>

                {subDetails?.plan === 'premium' && (
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl bg-cyan-950/10 border border-cyan-500/10 gap-4">
                    <div>
                      <div className="text-xs font-bold text-gray-400">Recurring Price:</div>
                      <div className="text-lg font-black text-cyan-400 mt-0.5">{subDetails.amount}</div>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {subDetails.autoRenew ? (
                          <>
                            Your plan automatically renews. You can cancel at any time to let it expire at the end of the current period.{' '}
                            <button 
                              onClick={() => {
                                setCancelOption('cancel_only');
                                setReasonCategory('technical_issue');
                                setUserExplanation('');
                                setExitError(null);
                                setExitModalOpen(true);
                              }}
                              className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline inline ml-1 cursor-pointer bg-none border-none p-0"
                            >
                              Cancel membership
                            </button>
                          </>
                        ) : (
                          'You have cancelled auto-renewal. Your premium access will expire at the end of this billing cycle.'
                        )}
                      </p>
                    </div>
                    <button
                      onClick={handleManageBilling}
                      disabled={billingLoading}
                      className="w-full sm:w-auto px-6 py-2.5 bg-white/[0.05] border border-white/10 hover:bg-white/[0.1] text-white font-extrabold text-xs rounded-lg transition-all shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      {billingLoading ? 'Syncing...' : 'Manage Billing'}
                    </button>
                  </div>
                )}

                {subDetails?.plan === 'free' && (
                  <div className="p-6 rounded-xl bg-gradient-to-r from-blue-950/20 to-cyan-950/20 border border-cyan-500/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                      <h4 className="text-sm font-bold text-white">Unlock cross-platform censoring controls</h4>
                      <p className="text-xs text-gray-400 mt-1">Filter profanity on YouTube, Disney+, Hulu, Plex, and Fandango. Access custom blocked words, timings, and blur features.</p>
                    </div>
                    <button
                      onClick={handleUpgrade}
                      disabled={billingLoading}
                      className="w-full md:w-auto shrink-0 px-8 py-3.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white font-black text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] disabled:opacity-50 cursor-pointer"
                    >
                      {billingLoading ? 'Redirecting...' : 'Upgrade to premium'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tier Feature Comparison Grid */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white mb-6">
              📊 Plan Comparisons
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Free Tier Details */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
                <div>
                  <h3 className="text-md font-extrabold text-gray-300 uppercase tracking-wide">Free Plan</h3>
                  <div className="text-2xl font-black text-white mt-2 mb-4">$0.00 <span className="text-xs text-gray-500 font-medium">/ forever</span></div>
                  <ul className="space-y-3 text-xs text-gray-400">
                    <li className="flex items-center gap-2">🟢 YouTube censoring support</li>
                    <li className="flex items-center gap-2">🟢 Standard blasphemy muting</li>
                    <li className="flex items-center gap-2">🟢 Up to 10 custom words</li>
                    <li className="flex items-center gap-2">🔴 Locked multi-channel support</li>
                    <li className="flex items-center gap-2">🔴 Locked video blurring overlays</li>
                    <li className="flex items-center gap-2">🔴 Locked adjustable timing buffer</li>
                  </ul>
                </div>
              </div>

              {/* Premium Tier Details */}
              <div className="p-6 rounded-2xl bg-cyan-950/5 border border-cyan-500/20 flex flex-col justify-between relative shadow-[0_0_30px_rgba(6,182,212,0.05)]">
                <div>
                  <h3 className="text-md font-extrabold text-cyan-400 uppercase tracking-wide">Premium Plan</h3>
                  <div className="text-2xl font-black text-white mt-2 mb-4">$3.99 <span className="text-xs text-cyan-500/50 font-medium">/ month</span></div>
                  <ul className="space-y-3 text-xs text-gray-300">
                    <li className="flex items-center gap-2 text-cyan-300">✨ Sync across YouTube, Hulu, Disney+, Plex & Vudu</li>
                    <li className="flex items-center gap-2 text-cyan-300">✨ Unlimited custom blocked words</li>
                    <li className="flex items-center gap-2 text-cyan-300">✨ Enable visual screen blurring filters</li>
                    <li className="flex items-center gap-2 text-cyan-300">✨ Fine-tune timing sliders (0.5s - 1.5s)</li>
                    <li className="flex items-center gap-2 text-cyan-300">✨ Sync settings automatically across all active devices</li>
                    <li className="flex items-center gap-2 text-cyan-300">✨ Secure commercial-free billing portal</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Account Deletion link */}
        <div className="mt-16 border-t border-white/5 pt-8 text-center">
          <p className="text-xs text-gray-600">
            Need to permanently close your account?{' '}
            <button
              onClick={handleDeleteAccount}
              disabled={deleteLoading}
              className="text-gray-500 hover:text-red-400 underline transition-colors cursor-pointer bg-transparent border-none p-0 inline font-medium"
            >
              {deleteLoading ? 'Deleting account...' : 'Delete account'}
            </button>
          </p>
        </div>

        {/* Cancellation / Refund Exit Modal */}
        {exitModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d0e12] border border-[#1f222d] rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-left">
              <h3 className="text-lg font-black text-white mb-2">Cancel Membership</h3>
              <p className="text-xs text-gray-400 mb-6">
                We're sorry to see you go! Let us know how we can improve.
              </p>

              {exitError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                  {exitError}
                </div>
              )}

              <form onSubmit={handleExitSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1.5">
                    Choose cancellation option
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-start gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors cursor-pointer">
                      <input 
                        type="radio" 
                        name="cancelOption" 
                        value="cancel_only"
                        checked={cancelOption === 'cancel_only'}
                        onChange={() => setCancelOption('cancel_only')}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="text-xs font-bold text-white">Just cancel auto-renewal</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">Keep premium access active until the end of the billing period.</div>
                      </div>
                    </label>
                    
                    <label className="flex items-start gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors cursor-pointer">
                      <input 
                        type="radio" 
                        name="cancelOption" 
                        value="cancel_and_refund"
                        checked={cancelOption === 'cancel_and_refund'}
                        onChange={() => setCancelOption('cancel_and_refund')}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="text-xs font-bold text-white">Cancel immediately & request refund</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">Terminate access immediately and request review for a full refund of this month's charge.</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1.5">
                    Why are you cancelling?
                  </label>
                  <select
                    value={reasonCategory}
                    onChange={(e) => setReasonCategory(e.target.value as any)}
                    className="w-full bg-[#151821] border border-[#1f222d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="technical_issue">Technical issue / Page fails</option>
                    <option value="missing_features">Missing required feature</option>
                    <option value="too_expensive">Too expensive / Pricing</option>
                    <option value="temporary_use">Temporary or one-time use</option>
                    <option value="other">Other reason</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1.5">
                    Please describe the issues you faced {cancelOption === 'cancel_and_refund' && '(required)'}
                  </label>
                  <textarea
                    value={userExplanation}
                    onChange={(e) => setUserExplanation(e.target.value)}
                    placeholder="Tell us what went wrong..."
                    rows={3}
                    required={cancelOption === 'cancel_and_refund'}
                    className="w-full bg-[#151821] border border-[#1f222d] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setExitModalOpen(false)}
                    className="px-4 py-2 border border-white/5 hover:bg-white/[0.02] text-xs font-bold rounded-lg text-gray-400 cursor-pointer"
                  >
                    Keep premium
                  </button>
                  <button
                    type="submit"
                    disabled={exitLoading}
                    className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-400 text-white font-extrabold text-xs rounded-lg cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {exitLoading ? (
                      <>
                        <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Processing...
                      </>
                    ) : (
                      cancelOption === 'cancel_and_refund' ? 'Request Refund' : 'Confirm Cancellation'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
