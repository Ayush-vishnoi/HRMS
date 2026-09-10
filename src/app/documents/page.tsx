'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { authFetch } from '@/lib/api-client';
import {
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  FileSearch,
  FileText,
  History,
  Lock,
  MessageSquarePlus,
  Search,
  Send,
  ShieldCheck,
  UploadCloud,
  X,
  XCircle,
} from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';
import { BankDetailsCard } from '@/features/dashboard/components/BankDetailsCard';

type DocumentStatus = 'Verified' | 'Under Review' | 'Action Required';
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

type StaffMember = { id: string; name: string; email?: string; employeeCode: string; department: string | null; roleTitle: string | null };
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

const CLOSED_REQUEST_STATUSES: RequestStatus[] = ['Sent', 'Downloaded', 'Verified', 'Rejected'];

const INITIAL_DOCUMENTS: EmployeeDocument[] = [
  {
    id: 'DOC-001',
    employeeId: 'EMP-001',
    employeeName: 'Ayush Vishnoi',
    name: 'Employment Offer Letter (Signed).pdf',
    type: 'Employment Document',
    uploadedOn: '15 Jul 2026',
    size: '1.4 MB',
    status: 'Verified',
    note: 'Official signed appointment & offer agreement.',
    downloadable: true,
    downloadUrl: '#',
    sharedByHr: true,
    sharedAt: '15 Jul 2026',
  },
  {
    id: 'DOC-002',
    employeeId: 'EMP-001',
    employeeName: 'Ayush Vishnoi',
    name: 'Aadhaar Card & National ID.pdf',
    type: 'Identity Proof',
    uploadedOn: '16 Jul 2026',
    size: '850 KB',
    status: 'Verified',
    note: 'Government issued identity verification proof.',
    downloadable: true,
    downloadUrl: '#',
  },
  {
    id: 'DOC-003',
    employeeId: 'EMP-001',
    employeeName: 'Ayush Vishnoi',
    name: 'B.Tech Degree & Marksheets.pdf',
    type: 'Education Certificate',
    uploadedOn: '18 Jul 2026',
    size: '2.1 MB',
    status: 'Verified',
    note: 'Undergraduate degree certificate.',
    downloadable: true,
    downloadUrl: '#',
  },
  {
    id: 'DOC-004',
    employeeId: 'EMP-002',
    employeeName: 'Arjun Mehta',
    name: 'Non-Disclosure Agreement (NDA).pdf',
    type: 'Employment Document',
    uploadedOn: '10 Aug 2026',
    size: '520 KB',
    status: 'Verified',
    note: 'Company proprietary information & NDA contract.',
    downloadable: true,
    downloadUrl: '#',
    sharedByHr: true,
  },
  {
    id: 'DOC-005',
    employeeId: 'EMP-001',
    employeeName: 'Ayush Vishnoi',
    name: 'Cancelled Cheque & Bank Proof.pdf',
    type: 'Bank Account Proof',
    uploadedOn: '20 Aug 2026',
    size: '410 KB',
    status: 'Under Review',
    note: 'Salary disbursement account verification.',
    downloadable: false,
  },
];

const INITIAL_REQUESTS: DocumentRequest[] = [
  {
    id: 'REQ-001',
    employeeId: 'EMP-001',
    requestedBy: 'Ayush Vishnoi',
    documentType: 'Employment Verification Letter',
    reason: 'Required for residential visa & rental agreement verification.',
    requestedOn: '22 Aug 2026',
    status: 'Sent',
    sentAt: '24 Aug 2026',
    downloadedAt: '25 Aug 2026',
    attachments: [
      {
        id: 'ATT-001',
        documentId: 'DOC-001',
        name: 'Employment_Verification_Ayush_Vishnoi.pdf',
        source: 'template',
        downloadUrl: '#',
      },
    ],
  },
  {
    id: 'REQ-002',
    employeeId: 'EMP-001',
    requestedBy: 'Ayush Vishnoi',
    documentType: 'Salary Certificate',
    reason: 'Bank loan application verification.',
    requestedOn: '28 Aug 2026',
    status: 'In Progress',
    attachments: [],
  },
];

