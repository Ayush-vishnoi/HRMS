'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  DoorOpen,
  Download,
  FileCheck,
  FileText,
  History,
  Laptop,
  Plus,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserMinus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';

type ExitClearance = {
  id: string;
  exitRequestId: string;
  department: string;
  status: 'Pending' | 'Cleared' | 'Disputed';
  clearedById?: string | null;
  clearedAt?: string | null;
  assetReturnedCount: number;
  duesPendingAmount: number;
  remarks?: string | null;
};

type FullAndFinalSettlement = {
  id: string;
  exitRequestId: string;
  employeeId: string;
  totalPayableDays: number;
  basicPay: number;
  leaveEncashmentAmount: number;
  gratuityAmount: number;
  bonusPayable: number;
  pendingDuesDeduction: number;
  taxDeduction: number;
  netSettlementAmount: number;
  status: string;
  disbursementDate?: string | null;
};

type KtTask = {
  id: string;
  exitRequestId: string;
  title: string;
  description: string;
  recipientEmployeeId: string;
  recipientName: string;
  status: string;
  dueDate: string;
  completedAt?: string | null;
  notes?: string | null;
};

type ExitRequest = {
  id: string;
  employeeId: string;
  resignationDate: string;
  requestedRelievingDate: string;
  approvedRelievingDate?: string | null;
  reasonCategory: string;
  reasonDetails: string;
  managerApproval: string;
  hrApproval: string;
  noticePeriodDays: number;
  status: string;
  clearances: ExitClearance[];
  settlement?: FullAndFinalSettlement | null;
  ktTasks?: KtTask[];
};

type AlumniRecord = {
  id: string;
  employeeId: string;
  employeeCode: string;
  name: string;
  personalEmail: string;
  phone?: string | null;
  department: string;
  lastDesignation: string;
  joinDate: string;
  exitDate: string;
  relievingLetterUrl?: string | null;
  experienceLetterUrl?: string | null;
};

