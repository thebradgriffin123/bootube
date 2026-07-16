'use client';

import React, { useEffect, useState, startTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock_key';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface RefundRequest {
  id: string;
  email: string;
  request_type: 'cancel_only' | 'cancel_and_refund';
  reason_category: 'technical_issue' | 'missing_features' | 'too_expensive' | 'temporary_use' | 'other';
  user_explanation: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  ai_assessment: {
    recommendation: 'approve' | 'reject';
    confidence: number;
    justification: string;
  } | null;
  created_at: string;
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [autopilot, setAutopilot] = useState(false);
  const [updatingAutopilot, setUpdatingAutopilot] = useState(false);

  const [activeTab, setActiveTab] = useState<'pending' | 'resolved'>('pending');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const router = useRouter();

  const fetchAdminData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        startTransition(() => {
          router.push('/login');
        });
        return;
      }

      if (session.user.email !== 'brad.griffin@mythic-makers.com') {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      const res = await fetch('/api/admin/refund-requests', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
        setAutopilot(data.autopilot || false);
      } else {
        throw new Error('Failed to load requests.');
      }
    } catch (err: any) {
      console.error('Error fetching admin requests:', err);
      setNotification({ type: 'error', message: err.message || 'Failed to fetch admin queue.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [router]);

  const handleAutopilotToggle = async () => {
    setUpdatingAutopilot(true);
    setNotification(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const targetValue = !autopilot;
      const res = await fetch('/api/admin/autopilot', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled: targetValue })
      });

      if (res.ok) {
        setAutopilot(targetValue);
        setNotification({ type: 'success', message: `Autopilot is now ${targetValue ? 'ENABLED' : 'DISABLED'}.` });
      } else {
        throw new Error('Failed to update Autopilot.');
      }
    } catch (e: any) {
      setNotification({ type: 'error', message: e.message || 'Failed to toggle Autopilot.' });
    } finally {
      setUpdatingAutopilot(false);
    }
  };

  const handleResolve = async (requestId: string, decision: 'approved' | 'rejected') => {
    setResolvingId(requestId);
    setNotification(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const notes = adminNotes[requestId] || '';

      const res = await fetch('/api/admin/resolve-refund', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requestId,
          decision,
          adminNotes: notes
        })
      });

      if (res.ok) {
        setNotification({ type: 'success', message: `Refund request successfully ${decision}.` });
        // Update local list
        setRequests(prev => prev.map(req => 
          req.id === requestId 
            ? { ...req, status: decision, admin_notes: notes }
            : req
        ));
      } else {
        const text = await res.text();
        throw new Error(text || 'Failed to resolve request.');
      }
    } catch (e: any) {
      setNotification({ type: 'error', message: e.message || 'Failed to resolve refund.' });
    } finally {
      setResolvingId(null);
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
          <span className="text-sm text-gray-500 font-medium">Securing admin terminal...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
        <span className="text-4xl mb-4">⛔</span>
        <h1 className="text-2xl font-black text-white">Access Denied</h1>
        <p className="text-sm text-gray-400 mt-2 max-w-sm">
          You must sign in with your administrator email account (brad.griffin@mythic-makers.com) to view this terminal.
        </p>
        <Link href="/login" className="mt-6 px-5 py-2.5 bg-white/[0.05] border border-white/10 hover:bg-white/[0.1] text-xs font-bold text-white rounded-lg transition-all">
          Go to Sign In
        </Link>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const resolvedRequests = requests.filter(r => r.status !== 'pending');
  const currentRequests = activeTab === 'pending' ? pendingRequests : resolvedRequests;

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
          <div className="text-xs text-cyan-400 font-bold bg-cyan-950/30 border border-cyan-500/20 px-3 py-1.5 rounded-full">
            🔑 Admin Terminal
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full px-6 py-12 flex-grow relative z-10">
        
        {/* Title and Autopilot Toggle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Refund & Cancellation Queue</h1>
            <p className="text-sm text-gray-400 mt-1">Review feedback, process cancellations, and manage AI autopilot resolves.</p>
          </div>

          <label className="flex items-center gap-3 bg-white/[0.02] border border-white/5 p-4 rounded-xl cursor-pointer hover:bg-white/[0.04] transition-colors">
            <input
              type="checkbox"
              checked={autopilot}
              disabled={updatingAutopilot}
              onChange={handleAutopilotToggle}
              className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 focus:ring-offset-black bg-black border-white/10"
            />
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                🤖 Gemini Autopilot Mode
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">Automatically resolves high-confidence technical claims (&gt;90% confidence)</div>
            </div>
          </label>
        </div>

        {/* Global Notifications */}
        {notification && (
          <div className={`mb-6 p-4 rounded-xl border text-xs font-semibold ${
            notification.type === 'success' 
              ? 'bg-green-500/10 border-green-500/20 text-green-400' 
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {notification.message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-white/5 mb-8">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'pending'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Pending Claims ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('resolved')}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'resolved'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Resolved History ({resolvedRequests.length})
          </button>
        </div>

        {/* Request Cards List */}
        {currentRequests.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl">
            <span className="text-2xl">🍃</span>
            <p className="text-xs text-gray-500 mt-2 font-medium">No claims match this status queue.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {currentRequests.map((req) => (
              <div key={req.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
                
                {/* Meta details */}
                <div className="flex flex-wrap justify-between items-start gap-4 border-b border-white/5 pb-4">
                  <div>
                    <span className="text-xs font-black text-white">{req.email}</span>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      Submitted on {new Date(req.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-full ${
                      req.request_type === 'cancel_and_refund'
                        ? 'bg-red-950/30 border border-red-500/20 text-red-400'
                        : 'bg-gray-900 border border-white/10 text-gray-400'
                    }`}>
                      {req.request_type === 'cancel_and_refund' ? 'Refund Request' : 'Cancellation Only'}
                    </span>
                    <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/5 text-gray-300">
                      {req.reason_category.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Explanation text */}
                <div className="bg-[#151821] border border-[#1f222d] rounded-xl p-4">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">User Explanation</div>
                  <p className="text-xs text-gray-300 font-medium leading-relaxed italic">
                    "{req.user_explanation || 'No text justification was provided.'}"
                  </p>
                </div>

                {/* AI recommendation assessment co-pilot card */}
                {req.status === 'pending' && req.ai_assessment && (
                  <div className="bg-[#10141f] border border-cyan-500/15 rounded-xl p-4 flex gap-3.5 items-start">
                    <span className="text-xl">🤖</span>
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        Gemini Claims Audit:
                        <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-black ${
                          req.ai_assessment.recommendation === 'approve'
                            ? 'bg-green-950/30 border border-green-500/20 text-green-400'
                            : 'bg-red-950/30 border border-red-500/20 text-red-400'
                        }`}>
                          Suggests {req.ai_assessment.recommendation.toUpperCase()} ({Math.round(req.ai_assessment.confidence * 100)}% confidence)
                        </span>
                      </div>
                      <p className="text-[11px] text-cyan-200 mt-1 leading-relaxed">
                        {req.ai_assessment.justification}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action details if pending */}
                {req.status === 'pending' ? (
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1.5">
                        Response Notes / Feedback (Emailed to user)
                      </label>
                      <textarea
                        value={adminNotes[req.id] || ''}
                        onChange={(e) => setAdminNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                        placeholder="Add explanation logic for approval/denial..."
                        rows={2}
                        className="w-full bg-[#151821] border border-[#1f222d] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => handleResolve(req.id, 'rejected')}
                        disabled={resolvingId === req.id}
                        className="px-4 py-2 border border-red-500/20 hover:bg-red-500/5 text-xs font-bold text-red-400 rounded-lg cursor-pointer"
                      >
                        Reject & Deny Refund
                      </button>
                      <button
                        onClick={() => handleResolve(req.id, 'approved')}
                        disabled={resolvingId === req.id}
                        className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-extrabold text-xs rounded-lg cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {resolvingId === req.id ? (
                          <>
                            <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Resolving...
                          </>
                        ) : (
                          req.request_type === 'cancel_and_refund' ? 'Approve & Refund Stripe' : 'Approve Cancellation'
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Resolved state history pane */
                  <div className="border-t border-white/5 pt-4 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Resolution Status:</span>
                      <span className={`font-bold uppercase ${
                        req.status === 'approved' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    {req.admin_notes && (
                      <div className="mt-2 text-gray-500 leading-relaxed italic">
                        <strong>Reviewer feedback:</strong> "{req.admin_notes}"
                      </div>
                    )}
                  </div>
                )}

              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
