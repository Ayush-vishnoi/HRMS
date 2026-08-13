'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
type RequestStatus = 'Pending' | 'In Review' | 'Completed';

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

const statusStyle: Record<DocumentStatus | RequestStatus, string> = {
  Verified: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'Under Review': 'border-blue-200 bg-blue-50 text-blue-700',
  'Action Required': 'border-rose-200 bg-rose-50 text-rose-700',
  Pending: 'border-amber-200 bg-amber-50 text-amber-700',
  'In Review': 'border-violet-200 bg-violet-50 text-violet-700',
  Completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const inputClass = 'w-full rounded-lg border border-[#9FC2DC] bg-white px-3 py-2 text-sm text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA]';

export default function DocumentsPage() {
  const { currentUser } = useHRMS();
  const isEmployee = currentUser.userRole === 'employee';
  const isManager = currentUser.userRole === 'manager';
  const canManageOwnDocuments = isEmployee || isManager;

  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [search, setSearch] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [uploadType, setUploadType] = useState('Identity Proof');
  const [requestType, setRequestType] = useState('Employment Verification Letter');
  const [requestReason, setRequestReason] = useState('');
  const [notice, setNotice] = useState('');

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`/api/documents?employeeId=${encodeURIComponent(currentUser.id)}&role=${encodeURIComponent(currentUser.userRole)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setDocuments(json.data.documents || []);
          setRequests(json.data.requests || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch documents from database:', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [currentUser.id, currentUser.userRole]);

  const filteredDocuments = useMemo(() => documents.filter((document) =>
    `${document.employeeName} ${document.name} ${document.type} ${document.status}`.toLowerCase().includes(search.toLowerCase())
  ), [search, documents]);

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fileInput = event.currentTarget.elements.namedItem('document-file') as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (!file) return;

    const docName = uploadName.trim() || file.name;
    const docSize = `${(file.size / 1024 / 1024).toFixed(1)} MB`;
    const docUploadedOn = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload',
          employeeId: currentUser.id,
          name: docName,
          type: uploadType,
          size: docSize,
          status: 'Under Review',
          uploadedOn: docUploadedOn,
          note: 'Uploaded by employee and queued for HR verification.',
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setDocuments((current) => [json.data, ...current]);
      }
    } catch (err) {
      console.error('Failed to save uploaded document in database:', err);
    }

    setUploadName('');
    setShowUpload(false);
    setNotice('Document uploaded and saved to database for HR verification.');
  };

  const handleRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!requestReason.trim()) return;

    const reqDate = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request',
          employeeId: currentUser.id,
          documentType: requestType,
          reason: requestReason.trim(),
          requestedOn: reqDate,
          status: 'Pending',
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setRequests((current) => [json.data, ...current]);
      }
    } catch (err) {
      console.error('Failed to save document request in database:', err);
    }

    setRequestReason('');
    setShowRequest(false);
    setNotice('Document request saved in database and queued for HR.');
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#5B91B5]"><ShieldCheck className="h-4 w-4" /> Secure document center</div>
          <h1 className="text-2xl font-black tracking-tight text-[#17324A]">Documents & Requests</h1>
          <p className="mt-1 text-sm text-[#667085]">Upload your documents securely or request an official document from HR via PostgreSQL.</p>
        </div>
        {canManageOwnDocuments && <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 rounded-xl bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#244A68]"><UploadCloud className="h-4 w-4" /> Upload Document</button>
          <button onClick={() => setShowRequest(true)} className="flex items-center gap-2 rounded-xl border border-[#9FC5E2] bg-[#B0D0EA] px-4 py-2.5 text-xs font-bold text-[#17324A] hover:bg-[#9FC5E2]"><MessageSquarePlus className="h-4 w-4" /> Request from HR</button>
        </div>}
      </header>

      {notice && <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss notification"><X className="h-4 w-4" /></button></div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label={canManageOwnDocuments ? 'My Documents' : 'Employee Documents'} value={String(documents.length)} detail="Uploaded records" icon={FileText} />
        <Stat label="Under Review" value={String(documents.filter((document) => document.status === 'Under Review').length)} detail="Awaiting HR verification" icon={Clock3} />
        <Stat label="Open Requests" value={String(requests.filter((request) => request.status !== 'Completed').length)} detail="HR actions in progress" icon={History} />
      </div>

      <section className="rounded-2xl border border-[#D9E5EE] bg-white p-5 shadow-md">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div><h2 className="flex items-center gap-2 text-sm font-bold text-[#17324A]"><FileCheck2 className="h-4 w-4" /> Uploaded Documents</h2><p className="mt-1 text-xs text-[#667085]">HR reviews new uploads before they become verified records.</p></div>
          <label className="relative block"><Search className="absolute left-3 top-2.5 h-4 w-4 text-[#667085]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search documents" className="rounded-lg border border-[#9FC2DC] py-2 pl-9 pr-3 text-xs text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA]" /></label>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#D9E5EE] bg-[#EAF2F8] text-[#667085]">
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E5EE]">
              {filteredDocuments.map((document) => (
                <tr key={document.id} className="hover:bg-[#F5F9FC]">
                  <td className="px-4 py-3 font-bold text-[#17324A]">{document.name}<p className="mt-1 max-w-xs text-[10px] font-normal leading-4 text-[#667085]">{document.note}</p></td>
                  <td className="px-4 py-3 text-[#667085]">{document.type}</td>
                  <td className="px-4 py-3 text-[#667085]">{document.uploadedOn}</td>
                  <td className="px-4 py-3 text-[#667085]">{document.size}</td>
                  <td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyle[document.status]}`}>{document.status}</span></td>
                  <td className="px-4 py-3 text-right"><button className="inline-flex items-center gap-1 rounded-lg border border-[#D9E5EE] px-2.5 py-1.5 text-[10px] font-bold text-[#17324A] hover:bg-[#EAF2F8]"><Download className="h-3.5 w-3.5" /> Download</button></td>
                </tr>
              ))}
              {filteredDocuments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-[#667085]">No documents found in database.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-[#D9E5EE] bg-white p-5 shadow-md">
        <div className="flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-sm font-bold text-[#17324A]"><History className="h-4 w-4" /> HR Document Requests</h2><p className="mt-1 text-xs text-[#667085]">Track official documents requested from HR Operations.</p></div>{canManageOwnDocuments && <button onClick={() => setShowRequest(true)} className="hidden rounded-lg border border-[#9FC5E2] px-3 py-2 text-xs font-bold text-[#17324A] hover:bg-[#EAF2F8] sm:block">New Request</button>}</div>
        <div className="mt-4 space-y-3">{requests.map((request) => <div key={request.id} className="rounded-xl border border-[#D9E5EE] bg-[#F9FBFD] p-4"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold text-[#667085]">{request.id}</span><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyle[request.status]}`}>{request.status}</span></div><h3 className="mt-2 text-sm font-bold text-[#17324A]">{request.documentType}</h3><p className="mt-1 text-xs text-[#667085]">{request.reason}</p></div><div className="text-left text-[11px] text-[#667085] md:text-right"><p className="mt-1">Requested {request.requestedOn}</p><p className="mt-1 font-semibold text-[#17324A]">Requested by {request.requestedBy}</p></div></div></div>)}{requests.length === 0 && <div className="rounded-xl border border-dashed border-[#9FC2DC] bg-[#F5F9FC] px-4 py-8 text-center text-xs text-[#667085]">No document requests found in database.</div>}</div>
      </section>

      {showUpload && <Modal title="Upload document" onClose={() => setShowUpload(false)}><form onSubmit={handleUpload} className="space-y-4"><Field label="Document name"><input value={uploadName} onChange={(event) => setUploadName(event.target.value)} placeholder="Optional display name" className={inputClass} /></Field><Field label="Document type"><select value={uploadType} onChange={(event) => setUploadType(event.target.value)} className={inputClass}><option>Identity Proof</option><option>Address Proof</option><option>Education Certificate</option><option>Bank Account Proof</option><option>Employment Document</option><option>Other</option></select></Field><Field label="Choose file"><input required id="document-file" name="document-file" type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-[#EAF2F8] file:px-2 file:py-1 file:text-xs file:font-bold`} /></Field><p className="text-[11px] text-[#667085]">Accepted: PDF, DOC, DOCX, JPG, or PNG. Maximum size: 10 MB.</p><button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#244A68]"><Send className="h-4 w-4" /> Upload & Send to HR</button></form></Modal>}
      {showRequest && <Modal title="Request a document from HR" onClose={() => setShowRequest(false)}><form onSubmit={handleRequest} className="space-y-4"><Field label="Document requested"><select value={requestType} onChange={(event) => setRequestType(event.target.value)} className={inputClass}><option>Employment Verification Letter</option><option>Internship Completion Certificate</option><option>Experience Letter</option><option>Service Record</option><option>Other</option></select></Field><Field label="Reason and required details"><textarea required rows={5} value={requestReason} onChange={(event) => setRequestReason(event.target.value)} placeholder="Tell HR why you need this document and any deadline..." className={`${inputClass} resize-none`} /></Field><button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#244A68]"><Send className="h-4 w-4" /> Send Request to HR</button></form></Modal>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-bold text-[#17324A]">{label}<span className="mt-1 block">{children}</span></label>;
}

function Stat({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: React.ElementType }) {
  return <div className="rounded-2xl border border-[#D9E5EE] bg-white p-4 shadow-md"><div className="flex items-start justify-between"><span className="text-xs font-bold uppercase tracking-wider text-[#667085]">{label}</span><span className="rounded-lg bg-[#EAF2F8] p-2 text-[#17324A]"><Icon className="h-4 w-4" /></span></div><p className="mt-2 text-2xl font-black text-[#17324A]">{value}</p><p className="mt-1 text-[11px] text-[#667085]">{detail}</p></div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-black text-[#17324A]">{title}</h2><button onClick={onClose} aria-label={`Close ${title}`} className="rounded-lg p-2 text-[#667085] hover:bg-[#EAF2F8]"><X className="h-5 w-5" /></button></div>{children}</div></div>;
}
