'use client';

import React, { useMemo, useState } from 'react';
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
import { useHRMS } from '@/context/HRMSContext';

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

const INITIAL_POLICIES: Policy[] = [
  {
    id: 'POL-001',
    title: 'Code of Conduct and Ethics',
    summary: 'Standards for professional conduct, conflicts of interest, and responsible decision-making at MYLOTIC GROUP PVT.LTD.',
    category: 'Code of Conduct',
    version: 'v3.2',
    effectiveDate: '01 Aug 2026',
    updatedOn: '01 Aug 2026',
    uploadedBy: 'HR Operations',
    mandatory: true,
    acknowledgementRequired: true,
    acknowledged: true,
    acknowledgedOn: '04 Aug 2026',
    fileName: 'code-of-conduct-v3.2.pdf',
    fileSize: '1.2 MB',
  },
  {
    id: 'POL-002',
    title: 'Leave and Attendance Policy',
    summary: 'Guidance on working hours, attendance, leave types, late arrival permissions, and attendance corrections.',
    category: 'Leave & Attendance',
    version: 'v2.4',
    effectiveDate: '15 Jul 2026',
    updatedOn: '15 Jul 2026',
    uploadedBy: 'HR Operations',
    mandatory: true,
    acknowledgementRequired: true,
    acknowledged: false,
    fileName: 'leave-attendance-policy-v2.4.pdf',
    fileSize: '980 KB',
  },
  {
    id: 'POL-003',
    title: 'Information Security and Acceptable Use',
    summary: 'Protect company information, devices, credentials, and customer data while working from any location.',
    category: 'Information Security',
    version: 'v4.1',
    effectiveDate: '01 Jun 2026',
    updatedOn: '01 Jun 2026',
    uploadedBy: 'IT & HR',
    mandatory: true,
    acknowledgementRequired: true,
    acknowledged: true,
    acknowledgedOn: '03 Jun 2026',
    fileName: 'information-security-v4.1.pdf',
    fileSize: '2.4 MB',
  },
  {
    id: 'POL-004',
    title: 'Prevention of Sexual Harassment',
    summary: 'A safe workplace commitment covering prohibited conduct, reporting channels, and committee support.',
    category: 'Anti-Harassment',
    version: 'v2.0',
    effectiveDate: '01 Apr 2026',
    updatedOn: '01 Apr 2026',
    uploadedBy: 'HR Compliance',
    mandatory: true,
    acknowledgementRequired: true,
    acknowledged: false,
    fileName: 'posh-policy-v2.0.pdf',
    fileSize: '1.5 MB',
  },
  {
    id: 'POL-005',
    title: 'Remote Work Guidelines',
    summary: 'Expectations for remote work, availability, secure connectivity, and collaboration across distributed teams.',
    category: 'Remote Work',
    version: 'v1.3',
    effectiveDate: '10 May 2026',
    updatedOn: '10 May 2026',
    uploadedBy: 'People Experience',
    mandatory: false,
    acknowledgementRequired: false,
    acknowledged: false,
    fileName: 'remote-work-guidelines-v1.3.pdf',
    fileSize: '760 KB',
  },
];

const inputClass = 'w-full rounded-lg border border-[#9FC2DC] bg-white px-3 py-2 text-sm text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA]';

