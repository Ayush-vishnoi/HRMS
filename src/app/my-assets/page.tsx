'use client';

import { authFetch } from '@/lib/api-client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Backpack,
  CheckCircle2,
  Eye,
  PackagePlus,
  RotateCcw,
  X,
} from 'lucide-react';

interface MyAsset {
  id: string;
  assetTag: string;
  category: string;
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
  status: string;
  condition: string;
  location: string;
  purchaseDate: string;
  warrantyUntil: string | null;
  allocationDate: string | null;
  acknowledgedAt: string | null;
  updatedAt: string;
}

interface MyAssetRequest {
  id: string;
  type: 'New Asset' | 'Issue Report' | 'Return';
  status: 'Pending' | 'Approved' | 'Rejected';
  reason: string;
  urgency: string | null;
  category: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  asset: { id: string; name: string; assetTag: string } | null;
}

const CATEGORIES = ['Laptop', 'Monitor', 'Mobile', 'Access Card', 'Other'];
const URGENCIES = ['Low', 'Medium', 'High'];

const statusStyles: Record<string, string> = {
  Assigned: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Available: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  Repair: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Retired: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

const requestStatusStyles: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Rejected: 'bg-rose-50 text-rose-700 ring-rose-600/20',
};

const urgencyStyles: Record<string, string> = {
  Low: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  Medium: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  High: 'bg-rose-50 text-rose-700 ring-rose-600/20',
};

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900';

