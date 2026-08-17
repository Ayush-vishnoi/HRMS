'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Heart,
  HeartHandshake,
  Hospital,
  Plus,
  Shield,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';

type BenefitPlan = {
  id: string;
  name: string;
  planType: string;
  provider: string;
  coverageAmount: number;
  annualPremium: number;
  companyContribution: number;
  employeeContribution: number;
  description: string;
  isActive: boolean;
};

type BenefitDependent = {
  id: string;
  name: string;
  relationship: string;
  dateOfBirth: string;
  gender: string;
};

type BenefitClaim = {
  id: string;
  claimType: string;
  claimAmount: number;
  hospital: string;
  incidentDate: string;
  status: string;
  settledAmount?: number | null;
  createdAt: string;
};

type Enrollment = {
  id: string;
  employeeId: string;
  benefitPlanId: string;
  enrollmentDate: string;
  coverageStartDate: string;
  coverageEndDate: string;
  status: string;
  plan: BenefitPlan;
  dependents: BenefitDependent[];
  claims: BenefitClaim[];
};

export default function BenefitsPage() {
  const { currentUser } = useHRMS();
  const [plans, setPlans] = useState<BenefitPlan[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [claims, setClaims] = useState<BenefitClaim[]>([]);
  const [loading, setLoading] = useState(true);

  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showDepModal, setShowDepModal] = useState(false);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string>('');

  // Claim Form State
  const [claimType, setClaimType] = useState('Hospitalisation');
  const [claimAmount, setClaimAmount] = useState('');
  const [hospital, setHospital] = useState('');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);

  // Dependent Form State
  const [depName, setDepName] = useState('');
  const [depRelationship, setDepRelationship] = useState('Spouse');
  const [depDob, setDepDob] = useState('1995-05-15');
  const [depGender, setDepGender] = useState('Female');

  const fetchBenefits = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/benefits?employeeId=${encodeURIComponent(currentUser.id)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setPlans(json.data.plans || []);
          setEnrollments(json.data.enrollments || []);
          setClaims(json.data.claims || []);
          if (json.data.enrollments?.length > 0) {
            setSelectedEnrollmentId(json.data.enrollments[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch benefits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBenefits();
  }, [currentUser.id]);

  const handleFileClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimAmount || !hospital) return;

    try {
      const res = await fetch('/api/benefits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'claim',
          enrollmentId: selectedEnrollmentId || enrollments[0]?.id,
          employeeId: currentUser.id,
          claimType,
          claimAmount: Number(claimAmount),
          hospital,
          incidentDate,
        }),
      });

      if (res.ok) {
        setShowClaimModal(false);
        setClaimAmount('');
        setHospital('');
        await fetchBenefits();
      }
    } catch (err) {
      console.error('Failed to file claim:', err);
    }
  };

  const handleAddDependent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depName) return;

    try {
      const res = await fetch('/api/benefits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dependent',
          enrollmentId: selectedEnrollmentId || enrollments[0]?.id,
          name: depName,
          relationship: depRelationship,
          dateOfBirth: depDob,
          gender: depGender,
        }),
      });

      if (res.ok) {
        setShowDepModal(false);
        setDepName('');
        await fetchBenefits();
      }
    } catch (err) {
      console.error('Failed to add dependent:', err);
    }
  };

  const activeEnrollment = enrollments[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#5B91B5]">
            <HeartHandshake className="h-4 w-4" /> Corporate Wellness & Insurance
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#17324A]">
            Benefits & Health Insurance
          </h1>
          <p className="mt-1 text-xs md:text-sm text-[#667085]">
            Review corporate group mediclaim coverage, covered family dependents, cashless network hospitals, and file insurance reimbursement claims.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowDepModal(true)}
            className="px-4 py-2.5 rounded-xl bg-white border border-[#D9E5EE] hover:bg-[#F5F9FC] text-[#17324A] text-xs font-semibold shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <Users className="w-4 h-4 text-[#17324A]" />
            Add Family Dependent
          </button>
          <button
            onClick={() => setShowClaimModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#17324A] hover:bg-[#244A68] text-white text-xs font-bold shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            File Insurance Claim
          </button>
        </div>
      </div>

      {/* Top Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#667085] uppercase">
              ACTIVE SUM INSURED
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              100% Employer Funded
            </span>
          </div>
          <div className="text-3xl font-black text-[#17324A] tracking-tight">
            ₹{activeEnrollment?.plan?.coverageAmount?.toLocaleString('en-IN') ?? '10,00,000'}
          </div>
          <div className="pt-3 border-t border-[#F0F4F8] text-xs text-[#667085]">
            {activeEnrollment?.plan?.name ?? 'Comprehensive Corporate Health Shield'}
          </div>
        </div>

        <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <span className="text-[11px] font-bold tracking-wider text-[#667085] uppercase">
            COVERED FAMILY MEMBERS
          </span>
          <div className="text-3xl font-black text-[#315B76] tracking-tight">
            {(activeEnrollment?.dependents?.length ?? 0) + 1} Members
          </div>
          <div className="pt-3 border-t border-[#F0F4F8] text-xs text-[#667085]">
            Self + {activeEnrollment?.dependents?.length ?? 0} registered dependents
          </div>
        </div>

        <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <span className="text-[11px] font-bold tracking-wider text-[#667085] uppercase">
            INSURANCE PROVIDER & TPA
          </span>
          <div className="text-xl font-bold text-[#17324A] tracking-tight">
            {activeEnrollment?.plan?.provider ?? 'Star Health & Allied Insurance'}
          </div>
          <div className="pt-3 border-t border-[#F0F4F8] text-xs text-emerald-600 font-semibold">
            Cashless TPA Card Active: #SH-CORP-2026
          </div>
        </div>
      </div>

      {/* Covered Dependents Section */}
      <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#17324A]">Covered Family Dependents</h2>
            <p className="text-xs text-[#667085]">
              Family members included under your corporate group health policy.
            </p>
          </div>
          <button
            onClick={() => setShowDepModal(true)}
            className="text-xs font-bold text-[#315B76] hover:underline cursor-pointer"
          >
            + Add Member
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Self card */}
          <div className="p-4 rounded-xl border border-[#B0D0EA] bg-[#F8FAFC] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#17324A]">{currentUser.name} (Primary)</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">Self</span>
            </div>
            <p className="text-[11px] text-[#667085]">Employee ID: {currentUser.employeeCode}</p>
            <p className="text-[10px] text-emerald-600 font-semibold">Coverage: ₹10,00,000</p>
          </div>

          {activeEnrollment?.dependents?.map((dep) => (
            <div key={dep.id} className="p-4 rounded-xl border border-[#D9E5EE] bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#17324A]">{dep.name}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EAF2F8] text-[#17324A]">
                  {dep.relationship}
                </span>
              </div>
              <p className="text-[11px] text-[#667085]">DOB: {dep.dateOfBirth} ({dep.gender})</p>
              <p className="text-[10px] text-emerald-600 font-semibold">Floater Health Coverage</p>
            </div>
          ))}
        </div>
      </div>

      {/* Claims History */}
      <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-md space-y-4">
        <h2 className="text-base font-bold text-[#17324A]">Insurance Reimbursement Claims</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#D9E5EE] text-[#667085] font-semibold bg-[#F8FAFC]">
                <th className="py-3 px-4 uppercase font-bold">CLAIM ID</th>
                <th className="py-3 px-4 uppercase font-bold">TYPE</th>
                <th className="py-3 px-4 uppercase font-bold">HOSPITAL / PROVIDER</th>
                <th className="py-3 px-4 uppercase font-bold">INCIDENT DATE</th>
                <th className="py-3 px-4 uppercase font-bold">AMOUNT (₹)</th>
                <th className="py-3 px-4 uppercase font-bold">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAF2F8] text-[#17324A]">
              {claims.map((claim) => (
                <tr key={claim.id} className="hover:bg-[#F8FAFC]">
                  <td className="py-3.5 px-4 font-mono font-bold">{claim.id}</td>
                  <td className="py-3.5 px-4">{claim.claimType}</td>
                  <td className="py-3.5 px-4 font-semibold">{claim.hospital}</td>
                  <td className="py-3.5 px-4 text-[#667085]">{claim.incidentDate}</td>
                  <td className="py-3.5 px-4 font-bold text-emerald-600">
                    ₹{claim.claimAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                      {claim.status}
                    </span>
                  </td>
                </tr>
              ))}
              {claims.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#667085]">
                    No claims submitted yet. Click &quot;File Insurance Claim&quot; to begin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* File Claim Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#D9E5EE] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAF2F8] pb-3">
              <h3 className="text-base font-bold text-[#17324A]">File Insurance Claim</h3>
              <button onClick={() => setShowClaimModal(false)} className="rounded-lg p-1 text-[#667085]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleFileClaim} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#17324A] mb-1">Claim Type</label>
                <select
                  value={claimType}
                  onChange={(e) => setClaimType(e.target.value)}
                  className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs font-semibold text-[#17324A]"
                >
                  <option value="Hospitalisation">Hospitalisation / In-Patient</option>
                  <option value="DayCareProcedure">Day Care Procedure</option>
                  <option value="PrePostHospitalisation">Pre / Post Hospitalisation Medication</option>
                  <option value="DentalWellness">Dental & Vision Wellness</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17324A] mb-1">Claim Amount (₹) *</label>
                <input
                  required
                  type="number"
                  value={claimAmount}
                  onChange={(e) => setClaimAmount(e.target.value)}
                  placeholder="e.g. 45000"
                  className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs text-[#17324A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17324A] mb-1">Hospital / Clinic *</label>
                <input
                  required
                  value={hospital}
                  onChange={(e) => setHospital(e.target.value)}
                  placeholder="e.g. Manipal Hospital, Bengaluru"
                  className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs text-[#17324A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17324A] mb-1">Incident Date *</label>
                <input
                  required
                  type="date"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs text-[#17324A]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EAF2F8]">
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#667085]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#17324A] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#244A68]"
                >
                  Submit to Insurance TPA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Dependent Modal */}
      {showDepModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#D9E5EE] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAF2F8] pb-3">
              <h3 className="text-base font-bold text-[#17324A]">Add Family Dependent</h3>
              <button onClick={() => setShowDepModal(false)} className="rounded-lg p-1 text-[#667085]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddDependent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#17324A] mb-1">Full Legal Name *</label>
                <input
                  required
                  value={depName}
                  onChange={(e) => setDepName(e.target.value)}
                  placeholder="e.g. Riya Vishnoi"
                  className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs text-[#17324A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#17324A] mb-1">Relationship</label>
                  <select
                    value={depRelationship}
                    onChange={(e) => setDepRelationship(e.target.value)}
                    className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs font-semibold text-[#17324A]"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Child">Child</option>
                    <option value="Parent">Parent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#17324A] mb-1">Gender</label>
                  <select
                    value={depGender}
                    onChange={(e) => setDepGender(e.target.value)}
                    className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs font-semibold text-[#17324A]"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17324A] mb-1">Date of Birth *</label>
                <input
                  required
                  type="date"
                  value={depDob}
                  onChange={(e) => setDepDob(e.target.value)}
                  className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs text-[#17324A]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EAF2F8]">
                <button
                  type="button"
                  onClick={() => setShowDepModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#667085]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#17324A] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#244A68]"
                >
                  Save Dependent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
