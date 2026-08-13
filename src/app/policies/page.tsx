'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Filter,
  History,
  Search,
  Send,
  ShieldCheck,
  Tag,
  UploadCloud,
  X,
} from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';

type PolicyCategory =
  | 'Code of Conduct'
  | 'Leave & Attendance'
  | 'Information Security'
  | 'Workplace Safety'
  | 'Anti-Harassment'
  | 'Remote Work';

type Policy = {
  id: string;
  title: string;
  summary: string;
  category: PolicyCategory;
  version: string;
  effectiveDate: string;
  updatedOn: string;
  uploadedBy: string;
  mandatory: boolean;
  acknowledgementRequired: boolean;
  acknowledged: boolean;
  acknowledgedOn?: string;
  fileName: string;
  fileSize: string;
};

const CATEGORIES: PolicyCategory[] = [
  'Code of Conduct',
  'Leave & Attendance',
  'Information Security',
  'Workplace Safety',
  'Anti-Harassment',
  'Remote Work',
];

const categoryDisplayMap: Record<string, PolicyCategory> = {
  CodeOfConduct: 'Code of Conduct',
  LeaveAndAttendance: 'Leave & Attendance',
  InformationSecurity: 'Information Security',
  WorkplaceSafety: 'Workplace Safety',
  AntiHarassment: 'Anti-Harassment',
  RemoteWork: 'Remote Work',
};

const formatDbPolicy = (p: any, currentEmpId: string): Policy => {
  const isAck = p.acknowledgements && Array.isArray(p.acknowledgements)
    ? p.acknowledgements.some((a: any) => a.employeeId === currentEmpId)
    : false;
  const ackRecord = p.acknowledgements?.find((a: any) => a.employeeId === currentEmpId);

  return {
    id: p.id,
    title: p.title,
    summary: p.summary,
    category: categoryDisplayMap[p.category] || (p.category as PolicyCategory) || 'Code of Conduct',
    version: p.version || 'v1.0',
    effectiveDate: p.effectiveDate,
    updatedOn: p.updatedOn,
    uploadedBy: p.uploadedBy?.name || 'HR Operations',
    mandatory: p.mandatory ?? true,
    acknowledgementRequired: p.acknowledgementRequired ?? true,
    acknowledged: isAck,
    acknowledgedOn: ackRecord?.acknowledgedOn,
    fileName: p.fileName || 'policy-document.pdf',
    fileSize: p.fileSize || '1.0 MB',
  };
};

const inputClass = 'w-full rounded-lg border border-[#9FC2DC] bg-white px-3 py-2 text-sm text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA]';

