'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Crown,
  ClipboardCheck,
  ShieldCheck,
  Check,
  X,
  UserCog,
  Clock3,
  CircleSlash,
  Wallet,
  Users,
} from 'lucide-react';

import { authFetch } from '@/lib/api-client';
import { useHRMS } from '@/shared/providers/HRMSContext';
import PageLoader from '@/shared/components/PageLoader';

/* ==========================================================================
   GOVERNANCE & CONTROLS
   The CEO's authority surface — approvals and delegation, split out of the
   analytics Dashboard so each has a single job:
   1. Pending CEO Approval — paid candidates awaiting onboarding sign-off, with
      interviewer feedback + HR recommendation for review.
   2. Requisition Budget Approval — new roles awaiting budget/headcount sign-off.
   3. Delegate My Access — grant specific, time-bound CEO permissions to a
      chosen HR Admin (revocable), plus the list of active/past grants.
   All are gated server-side; this UI only mirrors that authority. Visible to
   the CEO always, and to HR Admins only while they hold an active delegation.
   ========================================================================== */

type ReqApprovalItem = {
  jobId: string;
  title: string | null;
  department: string | null;
  location: string | null;
  employmentType: string | null;
  priority: string | null;
  requirements: string[];
  experienceMin: number | null;
  experienceMax: number | null;
  hiringManager: { id: string; name: string } | null;
  requestedBy: string;
  requestedOpenings: number;
  requestedSalaryMin: number | null;
  requestedSalaryMax: number | null;
  currency: string;
  createdAt: string;
};

type CatalogItem = { permission: string; label: string };

type OfferApprovalItem = {
  id: string;
  level: number;
  title: string | null;
  candidate: string;
  context: string | null;
};

type Delegation = {
  id: string;
  permission: string;
  label: string;
  delegateeId: string;
  delegateeName: string;
  delegateeRoleTitle: string | null;
  note: string | null;
  grantedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  active: boolean;
};

type AdminOption = { id: string; name: string; roleTitle: string | null };

const unwrap = <T,>(res: any): T => (res?.data ?? res) as T;

const formatCtc = (value: number | null, currency: string) => {
  if (value == null) return '—';
  return `${currency === 'INR' ? '₹' : currency + ' '}${value.toLocaleString('en-IN')}`;
};

