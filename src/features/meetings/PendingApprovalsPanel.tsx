'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, ClipboardCheck, Edit3, ExternalLink, RefreshCw, X } from 'lucide-react';
import Link from 'next/link';
import { authFetch } from '@/lib/api-client';
import { useHRMS } from '@/shared/providers/HRMSContext';

type ApprovalAction = 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';

type PendingJobApproval = { id: string; level: number; title: string; context: string };
type PendingOfferApproval = { id: string; level: number; title: string; candidate: string; context: string };

type MyApprovalsResponse = {
  success?: boolean;
  data?: { jobs?: PendingJobApproval[]; offers?: PendingOfferApproval[] };
  error?: string;
};

/**
 * Pending recruitment approvals (job requisitions + offers) surfaced on the
 * Meetings page so approvers can act without hopping over to Recruitment ATS.
 * Employees never see it, and it hides itself when nothing is pending.
 */
export function PendingApprovalsPanel() {
  const { currentUser } = useHRMS();
  const [jobs, setJobs] = useState<PendingJobApproval[]>([]);
  const [offers, setOffers] = useState<PendingOfferApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await authFetch<Response>('/api/recruitment/my-approvals', { raw: true });
      const json = (await res.json().catch(() => ({}))) as MyApprovalsResponse;
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load pending approvals');
      setJobs(json.data?.jobs ?? []);
      setOffers(json.data?.offers ?? []);
    } catch {
      // Silent: the Recruitment page remains the authoritative surface.
      setJobs([]);
      setOffers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser.userRole !== 'employee') void load();
  }, [currentUser.userRole, load]);

  const runAction = async (kind: 'job' | 'offer', id: string, action: ApprovalAction) => {
    if (action !== 'APPROVE') {
      const label = action === 'REJECT' ? 'Reject' : 'Request changes on';
      const proceed = window.confirm(`${label} this ${kind === 'job' ? 'job requisition' : 'offer'}?`);
      if (!proceed) return;
    }
    const comment = action === 'APPROVE' ? '' : (window.prompt('Optional note for the requester:') ?? '');
    setBusyKey(`${kind}:${id}`);
    setActionError(null);
    try {
      // Job approval steps read body.note while offer steps read body.comment;
      // sending both keys keeps a single call site correct for either route.
      const res = await authFetch<Response>(`/api/recruitment/${kind === 'job' ? 'jobs' : 'offers'}/${id}/approvals`, {
        raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: comment.trim() || undefined, comment: comment.trim() || undefined }),
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error || `Failed to process ${action}`);
      await load();
    } catch (err: any) {
      setActionError(err.message || `Error processing ${action}`);
    } finally {
      setBusyKey(null);
    }
  };

  const pendingCount = jobs.length + offers.length;
  if (currentUser.userRole === 'employee' || (!isLoading && pendingCount === 0)) return null;

  const kindLabel = (kind: 'job' | 'offer', item: PendingJobApproval | PendingOfferApproval) =>
    kind === 'job'
      ? `Job requisition · L${item.level}`
      : `Offer · L${(item as PendingOfferApproval).level}`;

  const buttons = (kind: 'job' | 'offer', id: string) => (
    <div className="flex shrink-0 flex-wrap gap-2">
      <button onClick={() => void runAction(kind, id, 'APPROVE')} disabled={busyKey !== null} className="primary-button">
        <Check className="h-3.5 w-3.5" /> Approve
      </button>
      <button onClick={() => void runAction(kind, id, 'REQUEST_CHANGES')} disabled={busyKey !== null} className="toolbar-button">
        <Edit3 className="h-3.5 w-3.5" /> Request changes
      </button>
      <button onClick={() => void runAction(kind, id, 'REJECT')} disabled={busyKey !== null} className="danger-button">
        <X className="h-3.5 w-3.5" /> Reject
      </button>
    </div>
  );

  return (
    <section className="rounded-xl border border-[#D9E5EE] bg-white p-4" aria-label="Pending approvals">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-[#17324A]" />
          <h2 className="text-sm font-bold text-[#17324A]">Approvals waiting for you</h2>
          <span className="rounded-full bg-[#FBEDEA] px-2 py-0.5 text-[11px] font-bold text-[#8D4333]">{pendingCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/recruitment" className="toolbar-button">
            <ExternalLink className="h-3.5 w-3.5" /> Open Recruitment
          </Link>
          <button onClick={() => void load()} disabled={isLoading} className="toolbar-button">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {actionError && (
        <p className="mt-3 rounded-lg border border-[#9B3F3F] bg-[#FBEDEA] px-3 py-2 text-xs font-medium text-[#9B3F3F]">{actionError}</p>
      )}

      <div className="mt-3 space-y-2">
        {jobs.map((job) => (
          <div key={`job-${job.id}`} className="flex flex-col gap-3 rounded-lg border border-[#D9E5EE] bg-[#F9FBFD] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="rounded-full bg-[#EAF2F8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#39759D]">{kindLabel('job', job)}</span>
              <p className="mt-1 text-sm font-semibold text-[#17324A]">{job.title}</p>
              <p className="text-xs text-[#667085]">{job.context}</p>
            </div>
            {buttons('job', job.id)}
          </div>
        ))}
        {offers.map((offer) => (
          <div key={`offer-${offer.id}`} className="flex flex-col gap-3 rounded-lg border border-[#D9E5EE] bg-[#F9FBFD] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="rounded-full bg-[#EAF2F8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#39759D]">{kindLabel('offer', offer)}</span>
              <p className="mt-1 text-sm font-semibold text-[#17324A]">{offer.title} — {offer.candidate}</p>
              <p className="text-xs text-[#667085]">{offer.context}</p>
            </div>
            {buttons('offer', offer.id)}
          </div>
        ))}
      </div>
    </section>
  );
}