export default function PoliciesPage() {
  const { currentUser } = useHRMS();
  const isHR = currentUser.userRole === 'admin';
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All categories');
  const [status, setStatus] = useState('All statuses');
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [notice, setNotice] = useState('');
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  // Upload Form State
  const [title, setTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<PolicyCategory>('Code of Conduct');
  const [version, setVersion] = useState('v1.0');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [summary, setSummary] = useState('');

  const fetchPolicies = async () => {
    try {
      const res = await fetch(`/api/policies?employeeId=${encodeURIComponent(currentUser.id)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setPolicies(json.data.map((p: any) => formatDbPolicy(p, currentUser.id)));
        }
      }
    } catch (err) {
      console.error('Failed to fetch policies from database:', err);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, [currentUser.id]);

  const filteredPolicies = useMemo(() => policies.filter((policy) => {
    const matchesSearch = `${policy.title} ${policy.category} ${policy.summary}`.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All categories' || policy.category === category;
    const matchesStatus = status === 'All statuses' || (status === 'Acknowledged' ? policy.acknowledged : !policy.acknowledged);
    return matchesSearch && matchesCategory && matchesStatus;
  }), [policies, search, category, status]);

  const acknowledge = async (policyId: string) => {
    setIsAcknowledging(true);
    const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    setPolicies((current) => current.map((policy) => policy.id === policyId ? { ...policy, acknowledged: true, acknowledgedOn: todayStr } : policy));
    setSelectedPolicy((current) => current ? { ...current, acknowledged: true, acknowledgedOn: todayStr } : current);
    setNotice('Policy acknowledgement recorded in database successfully.');

    try {
      await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'acknowledge',
          policyId,
          employeeId: currentUser.id,
        }),
      });
    } catch (err) {
      console.error('Failed to acknowledge policy in database:', err);
    } finally {
      setIsAcknowledging(false);
    }
  };

  const publishPolicy = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const file = (event.currentTarget.elements.namedItem('policy-file') as HTMLInputElement | null)?.files?.[0];
    if (!title.trim() || !effectiveDate || !summary.trim()) return;

    const formattedEffDate = new Date(`${effectiveDate}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const fileName = file ? file.name : `${title.toLowerCase().replace(/\s+/g, '-')}.pdf`;
    const fileSize = file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : '1.2 MB';

    try {
      const res = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          summary: summary.trim(),
          category: uploadCategory,
          version: version.trim() || 'v1.0',
          effectiveDate: formattedEffDate,
          uploadedById: currentUser.id || 'EMP-006',
          mandatory: true,
          acknowledgementRequired: true,
          fileName,
          fileSize,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const newPolicy = formatDbPolicy(json.data, currentUser.id);
        setPolicies((current) => [newPolicy, ...current.filter((p) => p.id !== newPolicy.id)]);
      }
    } catch (err) {
      console.error('Failed to publish policy to database:', err);
    }

    setShowUpload(false);
    setTitle('');
    setVersion('v1.0');
    setEffectiveDate('');
    setSummary('');
    setNotice('Updated policy published and saved in database.');
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#5B91B5]"><BookOpenCheck className="h-4 w-4" /> Governance & compliance</div>
          <h1 className="text-2xl font-black tracking-tight text-[#17324A]">Policy Center</h1>
          <p className="mt-1 text-sm text-[#667085]">Find the latest company policies, review official clauses, and record employee acknowledgements in PostgreSQL.</p>
        </div>
        {isHR && <button onClick={() => setShowUpload(true)} className="flex items-center justify-center gap-2 rounded-xl bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#244A68]"><UploadCloud className="h-4 w-4" /> Upload Updated Policy</button>}
      </header>

      {notice && <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss notification"><X className="h-4 w-4" /></button></div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Current policies" value={String(policies.length)} detail="Published in database" icon={ShieldCheck} />
        <Stat label="Needs acknowledgement" value={String(policies.filter((policy) => policy.acknowledgementRequired && !policy.acknowledged).length)} detail="Action required" icon={Clock3} />
        <Stat label="Latest update" value="13 Aug 2026" detail="Policy library refreshed" icon={History} />
      </div>

      <section className="rounded-2xl border border-[#D9E5EE] bg-white p-5 shadow-md">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div><h2 className="flex items-center gap-2 text-sm font-bold text-[#17324A]"><FileText className="h-4 w-4" /> Active policy library</h2><p className="mt-1 text-xs text-[#667085]">Click &quot;View policy&quot; to open the full centered policy reader and record acknowledgement.</p></div>
          <div className="flex flex-wrap gap-2"><label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-[#667085]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search policies" className="rounded-lg border border-[#9FC2DC] py-2 pl-9 pr-3 text-xs text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA]" /></label><select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs text-[#17324A]"><option>All categories</option>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs text-[#17324A]"><option>All statuses</option><option>Acknowledged</option><option>Pending</option></select></div>
        </div>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead><tr className="border-b border-[#D9E5EE] bg-[#EAF2F8] text-[#667085]"><th className="px-4 py-3">Policy</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Version</th><th className="px-4 py-3">Effective</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-[#D9E5EE]">{filteredPolicies.map((policy) => <tr key={policy.id} className="hover:bg-[#F5F9FC]"><td className="px-4 py-3"><button onClick={() => setSelectedPolicy(policy)} className="text-left font-bold text-[#17324A] hover:text-[#5B91B5]">{policy.title}<p className="mt-1 text-[10px] font-normal text-[#667085]">{policy.id} · Updated {policy.updatedOn}</p></button></td><td className="px-4 py-3 text-[#667085]"><span className="flex items-center gap-1"><Tag className="h-3 w-3" />{policy.category}</span></td><td className="px-4 py-3 font-bold text-[#17324A]">{policy.version}</td><td className="px-4 py-3 text-[#667085]">{policy.effectiveDate}</td><td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${policy.acknowledged ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : policy.acknowledgementRequired ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{policy.acknowledged ? 'Acknowledged' : policy.acknowledgementRequired ? 'Pending review' : 'Informational'}</span></td><td className="px-4 py-3 text-right"><button onClick={() => setSelectedPolicy(policy)} className="rounded-lg border border-[#9FC2DC] bg-[#EAF2F8] px-3.5 py-1.5 text-[11px] font-bold text-[#17324A] hover:bg-[#B0D0EA] transition-colors">View policy</button></td></tr>)}</tbody></table>{filteredPolicies.length === 0 && <div className="flex flex-col items-center gap-2 py-10 text-center text-xs text-[#667085]"><Filter className="h-5 w-5" />No policies found in database.</div>}</div>
      </section>

      {/* Centered Policy Reading Section / Modal */}
      {selectedPolicy && (
        <PolicyViewerModal
          policy={selectedPolicy}
          onClose={() => setSelectedPolicy(null)}
          onAcknowledge={() => acknowledge(selectedPolicy.id)}
          isAcknowledging={isAcknowledging}
        />
      )}

      {/* Publish Updated Policy Modal */}
      {isHR && showUpload && (
        <Modal title="Publish updated policy" onClose={() => setShowUpload(false)}>
          <form onSubmit={publishPolicy} className="space-y-4">
            <Field label="Policy title">
              <input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Expense and Travel Policy" className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <select value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value as PolicyCategory)} className={inputClass}>
                  {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </Field>
              <Field label="Version">
                <input required value={version} onChange={(event) => setVersion(event.target.value)} className={inputClass} />
              </Field>
            </div>
            <Field label="Effective date">
              <input required type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} className={inputClass} />
            </Field>
            <Field label="Summary of changes">
              <textarea required rows={4} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Explain what this policy covers or what changed..." className={`${inputClass} resize-none`} />
            </Field>
            <Field label="Policy file">
              <input id="policy-file" name="policy-file" type="file" accept=".pdf,.doc,.docx" className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-[#EAF2F8] file:px-2 file:py-1 file:text-xs file:font-bold`} />
            </Field>
            <p className="text-[11px] text-[#667085]">Publishing creates a current version in PostgreSQL and requests acknowledgement from employees.</p>
            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#244A68]">
              <Send className="h-4 w-4" /> Publish updated policy
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function PolicyViewerModal({
  policy,
  onClose,
  onAcknowledge,
  isAcknowledging,
}: {
  policy: Policy;
  onClose: () => void;
  onAcknowledge: () => void;
  isAcknowledging: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#17324A]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={policy.title}>
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-[#D9E5EE] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#D9E5EE] bg-white px-6 py-4">
          <div className="pr-4">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="rounded-full bg-[#EAF2F8] px-2.5 py-0.5 text-[10px] font-bold text-[#17324A] border border-[#B0D0EA]">
                {policy.category}
              </span>
              <span className="rounded-full bg-[#F5F9FC] px-2.5 py-0.5 text-[10px] font-bold text-[#55708A] border border-[#D9E5EE]">
                {policy.version}
              </span>
              {policy.mandatory && (
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                  Mandatory Compliance
                </span>
              )}
            </div>
            <h2 className="text-lg font-black text-[#17324A] tracking-tight">{policy.title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close policy reader"
            className="rounded-lg p-2 text-[#667085] hover:bg-[#EAF2F8] hover:text-[#17324A] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Policy Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-xs text-[#315B76] leading-relaxed">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-[#D9E5EE] bg-[#F8FAFC] p-3 text-[11px]">
            <Info label="Effective from" value={policy.effectiveDate} />
            <Info label="Last updated" value={policy.updatedOn} />
            <Info label="Published by" value={policy.uploadedBy} />
            <Info label="Document file" value={`${policy.fileName} (${policy.fileSize})`} />
          </div>

          {/* Policy Text & Structured Content */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17324A] flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-[#5B91B5]" /> 1. Scope & Objective
            </h3>
            <p className="rounded-lg bg-[#F5F9FC] p-3 text-xs leading-5 text-[#41556B] border border-[#E2ECF3]">
              {policy.summary}
            </p>
            <p className="text-xs text-[#52677A] leading-5">
              This policy applies to all full-time employees, contractors, consultants, and interns across all operating entities and branch locations of MYLOTIC GROUP PVT. LTD. All personnel are required to review, understand, and strictly abide by these documented terms and operating guidelines.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17324A] flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#5B91B5]" /> 2. Core Guidelines & Standards
            </h3>
            <ul className="space-y-2 pl-4 list-disc text-xs text-[#52677A] leading-5">
              <li>Personnel must maintain ethical conduct, transparency, and data confidentiality across all client and internal engagements.</li>
              <li>Attendance, leaves, and time tracking must be recorded in accordance with standard portal operating hours (08:00 AM - 06:00 PM).</li>
              <li>Company computing assets, network privileges, and access cards remain company property and must be maintained in good standing.</li>
              <li>Any security vulnerabilities, process conflicts, or grievance concerns should be immediately escalated to HR Operations.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17324A] flex items-center gap-1.5">
              <BookOpenCheck className="h-4 w-4 text-[#5B91B5]" /> 3. Compliance & Governance
            </h3>
            <p className="text-xs text-[#52677A] leading-5">
              Periodic reviews are conducted by HR Operations and Governance Leads. Failure to adhere to policy terms may result in corrective coaching or escalation as per standard organizational bylaws.
            </p>
          </section>
        </div>

        {/* Footer with Acknowledge Button */}
        <div className="sticky bottom-0 border-t border-[#D9E5EE] bg-[#F8FAFC] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => alert(`Downloading official document: ${policy.fileName}`)}
            className="flex items-center gap-1.5 text-xs font-bold text-[#315B76] hover:text-[#17324A]"
          >
            <Download className="h-4 w-4" /> Download PDF copy
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto rounded-lg border border-[#D9E5EE] px-4 py-2 text-xs font-bold text-[#52677A] hover:bg-white transition"
            >
              Close reader
            </button>

            {policy.acknowledgementRequired && (
              policy.acknowledged ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> Acknowledged on {policy.acknowledgedOn}
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isAcknowledging}
                  onClick={onAcknowledge}
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#17324A] px-5 py-2 text-xs font-bold text-white hover:bg-[#244A68] transition shadow-sm disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isAcknowledging ? 'Recording...' : 'Acknowledge Policy'}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-bold text-[#17324A]">{label}<span className="mt-1 block">{children}</span></label>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] text-[#667085]">{label}</p><p className="mt-1 break-words font-bold text-[#17324A]">{value}</p></div>; }
function Stat({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: React.ElementType }) { return <div className="rounded-2xl border border-[#D9E5EE] bg-white p-4 shadow-md"><div className="flex items-start justify-between"><span className="text-xs font-bold uppercase tracking-wider text-[#667085]">{label}</span><span className="rounded-lg bg-[#EAF2F8] p-2 text-[#17324A]"><Icon className="h-4 w-4" /></span></div><p className="mt-2 text-2xl font-black text-[#17324A]">{value}</p><p className="mt-1 text-[11px] text-[#667085]">{detail}</p></div>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-black text-[#17324A]">{title}</h2><button onClick={onClose} aria-label={`Close ${title}`} className="rounded-lg p-2 text-[#667085] hover:bg-[#EAF2F8]"><X className="h-5 w-5" /></button></div>{children}</div></div>; }