const formatDate = (value: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const GovernanceControls: React.FC = () => {
  const { currentUser, activeDelegations, hasCeoPermission, refreshDelegations } = useHRMS();
  const isCeo = currentUser.rawRole === 'ceo';

  const [loading, setLoading] = useState(true);

  const [reqQueue, setReqQueue] = useState<ReqApprovalItem[]>([]);
  const [reqEdits, setReqEdits] = useState<Record<string, { openings: string; salaryMin: string; salaryMax: string; note: string }>>({});
  const [reqBusy, setReqBusy] = useState<string | null>(null);

  // Offer approval chain (L1→L2→L3 sign-off before an offer is sent). The CEO is
  // usually the final approver, so surface their pending offer steps here too.
  const [offerQueue, setOfferQueue] = useState<OfferApprovalItem[]>([]);
  const [offerNotes, setOfferNotes] = useState<Record<string, string>>({});
  const [offerBusy, setOfferBusy] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [expiresAt, setExpiresAt] = useState('');
  const [grantNote, setGrantNote] = useState('');
  const [granting, setGranting] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const canApproveReq = hasCeoPermission('REQUISITION_APPROVAL');

  const loadOfferQueue = useCallback(async () => {
    try {
      const res = await authFetch<any>('/api/recruitment/my-approvals');
      const data = res?.data ?? res;
      const offers = data?.offers;
      setOfferQueue(Array.isArray(offers) ? offers : []);
    } catch {
      setOfferQueue([]);
    }
  }, []);

  const loadReqQueue = useCallback(async () => {
    try {
      const res = await authFetch<any>('/api/recruitment/requisition-approvals');
      const rows = unwrap<ReqApprovalItem[]>(res);
      const list = Array.isArray(rows) ? rows : [];
      setReqQueue(list);
      setReqEdits((prev) => {
        const next = { ...prev };
        for (const r of list) {
          if (!next[r.jobId]) {
            next[r.jobId] = {
              openings: String(r.requestedOpenings ?? ''),
              salaryMin: r.requestedSalaryMin != null ? String(r.requestedSalaryMin) : '',
              salaryMax: r.requestedSalaryMax != null ? String(r.requestedSalaryMax) : '',
              note: '',
            };
          }
        }
        return next;
      });
    } catch {
      setReqQueue([]);
    }
  }, []);

  const loadDelegationData = useCallback(async () => {
    if (!isCeo) return;
    try {
      const [catRes, delRes, empRes] = await Promise.all([
        authFetch<any>('/api/permissions/catalog'),
        authFetch<any>('/api/permissions/delegations'),
        authFetch<any>('/api/employees?status=Active'),
      ]);
      setCatalog(unwrap<CatalogItem[]>(catRes) ?? []);
      setDelegations(unwrap<Delegation[]>(delRes) ?? []);
      const emps = unwrap<any[]>(empRes) ?? [];
      // Only HR Admins can receive delegated CEO powers.
      setAdmins(
        (Array.isArray(emps) ? emps : [])
          .filter((e: any) => e.userRole === 'admin')
          .map((e: any) => ({ id: e.id, name: e.name, roleTitle: e.roleTitle ?? null })),
      );
    } catch {
      /* non-fatal */
    }
  }, [isCeo]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([loadOfferQueue(), loadReqQueue(), loadDelegationData()]);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadOfferQueue, loadReqQueue, loadDelegationData]);

  const decideOffer = async (offerId: string, action: 'APPROVE' | 'REJECT') => {
    const note = offerNotes[offerId]?.trim();
    if (action === 'REJECT' && !note) {
      setBanner({ tone: 'err', text: 'A reason is required to reject an offer.' });
      return;
    }
    setOfferBusy(offerId);
    setBanner(null);
    try {
      await authFetch(`/api/recruitment/offers/${offerId}/approvals`, {
        method: 'POST',
        body: { action, comment: note || undefined },
      });
      setOfferQueue((prev) => prev.filter((o) => o.id !== offerId));
      setBanner({
        tone: 'ok',
        text: action === 'APPROVE' ? 'Offer approved.' : 'Offer sent back to draft.',
      });
    } catch (err) {
      setBanner({ tone: 'err', text: (err as Error).message || 'Could not record the decision.' });
    } finally {
      setOfferBusy(null);
    }
  };

  const decideReq = async (jobId: string, decision: 'Approved' | 'Rejected') => {
    const edit = reqEdits[jobId] || { openings: '', salaryMin: '', salaryMax: '', note: '' };
    if (decision === 'Rejected' && !edit.note.trim()) {
      setBanner({ tone: 'err', text: 'A reason is required to reject a requisition.' });
      return;
    }
    setReqBusy(jobId);
    setBanner(null);
    try {
      await authFetch(`/api/recruitment/requisition-approvals/${jobId}`, {
        method: 'POST',
        body: {
          decision,
          note: edit.note.trim() || undefined,
          approvedOpenings: decision === 'Approved' && edit.openings ? Number(edit.openings) : undefined,
          approvedSalaryMin: decision === 'Approved' && edit.salaryMin ? Number(edit.salaryMin) : undefined,
          approvedSalaryMax: decision === 'Approved' && edit.salaryMax ? Number(edit.salaryMax) : undefined,
        },
      });
      setReqQueue((prev) => prev.filter((r) => r.jobId !== jobId));
      setBanner({
        tone: 'ok',
        text: decision === 'Approved' ? 'Requisition budget approved.' : 'Requisition rejected.',
      });
    } catch (err) {
      setBanner({ tone: 'err', text: (err as Error).message || 'Could not record the decision.' });
    } finally {
      setReqBusy(null);
    }
  };

  const patchReqEdit = (jobId: string, patch: Partial<{ openings: string; salaryMin: string; salaryMax: string; note: string }>) =>
    setReqEdits((prev) => {
      const cur = prev[jobId] ?? { openings: '', salaryMin: '', salaryMax: '', note: '' };
      return { ...prev, [jobId]: { ...cur, ...patch } };
    });

  const togglePerm = (permission: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(permission)) next.delete(permission);
      else next.add(permission);
      return next;
    });
  };

  const grant = async () => {
    if (!selectedAdmin || selectedPerms.size === 0) return;
    setGranting(true);
    setBanner(null);
    try {
      // One grant record per selected permission (delegation is per-permission).
      for (const permission of selectedPerms) {
        await authFetch('/api/permissions/delegations', {
          method: 'POST',
          body: {
            permission,
            delegateeId: selectedAdmin,
            expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
            note: grantNote.trim() || null,
          },
        });
      }
      setSelectedPerms(new Set());
      setGrantNote('');
      setExpiresAt('');
      setSelectedAdmin('');
      await loadDelegationData();
      await refreshDelegations();
      setBanner({ tone: 'ok', text: 'Access delegated.' });
    } catch (err) {
      setBanner({ tone: 'err', text: (err as Error).message || 'Could not delegate access.' });
    } finally {
      setGranting(false);
    }
  };

  const revoke = async (id: string) => {
    setBanner(null);
    try {
      await authFetch(`/api/permissions/delegations/${id}/revoke`, { method: 'PATCH' });
      await loadDelegationData();
      await refreshDelegations();
      setBanner({ tone: 'ok', text: 'Delegation revoked.' });
    } catch (err) {
      setBanner({ tone: 'err', text: (err as Error).message || 'Could not revoke delegation.' });
    }
  };

  if (loading) return <PageLoader label="Loading governance controls..." cards={3} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#17324A]/70">Executive Leadership</p>
        <h1 className="flex items-center gap-2 text-xl font-bold text-[#17324A]">
          <Crown className="h-5 w-5 text-[#B7791F]" />
          Governance &amp; Controls
        </h1>
        <p className="mt-1 text-xs text-[#17324A]/70">
          {isCeo
            ? 'Approve offers and new requisitions, and delegate specific powers to your HR leadership.'
            : 'Exercise the executive approvals delegated to you.'}
        </p>
      </div>

      {banner && (
        <div
          className={`rounded-xl border px-4 py-2.5 text-xs font-semibold ${
            banner.tone === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* Feature 1a — Offer Approvals (offer chain sign-off, incl. final CEO step) */}
      <section className="rounded-2xl border border-[#B0D0EA] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-[#D9E5EE] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-[#17324A]">
              <ClipboardCheck className="h-4 w-4" />
              Offer Approvals
            </h2>
            <p className="mt-1 text-[11px] text-[#667085]">
              Offers pending your sign-off in the approval chain. An offer can only be sent once every
              level has approved — approving here clears your step.
            </p>
          </div>
          <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold text-amber-700">
            {offerQueue.length} awaiting
          </span>
        </div>

        {offerQueue.length === 0 ? (
          <div className="py-10 text-center">
            <Check className="mx-auto h-8 w-8 text-emerald-500" />
            <p className="mt-2 text-xs font-semibold text-[#17324A]">No offers awaiting your approval</p>
            <p className="mt-1 text-[11px] text-[#667085]">Offers that need your sign-off will appear here.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {offerQueue.map((o) => (
              <div key={o.id} className="rounded-xl border border-[#D9E5EE] bg-[#F9FBFD] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#17324A]">{o.candidate}</p>
                    <p className="text-[11px] text-[#667085]">
                      {o.title}
                      {o.context ? ` · ${o.context}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-[#B0D0EA] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#17324A]">
                    Level {o.level}
                  </span>
                </div>

                <textarea
                  value={offerNotes[o.id] ?? ''}
                  onChange={(e) => setOfferNotes((cur) => ({ ...cur, [o.id]: e.target.value }))}
                  placeholder="Optional note (required to reject)…"
                  rows={2}
                  className="mt-3 w-full resize-none rounded-lg border border-[#D9E5EE] bg-white px-3 py-2 text-[11px] text-[#17324A] outline-none placeholder:text-[#98A2B3] focus:border-[#6FA6C9]"
                />

                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={offerBusy === o.id}
                    onClick={() => decideOffer(o.id, 'REJECT')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-[10px] font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" /> Reject
                  </button>
                  <button
                    type="button"
                    disabled={offerBusy === o.id}
                    onClick={() => decideOffer(o.id, 'APPROVE')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" /> {offerBusy === o.id ? 'Saving…' : 'Approve offer'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Feature 1b — Requisition Budget Approval */}
      <section className="rounded-2xl border border-[#B0D0EA] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-[#D9E5EE] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-[#17324A]">
              <Wallet className="h-4 w-4" />
              Requisition Budget Approval
            </h2>
            <p className="mt-1 text-[11px] text-[#667085]">
              New roles need your budget + headcount sign-off before HR can open hiring. Adjust the openings or salary band if needed.
            </p>
          </div>
          <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold text-amber-700">
            {reqQueue.length} awaiting
          </span>
        </div>

        {!canApproveReq ? (
          <div className="py-10 text-center">
            <CircleSlash className="mx-auto h-8 w-8 text-[#98A2B3]" />
            <p className="mt-2 text-xs font-semibold text-[#17324A]">You don’t hold requisition-approval authority</p>
            <p className="mt-1 text-[11px] text-[#667085]">Ask the CEO to delegate the Requisition Budget Approval permission.</p>
          </div>
        ) : reqQueue.length === 0 ? (
          <p className="py-10 text-center text-xs text-[#667085]">No new requisitions awaiting budget approval.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {reqQueue.map((r) => {
              const edit = reqEdits[r.jobId] || { openings: '', salaryMin: '', salaryMax: '', note: '' };
              const busy = reqBusy === r.jobId;
              return (
                <div key={r.jobId} className="rounded-xl border border-[#D9E5EE] bg-[#F8FBFD] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-[#17324A]">{r.title}</p>
                      <p className="text-[11px] text-[#667085]">
                        {r.department} · {r.location} · {r.employmentType === 'Contract' ? 'Contract' : 'Full-time'}
                        {r.priority ? ` · ${r.priority} priority` : ''}
                      </p>
                      <p className="mt-1 text-[11px] text-[#667085]">Requested by {r.requestedBy}</p>
                    </div>
                    <span className="rounded-full border border-[#B0D0EA] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#17324A]">
                      Requested: {r.requestedOpenings} opening(s)
                      {r.requestedSalaryMin != null || r.requestedSalaryMax != null
                        ? ` · ${formatCtc(r.requestedSalaryMin, r.currency)}–${formatCtc(r.requestedSalaryMax, r.currency)}`
                        : ''}
                    </span>
                  </div>

                  {r.requirements.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.requirements.slice(0, 10).map((req, i) => (
                        <span key={i} className="rounded bg-white px-2 py-0.5 text-[10px] text-[#315B76] border border-[#D9E5EE]">
                          {req}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <label className="text-[10px] font-semibold text-[#667085]">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Approved openings</span>
                      <input
                        type="number"
                        min={1}
                        value={edit.openings}
                        onChange={(e) => patchReqEdit(r.jobId, { openings: e.target.value })}
                        className="mt-1 w-full rounded border border-[#C3D9E8] px-2 py-1 text-xs text-[#17324A] outline-none"
                      />
                    </label>
                    <label className="text-[10px] font-semibold text-[#667085]">
                      Salary min ({r.currency})
                      <input
                        type="number"
                        value={edit.salaryMin}
                        onChange={(e) => patchReqEdit(r.jobId, { salaryMin: e.target.value })}
                        className="mt-1 w-full rounded border border-[#C3D9E8] px-2 py-1 text-xs text-[#17324A] outline-none"
                      />
                    </label>
                    <label className="text-[10px] font-semibold text-[#667085]">
                      Salary max ({r.currency})
                      <input
                        type="number"
                        value={edit.salaryMax}
                        onChange={(e) => patchReqEdit(r.jobId, { salaryMax: e.target.value })}
                        className="mt-1 w-full rounded border border-[#C3D9E8] px-2 py-1 text-xs text-[#17324A] outline-none"
                      />
                    </label>
                  </div>

                  <textarea
                    value={edit.note}
                    onChange={(e) => patchReqEdit(r.jobId, { note: e.target.value })}
                    placeholder="Note (required to reject)"
                    rows={2}
                    className="mt-2 w-full rounded border border-[#C3D9E8] px-2 py-1.5 text-xs text-[#17324A] outline-none"
                  />

                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => decideReq(r.jobId, 'Rejected')}
                      className="flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" /> Reject
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => decideReq(r.jobId, 'Approved')}
                      className="flex items-center gap-1 rounded-lg bg-[#17324A] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#315B76] disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" /> Approve budget
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Feature 2 — Delegate My Access (CEO only) */}
      {isCeo && (
        <section className="rounded-2xl border border-[#B0D0EA] bg-white p-5 shadow-sm">
          <div className="border-b border-[#D9E5EE] pb-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[#17324A]">
              <ShieldCheck className="h-4 w-4" />
              Delegate My Access
            </h2>
            <p className="mt-1 text-[11px] text-[#667085]">
              Temporarily grant specific executive powers to an HR Admin. This is a time-bound grant, not a role change —
              revoke it any time and the admin immediately loses the power.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Grant form */}
            <div className="space-y-3 rounded-xl border border-[#E4EBF1] bg-[#F9FBFD] p-4">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#52677A]">HR Admin</label>
                <select
                  value={selectedAdmin}
                  onChange={(e) => setSelectedAdmin(e.target.value)}
                  className="w-full rounded-lg border border-[#D9E5EE] bg-white px-3 py-2 text-xs text-[#17324A] outline-none focus:border-[#6FA6C9]"
                >
                  <option value="">Select an admin…</option>
                  {admins.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                      {a.roleTitle ? ` — ${a.roleTitle}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#52677A]">Permissions</label>
                <div className="space-y-2">
                  {catalog.map((item) => (
                    <label key={item.permission} className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#D9E5EE] bg-white px-3 py-2 text-xs text-[#17324A]">
                      <input
                        type="checkbox"
                        checked={selectedPerms.has(item.permission)}
                        onChange={() => togglePerm(item.permission)}
                        className="h-3.5 w-3.5 accent-[#17324A]"
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#52677A]">
                  Expiry (optional — blank = until revoked)
                </label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-lg border border-[#D9E5EE] bg-white px-3 py-2 text-xs text-[#17324A] outline-none focus:border-[#6FA6C9]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#52677A]">Note (optional)</label>
                <input
                  type="text"
                  value={grantNote}
                  onChange={(e) => setGrantNote(e.target.value)}
                  placeholder="e.g. Covering while I travel"
                  className="w-full rounded-lg border border-[#D9E5EE] bg-white px-3 py-2 text-xs text-[#17324A] outline-none placeholder:text-[#98A2B3] focus:border-[#6FA6C9]"
                />
              </div>

              <button
                type="button"
                disabled={!selectedAdmin || selectedPerms.size === 0 || granting}
                onClick={grant}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#17324A] px-3 py-2.5 text-[11px] font-bold text-white hover:bg-[#22496B] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UserCog className="h-4 w-4" /> Delegate access
              </button>
            </div>

            {/* Existing grants */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#52677A]">Delegations issued</p>
              {delegations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#B0D0EA] bg-white px-3 py-8 text-center text-[11px] text-[#667085]">
                  You haven’t delegated any access yet.
                </div>
              ) : (
                <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                  {delegations.map((d) => (
                    <div key={d.id} className="rounded-xl border border-[#D9E5EE] bg-white p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#17324A]">{d.delegateeName}</span>
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[9px] font-bold text-sky-700">{d.label}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                            d.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {d.active ? 'Active' : d.revokedAt ? 'Revoked' : 'Expired'}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-[#98A2B3]">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3 w-3" />
                          {d.expiresAt ? `Expires ${formatDate(d.expiresAt)}` : 'No expiry'}
                        </span>
                        {d.note && <span className="italic">“{d.note}”</span>}
                      </div>
                      {d.active && (
                        <button
                          type="button"
                          onClick={() => revoke(d.id)}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-rose-700 hover:bg-rose-50"
                        >
                          <X className="h-3 w-3" /> Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* When acting via delegation, remind the admin whose authority they wield. */}
      {!isCeo && activeDelegations.length > 0 && (
        <p className="text-center text-[11px] text-[#667085]">
          Acting on behalf of {activeDelegations[0].delegatorName}. Powers revert the moment the CEO revokes them.
        </p>
      )}
    </div>
  );
};