export default function PoliciesPage() {
  const { currentUser } = useHRMS();
  const isHR = currentUser.userRole === 'admin';
  const isEmployee = currentUser.userRole === 'employee';
  const [policies, setPolicies] = useState<Policy[]>(INITIAL_POLICIES);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All categories');
  const [status, setStatus] = useState('All statuses');
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [notice, setNotice] = useState('');
  const [title, setTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<PolicyCategory>('Code of Conduct');
  const [version, setVersion] = useState('v1.0');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [summary, setSummary] = useState('');

  const filteredPolicies = useMemo(() => policies.filter((policy) => {
    const matchesSearch = `${policy.title} ${policy.category} ${policy.summary}`.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All categories' || policy.category === category;
    const matchesStatus = status === 'All statuses' || (status === 'Acknowledged' ? policy.acknowledged : !policy.acknowledged);
    return matchesSearch && matchesCategory && matchesStatus;
  }), [policies, search, category, status]);

  const acknowledge = (policyId: string) => {
    setPolicies((current) => current.map((policy) => policy.id === policyId ? { ...policy, acknowledged: true, acknowledgedOn: '09 Aug 2026' } : policy));
    setSelectedPolicy((current) => current ? { ...current, acknowledged: true, acknowledgedOn: '09 Aug 2026' } : current);
    setNotice('Policy acknowledgement recorded successfully.');
  };

  const publishPolicy = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const file = (event.currentTarget.elements.namedItem('policy-file') as HTMLInputElement | null)?.files?.[0];
    if (!file || !title.trim() || !effectiveDate || !summary.trim()) return;
    const newPolicy: Policy = {
      id: `POL-${String(policies.length + 1).padStart(3, '0')}`,
      title: title.trim(), summary: summary.trim(), category: uploadCategory, version: version.trim() || 'v1.0',
      effectiveDate: new Date(`${effectiveDate}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      updatedOn: '09 Aug 2026', uploadedBy: currentUser.name, mandatory: true, acknowledgementRequired: true,
      acknowledged: false, fileName: file.name, fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
    };
    setPolicies((current) => [newPolicy, ...current]);
    setShowUpload(false); setTitle(''); setVersion('v1.0'); setEffectiveDate(''); setSummary('');
    setNotice('Updated policy published and made available for employee acknowledgement.');
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#5B91B5]"><BookOpenCheck className="h-4 w-4" /> Governance & compliance</div>
          <h1 className="text-2xl font-black tracking-tight text-[#17324A]">Policy Center</h1>
          <p className="mt-1 text-sm text-[#667085]">Find the latest company policies, review changes, and keep your acknowledgements up to date.</p>
        </div>
        {isHR && <button onClick={() => setShowUpload(true)} className="flex items-center justify-center gap-2 rounded-xl bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#244A68]"><UploadCloud className="h-4 w-4" /> Upload Updated Policy</button>}
      </header>

      {notice && <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss notification"><X className="h-4 w-4" /></button></div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Current policies" value={String(policies.length)} detail="Published and effective" icon={ShieldCheck} />
        <Stat label={isEmployee ? 'Needs acknowledgement' : 'Awaiting acknowledgement'} value={String(policies.filter((policy) => policy.acknowledgementRequired && !policy.acknowledged).length)} detail={isEmployee ? 'Requires your review' : 'Employee action pending'} icon={Clock3} />
        <Stat label="Latest update" value="09 Aug 2026" detail="Policy library refreshed" icon={History} />
      </div>

      <section className="rounded-2xl border border-[#D9E5EE] bg-white p-5 shadow-md">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div><h2 className="flex items-center gap-2 text-sm font-bold text-[#17324A]"><FileText className="h-4 w-4" /> Active policy library</h2><p className="mt-1 text-xs text-[#667085]">All documents shown below are the latest published versions.</p></div>
          <div className="flex flex-wrap gap-2"><label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-[#667085]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search policies" className="rounded-lg border border-[#9FC2DC] py-2 pl-9 pr-3 text-xs text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA]" /></label><select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs text-[#17324A]"><option>All categories</option>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs text-[#17324A]"><option>All statuses</option><option>Acknowledged</option><option>Pending</option></select></div>
        </div>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead><tr className="border-b border-[#D9E5EE] bg-[#EAF2F8] text-[#667085]"><th className="px-4 py-3">Policy</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Version</th><th className="px-4 py-3">Effective</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-[#D9E5EE]">{filteredPolicies.map((policy) => <tr key={policy.id} className="hover:bg-[#F5F9FC]"><td className="px-4 py-3"><button onClick={() => setSelectedPolicy(policy)} className="text-left font-bold text-[#17324A] hover:text-[#5B91B5]">{policy.title}<p className="mt-1 text-[10px] font-normal text-[#667085]">{policy.id} · Updated {policy.updatedOn}</p></button></td><td className="px-4 py-3 text-[#667085]"><span className="flex items-center gap-1"><Tag className="h-3 w-3" />{policy.category}</span></td><td className="px-4 py-3 font-bold text-[#17324A]">{policy.version}</td><td className="px-4 py-3 text-[#667085]">{policy.effectiveDate}</td><td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${policy.acknowledged ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : policy.acknowledgementRequired ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{policy.acknowledged ? 'Acknowledged' : policy.acknowledgementRequired ? 'Pending review' : 'Informational'}</span></td><td className="px-4 py-3 text-right"><button onClick={() => setSelectedPolicy(policy)} className="rounded-lg border border-[#D9E5EE] px-3 py-1.5 text-[10px] font-bold text-[#17324A] hover:bg-[#EAF2F8]">View policy</button></td></tr>)}</tbody></table>{filteredPolicies.length === 0 && <div className="flex flex-col items-center gap-2 py-10 text-center text-xs text-[#667085]"><Filter className="h-5 w-5" />No policies match your filters.</div>}</div>
      </section>

      {selectedPolicy && <Modal title={selectedPolicy.title} onClose={() => setSelectedPolicy(null)}><div className="space-y-4"><div className="flex flex-wrap gap-2 text-[10px] font-bold"><span className="rounded-full bg-[#EAF2F8] px-2.5 py-1 text-[#17324A]">{selectedPolicy.category}</span><span className="rounded-full bg-[#EAF2F8] px-2.5 py-1 text-[#17324A]">{selectedPolicy.version}</span>{selectedPolicy.mandatory && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">Mandatory</span>}</div><p className="text-sm leading-6 text-[#667085]">{selectedPolicy.summary}</p><div className="grid grid-cols-2 gap-3 rounded-xl bg-[#F5F9FC] p-3 text-xs"><Info label="Effective from" value={selectedPolicy.effectiveDate} /><Info label="Last updated" value={selectedPolicy.updatedOn} /><Info label="Published by" value={selectedPolicy.uploadedBy} /><Info label="File" value={`${selectedPolicy.fileName} (${selectedPolicy.fileSize})`} /></div><button className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#9FC2DC] px-4 py-2.5 text-xs font-bold text-[#17324A] hover:bg-[#EAF2F8]"><Download className="h-4 w-4" /> Download policy</button>{isEmployee && selectedPolicy.acknowledgementRequired && (selectedPolicy.acknowledged ? <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Acknowledged on {selectedPolicy.acknowledgedOn}</div> : <button onClick={() => acknowledge(selectedPolicy.id)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#244A68]"><CheckCircle2 className="h-4 w-4" /> I have read and acknowledge</button>)}</div></Modal>}
      {isHR && showUpload && <Modal title="Publish updated policy" onClose={() => setShowUpload(false)}><form onSubmit={publishPolicy} className="space-y-4"><Field label="Policy title"><input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Expense and Travel Policy" className={inputClass} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Category"><select value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value as PolicyCategory)} className={inputClass}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Version"><input required value={version} onChange={(event) => setVersion(event.target.value)} className={inputClass} /></Field></div><Field label="Effective date"><input required type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} className={inputClass} /></Field><Field label="Summary of changes"><textarea required rows={4} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Explain what this policy covers or what changed..." className={`${inputClass} resize-none`} /></Field><Field label="Policy file"><input required id="policy-file" name="policy-file" type="file" accept=".pdf,.doc,.docx" className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-[#EAF2F8] file:px-2 file:py-1 file:text-xs file:font-bold`} /></Field><p className="text-[11px] text-[#667085]">Publishing creates a current version and requests acknowledgement from employees.</p><button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#244A68]"><Send className="h-4 w-4" /> Publish updated policy</button></form></Modal>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-bold text-[#17324A]">{label}<span className="mt-1 block">{children}</span></label>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] text-[#667085]">{label}</p><p className="mt-1 break-words font-bold text-[#17324A]">{value}</p></div>; }
function Stat({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: React.ElementType }) { return <div className="rounded-2xl border border-[#D9E5EE] bg-white p-4 shadow-md"><div className="flex items-start justify-between"><span className="text-xs font-bold uppercase tracking-wider text-[#667085]">{label}</span><span className="rounded-lg bg-[#EAF2F8] p-2 text-[#17324A]"><Icon className="h-4 w-4" /></span></div><p className="mt-2 text-2xl font-black text-[#17324A]">{value}</p><p className="mt-1 text-[11px] text-[#667085]">{detail}</p></div>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-black text-[#17324A]">{title}</h2><button onClick={onClose} aria-label={`Close ${title}`} className="rounded-lg p-2 text-[#667085] hover:bg-[#EAF2F8]"><X className="h-5 w-5" /></button></div>{children}</div></div>; }
