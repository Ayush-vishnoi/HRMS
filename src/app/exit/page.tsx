'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  DoorOpen,
  Download,
  Eye,
  FileCheck,
  FileText,
  MessageSquare,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Star,
  ThumbsUp,
  Undo2,
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

type ExitInterview = {
  id: string;
  exitRequestId: string;
  employeeId: string;
  feedbackText: string;
  primaryReason: string;
  ratingCompany: number;
  ratingManager: number;
  ratingCulture: number;
  wouldRecommend: boolean;
  conductedAt?: string | null;
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
  managerApprovedAt?: string | null;
  hrApprovedAt?: string | null;
  rejectionReason?: string | null;
  noticePeriodDays: number;
  status: string;
  workflowStage?: string | null;
  clearances: ExitClearance[];
  settlement?: FullAndFinalSettlement | null;
  ktTasks?: KtTask[];
  interview?: ExitInterview | null;
};

type ExitEmployeeInfo = {
  id: string;
  name: string;
  employeeCode: string;
  department: string;
  roleTitle: string;
  email: string;
  managerId?: string | null;
  avatarUrl?: string | null;
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

type WorkflowActionType = 'manager_approve' | 'manager_reject' | 'hr_approve' | 'hr_reject';

const INACTIVE_EXIT_STATUSES = ['Completed', 'Cancelled', 'Withdrawn', 'Rejected'];
const LETTER_ELIGIBLE_STAGES = ['Settled', 'Exited'];
const LETTER_ELIGIBLE_STATUSES = ['Settled', 'Completed'];
const WITHDRAWABLE_STAGES = ['Pending Manager Approval', 'Pending HR Approval'];
const FF_ELIGIBLE_STAGES = ['In Notice Period', 'Clearance In Progress', 'Settled'];

const STAGE_BADGE_CLASSES: Record<string, string> = {
  'Pending Manager Approval': 'bg-amber-100 text-amber-800',
  'Pending HR Approval': 'bg-blue-100 text-blue-800',
  'In Notice Period': 'bg-indigo-100 text-indigo-800',
  'Clearance In Progress': 'bg-violet-100 text-violet-800',
  Settled: 'bg-emerald-100 text-emerald-800',
  Exited: 'bg-slate-200 text-slate-700',
  Rejected: 'bg-rose-100 text-rose-800',
  Withdrawn: 'bg-gray-100 text-gray-600',
};

const INTERVIEW_REASONS = [
  'Career Growth',
  'Higher Education',
  'Personal Reasons',
  'Relocation',
  'Compensation',
  'Work Environment',
  'Manager Relationship',
  'Other',
];

const WORKFLOW_META: Record<
  WorkflowActionType,
  { title: string; description: string; confirmLabel: string; isReject: boolean }
> = {
  manager_approve: {
    title: 'Manager Approval',
    description:
      'Approve this resignation on behalf of the reporting manager. The request will then move to HR approval.',
    confirmLabel: 'Approve Resignation',
    isReject: false,
  },
  manager_reject: {
    title: 'Manager Rejection',
    description:
      'Reject this resignation on behalf of the reporting manager. A rejection reason is required.',
    confirmLabel: 'Reject Resignation',
    isReject: true,
  },
  hr_approve: {
    title: 'HR Approval',
    description:
      'Approve this resignation and confirm the final relieving date. The notice period will begin immediately.',
    confirmLabel: 'Approve & Start Notice Period',
    isReject: false,
  },
  hr_reject: {
    title: 'HR Rejection',
    description: 'Reject this resignation on behalf of HR. A rejection reason is required.',
    confirmLabel: 'Reject Resignation',
    isReject: true,
  },
};

const WORKFLOW_SUCCESS_TEXT: Record<WorkflowActionType, string> = {
  manager_approve: 'Manager approval recorded. The request is now pending HR approval.',
  manager_reject: 'Resignation rejected by the reporting manager.',
  hr_approve: 'HR approval recorded. The notice period is now in effect.',
  hr_reject: 'Resignation rejected by HR.',
};

function defaultRelievingDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 60);
  return d.toISOString().split('T')[0];
}

function fmtDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ExitPage() {
  const { currentUser, employees } = useHRMS();
  const isAdmin = currentUser.userRole === 'admin';
  const isManager = currentUser.userRole === 'manager';
  const canManageWorkflow = isAdmin || isManager;

  const [activeTab, setActiveTab] = useState<
    'requests' | 'interview' | 'kt' | 'clearance' | 'ff' | 'alumni'
  >('requests');
  const [exitRequests, setExitRequests] = useState<ExitRequest[]>([]);
  const [alumniRecords, setAlumniRecords] = useState<AlumniRecord[]>([]);
  const [exitEmployees, setExitEmployees] = useState<ExitEmployeeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  // Incremented after successful actions so the data effect below refetches.
  const [refreshTick, setRefreshTick] = useState(0);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [showResignModal, setShowResignModal] = useState(false);
  const [showFfModal, setShowFfModal] = useState(false);
  const [showKtModal, setShowKtModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [showDetailsRequestId, setShowDetailsRequestId] = useState<string | null>(null);
  // Derived during render so the open details modal always reflects the
  // freshest copy of the request (e.g. after an approval from inside it).
  const showDetailsRequest =
    showDetailsRequestId !== null
      ? exitRequests.find((r) => r.id === showDetailsRequestId) ?? null
      : null;
  const [selectedExitRequest, setSelectedExitRequest] = useState<ExitRequest | null>(null);
  const [selectedInterviewRequest, setSelectedInterviewRequest] = useState<ExitRequest | null>(null);
  const [workflowAction, setWorkflowAction] = useState<{
    type: WorkflowActionType;
    request: ExitRequest;
  } | null>(null);
  const [workflowRemarks, setWorkflowRemarks] = useState('');
  const [approvedRelievingDate, setApprovedRelievingDate] = useState('');

  // Resignation Form
  const [requestedDate, setRequestedDate] = useState(defaultRelievingDate());
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

  // Exit Interview Form
  const [interviewForm, setInterviewForm] = useState({
    primaryReason: 'Career Growth',
    ratingCompany: 4,
    ratingManager: 4,
    ratingCulture: 4,
    wouldRecommend: true,
    feedbackText: '',
  });

  // `loading` starts as `true`, so the initial fetch renders the loading row
  // immediately; refetches after actions keep existing rows visible (the
  // `busy` flag covers in-flight actions) instead of flashing a loader.
  useEffect(() => {
    const loadExitData = async () => {
      try {
        // Admins and managers need org-wide visibility (managers act on their
        // reports' requests); employees only see their own separation records.
        const url = canManageWorkflow
          ? '/api/exit'
          : `/api/exit?employeeId=${encodeURIComponent(currentUser.id)}`;

        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setExitRequests(json.data.exitRequests || []);
            setAlumniRecords(json.data.alumniRecords || []);
            setExitEmployees(json.data.employees || []);
          }
        }
      } catch (err) {
        console.error('Failed to fetch exit data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadExitData();
  }, [canManageWorkflow, currentUser.id, refreshTick]);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 6000);
    return () => clearTimeout(timer);
  }, [banner]);

  const postAction = async (
    payload: Record<string, unknown>,
    successText?: string,
  ): Promise<Record<string, unknown> | null> => {
    try {
      setBusy(true);
      const res = await fetch('/api/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        if (successText) setBanner({ type: 'success', text: successText });
        // Bump the counter so the data effect above refetches updated records.
        setRefreshTick((t) => t + 1);
        return (json.data ?? {}) as Record<string, unknown>;
      }
      setBanner({ type: 'error', text: json?.error || 'Action failed. Please try again.' });
      return null;
    } catch (err) {
      console.error('Exit action failed:', err);
      setBanner({ type: 'error', text: 'Network error. Please try again.' });
      return null;
    } finally {
      setBusy(false);
    }
  };

  // ---- Lookups & derived flags -------------------------------------------------

  const empById = (id: string): ExitEmployeeInfo | undefined =>
    exitEmployees.find((e) => e.id === id);

  const empName = (id: string): string =>
    empById(id)?.name || employees.find((e) => e.id === id)?.name || id;

  const empCode = (id: string): string =>
    empById(id)?.employeeCode || employees.find((e) => e.id === id)?.employeeCode || '';

  const empDept = (id: string): string =>
    empById(id)?.department || employees.find((e) => e.id === id)?.department || '';

  const stageLabel = (req: ExitRequest): string => req.workflowStage || req.status;

  const stageBadgeClass = (stage: string): string =>
    STAGE_BADGE_CLASSES[stage] || 'bg-gray-100 text-gray-600';

  const isManagerOf = (req: ExitRequest): boolean =>
    empById(req.employeeId)?.managerId === currentUser.id;

  const myActiveRequest = exitRequests.find(
    (r) => r.employeeId === currentUser.id && !INACTIVE_EXIT_STATUSES.includes(r.status),
  );

  const myCompletedRequest = exitRequests.find(
    (r) => r.employeeId === currentUser.id && r.status === 'Completed',
  );

  const interviewableRequests = exitRequests.filter(
    (r) => !['Withdrawn', 'Rejected'].includes(r.status),
  );

  // ---- Action handlers ----------------------------------------------------------

  const handleSubmitResignation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasonDetails.trim()) return;

    const result = await postAction(
      {
        action: 'submit_resignation',
        employeeId: currentUser.id,
        requestedRelievingDate: requestedDate,
        reasonCategory,
        reasonDetails,
      },
      'Resignation submitted. It is now pending manager approval.',
    );

    if (result) {
      setShowResignModal(false);
      setReasonDetails('');
    }
  };

  const openWorkflowModal = (type: WorkflowActionType, request: ExitRequest) => {
    setWorkflowAction({ type, request });
    setWorkflowRemarks('');
    setApprovedRelievingDate(request.approvedRelievingDate || request.requestedRelievingDate);
  };

  const handleWorkflowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workflowAction) return;
    const { type, request } = workflowAction;
    const meta = WORKFLOW_META[type];
    if (meta.isReject && !workflowRemarks.trim()) return;

    const payload: Record<string, unknown> = { action: type, exitRequestId: request.id };
    if (workflowRemarks.trim()) payload.remarks = workflowRemarks.trim();
    if (type === 'hr_approve' && approvedRelievingDate) {
      payload.approvedRelievingDate = approvedRelievingDate;
    }

    const result = await postAction(payload, WORKFLOW_SUCCESS_TEXT[type]);
    if (result) {
      setWorkflowAction(null);
      setWorkflowRemarks('');
    }
  };

  const handleWithdraw = async (req: ExitRequest) => {
    if (!confirm('Withdraw this resignation? This cannot be undone.')) return;
    await postAction(
      { action: 'withdraw_resignation', exitRequestId: req.id },
      'Resignation withdrawn.',
    );
  };

  const openInterviewModal = (req: ExitRequest) => {
    setSelectedInterviewRequest(req);
    setInterviewForm({
      primaryReason: req.reasonCategory || 'Career Growth',
      ratingCompany: 4,
      ratingManager: 4,
      ratingCulture: 4,
      wouldRecommend: true,
      feedbackText: '',
    });
    setShowInterviewModal(true);
  };

  const handleInterviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInterviewRequest) return;
    if (!interviewForm.feedbackText.trim()) return;

    const result = await postAction(
      {
        action: 'interview_submit',
        exitRequestId: selectedInterviewRequest.id,
        ...interviewForm,
      },
      'Exit interview feedback saved.',
    );

    if (result) {
      setShowInterviewModal(false);
      setInterviewForm((prev) => ({ ...prev, feedbackText: '' }));
    }
  };

  const handleCreateKt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExitRequest) return;

    const result = await postAction(
      {
        action: 'kt_task_create',
        exitRequestId: selectedExitRequest.id,
        ...ktForm,
      },
      'Knowledge transfer task created.',
    );

    if (result) {
      setShowKtModal(false);
      setKtForm({
        title: '',
        description: '',
        recipientEmployeeId: '',
        recipientName: 'Designated Team Member',
        dueDate: new Date().toISOString().split('T')[0],
      });
    }
  };

  const handleUpdateKt = async (taskId: string, status: string) => {
    await postAction({ action: 'kt_task_update', taskId, status }, 'KT task updated.');
  };

  const handleUpdateClearance = async (clearanceId: string, status: string) => {
    await postAction(
      {
        action: 'clearance_update',
        clearanceId,
        status,
        remarks: 'Clearance verified and approved by department authority.',
      },
      'Department clearance updated.',
    );
  };

  const openFfModal = (req: ExitRequest) => {
    setSelectedExitRequest(req);
    const s = req.settlement;
    setPayableDays(String(s?.totalPayableDays ?? 30));
    setBasicPay(String(s?.basicPay ?? 50000));
    setLeaveEncash(String(s?.leaveEncashmentAmount ?? 15000));
    setGratuity(String(s?.gratuityAmount ?? 25000));
    setBonus(String(s?.bonusPayable ?? 10000));
    setDuesDeduction(String(s?.pendingDuesDeduction ?? 0));
    setTaxDeduction(String(s?.taxDeduction ?? 5000));
    setShowFfModal(true);
  };

  const handleCalculateFf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExitRequest) return;

    const result = await postAction(
      {
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
      },
      'Full & Final settlement saved. Workflow stage is now Settled.',
    );

    if (result) setShowFfModal(false);
  };

  const handleGenerateLetter = async (
    req: ExitRequest,
    letterType: 'Relieving_Letter' | 'Experience_Letter',
  ) => {
    const label = letterType === 'Relieving_Letter' ? 'Relieving Letter' : 'Experience Letter';
    const data = await postAction(
      { action: 'generate_letter', exitRequestId: req.id, letterType },
      `${label} is ready.`,
    );
    const url = typeof data?.downloadUrl === 'string' ? data.downloadUrl : null;
    if (url) window.open(url, '_blank', 'noopener');
  };

  const handleCompleteExit = async (req: ExitRequest) => {
    if (
      !confirm(
        'Complete this separation? Official Relieving & Experience letters will be generated and added to the employee\u2019s Documents section, LOCKED until the notice period (relieving date) ends. The employee stays able to log in and download both letters once unlocked; after both downloads, account access is revoked automatically. The profile is archived to the Alumni Directory.',
      )
    ) {
      return;
    }

    await postAction(
      { action: 'complete_exit', exitRequestId: req.id, employeeId: req.employeeId },
      'Exit completed. Letters added to the employee\u2019s Documents (locked until the relieving date); access is revoked automatically after both letters are downloaded.',
    );
  };

  // ---- Render helpers -----------------------------------------------------------

  const renderStageBadge = (req: ExitRequest) => (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-extrabold whitespace-nowrap ${stageBadgeClass(
        stageLabel(req),
      )}`}
    >
      {stageLabel(req)}
    </span>
  );

  const renderRating = (label: string, value: number) => (
    <div className="rounded-lg border border-[#E2ECEF] bg-white p-2.5">
      <div className="text-[10px] font-bold uppercase tracking-wide text-[#5B768F]">{label}</div>
      <div className="mt-0.5 flex items-center gap-1 text-xs font-extrabold text-[#17324A]">
        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {value}/5
      </div>
    </div>
  );

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
            Resignation lifecycle with Manager → HR approvals, notice periods, exit interviews,
            5-department clearance NOC matrix, Knowledge Transfer (KT), F&F settlement, official
            letters, and the Alumni archive.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {myActiveRequest ? (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              Active resignation in progress · {stageLabel(myActiveRequest)}
            </div>
          ) : myCompletedRequest ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              Exit completed · letters available in Documents
            </div>
          ) : (
            <button
              onClick={() => setShowResignModal(true)}
              className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-rose-700 transition-all"
            >
              <UserMinus className="h-3.5 w-3.5" /> Submit Resignation
            </button>
          )}
        </div>
      </div>

      {/* Action Feedback Banner */}
      {banner && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold ${
            banner.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {banner.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          {banner.text}
        </div>
      )}

      {/* Switcher Tabs */}
      <div className="flex border-b border-[#E2ECEF] overflow-x-auto gap-2 bg-white/70 p-1.5 rounded-2xl border backdrop-blur-sm">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'requests'
              ? 'bg-[#23587E] text-white shadow-sm'
              : 'text-[#567089] hover:bg-[#F4F8FA] hover:text-[#17324A]'
          }`}
        >
          <Clock className="h-3.5 w-3.5" /> Resignation Notices ({exitRequests.length})
        </button>

        <button
          onClick={() => setActiveTab('interview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'interview'
              ? 'bg-[#23587E] text-white shadow-sm'
              : 'text-[#567089] hover:bg-[#F4F8FA] hover:text-[#17324A]'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" /> Exit Interview (
          {interviewableRequests.filter((r) => r.interview).length}/
          {interviewableRequests.length})
        </button>

        <button
          onClick={() => setActiveTab('kt')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'kt'
              ? 'bg-[#23587E] text-white shadow-sm'
              : 'text-[#567089] hover:bg-[#F4F8FA] hover:text-[#17324A]'
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" /> Knowledge Transfer (KT)
        </button>

        <button
          onClick={() => setActiveTab('clearance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'clearance'
              ? 'bg-[#23587E] text-white shadow-sm'
              : 'text-[#567089] hover:bg-[#F4F8FA] hover:text-[#17324A]'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" /> 5-Department NOC Clearance
        </button>

        <button
          onClick={() => setActiveTab('ff')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'ff'
              ? 'bg-[#23587E] text-white shadow-sm'
              : 'text-[#567089] hover:bg-[#F4F8FA] hover:text-[#17324A]'
          }`}
        >
          <Wallet className="h-3.5 w-3.5" /> Full & Final (F&F) Settlements
        </button>

        <button
          onClick={() => setActiveTab('alumni')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
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
            <div>
              <h2 className="text-base font-bold text-[#17324A]">
                Resignation & Notice Period Requests
              </h2>
              <p className="text-xs text-[#667085] mt-0.5">
                Workflow: Submitted → Manager Approval → HR Approval → Notice Period → Clearance →
                Settled → Exited. Only one active resignation is allowed per employee.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E2ECEF] bg-[#F8FAFC] text-[11px] font-extrabold uppercase text-[#5B768F]">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Notice Date</th>
                  <th className="py-3 px-4">Relieving Date</th>
                  <th className="py-3 px-4">Workflow Stage</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Clearance</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBF1F5]">
                {loading && exitRequests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-[#8FAEC5]">
                      Loading exit data…
                    </td>
                  </tr>
                )}
                {!loading && exitRequests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-[#8FAEC5]">
                      No resignation requests found.
                    </td>
                  </tr>
                )}
                {exitRequests.map((req) => {
                  const clearedCount =
                    req.clearances?.filter((c) => c.status === 'Cleared').length || 0;
                  const totalCount = req.clearances?.length || 5;
                  const stage = req.workflowStage || '';
                  const isOwn = req.employeeId === currentUser.id;
                  const isDone = req.status === 'Completed' || stage === 'Exited';

                  const canWithdraw = isOwn && WITHDRAWABLE_STAGES.includes(stage);
                  const letterEligible =
                    LETTER_ELIGIBLE_STAGES.includes(stage) ||
                    LETTER_ELIGIBLE_STATUSES.includes(req.status);
                  const canCalculateFf = isAdmin && FF_ELIGIBLE_STAGES.includes(stage);
                  const canCompleteExit = isAdmin && stage === 'Settled';

                  return (
                    <tr key={req.id} className="hover:bg-[#F9FBFC] transition-colors align-top">
                      <td className="py-3.5 px-4 font-bold text-[#17324A]">
                        <div>{empName(req.employeeId)}</div>
                        <div className="text-[10px] text-[#667085]">
                          {empCode(req.employeeId)} · {empDept(req.employeeId)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#4B6882]">{fmtDate(req.resignationDate)}</td>
                      <td className="py-3.5 px-4 font-bold text-[#17324A]">
                        {fmtDate(req.approvedRelievingDate || req.requestedRelievingDate)}
                        {req.approvedRelievingDate &&
                          req.approvedRelievingDate !== req.requestedRelievingDate && (
                            <span className="ml-1 text-[9px] font-bold text-emerald-600">
                              (approved)
                            </span>
                          )}
                      </td>
                      <td className="py-3.5 px-4">{renderStageBadge(req)}</td>
                      <td className="py-3.5 px-4 text-[#4B6882]">{req.reasonCategory}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            clearedCount === totalCount
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {clearedCount}/{totalCount} Cleared
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            onClick={() => setShowDetailsRequestId(req.id)}
                            className="flex items-center gap-1 rounded-lg bg-[#EBF4FA] px-2.5 py-1 text-[11px] font-bold text-[#23587E] hover:bg-[#23587E] hover:text-white transition-all"
                          >
                            <Eye className="h-3 w-3" /> View
                          </button>

                          {canWithdraw && (
                            <button
                              onClick={() => handleWithdraw(req)}
                              disabled={busy}
                              className="flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-200 disabled:opacity-50"
                            >
                              <Undo2 className="h-3 w-3" /> Withdraw
                            </button>
                          )}

                          {canCalculateFf && (
                            <button
                              onClick={() => openFfModal(req)}
                              disabled={busy}
                              className="rounded-lg bg-[#EBF4FA] px-2.5 py-1 text-[11px] font-bold text-[#23587E] hover:bg-[#23587E] hover:text-white transition-all disabled:opacity-50"
                            >
                              Calculate F&F
                            </button>
                          )}

                          {isAdmin && letterEligible && (
                            <>
                              <button
                                onClick={() => handleGenerateLetter(req, 'Relieving_Letter')}
                                disabled={busy}
                                className="flex items-center gap-1 rounded-lg bg-[#EBF4FA] px-2.5 py-1 text-[11px] font-bold text-[#23587E] hover:bg-[#23587E] hover:text-white transition-all disabled:opacity-50"
                              >
                                <FileText className="h-3 w-3" /> Relieving
                              </button>
                              <button
                                onClick={() => handleGenerateLetter(req, 'Experience_Letter')}
                                disabled={busy}
                                className="flex items-center gap-1 rounded-lg bg-[#EBF4FA] px-2.5 py-1 text-[11px] font-bold text-[#23587E] hover:bg-[#23587E] hover:text-white transition-all disabled:opacity-50"
                              >
                                <FileCheck className="h-3 w-3" /> Experience
                              </button>
                            </>
                          )}

                          {canCompleteExit && (
                            <button
                              onClick={() => handleCompleteExit(req)}
                              disabled={busy}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Complete Exit
                            </button>
                          )}

                          {isDone && (
                            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Offboarded to Alumni
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: EXIT INTERVIEW */}
      {activeTab === 'interview' && (
        <div className="rounded-2xl border border-[#D5E2EC] bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-base font-bold text-[#17324A]">Exit Interview Feedback</h2>
            <p className="text-xs text-[#667085]">
              Structured separation survey — primary reason, company/manager/culture ratings, and
              open feedback — captured before the final relieving date.
            </p>
          </div>

          <div className="space-y-4">
            {interviewableRequests.length === 0 && (
              <p className="text-xs text-[#8FAEC5] py-4">
                No active separations to interview. Submit a resignation to begin.
              </p>
            )}
            {interviewableRequests.map((req) => {
              const iv = req.interview;
              const canSubmit = isAdmin || req.employeeId === currentUser.id;
              return (
                <div key={req.id} className="p-4 rounded-xl border border-[#D5E2EC] bg-[#FBFDFE]">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 mb-3">
                    <div className="font-bold text-xs text-[#17324A]">
                      Exit Interview for{' '}
                      <span className="text-[#23587E]">{empName(req.employeeId)}</span> (
                      {empCode(req.employeeId)}) · {empDept(req.employeeId)}
                    </div>
                    <div className="flex items-center gap-2">
                      {renderStageBadge(req)}
                      {iv && (
                        <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Submitted
                        </span>
                      )}
                    </div>
                  </div>

                  {iv ? (
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        {renderRating('Company Rating', iv.ratingCompany)}
                        {renderRating('Manager Rating', iv.ratingManager)}
                        {renderRating('Culture Rating', iv.ratingCulture)}
                      </div>
                      <div className="text-[11px] text-[#4B6882] bg-white p-3 rounded-lg border border-[#E2ECEF]">
                        {iv.feedbackText}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-2.5 text-[10px]">
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-extrabold">
                          Primary Reason: {iv.primaryReason}
                        </span>
                        <span
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-extrabold ${
                            iv.wouldRecommend
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          <ThumbsUp className="h-3 w-3" />
                          {iv.wouldRecommend ? 'Would Recommend' : 'Would Not Recommend'}
                        </span>
                        <span className="text-[#8FAEC5]">
                          Conducted {fmtDate(iv.conductedAt)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <p className="text-xs text-[#8FAEC5]">
                        Interview feedback has not been recorded yet.
                      </p>
                      {canSubmit && (
                        <button
                          onClick={() => openInterviewModal(req)}
                          disabled={busy}
                          className="flex items-center gap-1.5 rounded-xl bg-[#23587E] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#1b4461] disabled:opacity-50"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          {isAdmin ? 'Record Interview' : 'Submit Feedback'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: KNOWLEDGE TRANSFER */}
      {activeTab === 'kt' && (
        <div className="rounded-2xl border border-[#D5E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-base font-bold text-[#17324A]">
                Knowledge Transfer (KT) Handover Checklist
              </h2>
              <p className="text-xs text-[#667085]">
                Ensure comprehensive project, credentials, and documentation transfer prior to final
                relieving.
              </p>
            </div>
            {canManageWorkflow && exitRequests.length > 0 && (
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
            {exitRequests.length === 0 && (
              <p className="text-xs text-[#8FAEC5] py-2">No active separations found.</p>
            )}
            {exitRequests.map((req) => {
              return (
                <div key={req.id} className="p-4 rounded-xl border border-[#D5E2EC] bg-[#FBFDFE]">
                  <div className="flex items-center justify-between border-b pb-3 mb-3">
                    <div className="font-bold text-xs text-[#17324A]">
                      KT Handover for:{' '}
                      <span className="text-[#23587E]">{empName(req.employeeId)}</span> (
                      {empDept(req.employeeId)})
                    </div>
                    <span className="text-[11px] text-[#667085]">
                      Relieving: {fmtDate(req.approvedRelievingDate || req.requestedRelievingDate)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {req.ktTasks?.length === 0 ? (
                      <p className="text-xs text-[#8FAEC5] py-2">No KT tasks assigned yet.</p>
                    ) : (
                      req.ktTasks?.map((kt) => (
                        <div
                          key={kt.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-white border border-[#E2ECEF]"
                        >
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-[#17324A]">{kt.title}</div>
                            <div className="text-[11px] text-[#667085]">{kt.description}</div>
                            <div className="text-[10px] text-[#4B6882]">
                              Recipient: <span className="font-semibold">{kt.recipientName}</span> ·
                              Due: {fmtDate(kt.dueDate)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {kt.status !== 'Verified' &&
                              kt.status !== 'Completed' &&
                              kt.recipientEmployeeId === currentUser.id && (
                                <button
                                  onClick={() => handleUpdateKt(kt.id, 'Completed')}
                                  disabled={busy}
                                  className="rounded-md bg-[#23587E] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#1b4461] disabled:opacity-50"
                                >
                                  Mark Completed
                                </button>
                              )}
                            {kt.status !== 'Verified' && canManageWorkflow && (
                              <button
                                onClick={() => handleUpdateKt(kt.id, 'Verified')}
                                disabled={busy}
                                className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                Verify Handover
                              </button>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                kt.status === 'Verified'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : kt.status === 'Completed'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                              }`}
                            >
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

      {/* TAB 4: CLEARANCE MATRIX */}
      {activeTab === 'clearance' && (
        <div className="rounded-2xl border border-[#D5E2EC] bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-base font-bold text-[#17324A]">5-Department NOC Clearance Matrix</h2>
            <p className="text-xs text-[#667085]">
              Sign-offs required across IT, Finance, HR, Manager, and Admin before F&F calculation
              and relieving issuance. Clearing a NOC moves the workflow to Clearance In Progress.
            </p>
          </div>

          <div className="space-y-6">
            {exitRequests.length === 0 && (
              <p className="text-xs text-[#8FAEC5] py-2">No active separations found.</p>
            )}
            {exitRequests.map((req) => {
              return (
                <div key={req.id} className="rounded-xl border border-[#D5E2EC] p-5 bg-[#FBFDFE]">
                  <div className="flex items-center justify-between border-b pb-3 mb-4">
                    <div className="font-bold text-xs text-[#17324A]">
                      Separation Clearances for{' '}
                      <span className="text-[#23587E]">{empName(req.employeeId)}</span> (
                      {empCode(req.employeeId)})
                    </div>
                    <span className="text-[11px] text-[#667085]">
                      Target Relieving:{' '}
                      {fmtDate(req.approvedRelievingDate || req.requestedRelievingDate)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {req.clearances?.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl border border-[#DCE8F0] bg-white flex flex-col justify-between"
                      >
                        <div>
                          <div className="font-bold text-xs text-[#17324A] mb-1">
                            {c.department} NOC
                          </div>
                          <div className="text-[10px] text-[#667085] mb-3">
                            {c.remarks || 'Standard sign-off'}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              c.status === 'Cleared'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {c.status}
                          </span>
                          {canManageWorkflow && c.status !== 'Cleared' && (
                            <button
                              onClick={() => handleUpdateClearance(c.id, 'Cleared')}
                              disabled={busy}
                              className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
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

      {/* TAB 5: F&F */}
      {activeTab === 'ff' && (
        <div className="rounded-2xl border border-[#D5E2EC] bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-base font-bold text-[#17324A]">Full & Final (F&F) Settlement Ledger</h2>
            <p className="text-xs text-[#667085]">
              Computed earnings (Payable Salary, Leave Encashment, Gratuity, Bonus) minus deductions
              (Pending Dues, Tax). Saving a settlement marks the workflow stage as Settled and
              unlocks official letter generation.
            </p>
          </div>

          <div className="space-y-4">
            {exitRequests.length === 0 && (
              <p className="text-xs text-[#8FAEC5] py-2">No active separations found.</p>
            )}
            {exitRequests.map((req) => {
              const s = req.settlement;
              return (
                <div
                  key={req.id}
                  className="p-4 rounded-xl border border-[#D5E2EC] bg-[#FBFDFE] flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-xs font-bold text-[#17324A]">
                      {empName(req.employeeId)} ({empCode(req.employeeId)}) {renderStageBadge(req)}
                    </div>
                    {s ? (
                      <div className="text-[11px] text-[#667085] mt-0.5">
                        Payable Days: {s.totalPayableDays} · Leave Encashment: ₹
                        {Number(s.leaveEncashmentAmount).toLocaleString('en-IN')} · Gratuity: ₹
                        {Number(s.gratuityAmount).toLocaleString('en-IN')}
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#8FAEC5] mt-0.5">
                        Settlement not calculated yet.
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] text-[#667085]">Net Settlement Amount</div>
                      <div className="text-sm font-extrabold text-emerald-700">
                        {s
                          ? `₹${Number(s.netSettlementAmount).toLocaleString('en-IN')}`
                          : '—'}
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => openFfModal(req)}
                        disabled={busy}
                        className="rounded-lg bg-[#23587E] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1b4461] disabled:opacity-50"
                      >
                        {s ? 'Recalculate' : 'Calculate'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 6: ALUMNI */}
      {activeTab === 'alumni' && (
        <div className="rounded-2xl border border-[#D5E2EC] bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-base font-bold text-[#17324A]">Immutable Alumni Directory</h2>
            <p className="text-xs text-[#667085]">
              Archived profiles of separated colleagues with links to official relieving and
              experience certificates generated through the document template system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alumniRecords.length === 0 && (
              <p className="text-xs text-[#8FAEC5] py-2">No alumni records yet.</p>
            )}
            {alumniRecords.map((a) => (
              <div
                key={a.id}
                className="p-4 rounded-xl border border-[#D5E2EC] bg-[#FBFDFE] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-9 w-9 rounded-full bg-[#5B91B5]/10 flex items-center justify-center text-xs font-bold text-[#23587E]">
                      {a.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#17324A]">{a.name}</div>
                      <div className="text-[10px] text-[#667085]">
                        {a.employeeCode} · {a.department}
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-[#4B6882] space-y-1 bg-white p-2.5 rounded-lg border border-[#E2ECEF]">
                    <div>
                      Last Designation:{' '}
                      <span className="font-semibold text-[#17324A]">{a.lastDesignation}</span>
                    </div>
                    <div>
                      Tenure: {fmtDate(a.joinDate)} to {fmtDate(a.exitDate)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <a
                    href={a.relievingLetterUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 rounded-lg bg-[#EBF4FA] py-1.5 text-center text-[11px] font-bold text-[#23587E] hover:bg-[#23587E] hover:text-white transition-all flex items-center justify-center gap-1"
                  >
                    <Download className="h-3 w-3" /> Relieving Letter
                  </a>
                  <a
                    href={a.experienceLetterUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
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
              <button onClick={() => setShowResignModal(false)}>
                <X className="h-4 w-4 text-[#8FAEC5]" />
              </button>
            </div>
            <form onSubmit={handleSubmitResignation} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#4B6882] mb-1">
                  Requested Relieving Date
                </label>
                <input
                  type="date"
                  value={requestedDate}
                  onChange={(e) => setRequestedDate(e.target.value)}
                  className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#4B6882] mb-1">
                  Reason Category
                </label>
                <select
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value)}
                  className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                >
                  {INTERVIEW_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#4B6882] mb-1">
                  Detailed Explanation
                </label>
                <textarea
                  rows={3}
                  value={reasonDetails}
                  onChange={(e) => setReasonDetails(e.target.value)}
                  className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                  required
                />
              </div>
              <p className="text-[10px] text-[#8FAEC5]">
                Only one active resignation is allowed per employee. Once submitted, the request
                goes to your reporting manager for approval, then to HR.
              </p>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowResignModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-[#667085] hover:bg-[#F4F8FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  Submit Resignation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WORKFLOW APPROVAL MODAL (z-[60] so it stacks above the details modal) */}
      {workflowAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-[#17324A]">
                {workflowAction.type.startsWith('manager') ? (
                  <UserCheck className="h-4 w-4 text-[#23587E]" />
                ) : (
                  <ShieldCheck className="h-4 w-4 text-[#23587E]" />
                )}
                {WORKFLOW_META[workflowAction.type].title}
              </h3>
              <button onClick={() => setWorkflowAction(null)}>
                <X className="h-4 w-4 text-[#8FAEC5]" />
              </button>
            </div>
            <form onSubmit={handleWorkflowSubmit} className="space-y-3.5 text-xs">
              <div className="rounded-xl border border-[#E2ECEF] bg-[#F8FAFC] p-3">
                <div className="font-bold text-[#17324A]">
                  {empName(workflowAction.request.employeeId)} (
                  {empCode(workflowAction.request.employeeId)})
                </div>
                <div className="text-[11px] text-[#667085] mt-0.5">
                  Notice Date: {fmtDate(workflowAction.request.resignationDate)} · Requested
                  Relieving: {fmtDate(workflowAction.request.requestedRelievingDate)} · Reason:{' '}
                  {workflowAction.request.reasonCategory}
                </div>
              </div>

              <p className="text-[11px] text-[#667085]">
                {WORKFLOW_META[workflowAction.type].description}
              </p>

              {workflowAction.type === 'hr_approve' && (
                <div>
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">
                    Approved Relieving Date
                  </label>
                  <input
                    type="date"
                    value={approvedRelievingDate}
                    onChange={(e) => setApprovedRelievingDate(e.target.value)}
                    className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[#4B6882] mb-1">
                  {WORKFLOW_META[workflowAction.type].isReject
                    ? 'Rejection Reason (required)'
                    : 'Remarks (optional)'}
                </label>
                <textarea
                  rows={3}
                  value={workflowRemarks}
                  onChange={(e) => setWorkflowRemarks(e.target.value)}
                  className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                  required={WORKFLOW_META[workflowAction.type].isReject}
                  placeholder={
                    WORKFLOW_META[workflowAction.type].isReject
                      ? 'Explain why this resignation is being rejected…'
                      : 'Optional note for the employee…'
                  }
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setWorkflowAction(null)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-[#667085] hover:bg-[#F4F8FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className={`rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-50 ${
                    WORKFLOW_META[workflowAction.type].isReject
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {WORKFLOW_META[workflowAction.type].confirmLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXIT INTERVIEW MODAL */}
      {showInterviewModal && selectedInterviewRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-[#17324A]">
                <MessageSquare className="h-4 w-4 text-[#23587E]" /> Exit Interview Feedback
              </h3>
              <button onClick={() => setShowInterviewModal(false)}>
                <X className="h-4 w-4 text-[#8FAEC5]" />
              </button>
            </div>
            <form onSubmit={handleInterviewSubmit} className="space-y-3.5 text-xs">
              <div className="rounded-xl border border-[#E2ECEF] bg-[#F8FAFC] p-3 text-[11px] text-[#667085]">
                <span className="font-bold text-[#17324A]">
                  {empName(selectedInterviewRequest.employeeId)}
                </span>{' '}
                · {empDept(selectedInterviewRequest.employeeId)} · Relieving{' '}
                {fmtDate(
                  selectedInterviewRequest.approvedRelievingDate ||
                    selectedInterviewRequest.requestedRelievingDate,
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#4B6882] mb-1">
                  Primary Reason for Leaving
                </label>
                <select
                  value={interviewForm.primaryReason}
                  onChange={(e) =>
                    setInterviewForm({ ...interviewForm, primaryReason: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                >
                  {INTERVIEW_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">
                    Company Rating
                  </label>
                  <select
                    value={interviewForm.ratingCompany}
                    onChange={(e) =>
                      setInterviewForm({ ...interviewForm, ratingCompany: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-[#CBDDE9] px-2 py-2 text-xs"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} / 5
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">
                    Manager Rating
                  </label>
                  <select
                    value={interviewForm.ratingManager}
                    onChange={(e) =>
                      setInterviewForm({ ...interviewForm, ratingManager: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-[#CBDDE9] px-2 py-2 text-xs"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} / 5
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">
                    Culture Rating
                  </label>
                  <select
                    value={interviewForm.ratingCulture}
                    onChange={(e) =>
                      setInterviewForm({ ...interviewForm, ratingCulture: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-[#CBDDE9] px-2 py-2 text-xs"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} / 5
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 rounded-xl border border-[#E2ECEF] bg-[#F8FAFC] px-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={interviewForm.wouldRecommend}
                  onChange={(e) =>
                    setInterviewForm({ ...interviewForm, wouldRecommend: e.target.checked })
                  }
                  className="h-3.5 w-3.5 accent-[#23587E]"
                />
                <ThumbsUp className="h-3.5 w-3.5 text-[#23587E]" />
                <span className="text-[11px] font-bold text-[#4B6882]">
                  Would you recommend this company to others?
                </span>
              </label>

              <div>
                <label className="block text-[11px] font-bold text-[#4B6882] mb-1">
                  Detailed Feedback (required)
                </label>
                <textarea
                  rows={4}
                  value={interviewForm.feedbackText}
                  onChange={(e) =>
                    setInterviewForm({ ...interviewForm, feedbackText: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#CBDDE9] px-3 py-2 text-xs"
                  placeholder="What went well? What could we improve? Share your experience working here…"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowInterviewModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-[#667085] hover:bg-[#F4F8FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-[#23587E] px-4 py-2 text-xs font-bold text-white hover:bg-[#1b4461] disabled:opacity-50"
                >
                  Save Interview Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      {showDetailsRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-[#17324A]">
                <Eye className="h-4 w-4 text-[#23587E]" /> Separation Details
              </h3>
              <button onClick={() => setShowDetailsRequestId(null)}>
                <X className="h-4 w-4 text-[#8FAEC5]" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-extrabold text-[#17324A]">
                    {empName(showDetailsRequest.employeeId)}
                  </div>
                  <div className="text-[11px] text-[#667085]">
                    {empCode(showDetailsRequest.employeeId)} ·{' '}
                    {empDept(showDetailsRequest.employeeId)} ·{' '}
                    {empById(showDetailsRequest.employeeId)?.roleTitle || ''}
                  </div>
                </div>
                {renderStageBadge(showDetailsRequest)}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-[#E2ECEF] bg-[#F8FAFC] p-2.5">
                  <div className="text-[10px] font-bold uppercase text-[#5B768F]">Notice Date</div>
                  <div className="font-bold text-[#17324A]">
                    {fmtDate(showDetailsRequest.resignationDate)}
                  </div>
                </div>
                <div className="rounded-xl border border-[#E2ECEF] bg-[#F8FAFC] p-2.5">
                  <div className="text-[10px] font-bold uppercase text-[#5B768F]">
                    Requested Relieving
                  </div>
                  <div className="font-bold text-[#17324A]">
                    {fmtDate(showDetailsRequest.requestedRelievingDate)}
                  </div>
                </div>
                <div className="rounded-xl border border-[#E2ECEF] bg-[#F8FAFC] p-2.5">
                  <div className="text-[10px] font-bold uppercase text-[#5B768F]">
                    Approved Relieving
                  </div>
                  <div className="font-bold text-[#17324A]">
                    {fmtDate(showDetailsRequest.approvedRelievingDate)}
                  </div>
                </div>
                <div className="rounded-xl border border-[#E2ECEF] bg-[#F8FAFC] p-2.5">
                  <div className="text-[10px] font-bold uppercase text-[#5B768F]">
                    Notice Period
                  </div>
                  <div className="font-bold text-[#17324A]">
                    {showDetailsRequest.noticePeriodDays} Days
                  </div>
                </div>
                <div className="rounded-xl border border-[#E2ECEF] bg-[#F8FAFC] p-2.5">
                  <div className="text-[10px] font-bold uppercase text-[#5B768F]">Reason</div>
                  <div className="font-bold text-[#17324A]">
                    {showDetailsRequest.reasonCategory}
                  </div>
                </div>
                <div className="rounded-xl border border-[#E2ECEF] bg-[#F8FAFC] p-2.5">
                  <div className="text-[10px] font-bold uppercase text-[#5B768F]">Status</div>
                  <div className="font-bold text-[#17324A]">{showDetailsRequest.status}</div>
                </div>
              </div>

              <div className="rounded-xl border border-[#B9DDEF] bg-[#EBF4FA] p-3">
                <div className="text-[10px] font-bold uppercase text-[#23587E] mb-1.5">
                  Reason for Resignation
                </div>
                <span className="inline-block px-2 py-0.5 rounded-full bg-[#23587E] text-white text-[10px] font-extrabold mb-1.5">
                  {showDetailsRequest.reasonCategory}
                </span>
                <div className="text-[11px] font-medium text-[#17324A]">
                  {showDetailsRequest.reasonDetails || 'No additional details provided.'}
                </div>
              </div>

              <div className="rounded-xl border border-[#E2ECEF] bg-white p-3">
                <div className="text-[10px] font-bold uppercase text-[#5B768F] mb-2">
                  Knowledge Transfer Alternative
                </div>
                {showDetailsRequest.ktTasks?.length ? (
                  <div className="space-y-2">
                    {showDetailsRequest.ktTasks.map((kt) => (
                      <div
                        key={kt.id}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2ECEF]"
                      >
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-[#17324A]">{kt.title}</div>
                          {kt.description && (
                            <div className="text-[11px] text-[#667085]">{kt.description}</div>
                          )}
                          <div className="text-[10px] text-[#4B6882]">
                            KT Recipient:{' '}
                            <span className="font-bold text-[#17324A]">{kt.recipientName}</span>
                            {kt.dueDate ? ` · Due: ${fmtDate(kt.dueDate)}` : ''}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            kt.status === 'Verified'
                              ? 'bg-emerald-100 text-emerald-800'
                              : kt.status === 'Completed'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {kt.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-[#8FAEC5]">
                    No KT alternative assigned yet — a knowledge transfer recipient will be
                    assigned by the manager/HR.
                  </p>
                )}
              </div>

              {showDetailsRequest.rejectionReason && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                  <div>
                    <div className="text-[11px] font-extrabold text-rose-800">
                      {showDetailsRequest.status === 'Withdrawn'
                        ? 'Withdrawn'
                        : 'Rejection Reason'}
                    </div>
                    <div className="text-[11px] text-rose-700">
                      {showDetailsRequest.rejectionReason}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <div className="text-[10px] font-bold uppercase text-[#5B768F] mb-2">
                  Workflow Timeline
                </div>
                {(() => {
                  const req = showDetailsRequest;
                  const clearedCount =
                    req.clearances?.filter((c) => c.status === 'Cleared').length || 0;
                  const totalCount = req.clearances?.length || 5;
                  const stage = req.workflowStage || '';
                  const noticeStarted = [
                    'In Notice Period',
                    'Clearance In Progress',
                    'Settled',
                    'Exited',
                  ].includes(stage);
                  const steps = [
                    {
                      label: 'Resignation Submitted',
                      done: true,
                      detail: `Submitted on ${fmtDate(req.resignationDate)}`,
                    },
                    {
                      label: 'Manager Approval',
                      done: req.managerApproval === 'Approved',
                      detail:
                        req.managerApproval === 'Approved'
                          ? `Approved${req.managerApprovedAt ? ` · ${fmtDate(req.managerApprovedAt)}` : ''}`
                          : req.managerApproval === 'Rejected'
                            ? 'Rejected'
                            : 'Pending',
                    },
                    {
                      label: 'HR Approval',
                      done: req.hrApproval === 'Approved',
                      detail:
                        req.hrApproval === 'Approved'
                          ? `Approved${req.hrApprovedAt ? ` · ${fmtDate(req.hrApprovedAt)}` : ''}`
                          : req.hrApproval === 'Rejected'
                            ? 'Rejected'
                            : 'Pending',
                    },
                    {
                      label: 'Notice Period',
                      done: noticeStarted,
                      detail: `Relieving on ${fmtDate(req.approvedRelievingDate || req.requestedRelievingDate)}`,
                    },
                    {
                      label: 'Department Clearance',
                      done: totalCount > 0 && clearedCount === totalCount,
                      detail: `${clearedCount}/${totalCount} NOCs cleared`,
                    },
                    {
                      label: 'F&F Settlement',
                      done: !!req.settlement,
                      detail: req.settlement
                        ? `Net ₹${Number(req.settlement.netSettlementAmount).toLocaleString('en-IN')}`
                        : 'Pending calculation',
                    },
                    {
                      label: 'Exit Interview',
                      done: !!req.interview,
                      detail: req.interview
                        ? `Submitted${req.interview.conductedAt ? ` · ${fmtDate(req.interview.conductedAt)}` : ''}`
                        : 'Pending',
                    },
                    {
                      label: 'Relieved & Archived to Alumni',
                      done: stage === 'Exited' || req.status === 'Completed',
                      detail:
                        stage === 'Exited' || req.status === 'Completed'
                          ? 'Employee status set to Exited'
                          : 'Pending',
                    },
                  ];
                  return (
                    <div>
                      {steps.map((s, i) => (
                        <div key={s.label} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div
                              className={`flex h-6 w-6 items-center justify-center rounded-full ${
                                s.done
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              {s.done ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                            </div>
                            {i < steps.length - 1 && <div className="h-6 w-px bg-[#E2ECEF]" />}
                          </div>
                          <div className="pb-4">
                            <div
                              className={`text-xs font-bold ${s.done ? 'text-[#17324A]' : 'text-[#8FAEC5]'}`}
                            >
                              {s.label}
                            </div>
                            {s.detail && (
                              <div className="text-[11px] text-[#667085]">{s.detail}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {(() => {
                const req = showDetailsRequest;
                const stage = req.workflowStage || '';
                const canManagerAct =
                  (isAdmin || (isManager && isManagerOf(req))) && stage === 'Pending Manager Approval';
                const canHrAct = isAdmin && stage === 'Pending HR Approval';
                return (
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t">
                    {(canManagerAct || canHrAct) && (
                      <button
                        onClick={() =>
                          openWorkflowModal(
                            canManagerAct ? 'manager_approve' : 'hr_approve',
                            req,
                          )
                        }
                        disabled={busy}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <UserCheck className="h-3.5 w-3.5" /> Approve
                      </button>
                    )}
                    {(canManagerAct || canHrAct) && (
                      <button
                        onClick={() =>
                          openWorkflowModal(
                            canManagerAct ? 'manager_reject' : 'hr_reject',
                            req,
                          )
                        }
                        disabled={busy}
                        className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                      >
                        <Ban className="h-3.5 w-3.5" /> Reject
                      </button>
                    )}
                    <button
                      onClick={() => setShowDetailsRequestId(null)}
                      className="rounded-xl bg-[#23587E] px-4 py-2 text-xs font-bold text-white hover:bg-[#1b4461]"
                    >
                      Close
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* KT TASK MODAL */}
      {showKtModal && selectedExitRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-sm font-bold text-[#17324A]">Add Knowledge Transfer Task</h3>
              <button onClick={() => setShowKtModal(false)}>
                <X className="h-4 w-4 text-[#8FAEC5]" />
              </button>
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
                <label className="block text-[11px] font-bold text-[#4B6882] mb-1">
                  Description
                </label>
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
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">
                    Recipient Colleague
                  </label>
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
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
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
                <button
                  type="button"
                  onClick={() => setShowKtModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-[#667085] hover:bg-[#F4F8FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-[#23587E] px-4 py-2 text-xs font-bold text-white hover:bg-[#1b4461] disabled:opacity-50"
                >
                  Save KT Task
                </button>
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
              <button onClick={() => setShowFfModal(false)}>
                <X className="h-4 w-4 text-[#8FAEC5]" />
              </button>
            </div>
            <form onSubmit={handleCalculateFf} className="space-y-3 text-xs">
              <div className="rounded-xl border border-[#E2ECEF] bg-[#F8FAFC] p-3 text-[11px] text-[#667085]">
                <span className="font-bold text-[#17324A]">
                  {empName(selectedExitRequest.employeeId)}
                </span>{' '}
                · Saving this settlement marks the stage as <b>Settled</b> and unlocks letter
                generation.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">
                    Payable Days
                  </label>
                  <input
                    type="number"
                    value={payableDays}
                    onChange={(e) => setPayableDays(e.target.value)}
                    className="w-full rounded-xl border border-[#CBDDE9] px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">
                    Basic Salary (₹)
                  </label>
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
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">
                    Leave Encashment (₹)
                  </label>
                  <input
                    type="number"
                    value={leaveEncash}
                    onChange={(e) => setLeaveEncash(e.target.value)}
                    className="w-full rounded-xl border border-[#CBDDE9] px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">
                    Gratuity Amount (₹)
                  </label>
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
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">
                    Bonus Payable (₹)
                  </label>
                  <input
                    type="number"
                    value={bonus}
                    onChange={(e) => setBonus(e.target.value)}
                    className="w-full rounded-xl border border-[#CBDDE9] px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">
                    Pending Dues (₹)
                  </label>
                  <input
                    type="number"
                    value={duesDeduction}
                    onChange={(e) => setDuesDeduction(e.target.value)}
                    className="w-full rounded-xl border border-[#CBDDE9] px-3 py-1.5 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#4B6882] mb-1">
                    Tax Deduction (₹)
                  </label>
                  <input
                    type="number"
                    value={taxDeduction}
                    onChange={(e) => setTaxDeduction(e.target.value)}
                    className="w-full rounded-xl border border-[#CBDDE9] px-3 py-1.5 text-xs"
                  />
                </div>
                <div className="flex items-end">
                  <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-center">
                    <div className="text-[10px] font-bold text-emerald-700">Net Settlement</div>
                    <div className="text-xs font-extrabold text-emerald-800">
                      ₹
                      {(
                        Number(basicPay) +
                        Number(leaveEncash) +
                        Number(gratuity) +
                        Number(bonus) -
                        Number(duesDeduction) -
                        Number(taxDeduction)
                      ).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowFfModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-[#667085] hover:bg-[#F4F8FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-[#23587E] px-4 py-2 text-xs font-bold text-white hover:bg-[#1b4461] disabled:opacity-50"
                >
                  Save Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