function Stat({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type RequestModalMode = 'new' | 'issue' | 'return';

export default function MyAssetsPage() {
  const [assets, setAssets] = useState<MyAsset[]>([]);
  const [requests, setRequests] = useState<MyAssetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [detailAsset, setDetailAsset] = useState<MyAsset | null>(null);
  const [requestModal, setRequestModal] = useState<RequestModalMode | null>(null);
  const [requestAssetId, setRequestAssetId] = useState('');
  const [requestCategory, setRequestCategory] = useState('Laptop');
  const [requestUrgency, setRequestUrgency] = useState('Medium');
  const [requestReason, setRequestReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await authFetch<Response>('/api/my-assets', { raw: true, cache: 'no-store' });
        const json = await response.json().catch(() => null);
        if (response.ok && json?.success) {
          setAssets(json.data?.assets || []);
          setRequests(json.data?.requests || []);
          break;
        }
        const isServerError = response.status >= 500;
        if (!isServerError || attempt === maxAttempts) {
          throw new Error(
            isServerError
              ? 'The database is waking up — please try again in a few seconds.'
              : json?.error || 'Failed to load your assets.'
          );
        }
        await new Promise((resolve) => { window.setTimeout(resolve, attempt * 1500); });
      } catch {
        if (attempt === maxAttempts) {
          setError('Failed to load your assets. Please refresh the page.');
        } else {
          await new Promise((resolve) => { window.setTimeout(resolve, attempt * 1500); });
        }
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingAcknowledgements = useMemo(
    () => assets.filter((a) => a.status === 'Assigned' && !a.acknowledgedAt),
    [assets]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      const matchesQuery =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.assetTag.toLowerCase().includes(q) ||
        a.brand.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q) ||
        a.serialNumber.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === 'All' || a.category === categoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [assets, query, categoryFilter]);

  const acknowledge = async (assetId: string) => {
    setBusy(true);
    setActionError('');
    try {
      const response = await authFetch<Response>('/api/my-assets', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge', assetId }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        throw new Error(json?.error || 'Failed to confirm receipt.');
      }
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to confirm receipt.');
    } finally {
      setBusy(false);
    }
  };

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!requestModal) return;
    setBusy(true);
    setActionError('');
    try {
      const payload: Record<string, unknown> = {
        action: 'request',
        type: requestModal === 'new' ? 'New Asset' : requestModal === 'issue' ? 'Issue Report' : 'Return',
        reason: requestReason,
      };
      if (requestModal === 'new') payload.category = requestCategory;
      if (requestModal === 'issue') {
        payload.assetId = requestAssetId;
        payload.urgency = requestUrgency;
      }
      if (requestModal === 'return') payload.assetId = requestAssetId;

      const response = await authFetch<Response>('/api/my-assets', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        throw new Error(json?.error || 'Failed to submit request.');
      }
      setRequestModal(null);
      setRequestReason('');
      setRequestAssetId('');
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to submit request.');
    } finally {
      setBusy(false);
    }
  };

  const openRequest = (mode: RequestModalMode, assetId?: string) => {
    setActionError('');
    setRequestReason('');
    setRequestAssetId(assetId || '');
    setRequestModal(mode);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Backpack className="h-6 w-6 text-slate-700" /> My Assets
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Assets assigned to you, receipt confirmations, and requests to HR.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openRequest('new')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <PackagePlus className="h-4 w-4" /> Request New Asset
          </button>
          <button
            type="button"
            onClick={() => openRequest('issue')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
          >
            <AlertTriangle className="h-4 w-4" /> Report Issue
          </button>
          <button
            type="button"
            onClick={() => openRequest('return')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" /> Request Return
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      ) : null}
      {actionError ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{actionError}</div>
      ) : null}

      {pendingAcknowledgements.length > 0 ? (
        <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-sm font-semibold text-sky-900">
            Confirm receipt of {pendingAcknowledgements.length} asset
            {pendingAcknowledgements.length > 1 ? 's' : ''}
          </p>
          <p className="mt-1 text-xs text-sky-700">
            Let HR know you have received these assets in good condition.
          </p>
          <ul className="mt-3 space-y-2">
            {pendingAcknowledgements.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-200 bg-white px-3 py-2"
              >
                <span className="text-sm text-slate-700">
                  <span className="font-medium text-slate-900">{a.name}</span> · {a.assetTag}
                  {a.allocationDate ? ` · allocated ${a.allocationDate}` : ''}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => acknowledge(a.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> I've received this in good condition
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Assigned to me" value={assets.length} tone="text-slate-900" />
        <Stat label="Awaiting my confirmation" value={pendingAcknowledgements.length} tone="text-sky-600" />
        <Stat label="Open requests" value={requests.filter((r) => r.status === 'Pending').length} tone="text-amber-600" />
        <Stat label="Approved requests" value={requests.filter((r) => r.status === 'Approved').length} tone="text-emerald-600" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-slate-500">Loading your assets…</div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, tag, brand, model or serial…"
              className={`${inputClass} sm:max-w-xs`}
            />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={`${inputClass} sm:max-w-[180px]`}>
              <option value="All">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Asset</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Model</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Allocated</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Receipt</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                      No assets assigned to you yet.
                    </td>
                  </tr>
                ) : (
                  filtered.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{a.name}</p>
                        <p className="text-xs text-slate-500">{a.assetTag}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{a.category}</td>
                      <td className="px-4 py-3 text-slate-700">{a.brand} {a.model}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles[a.status] || statusStyles.Available}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{a.allocationDate || '—'}</td>
                      <td className="px-4 py-3">
                        {a.acknowledgedAt ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Confirmed
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => acknowledge(a.id)}
                            className="rounded-lg bg-sky-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                          >
                            Confirm Receipt
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailAsset(a)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => openRequest('issue', a.id)}
                            className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                          >
                            Report Issue
                          </button>
                          <button
                            type="button"
                            onClick={() => openRequest('return', a.id)}
                            className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Return
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h2 className="mt-10 mb-3 text-lg font-semibold text-slate-900">My Requests</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Request</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Asset</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">HR Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                      You haven't submitted any asset requests yet.
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{r.type}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {r.urgency ? ` · ${r.urgency} urgency` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {r.asset ? `${r.asset.name} (${r.asset.assetTag})` : r.category || '—'}
                      </td>
                      <td className="max-w-[260px] px-4 py-3 text-slate-600">{r.reason}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${requestStatusStyles[r.status]}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="max-w-[220px] px-4 py-3 text-slate-600">{r.reviewNote || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {detailAsset ? (
        <Modal title={detailAsset.name} onClose={() => setDetailAsset(null)}>
          <dl className="space-y-3 text-sm">
            {[
              ['Asset Tag', detailAsset.assetTag],
              ['Category', detailAsset.category],
              ['Brand', detailAsset.brand],
              ['Model', detailAsset.model],
              ['Serial Number', detailAsset.serialNumber],
              ['Status', detailAsset.status],
              ['Condition', detailAsset.condition],
              ['Location', detailAsset.location],
              ['Allocated on', detailAsset.allocationDate || '—'],
              ['Purchase Date', detailAsset.purchaseDate],
              ['Warranty Until', detailAsset.warrantyUntil || '—'],
              [
                'Receipt Confirmed',
                detailAsset.acknowledgedAt
                  ? new Date(detailAsset.acknowledgedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                  : 'Pending',
              ],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-right font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => { setDetailAsset(null); openRequest('issue', detailAsset.id); }}
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
            >
              Report Issue
            </button>
            <button
              type="button"
              onClick={() => { setDetailAsset(null); openRequest('return', detailAsset.id); }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Request Return
            </button>
          </div>
        </Modal>
      ) : null}

      {requestModal ? (
        <Modal
          title={
            requestModal === 'new'
              ? 'Request New Asset'
              : requestModal === 'issue'
                ? 'Report an Issue'
                : 'Request Return'
          }
          onClose={() => setRequestModal(null)}
        >
          <form onSubmit={submitRequest} className="space-y-4">
            {requestModal === 'new' ? (
              <Field label="Asset category">
                <select value={requestCategory} onChange={(e) => setRequestCategory(e.target.value)} className={inputClass}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
            ) : null}

            {requestModal !== 'new' ? (
              <Field label={requestModal === 'issue' ? 'Which asset has the issue?' : 'Which asset do you want to return?'}>
                <select value={requestAssetId} onChange={(e) => setRequestAssetId(e.target.value)} className={inputClass} required>
                  <option value="">Select an asset…</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.assetTag})
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            {requestModal === 'issue' ? (
              <Field label="Urgency">
                <select value={requestUrgency} onChange={(e) => setRequestUrgency(e.target.value)} className={inputClass}>
                  {URGENCIES.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </Field>
            ) : null}

            <Field label={requestModal === 'new' ? 'Justification' : requestModal === 'issue' ? 'Describe the issue' : 'Reason for return'}>
              <textarea
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                rows={4}
                maxLength={500}
                required
                placeholder={
                  requestModal === 'new'
                    ? 'Why do you need this asset?'
                    : requestModal === 'issue'
                      ? 'What is wrong with the asset?'
                      : 'Why are you returning this asset?'
                }
                className={inputClass}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRequestModal(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Submit Request
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