export default function ExitPage() {
  const { currentUser, employees } = useHRMS();
  const isAdmin = currentUser.userRole === 'admin';
  const isManager = currentUser.userRole === 'manager';

  const [activeTab, setActiveTab] = useState<'requests' | 'kt' | 'clearance' | 'ff' | 'alumni'>('requests');
  const [exitRequests, setExitRequests] = useState<ExitRequest[]>([]);
  const [alumniRecords, setAlumniRecords] = useState<AlumniRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showResignModal, setShowResignModal] = useState(false);
  const [showFfModal, setShowFfModal] = useState(false);
  const [showKtModal, setShowKtModal] = useState(false);
  const [selectedExitRequest, setSelectedExitRequest] = useState<ExitRequest | null>(null);

  // Resignation Form
  const [requestedDate, setRequestedDate] = useState('2026-10-15');
  const [reasonCategory, setReasonCategory] = useState('Career Growth');
  const [reasonDetails, setReasonDetails] = useState('');

  // KT Form
  const [ktForm, setKtForm] = useState({
    title: '',
    description: '',
    recipientEmployeeId: '',
    recipientName: 'Designated Team Member',
    dueDate: new Date().toISOString().split('T')[0],
  });

  // F&F Form
  const [payableDays, setPayableDays] = useState('30');
  const [basicPay, setBasicPay] = useState('50000');
  const [leaveEncash, setLeaveEncash] = useState('15000');
  const [gratuity, setGratuity] = useState('25000');
  const [bonus, setBonus] = useState('10000');
  const [duesDeduction, setDuesDeduction] = useState('0');
  const [taxDeduction, setTaxDeduction] = useState('5000');

  const fetchExitData = async () => {
    try {
      setLoading(true);
      const url = isAdmin
        ? '/api/exit'
        : `/api/exit?employeeId=${encodeURIComponent(currentUser.id)}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setExitRequests(json.data.exitRequests || []);
          setAlumniRecords(json.data.alumniRecords || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch exit data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExitData();
  }, [currentUser.id, isAdmin]);

  const handleSubmitResignation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasonDetails) return;

    try {
      const res = await fetch('/api/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_resignation',
          employeeId: currentUser.id,
          requestedRelievingDate: requestedDate,
          reasonCategory,
          reasonDetails,
        }),
      });

      if (res.ok) {
        setShowResignModal(false);
        setReasonDetails('');
        await fetchExitData();
      }
    } catch (err) {
      console.error('Failed to submit resignation:', err);
    }
  };

  const handleCreateKt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExitRequest) return;

    try {
      const res = await fetch('/api/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'kt_task_create',
          exitRequestId: selectedExitRequest.id,
          ...ktForm,
        }),
      });
      if (res.ok) {
        setShowKtModal(false);
        await fetchExitData();
      }
    } catch (err) {
      console.error('Failed to create KT task:', err);
    }
  };

  const handleUpdateKt = async (taskId: string, status: string) => {
    try {
      const res = await fetch('/api/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'kt_task_update', taskId, status }),
      });
      if (res.ok) await fetchExitData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateClearance = async (clearanceId: string, status: string) => {
    try {
      const res = await fetch('/api/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clearance_update',
          clearanceId,
          status,
          remarks: 'Clearance verified and approved by department authority.',
        }),
      });

      if (res.ok) {
        await fetchExitData();
      }
    } catch (err) {
      console.error('Failed to update clearance:', err);
    }
  };

  const handleCalculateFf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExitRequest) return;

    try {
      const res = await fetch('/api/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'calculate_ff',
          exitRequestId: selectedExitRequest.id,
          employeeId: selectedExitRequest.employeeId,
          totalPayableDays: Number(payableDays),
          basicPay: Number(basicPay),
          leaveEncashmentAmount: Number(leaveEncash),
          gratuityAmount: Number(gratuity),
          bonusPayable: Number(bonus),
          pendingDuesDeduction: Number(duesDeduction),
          taxDeduction: Number(taxDeduction),
        }),
      });

      if (res.ok) {
        setShowFfModal(false);
        await fetchExitData();
      }
    } catch (err) {
      console.error('Failed to calculate FF:', err);
    }
  };

  const handleCompleteExit = async (req: ExitRequest) => {
    if (!confirm('Are you sure you want to complete this separation? This will mark the employee as Offboarded, invalidate their active login sessions, and convert them to Alumni.')) {
      return;
    }

    try {
      const res = await fetch('/api/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_exit',
          exitRequestId: req.id,
          employeeId: req.employeeId,
          relievingLetterUrl: `/documents/relieving-${req.employeeId}.pdf`,
          experienceLetterUrl: `/documents/experience-${req.employeeId}.pdf`,
        }),
      });

      if (res.ok) {
        await fetchExitData();
      }
    } catch (err) {
      console.error('Failed to complete exit:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#5B91B5]">
            <DoorOpen className="h-4 w-4" /> Separation, Clearance & Offboarding Hub
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#17324A]">
            Exit Management & Alumni Hub
          </h1>
          <p className="mt-1 text-xs md:text-sm text-[#667085]">
            Resignation lifecycle, notice periods, 5-department clearance NOC matrix, Knowledge Transfer (KT), F&F settlement calculator, and Alumni archive.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowResignModal(true)}
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-rose-700 transition-all"
          >
            <UserMinus className="h-3.5 w-3.5" /> Submit Resignation
          </button>
        </div>
      </div>

      {/* Switcher Tabs */}
      <div className="flex border-b border-[#E2ECEF] overflow-x-auto gap-2 bg-white/70 p-1.5 rounded-2xl border backdrop-blur-sm">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'requests'
              ? 'bg-[#23587E] text-white shadow-sm'
              : 'text-[#567089] hover:bg-[#F4F8FA] hover:text-[#17324A]'
          }`}
        >
          <Clock className="h-3.5 w-3.5" /> Resignation Notices ({exitRequests.length})
        </button>

        <button
          onClick={() => setActiveTab('kt')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'kt'
              ? 'bg-[#23587E] text-white shadow-sm'
              : 'text-[#567089] hover:bg-[#F4F8FA] hover:text-[#17324A]'
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" /> Knowledge Transfer (KT)
        </button>

        <button
          onClick={() => setActiveTab('clearance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'clearance'
              ? 'bg-[#23587E] text-white shadow-sm'
              : 'text-[#567089] hover:bg-[#F4F8FA] hover:text-[#17324A]'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" /> 5-Department NOC Clearance
        </button>

        <button
          onClick={() => setActiveTab('ff')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'ff'
              ? 'bg-[#23587E] text-white shadow-sm'
              : 'text-[#567089] hover:bg-[#F4F8FA] hover:text-[#17324A]'
          }`}
        >
          <Wallet className="h-3.5 w-3.5" /> Full & Final (F&F) Settlements
        </button>

        <button
          onClick={() => setActiveTab('alumni')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'alumni'
              ? 'bg-[#23587E] text-white shadow-sm'
              : 'text-[#567089] hover:bg-[#F4F8FA] hover:text-[#17324A]'
          }`}
        >
          <Users className="h-3.5 w-3.5" /> Alumni Directory ({alumniRecords.length})
        </button>
      </div>

      {/* TAB 1: RESIGNATION NOTICES */}
      {activeTab === 'requests' && (
        <div className="rounded-2xl border border-[#D5E2EC] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-[#17324A]">Active Resignation & Notice Period Requests</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E2ECEF] bg-[#F8FAFC] text-[11px] font-extrabold uppercase text-[#5B768F]">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Notice Date</th>
                  <th className="py-3 px-4">Relieving Date</th>
                  <th className="py-3 px-4">Reason Category</th>
                  <th className="py-3 px-4">Notice Days</th>
                  <th className="py-3 px-4">Clearance Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBF1F5]">
                {exitRequests.map((req) => {
                  const emp = employees.find((e) => e.id === req.employeeId);
                  const clearedCount = req.clearances?.filter((c) => c.status === 'Cleared').length || 0;
                  const totalCount = req.clearances?.length || 5;

                  return (
                    <tr key={req.id} className="hover:bg-[#F9FBFC] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#17324A]">
                        <div>{emp?.name || req.employeeId}</div>
                        <div className="text-[10px] text-[#667085]">{emp?.employeeCode} · {emp?.department}</div>
                      </td>
                      <td className="py-3.5 px-4 text-[#4B6882]">{req.resignationDate}</td>
                      <td className="py-3.5 px-4 font-bold text-[#17324A]">{req.requestedRelievingDate}</td>
                      <td className="py-3.5 px-4 text-[#4B6882]">{req.reasonCategory}</td>
                      <td className="py-3.5 px-4 text-[#4B6882]">{req.noticePeriodDays} Days</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${clearedCount === totalCount ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {clearedCount}/{totalCount} Cleared
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isAdmin && req.status !== 'Completed' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedExitRequest(req);
                                setShowFfModal(true);
                              }}
                              className="rounded-lg bg-[#EBF4FA] px-3 py-1 text-xs font-bold text-[#23587E] hover:bg-[#23587E] hover:text-white"
                            >
                              Calculate F&F
                            </button>
                            <button
                              onClick={() => handleCompleteExit(req)}
                              className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                            >
                              Complete Exit
                            </button>
                          </div>
                        )}
                        {req.status === 'Completed' && (
                          <span className="text-[11px] font-semibold text-emerald-600 flex items-center justify-end gap-1">
                            <CheckCircle2 className="h-4 w-4" /> Offboarded to Alumni
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

      {/* TAB 2: KNOWLEDGE TRANSFER */}
      {activeTab === 'kt' && (
        <div className="rounded-2xl border border-[#D5E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-base font-bold text-[#17324A]">Knowledge Transfer (KT) Handover Checklist</h2>
              <p className="text-xs text-[#667085]">Ensure comprehensive project, credentials, and documentation transfer prior to final relieving.</p>
            </div>
            {exitRequests.length > 0 && (
              <button
                onClick={() => {
                  setSelectedExitRequest(exitRequests[0]);
                  setShowKtModal(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-[#23587E] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#1b4461]"
              >
                <Plus className="h-3.5 w-3.5" /> Add Handover Task
              </button>
            )}
          </div>

          <div className="space-y-4">
            {exitRequests.map((req) => {
              const emp = employees.find((e) => e.id === req.employeeId);
              return (
                <div key={req.id} className="p-4 rounded-xl border border-[#D5E2EC] bg-[#FBFDFE]">
                  <div className="flex items-center justify-between border-b pb-3 mb-3">
                    <div className="font-bold text-xs text-[#17324A]">
                      KT Handover for: <span className="text-[#23587E]">{emp?.name || req.employeeId}</span> ({emp?.department})
                    </div>
                    <span className="text-[11px] text-[#667085]">Relieving: {req.requestedRelievingDate}</span>
                  </div>

                  <div className="space-y-2">
                    {req.ktTasks?.length === 0 ? (
                      <p className="text-xs text-[#8FAEC5] py-2">No KT tasks assigned yet.</p>
                    ) : (
                      req.ktTasks?.map((kt) => (
                        <div key={kt.id} className="flex items-center justify-between p-3 rounded-lg bg-white border border-[#E2ECEF]">
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-[#17324A]">{kt.title}</div>
                            <div className="text-[11px] text-[#667085]">{kt.description}</div>
                            <div className="text-[10px] text-[#4B6882]">Recipient: <span className="font-semibold">{kt.recipientName}</span> · Due: {kt.dueDate}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {kt.status !== 'Verified' && (
                              <button
                                onClick={() => handleUpdateKt(kt.id, 'Verified')}
                                className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                              >
                                Verify Handover
                              </button>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${kt.status === 'Verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                              {kt.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: CLEARANCE MATRIX */}
      {activeTab === 'clearance' && (
        <div className="rounded-2xl border border-[#D5E2EC] bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-base font-bold text-[#17324A]">5-Department NOC Clearance Matrix</h2>
            <p className="text-xs text-[#667085]">Sign-offs required across IT, Finance, HR, Manager, and Admin before F&F calculation and relieving issuance.</p>
          </div>

          <div className="space-y-6">
            {exitRequests.map((req) => {
              const emp = employees.find((e) => e.id === req.employeeId);
              return (
                <div key={req.id} className="rounded-xl border border-[#D5E2EC] p-5 bg-[#FBFDFE]">
                  <div className="flex items-center justify-between border-b pb-3 mb-4">
                    <div className="font-bold text-xs text-[#17324A]">
                      Separation Clearances for <span className="text-[#23587E]">{emp?.name || req.employeeId}</span> ({emp?.employeeCode})
                    </div>
                    <span className="text-[11px] text-[#667085]">Target Relieving: {req.requestedRelievingDate}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {req.clearances?.map((c) => (
                      <div key={c.id} className="p-3 rounded-xl border border-[#DCE8F0] bg-white flex flex-col justify-between">
                        <div>
                          <div className="font-bold text-xs text-[#17324A] mb-1">{c.department} NOC</div>
                          <div className="text-[10px] text-[#667085] mb-3">{c.remarks || 'Standard sign-off'}</div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${c.status === 'Cleared' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {c.status}
                          </span>
                          {isAdmin && c.status !== 'Cleared' && (
                            <button
                              onClick={() => handleUpdateClearance(c.id, 'Cleared')}
                              className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-emerald-700"
                            >
                              Clear NOC
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: F&F */}
      {activeTab === 'ff' && (
        <div className="rounded-2xl border border-[#D5E2EC] bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-base font-bold text-[#17324A]">Full & Final (F&F) Settlement Ledger</h2>
            <p className="text-xs text-[#667085]">Computed earnings (Payable Salary, Leave Encashment, Gratuity, Bonus) minus deductions (Pending Dues, Tax).</p>
          </div>

          <div className="space-y-4">
            {exitRequests.map((req) => {
              const emp = employees.find((e) => e.id === req.employeeId);
              const s = req.settlement;
              return (
                <div key={req.id} className="p-4 rounded-xl border border-[#D5E2EC] bg-[#FBFDFE] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-[#17324A]">{emp?.name || req.employeeId} ({emp?.employeeCode})</div>
                    <div className="text-[11px] text-[#667085] mt-0.5">
                      Payable Days: {s?.totalPayableDays || 30} · Leave Encashment: ₹{Number(s?.leaveEncashmentAmount || 0).toLocaleString('en-IN')} · Gratuity: ₹{Number(s?.gratuityAmount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] text-[#667085]">Net Settlement Amount</div>
                      <div className="text-sm font-extrabold text-emerald-700">₹{Number(s?.netSettlementAmount || 75000).toLocaleString('en-IN')}</div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedExitRequest(req);
                        setShowFfModal(true);
                      }}
                      className="rounded-lg bg-[#23587E] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1b4461]"
                    >
                      Recalculate
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: ALUMNI */}
      {activeTab === 'alumni' && (
        <div className="rounded-2xl border border-[#D5E2EC] bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-base font-bold text-[#17324A]">Immutable Alumni Directory</h2>
            <p className="text-xs text-[#667085]">Archived profiles of separated colleagues with links to official relieving and experience certificates.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alumniRecords.map((a) => (
              <div key={a.id} className="p-4 rounded-xl border border-[#D5E2EC] bg-[#FBFDFE] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-9 w-9 rounded-full bg-[#5B91B5]/10 flex items-center justify-center text-xs font-bold text-[#23587E]">
                      {a.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#17324A]">{a.name}</div>
                      <div className="text-[10px] text-[#667085]">{a.employeeCode} · {a.department}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-[#4B6882] space-y-1 bg-white p-2.5 rounded-lg border border-[#E2ECEF]">
                    <div>Last Designation: <span className="font-semibold text-[#17324A]">{a.lastDesignation}</span></div>
                    <div>Tenure: {a.joinDate} to {a.exitDate}</div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <a
                    href={a.relievingLetterUrl || '#'}
                    className="flex-1 rounded-lg bg-[#EBF4FA] py-1.5 text-center text-[11px] font-bold text-[#23587E] hover:bg-[#23587E] hover:text-white transition-all flex items-center justify-center gap-1"
                  >
                    <Download className="h-3 w-3" /> Relieving Letter
                  </a>
                  <a
                    href={a.experienceLetterUrl || '#'}
                    className="flex-1 rounded-lg bg-[#EBF4FA] py-1.5 text-center text-[11px] font-bold text-[#23587E] hover:bg-[#23587E] hover:text-white transition-all flex items-center justify-center gap-1"
                  >
                    <FileCheck className="h-3 w-3" /> Experience
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RESIGNATION MODAL */}
      {showResignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-sm font-bold text-[#17324A]">Submit Formal Resignation Notice</h3>
              <button onClick={() => setShowResignModal(false)}><X className="h-4 w-4 text-[#8FAEC5]" /></button>
            </div>
            <form onSubmit={handleSubmitResignation} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Requested Relieving Date</label>
                <input
                  type="date"
                  value={requestedDate}
                  onChange={(e) => setRequestedDate(e.target.value)}
                  className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Reason Category</label>
                <select
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value)}
                  className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                >
                  <option value="Career Growth">Career Growth</option>
                  <option value="Higher Education">Higher Education</option>
                  <option value="Personal Reasons">Personal Reasons</option>
                  <option value="Relocation">Relocation</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Detailed Explanation</label>
                <textarea
                  rows={3}
                  value={reasonDetails}
                  onChange={(e) => setReasonDetails(e.target.value)}
                  className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowResignModal(false)} className="rounded-xl px-4 py-2 text-xs font-bold text-[#667085] hover:bg-[#F4F8FA]">Cancel</button>
                <button type="submit" className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700">Submit Resignation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KT TASK MODAL */}
      {showKtModal && selectedExitRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-sm font-bold text-[#17324A]">Add Knowledge Transfer Task</h3>
              <button onClick={() => setShowKtModal(false)}><X className="h-4 w-4 text-[#8FAEC5]" /></button>
            </div>
            <form onSubmit={handleCreateKt} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Task Title</label>
                <input
                  type="text"
                  value={ktForm.title}
                  onChange={(e) => setKtForm({ ...ktForm, title: e.target.value })}
                  className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                  placeholder="e.g. AWS Production Credentials Handover"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={ktForm.description}
                  onChange={(e) => setKtForm({ ...ktForm, description: e.target.value })}
                  className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Recipient Colleague</label>
                  <select
                    value={ktForm.recipientEmployeeId}
                    onChange={(e) => {
                      const emp = employees.find((emp) => emp.id === e.target.value);
                      setKtForm({
                        ...ktForm,
                        recipientEmployeeId: e.target.value,
                        recipientName: emp?.name || 'Designated Colleague',
                      });
                    }}
                    className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                    required
                  >
                    <option value="">Select Recipient</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Due Date</label>
                  <input
                    type="date"
                    value={ktForm.dueDate}
                    onChange={(e) => setKtForm({ ...ktForm, dueDate: e.target.value })}
                    className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowKtModal(false)} className="rounded-xl px-4 py-2 text-xs font-bold text-[#667085] hover:bg-[#F4F8FA]">Cancel</button>
                <button type="submit" className="rounded-xl bg-[#23587E] px-4 py-2 text-xs font-bold text-white hover:bg-[#1b4461]">Save KT Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* F&F MODAL */}
      {showFfModal && selectedExitRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-sm font-bold text-[#17324A]">Calculate Full & Final Settlement</h3>
              <button onClick={() => setShowFfModal(false)}><X className="h-4 w-4 text-[#8FAEC5]" /></button>
            </div>
            <form onSubmit={handleCalculateFf} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Payable Days</label>
                  <input
                    type="number"
                    value={payableDays}
                    onChange={(e) => setPayableDays(e.target.value)}
                    className="w-full rounded-xl border border-[#CBDDE9] px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Basic Salary (₹)</label>
                  <input
                    type="number"
                    value={basicPay}
                    onChange={(e) => setBasicPay(e.target.value)}
                    className="w-full rounded-xl border border-[#CBDDE9] px-3 py-1.5 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Leave Encashment (₹)</label>
                  <input
                    type="number"
                    value={leaveEncash}
                    onChange={(e) => setLeaveEncash(e.target.value)}
                    className="w-full rounded-xl border border-[#CBDDE9] px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Gratuity Amount (₹)</label>
                  <input
                    type="number"
                    value={gratuity}
                    onChange={(e) => setGratuity(e.target.value)}
                    className="w-full rounded-xl border border-[#CBDDE9] px-3 py-1.5 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Bonus Payable (₹)</label>
                  <input
                    type="number"
                    value={bonus}
                    onChange={(e) => setBonus(e.target.value)}
                    className="w-full rounded-xl border border-[#CBDDE9] px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">Tax Deduction (₹)</label>
                  <input
                    type="number"
                    value={taxDeduction}
                    onChange={(e) => setTaxDeduction(e.target.value)}
                    className="w-full rounded-xl border border-[#CBDDE9] px-3 py-1.5 text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowFfModal(false)} className="rounded-xl px-4 py-2 text-xs font-bold text-[#667085] hover:bg-[#F4F8FA]">Cancel</button>
                <button type="submit" className="rounded-xl bg-[#23587E] px-4 py-2 text-xs font-bold text-white hover:bg-[#1b4461]">Save Settlement</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
