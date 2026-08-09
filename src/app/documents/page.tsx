'use client';

import React, { useState } from 'react';
import {
  FileText,
  UploadCloud,
  FileCheck,
  Clock,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  FilePlus,
  Building2,
  ShieldCheck,
  Crown,
  Briefcase,
  Lock,
  Search,
} from 'lucide-react';
import { useHRMS, EmployeeDocument, DocumentRequest } from '@/context/HRMSContext';

interface CompanyDocumentItem {
  id: string;
  title: string;
  category: 'Corporate Governance' | 'Compliance & Audit' | 'Legal & Filings' | 'Financial Reports';
  version: string;
  fileSize: string;
  lastModified: string;
  restrictedAccess: string;
  summary: string;
}

const COMPANY_DOCUMENTS: CompanyDocumentItem[] = [
  { id: 'CDOC-001', title: 'Apex Enterprise Articles of Incorporation & Master Bylaws', category: 'Corporate Governance', version: 'v3.0', fileSize: '4.2 MB', lastModified: '15 Jan 2026', restrictedAccess: 'Board & Executive', summary: 'Official corporate registration, share structure, and board governance bylaws.' },
  { id: 'CDOC-002', title: 'ISO 27001 & SOC2 Type II Security Compliance Audit Report', category: 'Compliance & Audit', version: 'v2026.1', fileSize: '12.8 MB', lastModified: '28 Jul 2026', restrictedAccess: 'Executive & Security Council', summary: 'Third-party auditor certification for data encryption, SSO security, and cloud infrastructure.' },
  { id: 'CDOC-003', title: 'Q2 2026 Audited Financial Statements & Tax Submissions', category: 'Financial Reports', version: 'Final', fileSize: '8.5 MB', lastModified: '31 Jul 2026', restrictedAccess: 'CEO & CFO', summary: 'Comprehensive quarterly P&L, balance sheet, tax withholding, and audit disclosures.' },
  { id: 'CDOC-004', title: 'Enterprise Patent & Intellectual Property Filing Dossier', category: 'Legal & Filings', version: 'v1.2', fileSize: '6.1 MB', lastModified: '02 Aug 2026', restrictedAccess: 'CEO & Legal Council', summary: 'Registered patent applications for HR analytics algorithms and machine learning scoring engines.' },
];

