'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  FileSearch,
  FileText,
  History,
  Lock,
  Loader2,
  MessageSquarePlus,
  Search,
  Send,
  ShieldCheck,
  UploadCloud,
  X,
  XCircle,
} from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';

type DocumentStatus = 'Verified' | 'Under Review' | 'Action Required';
// Legacy statuses (Pending/In Progress/Ready/Delivered) remain for pre-migration rows.
type RequestStatus = 'Requested' | 'Submitted' | 'Verified' | 'Rejected' | 'Sent' | 'Downloaded' | 'Pending' | 'In Progress' | 'Ready' | 'Delivered';

type RequestAttachment = {
  id: string;
  documentId: string;
  name: string;
  source: string;
  downloadUrl: string | null;
};

type EmployeeDocument = {
  id: string;
  employeeId: string;
  employeeName: string;
  name: string;
  type: string;
  uploadedOn: string;
  size: string;
  status: DocumentStatus;
  note: string;
  downloadUrl?: string | null;
  downloadable?: boolean;
  expiresAt?: string | null;
  lockedUntil?: string | null;
  isLocked?: boolean;
  downloadedAt?: string | null;
  sharedByHr?: boolean;
  sharedAt?: string | null;
  uploadedByEmployee?: boolean;
};

type DocumentRequest = {
  id: string;
  employeeId: string;
  requestedBy: string;
  initiatedByHr?: boolean;
  documentType: string;
  reason: string;
  requestedOn: string;
  status: RequestStatus;
  sentAt?: string | null;
  downloadedAt?: string | null;
  attachments: RequestAttachment[];
};

type StaffMember = { id: string; name: string; employeeCode: string; department: string | null; roleTitle: string | null };
type Template = { id: string; name: string; variables: string[] };
type IconComponent = React.ComponentType<{ className?: string }>;

