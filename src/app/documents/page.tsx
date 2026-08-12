'use client';

import React, { useMemo, useState } from 'react';
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

const INITIAL_DOCUMENTS: EmployeeDocument[] = [
  {
    id: 'DOC-204',
    employeeId: 'EMP-001',
    employeeName: 'Ayush Vishnoi',
    name: 'Aadhaar Card.pdf',
    type: 'Identity Proof',
    uploadedOn: '02 Aug 2026',
    size: '1.8 MB',
    status: 'Verified',
    note: 'Identity proof verified by HR Operations.',
  },
  {
    id: 'DOC-201',
    employeeId: 'EMP-001',
    employeeName: 'Ayush Vishnoi',
    name: 'Internship Agreement.pdf',
    type: 'Employment Document',
    uploadedOn: '15 Jul 2026',
    size: '920 KB',
    status: 'Under Review',
    note: 'HR is checking the signed agreement.',
  },
  {
    id: 'DOC-199',
    employeeId: 'EMP-002',
    employeeName: 'Arjun Mehta',
    name: 'PAN Card.pdf',
    type: 'Identity Proof',
    uploadedOn: '18 Jul 2026',
    size: '1.2 MB',
    status: 'Verified',
    note: 'Identity proof verified by HR Operations.',
  },
  {
    id: 'DOC-198',
    employeeId: 'EMP-002',
    employeeName: 'Arjun Mehta',
    name: 'Leadership Certification.pdf',
    type: 'Education Certificate',
    uploadedOn: '01 Jul 2026',
    size: '640 KB',
    status: 'Action Required',
    note: 'Please upload a clearer scan of the certification page.',
  },
];

const INITIAL_REQUESTS: DocumentRequest[] = [
  {
    id: 'REQ-087',
    employeeId: 'EMP-001',
    documentType: 'Employment Verification Letter',
    reason: 'Required for opening a student bank account.',
    requestedOn: '05 Aug 2026',
    status: 'In Review',
    requestedBy: 'Ayush Vishnoi',
  },
  {
    id: 'REQ-081',
    employeeId: 'EMP-001',
    documentType: 'Internship Completion Certificate',
    reason: 'Needed for university records after the internship period.',
    requestedOn: '24 Jul 2026',
    status: 'Pending',
    requestedBy: 'Ayush Vishnoi',
  },
  {
    id: 'REQ-079',
    employeeId: 'EMP-002',
    documentType: 'Experience Letter',
    reason: 'Required for professional membership verification.',
    requestedOn: '18 Jul 2026',
    status: 'Completed',
    requestedBy: 'Arjun Mehta',
  },
];