export default function DocumentManagementPage() {
  const {
    documents,
    uploadDocument,
    documentRequests,
    requestDocument,
    updateDocumentRequestStatus,
    currentUser,
  } = useHRMS();

  const isCeo = currentUser.userRole === 'ceo' || currentUser.userRole === 'admin';

  // Tab state
  const [activeTab, setActiveTab] = useState<'company' | 'personal'>(
    isCeo ? 'company' : 'personal'
  );

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Upload modal state
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<EmployeeDocument['category']>('Identity');
  const [fileName, setFileName] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Request modal state
  const [requestDocType, setRequestDocType] = useState<DocumentRequest['documentType']>('Salary Certificate');
  const [purpose, setPurpose] = useState('');
  const [neededBy, setNeededBy] = useState('2026-08-25');
  const [requestSuccess, setRequestSuccess] = useState(false);

  const myPersonalDocuments = documents.filter((d) => d.employeeId === currentUser.id);

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) return;

    uploadDocument({
      title: docTitle.trim(),
      category: docCategory,
      fileName: fileName || `${docTitle.replace(/\s+/g, '_')}.pdf`,
      fileSize: '1.4 MB',
    });

    setUploadSuccess(true);
    setTimeout(() => {
      setUploadSuccess(false);
      setDocTitle('');
      setFileName('');
      setIsUploadModalOpen(false);
    }, 1200);
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose.trim()) return;

    requestDocument({
      documentType: requestDocType,
      purpose: purpose.trim(),
      neededBy,
    });

    setRequestSuccess(true);
    setTimeout(() => {
      setRequestSuccess(false);
      setPurpose('');
      setIsRequestModalOpen(false);
    }, 1200);
  };

  return (
    <div className="space-y-6 select-none">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-[#17324A]">
              Document & Record Governance
            </h1>
            {isCeo && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                <Crown className="w-3 h-3 text-purple-700" />
                Executive Vault
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[#667085]">
            {activeTab === 'company'
              ? 'Secure enterprise vault for corporate governance, legal filings, audit certificates, and board documents'
              : 'Personal credential repository for identity verification, payslips, and official document requests'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-white border border-[#D9E5EE] hover:bg-[#F5F9FC] text-[#17324A] text-xs font-bold shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-[#17324A]" />
            Upload File
          </button>

          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#B0D0EA] hover:bg-[#9FC5E2] text-[#17324A] border border-[#9FC5E2] text-xs font-bold shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <FilePlus className="w-4 h-4" />
            Request Certificate
          </button>
        </div>
      </div>

      {/* CEO Context Switcher Tabs */}
      {isCeo && (
        <div className="flex items-center gap-2 bg-[#F5F9FC] p-1.5 rounded-2xl border border-[#D9E5EE] w-fit">
          <button
            onClick={() => setActiveTab('company')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'company'
                ? 'bg-[#17324A] text-white shadow-md'
                : 'text-[#5F7180] hover:text-[#17324A]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Company Corporate Documents (Governance Vault)
          </button>
          <button
            onClick={() => setActiveTab('personal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'personal'
                ? 'bg-[#17324A] text-white shadow-md'
                : 'text-[#5F7180] hover:text-[#17324A]'
            }`}
          >
            <FileText className="w-4 h-4" />
            My Personal Documents (CEO Credentials)
          </button>
        </div>
      )}

      {/* TAB 1: COMPANY CORPORATE DOCUMENTS */}
      {activeTab === 'company' && isCeo && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md">
              <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">Corporate Governance</span>
              <div className="text-2xl font-black text-[#17324A] mt-2">Bylaws & Charter</div>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">• Board Approved</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md">
              <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">Compliance Audits</span>
              <div className="text-2xl font-black text-purple-700 mt-2">SOC2 & ISO 27001</div>
              <span className="text-[11px] text-[#667085] mt-1 block">Valid through 2027</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md">
              <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">Legal Filings</span>
              <div className="text-2xl font-black text-blue-700 mt-2">4 Active IP Dossiers</div>
              <span className="text-[11px] text-[#667085] mt-1 block">Patents & Trademarks</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md">
              <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">Vault Access Level</span>
              <div className="text-2xl font-black text-emerald-600 mt-2">Encrypted CEO Tier</div>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">• Zero Unauthorized Exposure</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#B0D0EA] shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#17324A] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-700" />
                  Corporate Master Document Repository
                </h3>
                <p className="text-xs text-[#5F7180]">Official legal, compliance, and governance files for Apex HRMS Enterprise</p>
              </div>
              <span className="text-xs font-bold text-[#17324A] bg-[#F5F9FC] px-3 py-1 rounded-xl border border-[#D9E5EE]">
                CEO Restricted Vault
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {COMPANY_DOCUMENTS.map((cdoc) => (
                <div key={cdoc.id} className="p-5 rounded-2xl bg-[#F5F9FC] border border-[#D9E5EE] flex flex-col justify-between space-y-3 hover:border-[#B0D0EA] transition-all">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#B0D0EA] text-[#17324A]">
                        {cdoc.category}
                      </span>
                      <span className="text-[10px] font-bold text-[#5F7180] flex items-center gap-1">
                        <Lock className="w-3 h-3 text-purple-700" /> {cdoc.restrictedAccess}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-[#17324A]">{cdoc.title}</h4>
                    <p className="text-xs text-[#5F7180]">{cdoc.summary}</p>
                    <span className="text-[10px] text-[#8C9CA8] block font-mono">File: {cdoc.fileSize} • Version {cdoc.version} • Modified {cdoc.lastModified}</span>
                  </div>

                  <button
                    onClick={() => alert(`Downloading secure enterprise file: ${cdoc.title}`)}
                    className="w-full py-2 rounded-xl bg-[#17324A] hover:bg-[#234B68] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Vault PDF
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY PERSONAL DOCUMENTS */}
      {(activeTab === 'personal' || !isCeo) && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#17324A]" />
                My Personal Documents & Verified Credentials
              </h3>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#B0D0EA] text-[#17324A]">
                {myPersonalDocuments.length} Verified Records
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myPersonalDocuments.map((doc) => (
                <div key={doc.id} className="p-4 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE] flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#B0D0EA] text-[#17324A] flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white text-[#5F7180] border border-[#D9E5EE]">
                        {doc.category}
                      </span>
                      <h4 className="text-xs font-bold text-[#17324A] truncate">{doc.title}</h4>
                      <p className="text-[11px] text-[#5F7180] font-mono truncate">{doc.fileName} • {doc.fileSize}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => alert(`Downloading personal file: ${doc.fileName}`)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-[#D9E5EE] text-[#17324A] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" /> PDF
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#B0D0EA] shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#D9E5EE] pb-3">
              <h3 className="text-base font-bold text-[#17324A]">Upload Personal Credential</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="p-1 rounded-lg hover:bg-[#F5F9FC] text-[#5F7180]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#17324A] mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Passport / Degree Certificate"
                  className="w-full p-2.5 rounded-xl border border-[#D9E5EE] bg-[#F5F9FC] text-xs font-semibold focus:outline-none focus:border-[#17324A]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#17324A] mb-1">Category</label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-[#D9E5EE] bg-[#F5F9FC] text-xs font-semibold focus:outline-none focus:border-[#17324A]"
                >
                  <option value="Identity">Identity Proof</option>
                  <option value="Education">Education & Degree</option>
                  <option value="Experience">Experience Letter</option>
                  <option value="Tax & Finance">Tax & Finance (Form 16)</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {uploadSuccess ? (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-center font-bold">
                  ✓ Document Uploaded & Queued for Verification!
                </div>
              ) : (
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#17324A] text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  Upload & Save
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