const statusStyle: Record<DocumentStatus | RequestStatus, string> = {
  Verified: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'Under Review': 'border-blue-200 bg-blue-50 text-blue-700',
  'Action Required': 'border-rose-200 bg-rose-50 text-rose-700',
  Requested: 'border-amber-200 bg-amber-50 text-amber-700',
  Submitted: 'border-blue-200 bg-blue-50 text-blue-700',
  Rejected: 'border-rose-200 bg-rose-50 text-rose-700',
  Sent: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  Downloaded: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Pending: 'border-amber-200 bg-amber-50 text-amber-700',
  'In Progress': 'border-violet-200 bg-violet-50 text-violet-700',
  Ready: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  Delivered: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

// Terminal request statuses — no further employee/HR action expected.
const CLOSED_REQUEST_STATUSES: RequestStatus[] = ['Sent', 'Downloaded', 'Verified', 'Rejected'];

const inputClass =
  'w-full rounded-lg border border-[#9FC2DC] bg-white px-3 py-2 text-sm text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA]';
const today = () =>
  new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

export default function DocumentsPage() {
  const { currentUser } = useHRMS();
  const isAdmin = currentUser.userRole === 'admin';
  const canSubmit = currentUser.userRole === 'employee' || currentUser.userRole === 'manager';
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [showHrRequest, setShowHrRequest] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState('Identity Proof');
  // Set when the employee is responding to an HR-initiated request; the type
  // is then fixed and the dropdown is replaced with read-only text.
  const [uploadRequest, setUploadRequest] = useState<DocumentRequest | null>(null);
  const [requestType, setRequestType] = useState('Employment Verification Letter');
  const [requestReason, setRequestReason] = useState('');
  const [fulfilRequest, setFulfilRequest] = useState<DocumentRequest | null>(null);
  const [fulfilTemplateId, setFulfilTemplateId] = useState('');
  const [fulfilValues, setFulfilValues] = useState<Record<string, string>>({});
  const [reviewDoc, setReviewDoc] = useState<EmployeeDocument | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'verify' | 'reject'>('verify');
  const [reviewReason, setReviewReason] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  // Key of the in-flight action (e.g. 'upload', 'review', 'share:DOC-1') so
  // the triggering button can show a spinner and disable itself.
  const [pending, setPending] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const query = isAdmin ? '' : `?employeeId=${encodeURIComponent(currentUser.id)}`;
      // Neon (free tier) suspends the database when idle, and the first request
      // during wake-up can fail with a 500. Retry with backoff so a cold start
      // recovers automatically instead of surfacing an error banner.
      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const response = await fetch(`/api/documents${query}`);
        const json = await response.json().catch(() => null);
        if (response.ok && json?.success) {
          setDocuments(json.data?.documents || []);
          setRequests(json.data?.requests || []);
          setTemplates(json.data?.templates || []);
          setStaff(json.data?.staff || []);
          break;
        }
        const isServerError = response.status >= 500;
        if (!isServerError || attempt === maxAttempts) {
          throw new Error(
            isServerError
              ? 'The database is waking up — please try again in a few seconds.'
              : json?.error || 'Failed to load documents.'
          );
        }
        await new Promise((resolve) => {
          window.setTimeout(resolve, attempt * 1500);
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents.');
    } finally {
      setLoading(false);
    }
  }, [currentUser.id, isAdmin]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchDocuments();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchDocuments]);

  const templateNames = useMemo(() => [...new Set(templates.map((template) => template.name))], [templates]);
  const selectedTemplate = templates.find((template) => template.id === fulfilTemplateId);
  // Keep the request-type dropdown aligned with the organization's templates
  // (derived, so no state sync is needed once templates load).
  const effectiveRequestType = templateNames.length > 0 && !templateNames.includes(requestType) ? templateNames[0] : requestType;

  const filteredDocuments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return documents.filter((document) => {
      if (employeeFilter && document.employeeId !== employeeFilter) return false;
      if (!term) return true;
      return `${document.employeeName} ${document.name} ${document.type} ${document.status}`
        .toLowerCase()
        .includes(term);
    });
  }, [documents, search, employeeFilter]);

  // HR overview: one card per employee with their submission/share counts.
  const employeeSummaries = useMemo(() => {
    const map = new Map<string, { id: string; name: string; total: number; review: number; shared: number; openRequests: number }>();
    for (const doc of documents) {
      const entry = map.get(doc.employeeId) || { id: doc.employeeId, name: doc.employeeName, total: 0, review: 0, shared: 0, openRequests: 0 };
      entry.total += 1;
      if (doc.status === 'Under Review') entry.review += 1;
      if (doc.sharedByHr) entry.shared += 1;
      map.set(doc.employeeId, entry);
    }
    for (const req of requests) {
      const entry = map.get(req.employeeId);
      if (entry && !CLOSED_REQUEST_STATUSES.includes(req.status)) entry.openRequests += 1;
    }
    return [...map.values()].sort((a, b) => b.review - a.review || a.name.localeCompare(b.name));
  }, [documents, requests]);

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set('action', 'upload');
    // When responding to an HR request the type is fixed server-side; send the
    // requestId so the API links the document to that request.
    form.set('type', uploadRequest ? uploadRequest.documentType : uploadType);
    if (uploadRequest) form.set('requestId', uploadRequest.id);
    setPending('upload');
    try {
      const response = await fetch('/api/documents', { method: 'POST', body: form });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Upload failed.');
      setShowUpload(false);
      setUploadRequest(null);
      setNotice(uploadRequest ? 'Document submitted to HR for verification.' : 'Document uploaded and queued for HR verification.');
      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setPending(null);
    }
  };

  const handleRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending('request');
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request',
          documentType: effectiveRequestType,
          reason: requestReason.trim(),
          requestedOn: today(),
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Request failed.');
      setRequestReason('');
      setShowRequest(false);
      setNotice('Document request sent to HR.');
      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setPending(null);
    }
  };

  const reviewDocument = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reviewDoc) return;
    const action = reviewDecision === 'verify' ? 'approve' : 'reject';
    const reason = reviewDecision === 'reject' ? reviewReason.trim() : undefined;
    if (reviewDecision === 'reject' && !reason) {
      setError('Enter the reason for rejecting the document.');
      return;
    }
    setPending('review');
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, documentId: reviewDoc.id, reason }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Review failed.');
      setReviewDoc(null);
      setReviewDecision('verify');
      setReviewReason('');
      setNotice(action === 'approve' ? 'Document verified and saved to the employee record.' : 'Document returned with action required.');
      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed.');
    } finally {
      setPending(null);
    }
  };

  const sendRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!fulfilRequest) return;
    const form = new FormData(event.currentTarget);
    form.set('action', 'request-send');
    form.set('requestId', fulfilRequest.id);
    if (fulfilTemplateId) {
      form.set('templateId', fulfilTemplateId);
      form.set('values', JSON.stringify(fulfilValues));
    }
    setPending('fulfil');
    try {
      const response = await fetch('/api/documents', { method: 'POST', body: form });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Send failed.');
      setFulfilRequest(null);
      setFulfilTemplateId('');
      setFulfilValues({});
      setNotice('Response sent to the employee — they can now download the files.');
      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed.');
    } finally {
      setPending(null);
    }
  };

  const downloadAttachment = async (attachment: RequestAttachment) => {
    if (!attachment.downloadUrl) return;
    setPending(`download:${attachment.id}`);
    window.open(attachment.downloadUrl, '_blank');
    // The download route marks the request Downloaded server-side; refresh
    // shortly after so the status badge updates.
    window.setTimeout(() => {
      void fetchDocuments().finally(() => setPending(null));
    }, 1500);
  };

  const handleHrRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending('hr-request');
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'hr-request', employeeId: form.get('employeeId'), documentType: form.get('documentType'), reason: form.get('reason') }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Request failed.');
      setShowHrRequest(false);
      setNotice('Document request sent to the employee.');
      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setPending(null);
    }
  };

  const shareDocument = async (documentId: string) => {
    setPending(`share:${documentId}`);
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'share', documentId }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Share failed.');
      setNotice('Document shared with the employee.');
      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Share failed.');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#5B91B5]">
            <ShieldCheck className="h-4 w-4" /> Secure document center
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#17324A]">Documents & Requests</h1>
          <p className="mt-1 text-sm text-[#667085]">Manage employee submissions and official HR document requests.</p>
        </div>
        {canSubmit && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setUploadRequest(null); setShowUpload(true); }} className="flex items-center gap-2 rounded-xl bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#244A68] active:scale-[0.97]">
              <UploadCloud className="h-4 w-4" /> Upload Document
            </button>
            <button onClick={() => setShowRequest(true)} className="flex items-center gap-2 rounded-xl border border-[#9FC5E2] bg-[#B0D0EA] px-4 py-2.5 text-xs font-bold text-[#17324A] transition hover:bg-[#9FC2DC] active:scale-[0.97]">
              <MessageSquarePlus className="h-4 w-4" /> Request from HR
            </button>
          </div>
        )}
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowHrRequest(true)} className="flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-cyan-800 active:scale-[0.97]">
              <MessageSquarePlus className="h-4 w-4" /> Request Document
            </button>
          </div>
        )}
      </header>

      {notice && <Banner tone="success" text={notice} onClose={() => setNotice('')} />}
      {error && <Banner tone="error" text={error} onClose={() => setError('')} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={isAdmin ? 'All Documents' : 'My Documents'} value={String(documents.length)} detail="Uploaded records" icon={FileText} />
        <Stat label="Verified" value={String(documents.filter((item) => item.status === 'Verified').length)} detail="Saved to employee record" icon={CheckCircle2} />
        <Stat label="Under Review" value={String(documents.filter((item) => item.status === 'Under Review').length)} detail="Awaiting HR verification" icon={Clock3} />
        <Stat label="Open Requests" value={String(requests.filter((item) => !CLOSED_REQUEST_STATUSES.includes(item.status)).length)} detail="Pending HR actions" icon={History} />
      </div>

      {isAdmin && employeeSummaries.length > 0 && (
        <section className="rounded-2xl border border-[#D9E5EE] bg-white p-5 shadow-md">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-[#17324A]"><Send className="h-4 w-4" /> Employee Overview</h2>
              <p className="mt-1 text-xs text-[#667085]">Submitted documents per employee. Click a card to filter the table below.</p>
            </div>
            {employeeFilter && (
              <button onClick={() => setEmployeeFilter(null)} className="rounded-lg border border-[#9FC2DC] bg-[#EAF2F8] px-3 py-2 text-[10px] font-bold text-[#17324A] hover:bg-[#D9E5EE]">
                Clear employee filter
              </button>
            )}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {employeeSummaries.map((summary) => (
              <button
                key={summary.id}
                onClick={() => setEmployeeFilter(employeeFilter === summary.id ? null : summary.id)}
                className={`rounded-xl border p-4 text-left transition hover:border-[#9FC2DC] hover:bg-[#F5F9FC] ${employeeFilter === summary.id ? 'border-cyan-300 bg-cyan-50' : 'border-[#D9E5EE] bg-[#F9FBFD]'}`}
              >
                <p className="text-sm font-bold text-[#17324A]">{summary.name}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold">
                  <span className="rounded-full border border-[#D9E5EE] bg-white px-2 py-1 text-[#667085]">{summary.total} docs</span>
                  {summary.review > 0 && <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700">{summary.review} in review</span>}
                  {summary.shared > 0 && <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-1 text-cyan-700">{summary.shared} shared</span>}
                  {summary.openRequests > 0 && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">{summary.openRequests} requests</span>}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-[#D9E5EE] bg-white p-5 shadow-md">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-[#17324A]"><FileCheck2 className="h-4 w-4" /> {isAdmin ? 'Document Submissions' : 'Uploaded Documents'}</h2>
            <p className="mt-1 text-xs text-[#667085]">Files are stored privately and access is checked on every download.</p>
          </div>
          <label className="relative block"><Search className="absolute left-3 top-2.5 h-4 w-4 text-[#667085]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search documents" className="rounded-lg border border-[#9FC2DC] py-2 pl-9 pr-3 text-xs text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA]" /></label>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead><tr className="border-b border-[#D9E5EE] bg-[#EAF2F8] text-[#667085]"><th className="px-4 py-3">Document</th>{isAdmin && <th className="px-4 py-3">Employee</th>}<th className="px-4 py-3">Type</th><th className="px-4 py-3">Uploaded</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-[#D9E5EE]">
              {filteredDocuments.map((document) => (
                <tr key={document.id} className="hover:bg-[#F5F9FC]"><td className="px-4 py-3 font-bold text-[#17324A]">{document.name}<p className="mt-1 max-w-xs text-[10px] font-normal leading-4 text-[#667085]">{document.note}</p></td>{isAdmin && <td className="px-4 py-3 text-[#667085]">{document.employeeName}</td>}<td className="px-4 py-3 text-[#667085]">{document.type}</td><td className="px-4 py-3 text-[#667085]">{document.uploadedOn}</td><td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold whitespace-nowrap ${statusStyle[document.status]}`}>{document.status}</span></td><td className="px-4 py-3 text-right align-middle"><div className="flex flex-wrap items-center justify-end gap-2">{document.isLocked && <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700" title="Unlocks automatically when the notice period ends"><Lock className="h-3 w-3" /> Locked until {document.lockedUntil}</span>}{!document.isLocked && document.downloadedAt && <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700" title={`Downloaded on ${document.downloadedAt} — download allowed only once`}><CheckCircle2 className="h-3 w-3" /> Downloaded</span>}{!isAdmin && document.sharedByHr && !document.isLocked && <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-bold text-cyan-700" title={`Shared by HR on ${document.sharedAt || ''}`}><Send className="h-3 w-3" /> Shared by HR</span>}{document.downloadable && document.downloadUrl && <a href={document.downloadUrl} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-[#9FC2DC] px-2.5 py-2 text-[10px] font-bold text-[#17324A] hover:bg-[#EAF2F8]"><Download className="h-3.5 w-3.5" /> Download</a>}{isAdmin && document.sharedByHr && <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-bold text-cyan-700" title={`Shared with employee on ${document.sharedAt || ''}`}><CheckCircle2 className="h-3 w-3" /> Shared</span>}{isAdmin && !document.sharedByHr && !document.uploadedByEmployee && document.downloadUrl && <button onClick={() => void shareDocument(document.id)} disabled={pending === `share:${document.id}`} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-cyan-700 px-2.5 py-2 text-[10px] font-bold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60" title="Share this document with the employee so they can download it">{pending === `share:${document.id}` ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending</> : 'Send'}</button>}{isAdmin && document.status === 'Under Review' && <button onClick={() => { setReviewDoc(document); setReviewDecision('verify'); setReviewReason(''); }} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-[#17324A] px-2.5 py-2 text-[10px] font-bold text-white hover:bg-[#244A68]"><FileSearch className="h-3.5 w-3.5" /> Review</button>}{!document.downloadable && !isAdmin && !document.isLocked && !document.downloadedAt && <span className="text-[10px] text-[#667085]">{document.status === 'Verified' ? 'Verified — awaiting HR share' : document.sharedByHr ? 'Processing' : 'Awaiting HR review'}</span>}</div></td></tr>
              ))}
              {!loading && filteredDocuments.length === 0 && <tr><td colSpan={isAdmin ? 6 : 5} className="px-4 py-8 text-center text-xs text-[#667085]">No documents found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-[#D9E5EE] bg-white p-5 shadow-md">
        <div><h2 className="flex items-center gap-2 text-sm font-bold text-[#17324A]"><History className="h-4 w-4" /> Document Requests</h2><p className="mt-1 text-xs text-[#667085]">{isAdmin ? 'Employee requests awaiting your response and requests you have sent to employees.' : 'Track your requests to HR and documents HR has requested from you.'}</p></div>
        <div className="mt-4 space-y-3">
          {requests.map((item) => (
            <div key={item.id} className="rounded-xl border border-[#D9E5EE] bg-[#F9FBFD] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold text-[#667085]">{item.id}</span>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyle[item.status]}`}>{item.status}</span>
                    {item.initiatedByHr && <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-bold text-cyan-700">HR Request</span>}
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-[#17324A]">{item.documentType}</h3>
                  {item.reason && item.reason !== 'No additional details provided.' && <p className="mt-1 text-xs text-[#667085]">{item.reason}</p>}
                  {isAdmin && <p className="mt-2 text-[11px] font-semibold text-[#17324A]">{item.initiatedByHr ? `HR request to ${item.requestedBy}` : `Employee: ${item.requestedBy}`}</p>}
                  {item.attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {item.attachments.map((attachment) => (
                        <div key={attachment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#D9E5EE] bg-white px-3 py-2">
                          <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-[#17324A]"><FileText className="h-3.5 w-3.5 shrink-0 text-[#5B91B5]" /> <span className="truncate">{attachment.name}</span><span className="rounded-full border border-[#D9E5EE] bg-[#F5F9FC] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#667085]">{attachment.source === 'template' ? 'Generated' : 'Uploaded'}</span></span>
                          {attachment.downloadUrl && <button onClick={() => void downloadAttachment(attachment)} disabled={pending === `download:${attachment.id}`} className="inline-flex items-center gap-1 rounded-lg border border-[#9FC2DC] px-2.5 py-1.5 text-[10px] font-bold text-[#17324A] transition hover:bg-[#EAF2F8] disabled:cursor-not-allowed disabled:opacity-60">{pending === `download:${attachment.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Download</button>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#667085]">
                  <span>Requested {item.requestedOn}</span>
                  {item.sentAt && <span className="text-cyan-700">Sent {item.sentAt}</span>}
                  {item.downloadedAt && <span className="text-emerald-700">Downloaded {item.downloadedAt}</span>}
                  {isAdmin && !item.initiatedByHr && item.status !== 'Sent' && item.status !== 'Downloaded' && <button onClick={() => { setFulfilRequest(item); setFulfilTemplateId(''); setFulfilValues({}); }} className="rounded-lg bg-[#17324A] px-3 py-2 text-[10px] font-bold text-white transition hover:bg-[#244A68] active:scale-[0.97]">Respond & Send</button>}
                  {!isAdmin && item.initiatedByHr && (item.status === 'Requested' || item.status === 'Rejected') && <button onClick={() => { setUploadType(item.documentType); setUploadRequest(item); setShowUpload(true); }} className="rounded-lg bg-[#17324A] px-3 py-2 text-[10px] font-bold text-white transition hover:bg-[#244A68] active:scale-[0.97]">{item.status === 'Rejected' ? 'Re-upload Document' : 'Upload Document'}</button>}
                </div>
              </div>
            </div>
          ))}
          {requests.length === 0 && <div className="rounded-xl border border-dashed border-[#9FC2DC] bg-[#F5F9FC] px-4 py-8 text-center text-xs text-[#667085]">No document requests found.</div>}
        </div>
      </section>

      {showUpload && (
        <Modal title={uploadRequest ? 'Respond to HR request' : 'Upload document'} onClose={() => { setShowUpload(false); setUploadRequest(null); }}>
          <form onSubmit={handleUpload} className="space-y-4">
            {uploadRequest && (
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-xs text-cyan-800">
                <p className="text-sm font-bold text-[#17324A]">{uploadRequest.documentType}</p>
                <p className="mt-1">HR request {uploadRequest.id} · Requested {uploadRequest.requestedOn}</p>
                {uploadRequest.reason && uploadRequest.reason !== 'No additional details provided.' && <p className="mt-1">Note: {uploadRequest.reason}</p>}
              </div>
            )}
            <Field label="Document name"><input name="name" placeholder="Optional display name" className={inputClass} /></Field>
            {uploadRequest ? (
              // HR-requested flow: the type is fixed by the request — read-only
              // text, no dropdown. The employee only picks a file and uploads.
              <Field label="Document type">
                <p className="rounded-lg border border-[#D9E5EE] bg-[#F5F9FC] px-3 py-2.5 text-sm font-bold text-[#17324A]">{uploadRequest.documentType}</p>
              </Field>
            ) : (
              // Voluntary flow: the employee picks the type themselves.
              <Field label="Document type"><select value={uploadType} onChange={(event) => setUploadType(event.target.value)} className={inputClass}><option>Identity Proof</option><option>Address Proof</option><option>Education Certificate</option><option>Bank Account Proof</option><option>Employment Document</option><option>Other</option></select></Field>
            )}
            <Field label="Choose file"><input required name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-[#EAF2F8] file:px-2 file:py-1 file:text-xs file:font-bold`} /></Field>
            <p className="text-[11px] text-[#667085]">Accepted: PDF, DOC, DOCX, JPG, or PNG. Maximum size: 10 MB.</p>
            <button type="submit" disabled={pending === 'upload'} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#244A68] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">{pending === 'upload' ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : <><Send className="h-4 w-4" /> {uploadRequest ? 'Submit to HR' : 'Upload & Send to HR'}</>}</button>
          </form>
        </Modal>
      )}
      {showRequest && <Modal title="Request a document from HR" onClose={() => setShowRequest(false)}><form onSubmit={handleRequest} className="space-y-4"><Field label="Document requested"><select value={effectiveRequestType} onChange={(event) => setRequestType(event.target.value)} className={inputClass}>{(templateNames.length > 0 ? templateNames : ['Employment Verification Letter', 'Internship Completion Certificate', 'Experience Letter', 'Service Record', 'Other']).map((name) => <option key={name}>{name}</option>)}</select></Field><Field label="Note (optional)"><textarea rows={4} value={requestReason} onChange={(event) => setRequestReason(event.target.value)} placeholder="Add any details HR should know, e.g. deadline or recipient..." className={`${inputClass} resize-none`} /></Field><button type="submit" disabled={pending === 'request'} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#244A68] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">{pending === 'request' ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : <><Send className="h-4 w-4" /> Send Request to HR</>}</button></form></Modal>}
      {showHrRequest && (
        <Modal title="Request a document from an employee" onClose={() => setShowHrRequest(false)}>
          <form onSubmit={handleHrRequest} className="space-y-4">
            <Field label="Employee">
              <select name="employeeId" required defaultValue="" className={inputClass}>
                <option value="" disabled>Select employee</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>{member.name} ({member.employeeCode}{member.department ? ' - ' + member.department : ''})</option>
                ))}
              </select>
            </Field>
            <Field label="Document type">
              <select name="documentType" defaultValue="Identity Proof" className={inputClass}>
                <option>Identity Proof</option>
                <option>Address Proof</option>
                <option>Education Certificate</option>
                <option>Bank Account Proof</option>
                <option>Employment Document</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Note for employee (optional)"><textarea name="reason" rows={4} placeholder="Add any details the employee should know, e.g. deadline or purpose..." className={`${inputClass} resize-none`} /></Field>
            <p className="text-[11px] text-[#667085]">The employee is notified and can upload the document from their Documents page. You will verify it once they submit it.</p>
            <button type="submit" disabled={pending === 'hr-request'} className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-cyan-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">{pending === 'hr-request' ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : <><MessageSquarePlus className="h-4 w-4" /> Send Request to Employee</>}</button>
          </form>
        </Modal>
      )}
      {fulfilRequest && (
        <Modal title={`Respond to ${fulfilRequest.id}`} onClose={() => { setFulfilRequest(null); setFulfilTemplateId(''); setFulfilValues({}); }}>
          <form onSubmit={sendRequest} className="space-y-4">
            <div className="rounded-xl border border-[#D9E5EE] bg-[#F5F9FC] p-3 text-xs text-[#667085]">
              <p className="text-sm font-bold text-[#17324A]">{fulfilRequest.documentType}</p>
              <p className="mt-1">Employee: <span className="font-bold text-[#17324A]">{fulfilRequest.requestedBy}</span> · Requested {fulfilRequest.requestedOn}</p>
              {fulfilRequest.reason && fulfilRequest.reason !== 'No additional details provided.' && <p className="mt-1">Note: {fulfilRequest.reason}</p>}
            </div>
            <div>
              <p className="text-xs font-bold text-[#17324A]">{"Employee's submitted documents (reference)"}</p>
              <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-[#D9E5EE] bg-white p-2">
                {documents.filter((doc) => doc.employeeId === fulfilRequest.employeeId).length === 0 && <p className="px-2 py-1 text-[11px] text-[#667085]">No submitted documents on file.</p>}
                {documents.filter((doc) => doc.employeeId === fulfilRequest.employeeId).map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between gap-2 px-2 py-1 text-[11px]">
                    <span className="font-bold text-[#17324A]">{doc.name}</span>
                    <span className="text-[#667085]">{doc.type} · {doc.uploadedOn} · {doc.status}</span>
                  </div>
                ))}
              </div>
            </div>
            <Field label="Attach files"><input name="files" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-[#EAF2F8] file:px-2 file:py-1 file:text-xs file:font-bold`} /></Field>
            <Field label="Or generate from template (optional)">
              <select value={fulfilTemplateId} onChange={(event) => { setFulfilTemplateId(event.target.value); setFulfilValues({}); }} className={inputClass}>
                <option value="">No template — uploaded files only</option>
                {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
              </select>
            </Field>
            {selectedTemplate && selectedTemplate.variables.length > 0 && (
              <div className="space-y-2 rounded-xl border border-[#9FC2DC] bg-[#F5F9FC] p-3">
                <p className="text-xs font-bold text-[#17324A]">Template details</p>
                {selectedTemplate.variables.map((variable) => (
                  <Field key={variable} label={variable.replace(/_/g, ' ')}>
                    <input value={fulfilValues[variable] || ''} onChange={(event) => setFulfilValues((prev) => ({ ...prev, [variable]: event.target.value }))} className={inputClass} />
                  </Field>
                ))}
                <p className="text-[10px] text-[#667085]">{"Everything else is filled automatically from the employee's HR record."}</p>
              </div>
            )}
            <p className="text-[11px] text-[#667085]">Attach at least one file or pick a template. All files are sent together, the request is marked Sent, and the employee is notified. Max 10 MB per file.</p>
            <button type="submit" disabled={pending === 'fulfil'} className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-cyan-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">{pending === 'fulfil' ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : <><Send className="h-4 w-4" /> Send to Employee</>}</button>
          </form>
        </Modal>
      )}
      {reviewDoc && (
        <Modal title="Review document" onClose={() => { setReviewDoc(null); setReviewDecision('verify'); setReviewReason(''); }}>
          <form onSubmit={reviewDocument} className="space-y-4">
            <div className="rounded-xl border border-[#D9E5EE] bg-[#F5F9FC] p-3 text-xs text-[#667085]">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-[#17324A]">{reviewDoc.name}</p>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyle[reviewDoc.status]}`}>{reviewDoc.status}</span>
              </div>
              <p className="mt-1">Employee: <span className="font-bold text-[#17324A]">{reviewDoc.employeeName}</span> · {reviewDoc.type} · Uploaded {reviewDoc.uploadedOn}</p>
              {reviewDoc.note && <p className="mt-1">Note: {reviewDoc.note}</p>}
            </div>
            {reviewDoc.downloadUrl ? (
              <div className="space-y-1.5">
                <a href={reviewDoc.downloadUrl} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#9FC2DC] bg-[#EAF2F8] px-4 py-2.5 text-xs font-bold text-[#17324A] hover:bg-[#D9E5EE]"><FileSearch className="h-4 w-4" /> Open Document</a>
                <p className="text-center text-[10px] text-[#667085]">Opens the file in a new tab — review it before you verify or reject.</p>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-[#9FC2DC] bg-[#F5F9FC] px-3 py-2 text-center text-[11px] text-[#667085]">No file is attached to this document record.</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setReviewDecision('verify')} className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-bold transition ${reviewDecision === 'verify' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-[#D9E5EE] bg-white text-[#667085] hover:bg-[#F5F9FC]'}`}><CheckCircle2 className="h-4 w-4" /> Verify</button>
              <button type="button" onClick={() => setReviewDecision('reject')} className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-bold transition ${reviewDecision === 'reject' ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-[#D9E5EE] bg-white text-[#667085] hover:bg-[#F5F9FC]'}`}><XCircle className="h-4 w-4" /> Reject</button>
            </div>
            {reviewDecision === 'reject' ? (
              <Field label="Reason for rejection (required)">
                <textarea required rows={3} value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} placeholder="Tell the employee what needs to be corrected..." className={`${inputClass} resize-none`} />
              </Field>
            ) : (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">Verifying marks the document as Verified and saves it to the employee{"'"}s record. It is not shared for download — use Send on the row to share it later.</p>
            )}
            <button type="submit" disabled={pending === 'review'} className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${reviewDecision === 'verify' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
              {pending === 'review' ? <><Loader2 className="h-4 w-4 animate-spin" /> {reviewDecision === 'verify' ? 'Verifying...' : 'Returning...'}</> : reviewDecision === 'verify' ? <><CheckCircle2 className="h-4 w-4" /> Verify</> : <><XCircle className="h-4 w-4" /> Reject & Return</>}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Banner({ tone, text, onClose }: { tone: 'success' | 'error'; text: string; onClose: () => void }) {
  return <div className={`animate-banner-in flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-semibold ${tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {text}</span><button onClick={onClose} aria-label="Dismiss notification" className="rounded-lg p-1.5 text-current transition hover:bg-black/5 active:scale-90"><X className="h-4 w-4" /></button></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-bold text-[#17324A]">{label}<span className="mt-1 block">{children}</span></label>;
}

function Stat({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: IconComponent }) {
  return <div className="rounded-2xl border border-[#D9E5EE] bg-white p-4 shadow-md"><div className="flex items-start justify-between"><span className="text-xs font-bold uppercase tracking-wider text-[#667085]">{label}</span><span className="rounded-lg bg-[#EAF2F8] p-2 text-[#17324A]"><Icon className="h-4 w-4" /></span></div><p className="mt-2 text-2xl font-black text-[#17324A]">{value}</p><p className="mt-1 text-[11px] text-[#667085]">{detail}</p></div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}><div className="animate-modal-in w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-black text-[#17324A]">{title}</h2><button onClick={onClose} aria-label={`Close ${title}`} className="rounded-lg p-2 text-[#667085] transition hover:rotate-90 hover:bg-[#EAF2F8]"><X className="h-5 w-5" /></button></div>{children}</div></div>;
}