const statusStyle: Record<DocumentStatus | RequestStatus, string> = {
  Verified: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'Under Review': 'border-blue-200 bg-blue-50 text-blue-700',
  'Action Required': 'border-rose-200 bg-rose-50 text-rose-700',
  Pending: 'border-amber-200 bg-amber-50 text-amber-700',
  'In Review': 'border-violet-200 bg-violet-50 text-violet-700',
  Completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

export default function DocumentsPage() {
  const { currentUser } = useHRMS();
  const isEmployee = currentUser.userRole === 'employee';
  const isManager = currentUser.userRole === 'manager';
  const canManageOwnDocuments = isEmployee || isManager;
  const visibleEmployeeIds = useMemo(
    () => canManageOwnDocuments ? new Set([currentUser.id]) : null,
    [canManageOwnDocuments, currentUser.id]
  );
  const [documents, setDocuments] = useState(INITIAL_DOCUMENTS);
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [showUpload, setShowUpload] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [search, setSearch] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [uploadType, setUploadType] = useState('Identity Proof');
  const [requestType, setRequestType] = useState('Employment Verification Letter');
  const [requestReason, setRequestReason] = useState('');
  const [notice, setNotice] = useState('');

  const visibleDocuments = useMemo(
    () => documents.filter((document) => !visibleEmployeeIds || visibleEmployeeIds.has(document.employeeId)),
    [documents, visibleEmployeeIds]
  );
  const visibleRequests = useMemo(
    () => requests.filter((request) => !visibleEmployeeIds || visibleEmployeeIds.has(request.employeeId)),
    [requests, visibleEmployeeIds]
  );
  const filteredDocuments = useMemo(() => visibleDocuments.filter((document) =>
    `${document.employeeName} ${document.name} ${document.type} ${document.status}`.toLowerCase().includes(search.toLowerCase())
  ), [search, visibleDocuments]);

  const handleUpload = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fileInput = event.currentTarget.elements.namedItem('document-file') as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (!file) return;

    setDocuments((current) => [{
      id: `DOC-${204 + current.length + 1}`,
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      name: uploadName.trim() || file.name,
      type: uploadType,
      uploadedOn: '09 Aug 2026',
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      status: 'Under Review',
      note: 'Uploaded by employee and queued for HR verification.',
    }, ...current]);
    setUploadName('');
    setShowUpload(false);
    setNotice('Document uploaded and sent to HR for verification.');
  };

  const handleRequest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!requestReason.trim()) return;

    setRequests((current) => [{
      id: `REQ-${87 + current.length + 1}`,
      employeeId: currentUser.id,
      documentType: requestType,
      reason: requestReason.trim(),
      requestedOn: '09 Aug 2026',
      status: 'Pending',
      requestedBy: currentUser.name,
    }, ...current]);
    setRequestReason('');
    setShowRequest(false);
    setNotice('Document request sent to HR.');
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#5B91B5]"><ShieldCheck className="h-4 w-4" /> Secure document center</div>
          <h1 className="text-2xl font-black tracking-tight text-[#17324A]">Documents & Requests</h1>
          <p className="mt-1 text-sm text-[#667085]">Upload your documents securely or request an official document from HR.</p>
        </div>
        {canManageOwnDocuments && <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 rounded-xl bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#244A68]"><UploadCloud className="h-4 w-4" /> Upload Document</button>
          <button onClick={() => setShowRequest(true)} className="flex items-center gap-2 rounded-xl border border-[#9FC5E2] bg-[#B0D0EA] px-4 py-2.5 text-xs font-bold text-[#17324A] hover:bg-[#9FC5E2]"><MessageSquarePlus className="h-4 w-4" /> Request from HR</button>
        </div>}
      </header>

      {notice && <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss notification"><X className="h-4 w-4" /></button></div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label={canManageOwnDocuments ? 'My Documents' : 'Employee Documents'} value={String(visibleDocuments.length)} detail="Uploaded records" icon={FileText} />
        <Stat label="Under Review" value={String(visibleDocuments.filter((document) => document.status === 'Under Review').length)} detail="Awaiting HR verification" icon={Clock3} />
        <Stat label="Open Requests" value={String(visibleRequests.filter((request) => request.status !== 'Completed').length)} detail="HR actions in progress" icon={History} />
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
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-[#667085]">No documents found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-[#D9E5EE] bg-white p-5 shadow-md">
        <div className="flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-sm font-bold text-[#17324A]"><History className="h-4 w-4" /> HR Document Requests</h2><p className="mt-1 text-xs text-[#667085]">Track official documents requested from HR Operations.</p></div>{canManageOwnDocuments && <button onClick={() => setShowRequest(true)} className="hidden rounded-lg border border-[#9FC5E2] px-3 py-2 text-xs font-bold text-[#17324A] hover:bg-[#EAF2F8] sm:block">New Request</button>}</div>
        <div className="mt-4 space-y-3">{visibleRequests.map((request) => <div key={request.id} className="rounded-xl border border-[#D9E5EE] bg-[#F9FBFD] p-4"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold text-[#667085]">{request.id}</span><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyle[request.status]}`}>{request.status}</span></div><h3 className="mt-2 text-sm font-bold text-[#17324A]">{request.documentType}</h3><p className="mt-1 text-xs text-[#667085]">{request.reason}</p></div><div className="text-left text-[11px] text-[#667085] md:text-right"><p className="mt-1">Requested {request.requestedOn}</p><p className="mt-1 font-semibold text-[#17324A]">Requested by {request.requestedBy}</p></div></div></div>)}{visibleRequests.length === 0 && <div className="rounded-xl border border-dashed border-[#9FC2DC] bg-[#F5F9FC] px-4 py-8 text-center text-xs text-[#667085]">No document requests found.</div>}</div>
      </section>

      {showUpload && <Modal title="Upload document" onClose={() => setShowUpload(false)}><form onSubmit={handleUpload} className="space-y-4"><Field label="Document name"><input value={uploadName} onChange={(event) => setUploadName(event.target.value)} placeholder="Optional display name" className={inputClass} /></Field><Field label="Document type"><select value={uploadType} onChange={(event) => setUploadType(event.target.value)} className={inputClass}><option>Identity Proof</option><option>Address Proof</option><option>Education Certificate</option><option>Bank Account Proof</option><option>Employment Document</option><option>Other</option></select></Field><Field label="Choose file"><input required id="document-file" name="document-file" type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-[#EAF2F8] file:px-2 file:py-1 file:text-xs file:font-bold`} /></Field><p className="text-[11px] text-[#667085]">Accepted: PDF, DOC, DOCX, JPG, or PNG. Maximum size: 10 MB.</p><button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#244A68]"><Send className="h-4 w-4" /> Upload & Send to HR</button></form></Modal>}
      {showRequest && <Modal title="Request a document from HR" onClose={() => setShowRequest(false)}><form onSubmit={handleRequest} className="space-y-4"><Field label="Document requested"><select value={requestType} onChange={(event) => setRequestType(event.target.value)} className={inputClass}><option>Employment Verification Letter</option><option>Internship Completion Certificate</option><option>Experience Letter</option><option>Service Record</option><option>Other</option></select></Field><Field label="Reason and required details"><textarea required rows={5} value={requestReason} onChange={(event) => setRequestReason(event.target.value)} placeholder="Tell HR why you need this document and any deadline..." className={`${inputClass} resize-none`} /></Field><button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#244A68]"><Send className="h-4 w-4" /> Send Request to HR</button></form></Modal>}
    </div>
  );
}

const inputClass = 'w-full rounded-lg border border-[#9FC2DC] bg-white px-3 py-2 text-sm text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA]';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-bold text-[#17324A]">{label}<span className="mt-1 block">{children}</span></label>;
}

function Stat({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: React.ElementType }) {
  return <div className="rounded-2xl border border-[#D9E5EE] bg-white p-4 shadow-md"><div className="flex items-start justify-between"><span className="text-xs font-bold uppercase tracking-wider text-[#667085]">{label}</span><span className="rounded-lg bg-[#EAF2F8] p-2 text-[#17324A]"><Icon className="h-4 w-4" /></span></div><p className="mt-2 text-2xl font-black text-[#17324A]">{value}</p><p className="mt-1 text-[11px] text-[#667085]">{detail}</p></div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-black text-[#17324A]">{title}</h2><button onClick={onClose} aria-label={`Close ${title}`} className="rounded-lg p-2 text-[#667085] hover:bg-[#EAF2F8]"><X className="h-5 w-5" /></button></div>{children}</div></div>;
}
