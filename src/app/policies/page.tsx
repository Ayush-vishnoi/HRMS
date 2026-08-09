'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  FileText,
  ShieldCheck,
  Download,
  CheckCircle2,
  AlertCircle,
  Building2,
  Clock,
  Briefcase,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Crown,
  Check,
} from 'lucide-react';
import { useHRMS } from '@/context/HRMSContext';
import { PolicyDocument } from '@/data/mockData';

interface PolicyItem {
  id: string;
  title: string;
  category: 'Governance' | 'Workplace' | 'Compensation' | 'Security';
  version: string;
  lastUpdated: string;
  summary: string;
  highlights: string[];
}

const COMPANY_POLICIES: PolicyItem[] = [
  {
    id: 'POL-001',
    title: 'Attendance, Shifts & 60-Min Grace Period Policy',
    category: 'Workplace',
    version: 'v4.2',
    lastUpdated: '01 Aug 2026',
    summary: 'Standard general shift hours are 09:00 AM to 06:00 PM. Clock-in is strictly permitted between 09:00 AM and 10:00 AM with a 60-minute grace period allowance. Late check-ins after 10:00 AM mandate formal manager approval.',
    highlights: [
      'Shift window: 09:00 AM - 06:00 PM with 60-min grace period.',
      'Clock-in between 09:00 AM and 10:00 AM.',
      'Late check-in past 10:00 AM requires mandatory reason submitted to manager.',
      'Shift automatically concludes with auto-logout after 9 hours of logged work time.',
    ],
  },
  {
    id: 'POL-002',
    title: 'Code of Business Conduct & Ethics',
    category: 'Governance',
    version: 'v3.1',
    lastUpdated: '15 Jan 2026',
    summary: 'Apex Enterprise standards on professional integrity, non-discrimination, confidentiality of company information, and intellectual property protection.',
    highlights: [
      'Zero tolerance for workplace discrimination, harassment, or conflicts of interest.',
      'Confidentiality of proprietary source code and client datasets.',
      'Whistleblower protection and open-door reporting mechanisms.',
    ],
  },
  {
    id: 'POL-003',
    title: 'POSH (Prevention of Sexual Harassment) Policy',
    category: 'Workplace',
    version: 'v5.0',
    lastUpdated: '10 Feb 2026',
    summary: 'Comprehensive guidelines establishing an Internal Complaints Committee (ICC) ensuring a safe, respectful, and inclusive working environment for all employees.',
    highlights: [
      'Dedicated ICC presiding over complaints with strict confidentiality.',
      'Periodic mandatory sensitization and awareness workshops.',
      'Fair, unbiased, and time-bound inquiry procedures.',
    ],
  },
  {
    id: 'POL-004',
    title: 'Information Security & IT Acceptable Use Policy',
    category: 'Security',
    version: 'v2.8',
    lastUpdated: '20 Jun 2026',
    summary: 'Rules governing the use of organization-issued hardware, secure VPN access, multi-factor authentication (MFA), and data encryption standards.',
    highlights: [
      'Mandatory MFA on all organizational SSO logins.',
      'Prohibition of unauthorized external data transfer or USB storage devices.',
      'Regular automated endpoint patch management and security audits.',
    ],
  },
  {
    id: 'POL-005',
    title: 'Leave & Time-Off Comprehensive Guidelines',
    category: 'Compensation',
    version: 'v3.4',
    lastUpdated: '01 May 2026',
    summary: 'Entitlement structure for Casual Leaves (12), Sick Leaves (10), Earned Privilege Leaves (20), and Work-From-Home allowances (12 days/yr).',
    highlights: [
      'Casual and Sick leaves accrue monthly and reset annually.',
      'Earned leaves can be accumulated up to a maximum of 45 days.',
      'Manager pre-approval required for leaves exceeding 2 consecutive working days.',
    ],
  },
  {
    id: 'POL-006',
    title: 'Travel, Meal & Business Expense Reimbursement',
    category: 'Compensation',
    version: 'v2.1',
    lastUpdated: '12 Mar 2026',
    summary: 'Allowances and claims workflow for business travel, client entertainment, and mobile/internet allowance reimbursement.',
    highlights: [
      'Economy tier travel for domestic flights and standard corporate hotel accommodations.',
      'Expense claims must be submitted within 30 days accompanied by GST tax invoices.',
      'Direct credit to registered employee bank account upon finance team sign-off.',
    ],
  },
];

