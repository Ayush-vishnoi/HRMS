'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  History,
  MessageSquarePlus,
  Search,
  Send,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';

type DocumentStatus = 'Verified' | 'Under Review' | 'Action Required';
type RequestStatus = 'Pending' | 'In Progress' | 'Ready' | 'Delivered';

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
};

type DocumentRequest = {
  id: string;
  employeeId: string;
  requestedBy: string;
  documentType: string;
  reason: string;
  requestedOn: string;
  status: RequestStatus;
};

type Template = { id: string; name: string; variables: string[] };
type IconComponent = React.ComponentType<{ className?: string }>;

const statusStyle: Record<DocumentStatus | RequestStatus, string> = {
  Verified: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'Under Review': 'border-blue-200 bg-blue-50 text-blue-700',
  'Action Required': 'border-rose-200 bg-rose-50 text-rose-700',
  Pending: 'border-amber-200 bg-amber-50 text-amber-700',
  'In Progress': 'border-violet-200 bg-violet-50 text-violet-700',
  Ready: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  Delivered: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

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
  const [search, setSearch] = useState('');
  const [uploadType, setUploadType] = useState('Identity Proof');
  const [requestType, setRequestType] = useState('Employment Verification Letter');
  const [requestReason, setRequestReason] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const query = isAdmin ? '' : `?employeeId=${encodeURIComponent(currentUser.id)}`;
      const response = await fetch(`/api/documents${query}`);
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Failed to load documents.');
      setDocuments(json.data?.documents || []);
      setRequests(json.data?.requests || []);
      setTemplates(json.data?.templates || []);
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

  const filteredDocuments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return documents;
    return documents.filter((document) =>
      `${document.employeeName} ${document.name} ${document.type} ${document.status}`
        .toLowerCase()
        .includes(term),
    );
  }, [documents, search]);

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set('action', 'upload');
    form.set('type', uploadType);
    try {
      const response = await fetch('/api/documents', { method: 'POST', body: form });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Upload failed.');
      setShowUpload(false);
      setNotice('Document uploaded and queued for HR verification.');
      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    }
  };

  const handleRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request',
          documentType: requestType,
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
    }
  };

  const reviewDocument = async (documentId: string, action: 'approve' | 'reject') => {
    const reason = action === 'reject' ? window.prompt('Enter the reason for rejection:') : undefined;
    if (action === 'reject' && !reason?.trim()) return;
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, documentId, reason }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Review failed.');
      setNotice(action === 'approve' ? 'Document verified.' : 'Document returned with action required.');
      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed.');
    }
  };

  const updateRequest = async (requestId: string, status: RequestStatus) => {
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-request', requestId, status }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Request update failed.');
      setNotice(`Request moved to ${status}.`);
      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request update failed.');
    }
  };

  const generateDocument = async (request: DocumentRequest) => {
    const template = templates.find((item) => item.name === request.documentType) || templates[0];
    if (!template) {
      setError('No active document template is available.');
      return;
    }
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', requestId: request.id }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Generation failed.');
      setNotice(`${template.name} generated and made available to the employee.`);
      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed.');
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
            <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 rounded-xl bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#244A68]">
              <UploadCloud className="h-4 w-4" /> Upload Document
            </button>
            <button onClick={() => setShowRequest(true)} className="flex items-center gap-2 rounded-xl border border-[#9FC5E2] bg-[#B0D0EA] px-4 py-2.5 text-xs font-bold text-[#17324A] hover:bg-[#9FC2DC]">
              <MessageSquarePlus className="h-4 w-4" /> Request from HR
            </button>
          </div>
        )}
      </header>

      {notice && <Banner tone="success" text={notice} onClose={() => setNotice('')} />}
      {error && <Banner tone="error" text={error} onClose={() => setError('')} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label={isAdmin ? 'All Documents' : 'My Documents'} value={String(documents.length)} detail="Uploaded records" icon={FileText} />
        <Stat label="Under Review" value={String(documents.filter((item) => item.status === 'Under Review').length)} detail="Awaiting HR verification" icon={Clock3} />
        <Stat label="Open Requests" value={String(requests.filter((item) => item.status !== 'Delivered').length)} detail="Pending HR actions" icon={History} />
      </div>

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
                <tr key={document.id} className="hover:bg-[#F5F9FC]"><td className="px-4 py-3 font-bold text-[#17324A]">{document.name}<p className="mt-1 max-w-xs text-[10px] font-normal leading-4 text-[#667085]">{document.note}</p></td>{isAdmin && <td className="px-4 py-3 text-[#667085]">{document.employeeName}</td>}<td className="px-4 py-3 text-[#667085]">{document.type}</td><td className="px-4 py-3 text-[#667085]">{document.uploadedOn}</td><td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyle[document.status]}`}>{document.status}</span></td><td className="px-4 py-3 text-right"><div className="flex justify-end gap-2">{document.downloadable && document.downloadUrl && <a href={document.downloadUrl} className="inline-flex items-center gap-1 rounded-lg border border-[#9FC2DC] px-2.5 py-2 text-[10px] font-bold text-[#17324A] hover:bg-[#EAF2F8]"><Download className="h-3.5 w-3.5" /> Download</a>}{isAdmin && document.status === 'Under Review' && <><button onClick={() => void reviewDocument(document.id, 'approve')} className="rounded-lg bg-emerald-600 px-2.5 py-2 text-[10px] font-bold text-white">Verify</button><button onClick={() => void reviewDocument(document.id, 'reject')} className="rounded-lg bg-rose-600 px-2.5 py-2 text-[10px] font-bold text-white">Return</button></>}{!document.downloadable && !isAdmin && <span className="text-[10px] text-[#667085]">Awaiting review</span>}</div></td></tr>
              ))}
              {!loading && filteredDocuments.length === 0 && <tr><td colSpan={isAdmin ? 6 : 5} className="px-4 py-8 text-center text-xs text-[#667085]">No documents found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-[#D9E5EE] bg-white p-5 shadow-md">
        <div><h2 className="flex items-center gap-2 text-sm font-bold text-[#17324A]"><History className="h-4 w-4" /> Document Requests</h2><p className="mt-1 text-xs text-[#667085]">Track official documents requested from HR Operations.</p></div>
        <div className="mt-4 space-y-3">
          {requests.map((item) => <div key={item.id} className="rounded-xl border border-[#D9E5EE] bg-[#F9FBFD] p-4"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold text-[#667085]">{item.id}</span><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyle[item.status]}`}>{item.status}</span></div><h3 className="mt-2 text-sm font-bold text-[#17324A]">{item.documentType}</h3><p className="mt-1 text-xs text-[#667085]">{item.reason}</p>{isAdmin && <p className="mt-2 text-[11px] font-semibold text-[#17324A]">Employee: {item.requestedBy}</p>}</div><div className="flex flex-wrap items-center gap-2 text-[11px] text-[#667085]"><span>Requested {item.requestedOn}</span>{isAdmin && item.status === 'Pending' && <button onClick={() => void updateRequest(item.id, 'In Progress')} className="rounded-lg bg-[#17324A] px-3 py-2 text-[10px] font-bold text-white">Start</button>}{isAdmin && item.status === 'In Progress' && <button onClick={() => void generateDocument(item)} className="rounded-lg bg-cyan-700 px-3 py-2 text-[10px] font-bold text-white">Generate PDF</button>}{isAdmin && item.status === 'Ready' && <button onClick={() => void updateRequest(item.id, 'Delivered')} className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white">Mark Delivered</button>}</div></div></div>)}
          {requests.length === 0 && <div className="rounded-xl border border-dashed border-[#9FC2DC] bg-[#F5F9FC] px-4 py-8 text-center text-xs text-[#667085]">No document requests found.</div>}
        </div>
      </section>

      {showUpload && <Modal title="Upload document" onClose={() => setShowUpload(false)}><form onSubmit={handleUpload} className="space-y-4"><Field label="Document name"><input name="name" placeholder="Optional display name" className={inputClass} /></Field><Field label="Document type"><select value={uploadType} onChange={(event) => setUploadType(event.target.value)} className={inputClass}><option>Identity Proof</option><option>Address Proof</option><option>Education Certificate</option><option>Bank Account Proof</option><option>Employment Document</option><option>Other</option></select></Field><Field label="Choose file"><input required name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-[#EAF2F8] file:px-2 file:py-1 file:text-xs file:font-bold`} /></Field><p className="text-[11px] text-[#667085]">Accepted: PDF, DOC, DOCX, JPG, or PNG. Maximum size: 10 MB.</p><button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white"><Send className="h-4 w-4" /> Upload & Send to HR</button></form></Modal>}
      {showRequest && <Modal title="Request a document from HR" onClose={() => setShowRequest(false)}><form onSubmit={handleRequest} className="space-y-4"><Field label="Document requested"><select value={requestType} onChange={(event) => setRequestType(event.target.value)} className={inputClass}><option>Employment Verification Letter</option><option>Internship Completion Certificate</option><option>Experience Letter</option><option>Service Record</option><option>Other</option></select></Field><Field label="Reason and required details"><textarea required rows={5} value={requestReason} onChange={(event) => setRequestReason(event.target.value)} placeholder="Tell HR why you need this document and any deadline..." className={`${inputClass} resize-none`} /></Field><button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white"><Send className="h-4 w-4" /> Send Request to HR</button></form></Modal>}
    </div>
  );
}

function Banner({ tone, text, onClose }: { tone: 'success' | 'error'; text: string; onClose: () => void }) {
  return <div className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-semibold ${tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {text}</span><button onClick={onClose} aria-label="Dismiss notification"><X className="h-4 w-4" /></button></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-bold text-[#17324A]">{label}<span className="mt-1 block">{children}</span></label>;
}

function Stat({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: IconComponent }) {
  return <div className="rounded-2xl border border-[#D9E5EE] bg-white p-4 shadow-md"><div className="flex items-start justify-between"><span className="text-xs font-bold uppercase tracking-wider text-[#667085]">{label}</span><span className="rounded-lg bg-[#EAF2F8] p-2 text-[#17324A]"><Icon className="h-4 w-4" /></span></div><p className="mt-2 text-2xl font-black text-[#17324A]">{value}</p><p className="mt-1 text-[11px] text-[#667085]">{detail}</p></div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-black text-[#17324A]">{title}</h2><button onClick={onClose} aria-label={`Close ${title}`} className="rounded-lg p-2 text-[#667085] hover:bg-[#EAF2F8]"><X className="h-5 w-5" /></button></div>{children}</div></div>;
}
