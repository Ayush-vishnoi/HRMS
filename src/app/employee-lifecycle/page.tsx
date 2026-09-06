'use client';

import { authFetch } from '@/lib/api-client';
import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  FileCheck,
  FileText,
  History,
  Layers,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserMinus,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';

type TabKey = 'onboarding' | 'probation' | 'transfers' | 'promotions' | 'salary_revisions' | 'disciplinary';

export default function EmployeeLifecyclePage() {
  const { currentUser } = useHRMS();
  const [activeTab, setActiveTab] = useState<TabKey>('onboarding');
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>({
    candidates: [],
    awaitingSignatureCandidates: [],
    employees: [],
    onboardingHistory: [],
    offboardingHistory: [],
    employmentProfiles: [],
    changeRequests: [],
    salaryRevisions: [],
    bgvRecords: [],
    onboardingTasks: [],
  });

  const [warnings, setWarnings] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals
  const [showOnboardModal, setShowOnboardModal] = useState<boolean>(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [showPromotionModal, setShowPromotionModal] = useState<boolean>(false);
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [showProbationModal, setShowProbationModal] = useState<boolean>(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  // Form states
  const [onboardForm, setOnboardForm] = useState<any>({
    roleTitle: '',
    department: 'Engineering',
    location: 'Bengaluru HQ',
    joinDate: new Date().toISOString().split('T')[0],
    salary: 1800000,
    managerId: '',
    userRole: 'employee',
    probationMonths: 6,
  });

  const [transferForm, setTransferForm] = useState<any>({
    employeeId: '',
    toDepartment: 'Product',
    toLocation: 'Bengaluru HQ',
    toManagerId: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    reason: 'Inter-departmental rotation and growth',
  });

  const [promotionForm, setPromotionForm] = useState<any>({
    employeeId: '',
    newDesignation: 'Senior Cloud Architect',
    newCtcAnnual: 3200000,
    effectiveDate: new Date().toISOString().split('T')[0],
    reason: 'Exceeded FY26 H1 deliverable expectations and led core migration.',
  });

  const [warningForm, setWarningForm] = useState<any>({
    employeeId: '',
    type: 'PolicyViolation',
    severity: 'Medium',
    reason: '',
    actionRequired: '',
    incidentDate: new Date().toISOString().split('T')[0],
    isEmployeeVisible: true,
  });

  const [probationForm, setProbationForm] = useState<any>({
    decision: 'Confirm',
    notes: 'Exceeds all probation milestones and integrates well with squad.',
    extensionMonths: 3,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resLifecycle, resWarnings] = await Promise.all([
        authFetch<Response>('/api/employee-lifecycle', { raw: true }),
        authFetch<Response>('/api/disciplinary', { raw: true }),
      ]);

      const jsonLifecycle = await resLifecycle.json();
      const jsonWarnings = await resWarnings.json();

      if (jsonLifecycle.success) setData(jsonLifecycle.data);
      if (jsonWarnings.success) setWarnings(jsonWarnings.data);
    } catch (err) {
      console.error('Error fetching lifecycle data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;
    try {
      const hasOffer = selectedCandidate.recruitment_offers && selectedCandidate.recruitment_offers.length > 0;
      let res;
      if (hasOffer) {
        res = await authFetch<Response>('/api/employee-lifecycle/convert', { raw: true,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateId: selectedCandidate.id,
            customJoinDate: onboardForm.joinDate,
            customManagerId: onboardForm.managerId || undefined,
            customProbationMonths: Number(onboardForm.probationMonths || 6),
          }),
        });
      } else {
        res = await authFetch<Response>('/api/employee-lifecycle', { raw: true,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'onboard',
            candidateId: selectedCandidate.id,
            name: selectedCandidate.name,
            email: selectedCandidate.email,
            phone: selectedCandidate.phone,
            avatarUrl: selectedCandidate.avatarUrl,
            ...onboardForm,
          }),
        });
      }
      const result = await res.json();
      if (result.success) {
        const empCode = result.employee?.employeeCode || result.data?.employee?.employeeCode || 'New Employee';
        setActionSuccess(`Employee created successfully (${empCode})! Onboarding checklist and tasks initialized.`);
        setShowOnboardModal(false);
        fetchData();
      } else {
        setActionError(result.error || 'Failed to onboard candidate');
      }
    } catch {
      setActionError('Network error onboarding candidate');
    }
  };

  const handleTaskToggle = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    try {
      await authFetch<Response>('/api/employee-lifecycle', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_task', taskId, status: newStatus }),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBgvUpdate = async (bgvId: string, status: string) => {
    try {
      await authFetch<Response>('/api/employee-lifecycle', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_bgv', bgvId, status }),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch<Response>('/api/employee-lifecycle', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'transfer_request', ...transferForm }),
      });
      const result = await res.json();
      if (result.success) {
        setActionSuccess('Employee transfer processed and profile updated atomically!');
        setShowTransferModal(false);
        fetchData();
      } else {
        setActionError(result.error);
      }
    } catch {
      setActionError('Network error processing transfer');
    }
  };

  const handlePromotionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch<Response>('/api/employee-lifecycle', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'promotion_request', ...promotionForm }),
      });
      const result = await res.json();
      if (result.success) {
        setActionSuccess('Promotion approved! Designation updated and SalaryRevisionHistory record created.');
        setShowPromotionModal(false);
        fetchData();
      } else {
        setActionError(result.error);
      }
    } catch {
      setActionError('Network error processing promotion');
    }
  };

  const handleWarningSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch<Response>('/api/disciplinary', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(warningForm),
      });
      const result = await res.json();
      if (result.success) {
        setActionSuccess('Disciplinary record logged and employee notified.');
        setShowWarningModal(false);
        fetchData();
      } else {
        setActionError(result.error);
      }
    } catch {
      setActionError('Network error submitting warning');
    }
  };

  const handleProbationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    try {
      const res = await authFetch<Response>('/api/employee-lifecycle', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'probation_action',
          employeeId: selectedEmployee.id,
          ...probationForm,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setActionSuccess(`Probation action '${probationForm.decision}' recorded successfully!`);
        setShowProbationModal(false);
        fetchData();
      } else {
        setActionError(result.error);
      }
    } catch {
      setActionError('Network error updating probation');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#5B91B5]">
            <Layers className="h-4 w-4" /> Comprehensive Talent Operations
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#17324A]">
            Employee Lifecycle & HR Operations
          </h1>
          <p className="mt-1 text-xs md:text-sm text-[#667085]">
            Manage complete employee journey: Onboarding, BGV, Probation confirmation, Transfers, Promotions, Salary Revision timeline, and Disciplinary records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData()}
            className="flex items-center gap-2 rounded-xl border border-[#D5E2EC] bg-white px-3.5 py-2.5 text-xs font-bold text-[#17324A] shadow-sm hover:bg-[#F4F8FA] transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          {currentUser?.role === 'admin' && (
            <>
              <button
                onClick={() => {
                  setTransferForm({
                    employeeId: data.employees[0]?.id || '',
                    toDepartment: 'AI/ML',
                    toLocation: 'Bengaluru HQ',
                    toManagerId: data.employees[1]?.id || '',
                    effectiveDate: new Date().toISOString().split('T')[0],
                    reason: 'Strategic reallocation to AI Core squad',
                  });
                  setShowTransferModal(true);
                }}
                className="flex items-center gap-2 rounded-xl bg-white border border-[#23587E]/20 px-3.5 py-2.5 text-xs font-bold text-[#17324A] hover:bg-[#F4F8FA] shadow-sm transition-all"
              >
                <ArrowRight className="h-3.5 w-3.5 text-[#23587E]" /> New Transfer
              </button>
              <button
                onClick={() => {
                  setPromotionForm({
                    employeeId: data.employees[0]?.id || '',
                    newDesignation: 'Staff AI Engineer',
                    newCtcAnnual: 3200000,
                    effectiveDate: new Date().toISOString().split('T')[0],
                    reason: 'Outstanding contribution to Next.js 16 enterprise platform',
                  });
                  setShowPromotionModal(true);
                }}
                className="flex items-center gap-2 rounded-xl bg-[#23587E] px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#1b4461] transition-all"
              >
                <TrendingUp className="h-3.5 w-3.5" /> Promotion & Salary Revision
              </button>
            </>
          )}
        </div>
      </div>

      {/* Action Alerts */}
      {actionSuccess && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs md:text-sm font-semibold text-emerald-800 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-xs md:text-sm font-semibold text-rose-800 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-rose-600 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-700 hover:text-rose-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navigation Switcher Tabs */}
      <div className="flex border-b border-[#E2ECEF] overflow-x-auto gap-2 bg-white/70 p-1.5 rounded-2xl border backdrop-blur-sm">
        <button
          onClick={() => setActiveTab('onboarding')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'onboarding'
              ? 'bg-[#23587E] text-white shadow-sm'
              : 'text-[#567089] hover:bg-[#F4F8FA] hover:text-[#17324A]'
          }`}
        >
          <UserPlus className="h-3.5 w-3.5" /> Candidate Onboarding & BGV
          {data.candidates.length > 0 && (
            <span className="ml-1.5 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-700 font-extrabold">
              {data.candidates.length} Ready
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('probation')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'probation'
              ? 'bg-[#23587E] text-white shadow-sm'
              : 'text-[#567089] hover:bg-[#F4F8FA] hover:text-[#17324A]'
          }`}
        >
          <Clock className="h-3.5 w-3.5" /> Probation & Confirmation Tracker
        </button>

        <button
          onClick={() => setActiveTab('transfers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'transfers'
              ? 'bg-[#23587E] text-white shadow-sm'
              : 'text-[#567089] hover:bg-[#F4F8FA] hover:text-[#17324A]'
          }`}
        >
          <ArrowRight className="h-3.5 w-3.5" /> Department Transfers
        </button>

        <button
          onClick={() => setActiveTab('promotions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'promotions'
              ? 'bg-[#23587E] text-white shadow-sm'
              : 'text-[#567089] hover:bg-[#F4F8FA] hover:text-[#17324A]'
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" /> Promotions & Levels
        </button>

        <button
          onClick={() => setActiveTab('salary_revisions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'salary_revisions'
              ? 'bg-[#23587E] text-white shadow-sm'
              : 'text-[#567089] hover:bg-[#F4F8FA] hover:text-[#17324A]'
          }`}
        >
          <Coins className="h-3.5 w-3.5" /> Salary Revision Timeline
        </button>

        <button
          onClick={() => setActiveTab('disciplinary')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'disciplinary'
              ? 'bg-[#23587E] text-white shadow-sm'
              : 'text-[#567089] hover:bg-[#F4F8FA] hover:text-[#17324A]'
          }`}
        >
          <ShieldAlert className="h-3.5 w-3.5" /> Disciplinary & Warnings
          {warnings.length > 0 && (
            <span className="ml-1.5 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-800 font-extrabold">
              {warnings.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: ONBOARDING & BGV */}
      {activeTab === 'onboarding' && (
        <div className="space-y-6">
          {/* Candidate Selection Queue */}
          <div className="rounded-2xl border border-[#D5E2EC] bg-white p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
              <div>
                <h2 className="text-base font-bold text-[#17324A]">Selected Candidates Ready for Onboarding</h2>
                <p className="text-xs text-[#667085]">Candidates whose latest offer is fully Accepted (e-signature complete). Click to trigger transactional onboarding.</p>
              </div>
              <span className="rounded-full bg-[#EBF4FA] px-3 py-1 text-xs font-extrabold text-[#23587E]">
                {data.candidates.length} Selected Candidates
              </span>
            </div>

            {data.candidates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#CBDDE9] p-8 text-center bg-[#F9FBFC]">
                <UserCheck className="mx-auto h-8 w-8 text-[#8FAEC5] mb-2" />
                <p className="text-xs font-bold text-[#4B6882]">No candidates are ready for onboarding.</p>
                <p className="text-[11px] text-[#7895AE] mt-1">Candidates appear here once their latest offer is Accepted (all e-signatures signed).</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.candidates.map((c: any) => (
                  <div key={c.id} className="rounded-xl border border-[#D5E2EC] p-4 bg-[#FBFDFE] hover:border-[#23587E] transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-full bg-[#23587E]/10 flex items-center justify-center text-xs font-extrabold text-[#23587E]">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-[#17324A]">{c.name}</div>
                          <div className="text-[11px] text-[#667085]">{c.email}</div>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-[11px] text-[#4B6882] mb-4">
                        <div className="flex items-center gap-1.5"><BriefcaseBusiness className="h-3.5 w-3.5 text-[#8FAEC5]" /> {c.job?.title || 'Applied Role'}</div>
                        <div className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-[#8FAEC5]" /> {c.job?.department || 'Department'} · {c.location}</div>
                      </div>
                    </div>
                    {c.recruitment_offers?.[0]?.status === 'Accepted' ? (
                      <button
                        onClick={() => {
                          setSelectedCandidate(c);
                          setOnboardForm((prev: any) => ({
                            ...prev,
                            roleTitle: c.job?.title || 'Engineer',
                            department: c.job?.department || 'Engineering',
                          }));
                          setShowOnboardModal(true);
                        }}
                        className="w-full rounded-lg bg-[#23587E] py-2 text-xs font-bold text-white hover:bg-[#1b4461] transition-all flex items-center justify-center gap-1.5"
                      >
                        <UserPlus className="h-3.5 w-3.5" /> Start Onboarding
                      </button>
                    ) : (
                      <div className="w-full rounded-lg border border-[#D5E2EC] bg-[#F4F8FB] py-2 text-center text-[11px] font-bold text-[#7895AE]">
                        Offer {c.recruitment_offers?.[0]?.status || 'Not Created'} — Not Eligible for Onboarding
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Awaiting Candidate E-Signature Queue */}
          {data.awaitingSignatureCandidates?.length > 0 && (
            <div className="rounded-2xl border border-[#D5E2EC] bg-white p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-base font-bold text-[#17324A]">Awaiting Candidate E-Signature</h2>
                  <p className="text-xs text-[#667085]">Offers sent to candidates — they move to the onboarding queue above once accepted & fully e-signed in the candidate portal.</p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-800">
                  {data.awaitingSignatureCandidates.length} Awaiting Signature
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.awaitingSignatureCandidates.map((c: any) => {
                  const offer = c.recruitment_offers?.[0];
                  const signatures = offer?.document_signatures ?? [];
                  const signedCount = signatures.filter((s: any) => s.status === 'Signed').length;
                  return (
                    <div key={c.id} className="rounded-xl border border-amber-200 p-4 bg-amber-50/40 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-xs font-extrabold text-amber-700">
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-[#17324A]">{c.name}</div>
                            <div className="text-[11px] text-[#667085]">{c.email}</div>
                          </div>
                        </div>
                        <div className="space-y-1.5 text-[11px] text-[#4B6882] mb-3">
                          <div className="flex items-center gap-1.5"><BriefcaseBusiness className="h-3.5 w-3.5 text-[#8FAEC5]" /> {c.job?.title || 'Applied Role'}</div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-[#8FAEC5]" />
                            Sent {offer?.sent_at ? new Date(offer.sent_at).toLocaleDateString('en-GB') : '—'} · Offer {offer?.status}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FileCheck className="h-3.5 w-3.5 text-[#8FAEC5]" />
                            E-signatures: {signedCount}/{signatures.length} signed
                          </div>
                        </div>
                      </div>
                      <div className="w-full rounded-lg border border-amber-300 bg-amber-100/60 py-2 text-center text-[11px] font-bold text-amber-800 flex items-center justify-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> Awaiting Candidate E-Signature
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Onboarding Checklist & BGV Tracker */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[#D5E2EC] bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold text-[#17324A] mb-1">Onboarding Task Engine (Multi-Department)</h2>
              <p className="text-xs text-[#667085] mb-4">Reusable task checklist across HR, Manager, IT, Finance, and Employee.</p>
              
              <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                {data.onboardingTasks.length === 0 ? (
                  <p className="text-xs text-[#8FAEC5] py-4 text-center">No active onboarding tasks.</p>
                ) : (
                  data.onboardingTasks.map((t: any) => (
                    <div
                      key={t.id}
                      onClick={() => handleTaskToggle(t.id, t.status)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        t.status === 'Completed'
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : 'border-[#DCE8F0] bg-white hover:border-[#23587E]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-5 w-5 rounded-md flex items-center justify-center ${t.status === 'Completed' ? 'bg-emerald-600 text-white' : 'border border-[#CBDDE9]'}`}>
                          {t.status === 'Completed' && <Check className="h-3.5 w-3.5" />}
                        </div>
                        <div>
                          <div className={`text-xs font-bold ${t.status === 'Completed' ? 'line-through text-emerald-900/60' : 'text-[#17324A]'}`}>
                            {t.title}
                          </div>
                          <div className="text-[10px] text-[#667085]">Department Owner: <span className="font-semibold text-[#23587E]">{t.owner}</span></div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {t.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[#D5E2EC] bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold text-[#17324A] mb-1">Background Verification (BGV) Status</h2>
              <p className="text-xs text-[#667085] mb-4">Identity, criminal background, address & previous employment checks.</p>

              <div className="space-y-3">
                {data.bgvRecords.length === 0 ? (
                  <p className="text-xs text-[#8FAEC5] py-4 text-center">No active BGV verifications.</p>
                ) : (
                  data.bgvRecords.map((b: any) => (
                    <div key={b.id} className="p-3.5 rounded-xl border border-[#DCE8F0] bg-[#FBFDFE] flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-[#17324A] flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-[#23587E]" /> {b.checkType}
                        </div>
                        <div className="text-[11px] text-[#667085]">
                          Status: <span className="font-semibold text-[#17324A]">{b.status}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {b.status !== 'Verified' && (
                          <button
                            onClick={() => handleBgvUpdate(b.id, 'Verified')}
                            className="rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition-all"
                          >
                            Mark Verified
                          </button>
                        )}
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${b.status === 'Verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                          {b.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROBATION & CONFIRMATION */}
      {activeTab === 'probation' && (
        <div className="rounded-2xl border border-[#D5E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-base font-bold text-[#17324A]">Probation Milestones & Confirmation</h2>
              <p className="text-xs text-[#667085]">Evaluate 90/180-day new joiner probation status, record manager reviews, and issue confirmations.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E2ECEF] bg-[#F8FAFC] text-[11px] font-extrabold uppercase text-[#5B768F]">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department & Role</th>
                  <th className="py-3 px-4">Joining Date</th>
                  <th className="py-3 px-4">Probation End Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBF1F5]">
                {data.employees.map((emp: any) => {
                  const prof = data.employmentProfiles.find((p: any) => p.employee_id === emp.id);
                  const isProbation = prof?.lifecycle_status === 'Probation' || !prof?.confirmation_date;
                  const probEnd = prof?.probation_end_date ? new Date(prof.probation_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '6 Months from Joining';

                  return (
                    <tr key={emp.id} className="hover:bg-[#F9FBFC] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#17324A]">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-[#23587E]/10 flex items-center justify-center text-xs font-bold text-[#23587E]">
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <div>{emp.name}</div>
                            <div className="text-[10px] text-[#667085]">{emp.employeeCode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#4B6882]">{emp.department} · {emp.roleTitle}</td>
                      <td className="py-3.5 px-4 text-[#4B6882]">{emp.joinDate}</td>
                      <td className="py-3.5 px-4 font-semibold text-[#17324A]">{probEnd}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${isProbation ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {isProbation ? 'In Probation' : 'Confirmed Full-Time'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isProbation ? (
                          <button
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setShowProbationModal(true);
                            }}
                            className="rounded-lg bg-[#23587E] px-3 py-1 text-xs font-bold text-white hover:bg-[#1b4461] transition-all"
                          >
                            Review & Confirm
                          </button>
                        ) : (
                          <span className="text-[11px] font-semibold text-emerald-600 flex items-center justify-end gap-1">
                            <BadgeCheck className="h-4 w-4" /> Confirmed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TRANSFERS & MOBILITY */}
      {activeTab === 'transfers' && (
        <div className="rounded-2xl border border-[#D5E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-base font-bold text-[#17324A]">Internal Department & Location Mobility</h2>
              <p className="text-xs text-[#667085]">Audit log of inter-department transfers, reporting manager changes, and geographical relocations.</p>
            </div>
            <button
              onClick={() => {
                setTransferForm({
                  employeeId: data.employees[0]?.id || '',
                  toDepartment: 'AI/ML',
                  toLocation: 'Bengaluru HQ',
                  toManagerId: data.employees[1]?.id || '',
                  effectiveDate: new Date().toISOString().split('T')[0],
                  reason: 'Strategic reallocation',
                });
                setShowTransferModal(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-[#23587E] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#1b4461]"
            >
              <Plus className="h-3.5 w-3.5" /> Request Transfer
            </button>
          </div>

          <div className="space-y-3">
            {data.changeRequests.length === 0 ? (
              <p className="text-xs text-[#8FAEC5] py-8 text-center">No transfer change requests recorded.</p>
            ) : (
              data.changeRequests.map((req: any) => (
                <div key={req.id} className="p-4 rounded-xl border border-[#D5E2EC] bg-[#FBFDFE] flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-[#17324A] flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-[#23587E]" />
                      <span>{req.employees_employee_change_requests_employee_idToemployees?.name || 'Employee'}</span>
                      <span className="text-[11px] font-normal text-[#667085]">({req.employees_employee_change_requests_employee_idToemployees?.employeeCode})</span>
                    </div>
                    <div className="text-[11px] text-[#4B6882] mt-1">
                      Effective Date: <span className="font-semibold text-[#17324A]">{new Date(req.effective_date).toLocaleDateString()}</span> · Reason: {req.reason}
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 self-start md:self-auto">
                    {req.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PROMOTIONS & LEVELS */}
      {activeTab === 'promotions' && (
        <div className="rounded-2xl border border-[#D5E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-base font-bold text-[#17324A]">Promotion Matrix & Level Progression</h2>
              <p className="text-xs text-[#667085]">Promotions automatically update employee designations, active SalaryStructures, and write to SalaryRevisionHistory.</p>
            </div>
            <button
              onClick={() => {
                setPromotionForm({
                  employeeId: data.employees[0]?.id || '',
                  newDesignation: 'Staff AI Engineer',
                  newCtcAnnual: 3200000,
                  effectiveDate: new Date().toISOString().split('T')[0],
                  reason: 'Outstanding contribution to enterprise platform',
                });
                setShowPromotionModal(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-[#23587E] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#1b4461]"
            >
              <TrendingUp className="h-3.5 w-3.5" /> Execute Promotion
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.employees.map((emp: any) => (
              <div key={emp.id} className="p-4 rounded-xl border border-[#D5E2EC] bg-[#FBFDFE] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="h-8 w-8 rounded-full bg-[#23587E]/10 flex items-center justify-center text-xs font-bold text-[#23587E]">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#17324A]">{emp.name}</div>
                      <div className="text-[10px] text-[#667085]">{emp.employeeCode} · {emp.department}</div>
                    </div>
                  </div>
                  <div className="mt-3 p-3 rounded-lg bg-white border border-[#E2ECEF] space-y-1 text-[11px]">
                    <div className="text-[#667085]">Current Role: <span className="font-bold text-[#17324A]">{emp.roleTitle}</span></div>
                    <div className="text-[#667085]">Current CTC: <span className="font-extrabold text-[#23587E]">₹{Number(emp.salary).toLocaleString('en-IN')}</span></div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setPromotionForm({
                      employeeId: emp.id,
                      newDesignation: `Senior ${emp.roleTitle}`,
                      newCtcAnnual: Math.round(Number(emp.salary) * 1.2),
                      effectiveDate: new Date().toISOString().split('T')[0],
                      reason: 'Performance merit elevation',
                    });
                    setShowPromotionModal(true);
                  }}
                  className="mt-4 w-full rounded-lg bg-[#EBF4FA] py-2 text-xs font-bold text-[#23587E] hover:bg-[#23587E] hover:text-white transition-all flex items-center justify-center gap-1.5"
                >
                  <TrendingUp className="h-3.5 w-3.5" /> Promote Employee
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: SALARY REVISION TIMELINE */}
      {activeTab === 'salary_revisions' && (
        <div className="rounded-2xl border border-[#D5E2EC] bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-base font-bold text-[#17324A]">Immutable Salary Revision Timeline</h2>
            <p className="text-xs text-[#667085]">Historical audit ledger recording every CTC adjustment, merit appraisal increment, and promotion change.</p>
          </div>

          <div className="space-y-4">
            {data.salaryRevisions.length === 0 ? (
              <p className="text-xs text-[#8FAEC5] py-8 text-center">No salary revisions recorded.</p>
            ) : (
              data.salaryRevisions.map((r: any) => {
                const emp = data.employees.find((e: any) => e.id === r.employeeId);
                return (
                  <div key={r.id} className="p-4 rounded-xl border border-[#D5E2EC] bg-[#FBFDFE] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-[#17324A] flex items-center gap-2">
                        <Coins className="h-4 w-4 text-[#23587E]" />
                        <span>{emp?.name || 'Employee'}</span>
                        <span className="text-[11px] font-normal text-[#667085]">({emp?.employeeCode})</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800">
                          {r.revisionType}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#4B6882]">
                        Effective Date: <span className="font-bold text-[#17324A]">{r.effectiveDate}</span> · Reason: {r.reason}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 bg-white p-2.5 rounded-lg border border-[#E2ECEF]">
                      <div className="text-right">
                        <div className="text-[10px] text-[#667085]">Previous CTC</div>
                        <div className="text-xs font-bold text-[#4B6882]">₹{Number(r.previousCtcAnnual).toLocaleString('en-IN')}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-emerald-600" />
                      <div>
                        <div className="text-[10px] text-[#667085]">New Revised CTC</div>
                        <div className="text-xs font-extrabold text-emerald-700">₹{Number(r.newCtcAnnual).toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 6: DISCIPLINARY & WARNINGS */}
      {activeTab === 'disciplinary' && (
        <div className="rounded-2xl border border-[#D5E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-base font-bold text-[#17324A]">Confidential Disciplinary & Compliance Warnings</h2>
              <p className="text-xs text-[#667085]">Strictly RBAC-enforced disciplinary records. Employees only see designated notices.</p>
            </div>
            {currentUser?.role !== 'employee' && (
              <button
                onClick={() => {
                  setWarningForm({
                    employeeId: data.employees[0]?.id || '',
                    type: 'PolicyViolation',
                    severity: 'Medium',
                    reason: 'Delayed submission of mandatory compliance policy acknowledgment.',
                    actionRequired: 'Submit signed document within 24 hours.',
                    incidentDate: new Date().toISOString().split('T')[0],
                    isEmployeeVisible: true,
                  });
                  setShowWarningModal(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700"
              >
                <ShieldAlert className="h-3.5 w-3.5" /> Issue Disciplinary Notice
              </button>
            )}
          </div>

          <div className="space-y-3">
            {warnings.length === 0 ? (
              <p className="text-xs text-[#8FAEC5] py-8 text-center">No disciplinary warnings on record. Clean compliance record!</p>
            ) : (
              warnings.map((w: any) => {
                const emp = data.employees.find((e: any) => e.id === w.employeeId);
                return (
                  <div key={w.id} className="p-4 rounded-xl border border-rose-100 bg-rose-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-rose-950 flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-rose-600" />
                        <span>{emp?.name || 'Employee'}</span>
                        <span className="text-[11px] font-normal text-rose-800">({emp?.employeeCode})</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-200 text-rose-900">
                          {w.type} · Severity: {w.severity}
                        </span>
                      </div>
                      <div className="text-[11px] text-rose-900">
                        Incident Date: <span className="font-semibold">{w.incidentDate}</span> · Issued by: {w.issuedByName}
                      </div>
                      <div className="text-[11px] text-[#4B6882] mt-1 font-medium">
                        Reason: {w.reason} | Action: <span className="font-semibold text-rose-900">{w.actionRequired}</span>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 self-start md:self-auto">
                      {w.status}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ONBOARDING */}
      {showOnboardModal && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-sm font-bold text-[#17324A]">Onboard Candidate: {selectedCandidate.name}</h3>
              <button onClick={() => setShowOnboardModal(false)}><X className="h-4 w-4 text-[#8FAEC5]" /></button>
            </div>
            <form onSubmit={handleOnboardSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Official Role Title</label>
                <input
                  type="text"
                  value={onboardForm.roleTitle}
                  onChange={(e) => setOnboardForm({ ...onboardForm, roleTitle: e.target.value })}
                  className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Department</label>
                  <input
                    type="text"
                    value={onboardForm.department}
                    onChange={(e) => setOnboardForm({ ...onboardForm, department: e.target.value })}
                    className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Annual CTC (₹)</label>
                  <input
                    type="number"
                    value={onboardForm.salary}
                    onChange={(e) => setOnboardForm({ ...onboardForm, salary: Number(e.target.value) })}
                    className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={onboardForm.joinDate}
                    onChange={(e) => setOnboardForm({ ...onboardForm, joinDate: e.target.value })}
                    className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Probation Period</label>
                  <select
                    value={onboardForm.probationMonths}
                    onChange={(e) => setOnboardForm({ ...onboardForm, probationMonths: Number(e.target.value) })}
                    className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                  >
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowOnboardModal(false)} className="rounded-xl px-4 py-2 text-xs font-bold text-[#667085] hover:bg-[#F4F8FA]">Cancel</button>
                <button type="submit" className="rounded-xl bg-[#23587E] px-4 py-2 text-xs font-bold text-white hover:bg-[#1b4461]">Confirm Onboarding</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TRANSFER */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-sm font-bold text-[#17324A]">Initiate Employee Transfer</h3>
              <button onClick={() => setShowTransferModal(false)}><X className="h-4 w-4 text-[#8FAEC5]" /></button>
            </div>
            <form onSubmit={handleTransferSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Select Employee</label>
                <select
                  value={transferForm.employeeId}
                  onChange={(e) => setTransferForm({ ...transferForm, employeeId: e.target.value })}
                  className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                  required
                >
                  {data.employees.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.employeeCode})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">New Department</label>
                  <input
                    type="text"
                    value={transferForm.toDepartment}
                    onChange={(e) => setTransferForm({ ...transferForm, toDepartment: e.target.value })}
                    className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">New Location</label>
                  <input
                    type="text"
                    value={transferForm.toLocation}
                    onChange={(e) => setTransferForm({ ...transferForm, toLocation: e.target.value })}
                    className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Effective Date</label>
                <input
                  type="date"
                  value={transferForm.effectiveDate}
                  onChange={(e) => setTransferForm({ ...transferForm, effectiveDate: e.target.value })}
                  className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Transfer Justification</label>
                <textarea
                  rows={2}
                  value={transferForm.reason}
                  onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                  className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowTransferModal(false)} className="rounded-xl px-4 py-2 text-xs font-bold text-[#667085] hover:bg-[#F4F8FA]">Cancel</button>
                <button type="submit" className="rounded-xl bg-[#23587E] px-4 py-2 text-xs font-bold text-white hover:bg-[#1b4461]">Execute Transfer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PROMOTION */}
      {showPromotionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-sm font-bold text-[#17324A]">Promote & Revise Salary Structure</h3>
              <button onClick={() => setShowPromotionModal(false)}><X className="h-4 w-4 text-[#8FAEC5]" /></button>
            </div>
            <form onSubmit={handlePromotionSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Select Employee</label>
                <select
                  value={promotionForm.employeeId}
                  onChange={(e) => setPromotionForm({ ...promotionForm, employeeId: e.target.value })}
                  className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                  required
                >
                  {data.employees.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.employeeCode} · {e.roleTitle})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#4B6882] mb-1">New Promoted Designation</label>
                <input
                  type="text"
                  value={promotionForm.newDesignation}
                  onChange={(e) => setPromotionForm({ ...promotionForm, newDesignation: e.target.value })}
                  className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#4B6882] mb-1">New Annual CTC (₹)</label>
                <input
                  type="number"
                  value={promotionForm.newCtcAnnual}
                  onChange={(e) => setPromotionForm({ ...promotionForm, newCtcAnnual: Number(e.target.value) })}
                  className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Promotion Reason & Justification</label>
                <textarea
                  rows={2}
                  value={promotionForm.reason}
                  onChange={(e) => setPromotionForm({ ...promotionForm, reason: e.target.value })}
                  className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowPromotionModal(false)} className="rounded-xl px-4 py-2 text-xs font-bold text-[#667085] hover:bg-[#F4F8FA]">Cancel</button>
                <button type="submit" className="rounded-xl bg-[#23587E] px-4 py-2 text-xs font-bold text-white hover:bg-[#1b4461]">Approve Promotion</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: PROBATION REVIEW */}
      {showProbationModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-sm font-bold text-[#17324A]">Probation Evaluation: {selectedEmployee.name}</h3>
              <button onClick={() => setShowProbationModal(false)}><X className="h-4 w-4 text-[#8FAEC5]" /></button>
            </div>
            <form onSubmit={handleProbationSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Action Decision</label>
                <select
                  value={probationForm.decision}
                  onChange={(e) => setProbationForm({ ...probationForm, decision: e.target.value })}
                  className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                >
                  <option value="Confirm">Confirm Full-Time Employment</option>
                  <option value="Extend">Extend Probation Period</option>
                </select>
              </div>
              {probationForm.decision === 'Extend' && (
                <div>
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Extension Duration</label>
                  <select
                    value={probationForm.extensionMonths}
                    onChange={(e) => setProbationForm({ ...probationForm, extensionMonths: Number(e.target.value) })}
                    className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                  >
                    <option value={1}>1 Month</option>
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Evaluation & Manager Review Notes</label>
                <textarea
                  rows={3}
                  value={probationForm.notes}
                  onChange={(e) => setProbationForm({ ...probationForm, notes: e.target.value })}
                  className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowProbationModal(false)} className="rounded-xl px-4 py-2 text-xs font-bold text-[#667085] hover:bg-[#F4F8FA]">Cancel</button>
                <button type="submit" className="rounded-xl bg-[#23587E] px-4 py-2 text-xs font-bold text-white hover:bg-[#1b4461]">Save Decision</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: DISCIPLINARY */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-sm font-bold text-rose-950">Issue Disciplinary Notice</h3>
              <button onClick={() => setShowWarningModal(false)}><X className="h-4 w-4 text-[#8FAEC5]" /></button>
            </div>
            <form onSubmit={handleWarningSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Employee</label>
                <select
                  value={warningForm.employeeId}
                  onChange={(e) => setWarningForm({ ...warningForm, employeeId: e.target.value })}
                  className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                  required
                >
                  {data.employees.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.employeeCode})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Warning Category</label>
                  <select
                    value={warningForm.type}
                    onChange={(e) => setWarningForm({ ...warningForm, type: e.target.value })}
                    className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                  >
                    <option value="Verbal">Verbal Warning</option>
                    <option value="Written">Written Warning</option>
                    <option value="PolicyViolation">Policy Violation</option>
                    <option value="Attendance">Attendance Infraction</option>
                    <option value="Performance">Performance Deficit</option>
                    <option value="Final">Final Warning</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Severity</label>
                  <select
                    value={warningForm.severity}
                    onChange={(e) => setWarningForm({ ...warningForm, severity: e.target.value })}
                    className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Reason & Incident Description</label>
                <textarea
                  rows={2}
                  value={warningForm.reason}
                  onChange={(e) => setWarningForm({ ...warningForm, reason: e.target.value })}
                  className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Action Required / Corrective Measures</label>
                <input
                  type="text"
                  value={warningForm.actionRequired}
                  onChange={(e) => setWarningForm({ ...warningForm, actionRequired: e.target.value })}
                  className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowWarningModal(false)} className="rounded-xl px-4 py-2 text-xs font-bold text-[#667085] hover:bg-[#F4F8FA]">Cancel</button>
                <button type="submit" className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700">Issue Disciplinary Notice</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
