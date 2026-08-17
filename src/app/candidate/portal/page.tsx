'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  MapPin,
  Calendar,
  IndianRupee,
  FileCheck2,
  ArrowRight,
  LogOut,
  Clock,
  Sparkles,
  AlertCircle,
  Building2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export default function CandidatePortalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPortalData();
  }, []);

  const fetchPortalData = async () => {
    try {
      setLoading(false);
      const res = await fetch('/api/candidate/portal');
      if (res.status === 401) {
        router.push('/candidate/login');
        return;
      }
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load candidate portal.');
      }
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/candidate/auth/logout', { method: 'POST' });
    router.push('/candidate/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium">Loading your candidate portal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-6 text-center text-slate-200 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">Access Notice</h3>
          <p className="text-sm text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/candidate/login')}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const { candidate, job, activeOffer } = data || {};

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
              CP
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">Candidate Portal</h1>
              <p className="text-xs text-slate-400">{candidate?.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border border-indigo-500/20 p-6 sm:p-8 shadow-2xl">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Application Portal</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome, {candidate?.name}!
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-300">
              Track your recruitment progress, review employment offer letters, and securely manage your onboarding documents.
            </p>
          </div>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Job Application Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-400" />
                <span>My Application</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                {candidate?.stage}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500">Applied Role</p>
                <p className="text-base font-bold text-white">{job?.title || 'Open Position'}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Department</span>
                  <p className="font-medium text-slate-300 flex items-center gap-1.5 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {job?.department || 'Engineering'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Location</span>
                  <p className="font-medium text-slate-300 flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {job?.location || 'Bengaluru'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Offer Summary Card (Col Span 2) */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-400" />
                <span>Employment Offer</span>
              </h3>
              {activeOffer && (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                    activeOffer.status === 'Accepted'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800/80'
                      : activeOffer.status === 'Declined'
                      ? 'bg-red-950 text-red-300 border-red-800/80'
                      : activeOffer.isExpired
                      ? 'bg-amber-950 text-amber-300 border-amber-800/80'
                      : 'bg-indigo-950 text-indigo-300 border-indigo-800/80'
                  }`}
                >
                  {activeOffer.isExpired ? 'Expired' : activeOffer.status}
                </span>
              )}
            </div>

            {activeOffer ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-xs text-slate-400">Offered Designation</span>
                    <h4 className="text-lg font-extrabold text-white mt-0.5">{activeOffer.offeredTitle}</h4>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      Proposed Joining:{' '}
                      {activeOffer.proposedJoinDate
                        ? new Date(activeOffer.proposedJoinDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : 'To be finalized'}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-xs text-slate-400">Annual Total CTC</span>
                    <p className="text-2xl font-black text-emerald-400 flex items-center sm:justify-end gap-1">
                      <IndianRupee className="w-5 h-5" />
                      {activeOffer.offeredCtc?.toLocaleString('en-IN')}
                    </p>
                    {activeOffer.expiresAt && (
                      <p className="text-xs text-amber-400/90 mt-1 flex items-center sm:justify-end gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Expires: {new Date(activeOffer.expiresAt).toLocaleDateString('en-IN')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    {activeOffer.status === 'Accepted' ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-4 h-4" /> Offer Accepted
                      </span>
                    ) : activeOffer.status === 'Declined' ? (
                      <span className="flex items-center gap-1 text-red-400 font-medium">
                        <XCircle className="w-4 h-4" /> Offer Declined
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-indigo-300">
                        <Clock className="w-4 h-4" /> Ready for your review & response
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => router.push(`/candidate/offers/${activeOffer.id}`)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-600/30"
                  >
                    <span>View Offer & Documents</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500">
                <Clock className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                <p className="text-sm font-medium text-slate-400">No active offer available at this moment</p>
                <p className="text-xs text-slate-600 mt-1">
                  Once your offer is approved by hiring leadership, it will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