export default function PoliciesPage() {
  const { currentUser, policies, updatePolicyStatus } = useHRMS();
  const isCeo = currentUser.userRole === 'ceo' || currentUser.userRole === 'admin';

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activePolicy, setActivePolicy] = useState<PolicyItem | null>(null);

  const categories = ['All', 'Workplace', 'Governance', 'Security', 'Compensation'];

  const filteredPolicies = COMPANY_POLICIES.filter((policy) => {
    if (selectedCategory === 'All') return true;
    return policy.category === selectedCategory;
  });

  return (
    <div className="space-y-6 select-none">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-[#17324A]">
              Company Policies & Governance
            </h1>
            {isCeo && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                <Crown className="w-3 h-3 text-purple-700" />
                CEO Governance Portal
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[#667085]">
            Official corporate policies, approval lifecycles, compliance frameworks, and statutory reports
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => alert('Downloading Complete Employee Policy Handbook (PDF)...')}
            className="px-4 py-2.5 rounded-xl bg-[#B0D0EA] hover:bg-[#9FC5E2] text-[#17324A] border border-[#9FC5E2] text-xs font-bold shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download Policy Handbook (PDF)
          </button>
        </div>
      </div>

      {/* CEO POLICY APPROVAL WORKFLOW SECTION */}
      {isCeo && (
        <div className="p-6 rounded-2xl bg-white border border-[#B0D0EA] shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#17324A] flex items-center gap-2">
                <Crown className="w-4 h-4 text-purple-700" />
                Policy Lifecycle & Executive Approval Pipeline
              </h3>
              <p className="text-xs text-[#5F7180]">
                Workflow: Draft → HR Review → Legal Review → CEO Executive Approval → Published
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#D9E5EE] text-[#5F7180] uppercase tracking-wider font-bold text-[10px] bg-[#F5F9FC]">
                  <th className="py-3 px-4 rounded-l-xl">Policy Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Last Updated</th>
                  <th className="py-3 px-4">Workflow Status</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAF2F8]">
                {policies.map((pol) => (
                  <tr key={pol.id} className="hover:bg-[#F5F9FC]">
                    <td className="py-3.5 px-4 font-bold text-[#17324A]">
                      <div>
                        <span className="block font-black text-xs text-[#17324A]">{pol.title}</span>
                        <span className="text-[10px] text-[#5F7180] truncate max-w-xs block">{pol.summary}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#17324A]">{pol.category}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#17324A]">{pol.version}</td>
                    <td className="py-3.5 px-4 text-[#5F7180]">{pol.owner}</td>
                    <td className="py-3.5 px-4 text-[#5F7180]">{pol.lastUpdated}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                          pol.status === 'Published'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : pol.status === 'CEO Approval'
                            ? 'bg-purple-100 text-purple-800 border-purple-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}
                      >
                        {pol.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {pol.status === 'CEO Approval' ? (
                        <button
                          onClick={() => updatePolicyStatus(pol.id, 'Published')}
                          className="px-3.5 py-1.5 rounded-lg bg-[#17324A] hover:bg-[#234B68] text-white font-bold text-[11px] shadow-xs cursor-pointer flex items-center gap-1 ml-auto"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve & Publish
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#5F7180] font-medium">No action required</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#D9E5EE] shadow-md">
          <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">Active Policies</span>
          <div className="text-2xl font-black text-[#17324A] mt-2">6 Handbooks</div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">• Q3 2026 Updated</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#D9E5EE] shadow-md">
          <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">Grace Period Allowance</span>
          <div className="text-2xl font-black text-[#17324A] mt-2">60 Minutes</div>
          <span className="text-[11px] text-[#667085] mt-1 block">09:00 AM - 10:00 AM Window</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#D9E5EE] shadow-md">
          <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">Policy Acknowledgment</span>
          <div className="text-2xl font-black text-emerald-600 mt-2">100% Signed</div>
          <span className="text-[11px] text-[#667085] mt-1 block">By {currentUser.name}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#D9E5EE] shadow-md">
          <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">Compliance Score</span>
          <div className="text-2xl font-black text-[#17324A] mt-2">99.2%</div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">• ISO 27001 & SOC2</span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedCategory === cat
                ? 'bg-[#17324A] text-white shadow-sm'
                : 'bg-white border border-[#D9E5EE] text-[#5F7180] hover:bg-[#F5F9FC] hover:text-[#17324A]'
            }`}
          >
            {cat} {cat !== 'All' && 'Policies'}
          </button>
        ))}
      </div>

      {/* Policy Handbook Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPolicies.map((policy) => (
          <div
            key={policy.id}
            className="p-5 rounded-2xl bg-white border border-[#D9E5EE] shadow-md flex flex-col justify-between space-y-4 hover:border-[#B0D0EA] transition-all"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#B0D0EA] text-[#17324A] border border-[#9FC5E2]">
                  {policy.category} • {policy.version}
                </span>
                <span className="text-[10px] text-[#8C9CA8]">Updated {policy.lastUpdated}</span>
              </div>

              <h3 className="text-sm font-bold text-[#17324A]">{policy.title}</h3>
              <p className="text-xs text-[#5F7180] leading-relaxed">{policy.summary}</p>

              <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE] space-y-1.5 mt-2">
                <span className="text-[10px] uppercase font-bold text-[#17324A] block">Key Clauses & Standards:</span>
                <ul className="space-y-1 text-[11px] text-[#5F7180]">
                  {policy.highlights.map((h, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-[#17324A] font-bold">•</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
