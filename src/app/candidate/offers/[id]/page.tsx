'use client';

import { authFetch } from '@/lib/api-client';
import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck2,
  FileText,
  IndianRupee,
  Lock,
  LogOut,
  MapPin,
  PenTool,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';

export default function CandidateOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: offerId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [acceptConsent, setAcceptConsent] = useState(false);
  const [acceptRemarks, setAcceptRemarks] = useState('');
  const [acceptLoading, setAcceptLoading] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const [showSignModal, setShowSignModal] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signConsent, setSignConsent] = useState(false);
  const [signLoading, setSignLoading] = useState(false);

  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  useEffect(() => {
    fetchOffer();
  }, [offerId]);

  const fetchOffer = async () => {
    try {
      setLoading(true);
      const res = await authFetch<Response>(`/api/candidate/offers/${offerId}`, { raw: true });
      if (res.status === 401) {
        router.push('/candidate/login');
        return;
      }
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load offer details.');
      }
      setOffer(json.offer);
      if (json.offer.candidateName) {
        setSignerName(json.offer.candidateName);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async () => {
    if (!acceptConsent) return;
    setAcceptLoading(true);
    try {
      const res = await authFetch<Response>(`/api/candidate/offers/${offerId}/accept`, { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks: acceptRemarks.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to accept offer.');
      }
      setOffer(data.offer);
      setShowAcceptModal(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAcceptLoading(false);
    }
  };

  const handleRejectOffer = async () => {
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      alert('Please provide a valid reason for declining the offer (at least 5 characters).');
      return;
    }
    setRejectLoading(true);
    try {
      const res = await authFetch<Response>(`/api/candidate/offers/${offerId}/reject`, { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to decline offer.');
      }
      setOffer(data.offer);
      setShowRejectModal(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRejectLoading(false);
    }
  };

  const handleExecuteSignature = async () => {
    if (!signConsent || !signerName.trim()) {
      alert('Please agree to the consent statement and enter your full legal name.');
      return;
    }
    setSignLoading(true);
    try {
      const res = await authFetch<Response>(`/api/candidate/offers/${offerId}/signature`, { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signerName: signerName.trim(),
          consentGiven: signConsent,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete electronic signature.');
      }
      setShowSignModal(false);
      await fetchOffer();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSignLoading(false);
    }
  };

  const handleLogout = async () => {
    await authFetch<Response>('/api/candidate/auth/logout', { raw: true, method: 'POST' });
    router.push('/candidate/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium">Loading employment offer details...</p>
        </div>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-200 shadow-2xl">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">Offer Not Available</h3>
          <p className="text-sm text-slate-400 mb-6">{error || 'Unable to retrieve offer.'}</p>
          <button
            onClick={() => router.push('/candidate/portal')}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const comp = offer.compensation;
  const isResponded = offer.status === 'Accepted' || offer.status === 'Declined';
  const isAccepted = offer.status === 'Accepted';
  const isDeclined = offer.status === 'Declined';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/candidate/portal')}
              className="p-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">Formal Employment Offer</h1>
              <p className="text-xs text-slate-400">{offer.offeredTitle}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Offer Header Banner */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mylotic Group · Employment Offer</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{offer.offeredTitle}</h2>
              <p className="text-sm text-slate-400 mt-1">
                Candidate: <strong className="text-slate-200">{offer.candidateName}</strong> ({offer.candidateEmail})
              </p>
            </div>

            <div className="sm:text-right">
              <span
                className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border shadow-md ${
                  isAccepted
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800/80'
                    : isDeclined
                    ? 'bg-red-950 text-red-300 border-red-800/80'
                    : offer.isExpired
                    ? 'bg-amber-950 text-amber-300 border-amber-800/80'
                    : 'bg-indigo-950 text-indigo-300 border-indigo-800/80'
                }`}
              >
                {offer.isExpired ? 'Offer Expired' : offer.status}
              </span>
              <p className="text-2xl font-black text-emerald-400 flex items-center sm:justify-end gap-1 mt-2">
                <IndianRupee className="w-5 h-5" />
                {offer.offeredCtc?.toLocaleString('en-IN')}{' '}
                <span className="text-xs font-medium text-slate-400">/ Annum</span>
              </p>
            </div>
          </div>

          {/* Key Parameters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-slate-800/40 p-4 rounded-2xl border border-slate-800">
            <div>
              <span className="text-slate-500">Department</span>
              <p className="font-semibold text-slate-200 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                {offer.department}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Location</span>
              <p className="font-semibold text-slate-200 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                {offer.location}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Proposed Joining</span>
              <p className="font-semibold text-slate-200 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                {offer.proposedJoinDate
                  ? new Date(offer.proposedJoinDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Flexible'}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Offer Expiry</span>
              <p className="font-semibold text-slate-200 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                {offer.expiresAt
                  ? new Date(offer.expiresAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'N/A'}
              </p>
            </div>
          </div>

          {/* Action Bar */}
          {!isResponded && !offer.isExpired && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-800">
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Please review your compensation and documents below prior to responding.
              </p>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-red-500/40 bg-red-950/30 hover:bg-red-900/50 text-red-300 font-semibold text-xs transition-all"
                >
                  Decline Offer
                </button>
                <button
                  onClick={() => setShowAcceptModal(true)}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Accept Offer</span>
                </button>
              </div>
            </div>
          )}

          {/* Accepted Response State with E-Signature Action */}
          {isAccepted && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Offer Accepted</span>
                </h4>
                <p className="text-xs text-slate-300">
                  Responded on{' '}
                  {new Date(offer.respondedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  . Electronic signature status:{' '}
                  <strong className={offer.signatureStatus === 'Signed' ? 'text-emerald-400' : 'text-amber-400'}>
                    {offer.signatureStatus === 'Signed' ? 'Completed & Verified' : 'Pending Signature'}
                  </strong>
                </p>
              </div>

              {offer.signatureStatus !== 'Signed' ? (
                <button
                  onClick={() => setShowSignModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
                >
                  <PenTool className="w-4 h-4" />
                  <span>Sign Documents</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-900/60 border border-emerald-500/50 text-emerald-300 text-xs font-semibold">
                  <Lock className="w-4 h-4" />
                  <span>Signed & Secured</span>
                </div>
              )}
            </div>
          )}

          {/* Declined State Notice */}
          {isDeclined && (
            <div className="bg-red-950/40 border border-red-500/40 rounded-2xl p-5">
              <h4 className="text-sm font-bold text-red-300 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" />
                <span>Offer Declined</span>
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                You declined this offer on{' '}
                {new Date(offer.respondedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
                .
              </p>
            </div>
          )}
        </div>

        {/* Compensation Breakdown Card */}
        {comp && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <IndianRupee className="w-5 h-5 text-emerald-400" />
                  <span>Compensation Structure (Annexure A)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detailed statutory salary and employer contribution breakdown
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500">Gross Monthly</span>
                <p className="text-base font-bold text-white">
                  ₹{comp.monthlyGross?.toLocaleString('en-IN') || comp.components?.basicMonthly?.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 pr-4 font-semibold">Salary Component</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Monthly (₹)</th>
                    <th className="py-2.5 pl-4 font-semibold text-right">Annual (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-white">Basic Salary</td>
                    <td className="py-2.5 px-4 text-right">{comp.components?.basicMonthly?.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 pl-4 text-right font-medium">{comp.components?.basicAnnual?.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-white">House Rent Allowance (HRA)</td>
                    <td className="py-2.5 px-4 text-right">{comp.components?.hraMonthly?.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 pl-4 text-right font-medium">{comp.components?.hraAnnual?.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-white">Special Allowance</td>
                    <td className="py-2.5 px-4 text-right">{comp.components?.specialAllowanceMonthly?.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 pl-4 text-right font-medium">{comp.components?.specialAllowanceAnnual?.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-white">Conveyance Allowance</td>
                    <td className="py-2.5 px-4 text-right">{comp.components?.conveyanceMonthly?.toLocaleString('en-IN') || '1,600'}</td>
                    <td className="py-2.5 pl-4 text-right font-medium">{comp.components?.conveyanceAnnual?.toLocaleString('en-IN') || '19,200'}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-white">Medical Allowance</td>
                    <td className="py-2.5 px-4 text-right">{comp.components?.medicalAllowanceMonthly?.toLocaleString('en-IN') || '1,250'}</td>
                    <td className="py-2.5 pl-4 text-right font-medium">{comp.components?.medicalAllowanceAnnual?.toLocaleString('en-IN') || '15,000'}</td>
                  </tr>

                  {/* Employer Contributions */}
                  <tr className="bg-slate-800/30 font-semibold text-slate-400">
                    <td colSpan={3} className="py-2 pr-4 text-slate-400 uppercase tracking-wider text-[10px]">
                      Employer Statutory Contributions
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-slate-300">Employer Provident Fund (PF)</td>
                    <td className="py-2.5 px-4 text-right">{comp.employerContributions?.pfMonthly?.toLocaleString('en-IN') || '1,800'}</td>
                    <td className="py-2.5 pl-4 text-right font-medium">{comp.employerContributions?.pfAnnual?.toLocaleString('en-IN') || '21,600'}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-slate-300">Gratuity Provision</td>
                    <td className="py-2.5 px-4 text-right">{comp.employerContributions?.gratuityMonthly?.toLocaleString('en-IN') || '0'}</td>
                    <td className="py-2.5 pl-4 text-right font-medium">{comp.employerContributions?.gratuityAnnual?.toLocaleString('en-IN') || '0'}</td>
                  </tr>

                  {/* Variable Pay if any */}
                  {comp.variablePayAnnual > 0 && (
                    <tr>
                      <td className="py-2.5 pr-4 font-medium text-indigo-300">Annual Performance Variable Pay</td>
                      <td className="py-2.5 px-4 text-right text-slate-500">—</td>
                      <td className="py-2.5 pl-4 text-right font-medium text-indigo-300">{comp.variablePayAnnual?.toLocaleString('en-IN')}</td>
                    </tr>
                  )}

                  {/* Total Row */}
                  <tr className="border-t-2 border-slate-700 bg-slate-800/50 font-bold text-white text-sm">
                    <td className="py-3 pr-4">Total Cost to Company (CTC)</td>
                    <td className="py-3 px-4 text-right">₹{comp.monthlyGross?.toLocaleString('en-IN')}</td>
                    <td className="py-3 pl-4 text-right text-emerald-400">₹{comp.annualCtc?.toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Take-Home Pay Estimate Box */}
            <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-semibold text-slate-300">Estimated Net Monthly Take-Home</span>
                <p className="text-slate-500">Excluding individual income tax (TDS), which depends on tax regime selection.</p>
              </div>
              <p className="text-lg font-black text-emerald-300">
                ₹{comp.estimatedNetTakeHomeMonthly?.toLocaleString('en-IN') || comp.monthlyGross?.toLocaleString('en-IN')} / month
              </p>
            </div>
          </div>
        )}

        {/* Offer Documents List */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span>Official Offer Documents</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Download verified employment documents and agreements
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              {offer.documents?.length || 0} Files Available
            </span>
          </div>

          {offer.documents && offer.documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {offer.documents.map((doc: any) => (
                <div
                  key={doc.id}
                  className="bg-slate-800/50 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                        <FileCheck2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{doc.templateName || doc.documentType}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {doc.fileName} · {(doc.fileSizeBytes / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-700">
                      PDF
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    <a
                      href={`/api/candidate/offers/${offer.id}/documents/${doc.id}`}
                      download={doc.fileName}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/20"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-xs">
              Documents are being prepared by People Operations.
            </div>
          )}
        </div>
      </main>

      {/* Accept Offer Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-white">Accept Employment Offer</h3>
              <p className="text-xs text-slate-400 mt-1">
                You are about to accept the offer for <strong>{offer.offeredTitle}</strong> at Mylotic Group.
              </p>
            </div>

            <div className="space-y-4">
              <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptConsent}
                  onChange={(e) => setAcceptConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-emerald-600 rounded bg-slate-900 border-slate-700 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-300 leading-relaxed">
                  I confirm that I have reviewed the compensation terms, proposed start date (
                  <strong>
                    {offer.proposedJoinDate
                      ? new Date(offer.proposedJoinDate).toLocaleDateString('en-IN')
                      : 'To be confirmed'}
                  </strong>
                  ), and employment conditions, and I formally accept this offer.
                </span>
              </label>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Optional Notes / Comments for HR
                </label>
                <textarea
                  rows={2}
                  value={acceptRemarks}
                  onChange={(e) => setAcceptRemarks(e.target.value)}
                  placeholder="Looking forward to joining the team..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAcceptModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 font-medium transition-all"
              >
                Cancel
              </button>
              <button
                disabled={!acceptConsent || acceptLoading}
                onClick={handleAcceptOffer}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {acceptLoading ? 'Processing...' : 'Confirm Acceptance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Offer Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 mb-3">
                <XCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-white">Decline Employment Offer</h3>
              <p className="text-xs text-slate-400 mt-1">
                Please let our recruitment team know why you are declining this opportunity.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Reason for Declining <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., I have accepted another offer / Compensation expectations / Location constraints..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">Minimum 5 characters required.</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 font-medium transition-all"
              >
                Cancel
              </button>
              <button
                disabled={rejectReason.trim().length < 5 || rejectLoading}
                onClick={handleRejectOffer}
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-lg shadow-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejectLoading ? 'Submitting...' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* E-Signature Modal */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3">
                <PenTool className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-white">Electronic Signature</h3>
              <p className="text-xs text-slate-400 mt-1">
                Execute your legally binding electronic signature for your offer documents.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Signer Full Legal Name <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Enter your full legal name"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={signConsent}
                  onChange={(e) => setSignConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-300 leading-relaxed">
                  I agree that typing my name and clicking &quot;Submit Signature&quot; constitutes my legal electronic signature and confirms my intent to execute these offer documents.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSignModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 font-medium transition-all"
              >
                Cancel
              </button>
              <button
                disabled={!signConsent || !signerName.trim() || signLoading}
                onClick={handleExecuteSignature}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <PenTool className="w-4 h-4" />
                <span>{signLoading ? 'Executing...' : 'Submit Electronic Signature'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