const STATIC_STAFF: StaffMember[] = [
  { id: 'EMP-001', name: 'Ayush Vishnoi', employeeCode: 'EMP-2026-089', department: 'AI/ML', roleTitle: 'AI/ML Intern Developer' },
  { id: 'EMP-002', name: 'Arjun Mehta', employeeCode: 'EMP-2019-012', department: 'Engineering', roleTitle: 'Engineering Manager' },
  { id: 'EMP-006', name: 'Priya Sharma', employeeCode: 'EMP-2017-003', department: 'Human Resources', roleTitle: 'VP of Human Resources' },
];

const STATIC_TEMPLATES: Template[] = [
  { id: 'TPL-001', name: 'Employment Verification Letter', variables: ['designation', 'salary', 'purpose'] },
  { id: 'TPL-002', name: 'Experience Letter', variables: ['joining_date', 'relieving_date', 'designation'] },
  { id: 'TPL-003', name: 'Internship Completion Certificate', variables: ['duration', 'project_name'] },
];

const inputClass =
  'w-full rounded-lg border border-[#9FC2DC] bg-white px-3 py-2 text-sm text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA]';

export default function DocumentsPage() {
  const { currentUser } = useHRMS();
  const isAdmin = currentUser.userRole === 'admin';
  const canSubmit = currentUser.userRole === 'employee' || currentUser.userRole === 'manager';

  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [templates, setTemplates] = useState<Template[]>(STATIC_TEMPLATES);
  const [staff, setStaff] = useState<StaffMember[]>(STATIC_STAFF);

  const loadDocumentsData = useCallback(async () => {
    try {
      const res = await authFetch<{ success: boolean; data: any }>('/api/documents');
      if (res?.success && res.data) {
        setDocuments(res.data.documents || []);
        setRequests(res.data.requests || []);
        if (res.data.templates?.length) setTemplates(res.data.templates);
        if (res.data.staff?.length) setStaff(res.data.staff);
      }
    } catch {
      setDocuments(INITIAL_DOCUMENTS);
      setRequests(INITIAL_REQUESTS);
    }
  }, []);

  useEffect(() => {
    void loadDocumentsData();
  }, [currentUser.id, loadDocumentsData]);

  const [showUpload, setShowUpload] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [showHrRequest, setShowHrRequest] = useState(false);
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState('Identity Proof');
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

  const templateNames = useMemo(() => [...new Set(templates.map((template) => template.name))], [templates]);
  const selectedTemplate = templates.find((template) => template.id === fulfilTemplateId);
  const effectiveRequestType = templateNames.length > 0 && !templateNames.includes(requestType) ? templateNames[0] : requestType;

  const filteredDocuments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return documents.filter((document) => {
      if (!isAdmin && document.employeeId !== currentUser.id) return false;
      if (employeeFilter && document.employeeId !== employeeFilter) return false;
      if (!term) return true;
      return `${document.employeeName} ${document.name} ${document.type} ${document.status}`
        .toLowerCase()
        .includes(term);
    });
  }, [documents, search, employeeFilter, isAdmin, currentUser.id]);

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
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) {
      setError('Please choose a file to upload.');
      return;
    }

    const payload = new FormData();
    payload.append('file', file);
    payload.append('name', (form.get('name') as string)?.trim() || file.name);
    payload.append('type', uploadRequest ? uploadRequest.documentType : uploadType);
    if (uploadRequest) payload.append('requestId', uploadRequest.id);

    try {
      const res = await authFetch<{ success: boolean; data: { document: EmployeeDocument; request: DocumentRequest | null } }>(
        '/api/documents/upload',
        { method: 'POST', body: payload },
      );
      const doc = res?.data?.document;
      const req = res?.data?.request;
      if (doc) setDocuments((prev) => [doc, ...prev.filter((d) => d.id !== doc.id)]);
      if (req) setRequests((prev) => prev.map((r) => (r.id === req.id ? req : r)));
      setShowUpload(false);
      setUploadRequest(null);
      setNotice(uploadRequest ? 'Document submitted to HR for verification.' : 'Document uploaded and queued for HR verification.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed.');
    }
  };

  const handleRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const res = await authFetch<{ success: boolean; data: { request: DocumentRequest } }>('/api/documents/request', {
        method: 'POST',
        body: {
          documentType: effectiveRequestType,
          reason: requestReason.trim() || 'Official company document request.',
        },
      });
      const req = res?.data?.request;
      if (req) setRequests((prev) => [req, ...prev]);
      setRequestReason('');
      setShowRequest(false);
      setNotice('Document request sent to HR.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send request.');
    }
  };

  const reviewDocument = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reviewDoc) return;
    try {
      const res = await authFetch<{ success: boolean; data: { document: EmployeeDocument; request: DocumentRequest | null } }>(
        '/api/documents/review',
        { method: 'POST', body: { documentId: reviewDoc.id, decision: reviewDecision, reason: reviewReason.trim() } },
      );
      const doc = res?.data?.document;
      const req = res?.data?.request;
      if (doc) setDocuments((prev) => prev.map((d) => (d.id === doc.id ? doc : d)));
      if (req) setRequests((prev) => prev.map((r) => (r.id === req.id ? req : r)));
      setReviewDoc(null);
      setReviewDecision('verify');
      setReviewReason('');
      setNotice(reviewDecision === 'verify' ? 'Document verified and saved to the employee record.' : 'Document returned with action required.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Review failed.');
    }
  };

  const sendRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!fulfilRequest) return;

    const form = new FormData(event.currentTarget);
    const files = form.getAll('files').filter((entry): entry is File => entry instanceof File && entry.size > 0);
    if (files.length === 0) {
      setError('Attach at least one file to send.');
      return;
    }

    const payload = new FormData();
    payload.append('requestId', fulfilRequest.id);
    for (const file of files) payload.append('files', file);

    try {
      const res = await authFetch<{ success: boolean; data: { request: DocumentRequest } }>('/api/documents/fulfil', {
        method: 'POST',
        body: payload,
      });
      const req = res?.data?.request;
      if (req) setRequests((prev) => prev.map((r) => (r.id === req.id ? req : r)));
      setFulfilRequest(null);
      setFulfilTemplateId('');
      setFulfilValues({});
      setNotice('Response sent to the employee — they can now download the files.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send response.');
    }
  };

  const handleHrRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const employeeId = ((form.get('employeeId') as string) ?? '').trim();
    const documentType = ((form.get('documentType') as string) ?? '').trim();
    if (!employeeId || !documentType) {
      setError('Please select an employee and a document type.');
      return;
    }

    try {
      const res = await authFetch<{ success: boolean; data: { request: DocumentRequest } }>('/api/documents/hr-request', {
        method: 'POST',
        body: {
          employeeId,
          documentType,
          reason: (form.get('reason') as string)?.trim() || 'HR Document Submission Request',
        },
      });
      const req = res?.data?.request;
      if (req) setRequests((prev) => [req, ...prev]);
      setShowHrRequest(false);
      setNotice('Document request sent to the employee.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send request.');
    }
  };

  const shareDocument = async (documentId: string) => {
    try {
      const res = await authFetch<{ success: boolean; data: { document: EmployeeDocument } }>('/api/documents/share', {
        method: 'POST',
        body: { documentId },
      });
      const doc = res?.data?.document;
      if (doc) setDocuments((prev) => prev.map((d) => (d.id === doc.id ? doc : d)));
      setNotice('Document shared with the employee.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to share document.');
    }
  };

  /** Streams the file from the backend (with the auth token) and saves it locally. */
  const downloadFile = async (downloadUrl: string | null | undefined, fallbackName: string) => {
    if (!downloadUrl) {
      setError('This file is not available for download.');
      return;
    }
    try {
      const response = await authFetch<Response>(downloadUrl, { raw: true });
      if (!response.ok) throw new Error(`Download failed (${response.status}).`);
      const blob = await response.blob();
      const dispositionMatch = (response.headers.get('Content-Disposition') ?? '').match(/filename="([^"]+)"/);
      const filename = dispositionMatch?.[1] || fallbackName;
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      // Downloading a fulfilled request file may advance its status (Sent → Downloaded).
      void loadDocumentsData();
      setNotice(`Downloaded ${filename}.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Download failed.');
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
            <button onClick={() => { setUploadRequest(null); setShowUpload(true); }} className="flex items-center gap-2 rounded-xl bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#244A68] active:scale-[0.97] cursor-pointer">
              <UploadCloud className="h-4 w-4" /> Upload Document
            </button>
            <button onClick={() => setShowRequest(true)} className="flex items-center gap-2 rounded-xl border border-[#9FC5E2] bg-[#B0D0EA] px-4 py-2.5 text-xs font-bold text-[#17324A] transition hover:bg-[#9FC2DC] active:scale-[0.97] cursor-pointer">
              <MessageSquarePlus className="h-4 w-4" /> Request from HR
            </button>
          </div>
        )}
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowHrRequest(true)} className="flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-cyan-800 active:scale-[0.97] cursor-pointer">
              <MessageSquarePlus className="h-4 w-4" /> Request Document
            </button>
          </div>
        )}
      </header>

      {notice && <Banner tone="success" text={notice} onClose={() => setNotice('')} />}
      {error && <Banner tone="error" text={error} onClose={() => setError('')} />}

      {/* Onboarding STEP 4b — bank details collection (self-hides when Verified).
          Employees and managers submit/update their own bank details here. */}
      {canSubmit && <BankDetailsCard />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={isAdmin ? 'All Documents' : 'My Documents'} value={String(filteredDocuments.length)} detail="Uploaded records" icon={FileText} />
        <Stat label="Verified" value={String(filteredDocuments.filter((item) => item.status === 'Verified').length)} detail="Saved to employee record" icon={CheckCircle2} />
        <Stat label="Under Review" value={String(filteredDocuments.filter((item) => item.status === 'Under Review').length)} detail="Awaiting HR verification" icon={Clock3} />
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
              <button onClick={() => setEmployeeFilter(null)} className="rounded-lg border border-[#9FC2DC] bg-[#EAF2F8] px-3 py-2 text-[10px] font-bold text-[#17324A] hover:bg-[#D9E5EE] cursor-pointer">
                Clear employee filter
              </button>
            )}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {employeeSummaries.map((summary) => (
              <button
                key={summary.id}
                onClick={() => setEmployeeFilter(employeeFilter === summary.id ? null : summary.id)}
                className={`rounded-xl border p-4 text-left transition hover:border-[#9FC2DC] hover:bg-[#F5F9FC] cursor-pointer ${employeeFilter === summary.id ? 'border-cyan-300 bg-cyan-50' : 'border-[#D9E5EE] bg-[#F9FBFD]'}`}
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
            <p className="mt-1 text-xs text-[#667085]">Static verified company documents and records.</p>
          </div>
          <label className="relative block"><Search className="absolute left-3 top-2.5 h-4 w-4 text-[#667085]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search documents" className="rounded-lg border border-[#9FC2DC] py-2 pl-9 pr-3 text-xs text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA]" /></label>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead><tr className="border-b border-[#D9E5EE] bg-[#EAF2F8] text-[#667085]"><th className="px-4 py-3">Document</th>{isAdmin && <th className="px-4 py-3">Employee</th>}<th className="px-4 py-3">Type</th><th className="px-4 py-3">Uploaded</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-[#D9E5EE]">
              {filteredDocuments.map((document) => (
                <tr key={document.id} className="hover:bg-[#F5F9FC]">
                  <td className="px-4 py-3 font-bold text-[#17324A]">
                    {document.name}
                    <p className="mt-1 max-w-xs text-[10px] font-normal leading-4 text-[#667085]">{document.note}</p>
                  </td>
                  {isAdmin && <td className="px-4 py-3 text-[#667085]">{document.employeeName}</td>}
                  <td className="px-4 py-3 text-[#667085]">{document.type}</td>
                  <td className="px-4 py-3 text-[#667085]">{document.uploadedOn}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold whitespace-nowrap ${statusStyle[document.status]}`}>{document.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right align-middle">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {document.downloadable && (
                        <button onClick={() => downloadFile(document.downloadUrl, document.name)} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-[#9FC2DC] px-2.5 py-2 text-[10px] font-bold text-[#17324A] hover:bg-[#EAF2F8] cursor-pointer">
                          <Download className="h-3.5 w-3.5" /> Download
                        </button>
                      )}
                      {isAdmin && !document.sharedByHr && (
                        <button onClick={() => shareDocument(document.id)} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-cyan-700 px-2.5 py-2 text-[10px] font-bold text-white transition hover:bg-cyan-800 cursor-pointer">
                          <Send className="h-3.5 w-3.5" /> Share
                        </button>
                      )}
                      {isAdmin && document.status === 'Under Review' && (
                        <button onClick={() => { setReviewDoc(document); setReviewDecision('verify'); setReviewReason(''); }} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-[#17324A] px-2.5 py-2 text-[10px] font-bold text-white hover:bg-[#244A68] cursor-pointer">
                          <FileSearch className="h-3.5 w-3.5" /> Review
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDocuments.length === 0 && <tr><td colSpan={isAdmin ? 6 : 5} className="px-4 py-8 text-center text-xs text-[#667085]">No documents found.</td></tr>}
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
                  {item.reason && <p className="mt-1 text-xs text-[#667085]">{item.reason}</p>}
                  {isAdmin && <p className="mt-2 text-[11px] font-semibold text-[#17324A]">{item.initiatedByHr ? `HR request to ${item.requestedBy}` : `Employee: ${item.requestedBy}`}</p>}
                  {item.attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {item.attachments.map((attachment) => (
                        <div key={attachment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#D9E5EE] bg-white px-3 py-2">
                          <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-[#17324A]"><FileText className="h-3.5 w-3.5 shrink-0 text-[#5B91B5]" /> <span className="truncate">{attachment.name}</span></span>
                          <button onClick={() => downloadFile(attachment.downloadUrl, attachment.name)} className="inline-flex items-center gap-1 rounded-lg border border-[#9FC2DC] px-2.5 py-1.5 text-[10px] font-bold text-[#17324A] transition hover:bg-[#EAF2F8] cursor-pointer"><Download className="h-3.5 w-3.5" /> Download</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#667085]">
                  <span>Requested {item.requestedOn}</span>
                  {item.sentAt && <span className="text-cyan-700">Sent {item.sentAt}</span>}
                  {item.downloadedAt && <span className="text-emerald-700">Downloaded {item.downloadedAt}</span>}
                  {isAdmin && !item.initiatedByHr && item.status !== 'Sent' && item.status !== 'Downloaded' && <button onClick={() => { setFulfilRequest(item); setFulfilTemplateId(''); setFulfilValues({}); }} className="rounded-lg bg-[#17324A] px-3 py-2 text-[10px] font-bold text-white transition hover:bg-[#244A68] active:scale-[0.97] cursor-pointer">Respond & Send</button>}
                  {!isAdmin && item.initiatedByHr && (item.status === 'Requested' || item.status === 'Rejected') && <button onClick={() => { setUploadType(item.documentType); setUploadRequest(item); setShowUpload(true); }} className="rounded-lg bg-[#17324A] px-3 py-2 text-[10px] font-bold text-white transition hover:bg-[#244A68] active:scale-[0.97] cursor-pointer">{item.status === 'Rejected' ? 'Re-upload Document' : 'Upload Document'}</button>}
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
            <Field label="Document name"><input name="name" placeholder="Optional display name" className={inputClass} /></Field>
            <Field label="Document type">
              <select value={uploadType} onChange={(event) => setUploadType(event.target.value)} className={inputClass}>
                <option>Identity Proof</option>
                <option>Address Proof</option>
                <option>Education Certificate</option>
                <option>Bank Account Proof</option>
                <option>Employment Document</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Choose file"><input required name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-[#EAF2F8] file:px-2 file:py-1 file:text-xs file:font-bold`} /></Field>
            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#244A68] active:scale-[0.98] cursor-pointer">
              <UploadCloud className="h-4 w-4" /> Upload Document
            </button>
          </form>
        </Modal>
      )}

      {showRequest && (
        <Modal title="Request a document from HR" onClose={() => setShowRequest(false)}>
          <form onSubmit={handleRequest} className="space-y-4">
            <Field label="Document requested">
              <select value={effectiveRequestType} onChange={(event) => setRequestType(event.target.value)} className={inputClass}>
                {templateNames.map((name) => <option key={name}>{name}</option>)}
              </select>
            </Field>
            <Field label="Note (optional)">
              <textarea rows={4} value={requestReason} onChange={(event) => setRequestReason(event.target.value)} placeholder="Add any details HR should know..." className={`${inputClass} resize-none`} />
            </Field>
            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#244A68] active:scale-[0.98] cursor-pointer">
              <Send className="h-4 w-4" /> Send Request to HR
            </button>
          </form>
        </Modal>
      )}

      {showHrRequest && (
        <Modal title="Request a document from an employee" onClose={() => setShowHrRequest(false)}>
          <form onSubmit={handleHrRequest} className="space-y-4">
            <Field label="Employee">
              <select name="employeeId" required defaultValue="" className={inputClass}>
                <option value="" disabled>Select employee</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.employeeCode}){member.department ? ` — ${member.department}` : ''}
                    {member.email ? ` — ${member.email}` : ''}
                  </option>
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
              </select>
            </Field>
            <Field label="Note for employee (optional)"><textarea name="reason" rows={4} placeholder="Add any details..." className={`${inputClass} resize-none`} /></Field>
            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-cyan-800 active:scale-[0.98] cursor-pointer">
              <MessageSquarePlus className="h-4 w-4" /> Send Request to Employee
            </button>
          </form>
        </Modal>
      )}

      {fulfilRequest && (
        <Modal title={`Respond to ${fulfilRequest.id}`} onClose={() => { setFulfilRequest(null); setFulfilTemplateId(''); setFulfilValues({}); }}>
          <form onSubmit={sendRequest} className="space-y-4">
            <Field label="Attach files"><input name="files" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-[#EAF2F8] file:px-2 file:py-1 file:text-xs file:font-bold`} /></Field>
            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-cyan-800 active:scale-[0.98] cursor-pointer">
              <Send className="h-4 w-4" /> Send to Employee
            </button>
          </form>
        </Modal>
      )}

      {reviewDoc && (
        <Modal title="Review document" onClose={() => { setReviewDoc(null); setReviewDecision('verify'); setReviewReason(''); }}>
          <form onSubmit={reviewDocument} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setReviewDecision('verify')} className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-bold transition cursor-pointer ${reviewDecision === 'verify' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-[#D9E5EE] bg-white text-[#667085]'}`}><CheckCircle2 className="h-4 w-4" /> Verify</button>
              <button type="button" onClick={() => setReviewDecision('reject')} className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-bold transition cursor-pointer ${reviewDecision === 'reject' ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-[#D9E5EE] bg-white text-[#667085]'}`}><XCircle className="h-4 w-4" /> Reject</button>
            </div>
            {reviewDecision === 'reject' && (
              <Field label="Reason for rejection (required)">
                <textarea required rows={3} value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} placeholder="Reason for rejection..." className={`${inputClass} resize-none`} />
              </Field>
            )}
            <button type="submit" className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold text-white transition cursor-pointer ${reviewDecision === 'verify' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
              {reviewDecision === 'verify' ? 'Verify Document' : 'Reject Document'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Banner({ tone, text, onClose }: { tone: 'success' | 'error'; text: string; onClose: () => void }) {
  return <div className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-semibold ${tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {text}</span><button onClick={onClose} className="rounded-lg p-1.5 text-current hover:bg-black/5 cursor-pointer"><X className="h-4 w-4" /></button></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-bold text-[#17324A]">{label}<span className="mt-1 block">{children}</span></label>;
}

function Stat({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: IconComponent }) {
  return <div className="rounded-2xl border border-[#D9E5EE] bg-white p-4 shadow-md"><div className="flex items-start justify-between"><span className="text-xs font-bold uppercase tracking-wider text-[#667085]">{label}</span><span className="rounded-lg bg-[#EAF2F8] p-2 text-[#17324A]"><Icon className="h-4 w-4" /></span></div><p className="mt-2 text-2xl font-black text-[#17324A]">{value}</p><p className="mt-1 text-[11px] text-[#667085]">{detail}</p></div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/40 p-4 backdrop-blur-sm" role="dialog" onClick={onClose}><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-black text-[#17324A]">{title}</h2><button onClick={onClose} className="rounded-lg p-2 text-[#667085] hover:bg-[#EAF2F8] cursor-pointer"><X className="h-5 w-5" /></button></div>{children}</div></div>;
}
