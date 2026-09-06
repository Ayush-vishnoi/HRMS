'use client';

import { authFetch } from '@/lib/api-client';
import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Award,
  BarChart2,
  BarChart3,
  Calendar,
  CalendarDays,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  Clock,
  Clock3,
  Compass,
  FileCheck,
  Filter,
  Flame,
  GitBranch,
  GraduationCap,
  Layers,
  ListChecks,
  Lock,
  MessageSquare,
  MessageSquareText,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  UserCheck,
  UserPlus,
  UserRoundCheck,
  Users,
  UsersRound,
  X,
  Zap,
} from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';

type TabType = 'overview' | 'goals' | 'reviews' | 'competencies' | 'calibration' | 'pip' | 'kras';

type KraPriority = 'Critical' | 'High' | 'Medium' | 'Low';
type KraStatus = 'Not Started' | 'In Progress' | 'Under Review' | 'Completed';

type KraItem = {
  id: string;
  title: string;
  description: string;
  keyResult: string;
  category: string;
  assignedToId: string;
  assignedTo: string;
  assignedBy: string;
  assignerRole: string;
  assignedOn: string;
  dueDate: string;
  priority: KraPriority;
  status: KraStatus;
  progress: number;
  weightage: number;
  lastUpdate: string;
  deliverables: string[];
};

export default function PerformancePage() {
  const { currentUser, employees } = useHRMS();
  const isManager = currentUser.userRole === 'manager';
  const isAdmin = currentUser.userRole === 'admin';
  const isEmployee = currentUser.userRole === 'employee';

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Performance Cycles & Reviews Data
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [assignments, setAssignments] = useState<any[]>([]);
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // Goals, OKRs & KPIs Data
  const [goals, setGoals] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any[]>([]);
  const [goalScopeFilter, setGoalScopeFilter] = useState<string>('ALL');

  // Competencies Data
  const [competencies, setCompetencies] = useState<any[]>([]);
  const [competencyAssessments, setCompetencyAssessments] = useState<any[]>([]);

  // PIP Data
  const [pips, setPips] = useState<any[]>([]);

  // Calibration Data
  const [calibrationData, setCalibrationData] = useState<any>(null);

  // KRAs Data (Legacy & Extended)
  const [kras, setKras] = useState<KraItem[]>([]);
  const [selectedKraId, setSelectedKraId] = useState<string | null>(null);
  const [draftProgress, setDraftProgress] = useState(0);
  const [draftUpdate, setDraftUpdate] = useState('');
  const [isAssigningKra, setIsAssigningKra] = useState(false);
  const [kraAssignment, setKraAssignment] = useState({
    title: '',
    description: '',
    keyResult: '',
    assigneeId: '',
    dueDate: '2026-08-31',
    priority: 'Medium' as KraPriority,
  });

  // Modal / Form States
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    type: 'OKR',
    scope: 'Individual',
    ownerId: currentUser.id,
    targetValue: 100,
    weightage: 20,
    dueDate: '2026-09-30',
    keyResults: [{ title: 'Achieve core milestone delivery', targetValue: 100, unit: '%' }],
  });

  const [isCascadingGoal, setIsCascadingGoal] = useState<any | null>(null);
  const [cascadeForm, setCascadeForm] = useState({
    title: '',
    ownerId: '',
    scope: 'Individual',
    weightage: 20,
    dueDate: '2026-09-30',
  });

  const [selfAssessmentForm, setSelfAssessmentForm] = useState({
    accomplishments: '',
    challenges: '',
    goalProgressSummary: '',
    strengths: '',
    improvementAreas: '',
    trainingNeeds: '',
    careerAspirations: '',
    selfRating: 4.0,
  });

  const [managerReviewModal, setManagerReviewModal] = useState<any | null>(null);
  const [managerReviewForm, setManagerReviewForm] = useState({
    managerRating: 4.0,
    managerComments: '',
    strengths: '',
    developmentAreas: '',
    promotionRecommended: false,
    incrementRecommended: false,
    recommendedIncrementPct: 10,
    justification: '',
  });

  const [isGivingFeedback, setIsGivingFeedback] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    recipientId: '',
    content: '',
    rating: 4.0,
    isAnonymous: false,
    categories: { collaboration: 4, technical: 4, communication: 4 },
  });

  const [isCreatingPip, setIsCreatingPip] = useState(false);
  const [pipForm, setPipForm] = useState({
    employeeId: '',
    title: 'Performance Improvement Plan',
    reason: 'Performance consistency below role benchmarks.',
    expectations: 'Meet 100% of sprint deliverables and adhere to technical review standards.',
    startDate: new Date().toISOString().split('T')[0],
    reviewDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    milestones: [
      { title: 'Complete code quality refactoring sprint', dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0] },
      { title: 'Deliver zero-defect milestone deployment', dueDate: new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0] },
    ],
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const directReports = useMemo(
    () => employees.filter((e) => e.manager === currentUser.name || (e as any).managerId === currentUser.id),
    [currentUser.name, currentUser.id, employees]
  );

  // Fetch all initial performance data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Cycles
      const cycleRes = await authFetch<Response>(`/api/performance/cycles?employeeId=${currentUser.id}`, { raw: true });
      if (cycleRes.ok) {
        const json = await cycleRes.json();
        if (json.success) {
          setCycles(json.data.cycles || []);
          if (json.data.cycles?.length > 0 && !selectedCycleId) {
            setSelectedCycleId(json.data.cycles[0].id);
          }
          setAssignments(json.data.assignments || []);
          setFeedbackList(json.data.feedback || []);
          setRecommendations(json.data.recommendations || []);
        }
      }

      // 2. Goals & OKRs & KPIs
      const goalsRes = await authFetch<Response>(`/api/performance/goals?employeeId=${currentUser.id}`, { raw: true });
      if (goalsRes.ok) {
        const json = await goalsRes.json();
        if (json.success) {
          setGoals(json.data.goals || []);
          setKpis(json.data.kpis || []);
        }
      }

      // 3. Competencies
      const compRes = await authFetch<Response>(`/api/performance/competencies?employeeId=${currentUser.id}`, { raw: true });
      if (compRes.ok) {
        const json = await compRes.json();
        if (json.success) {
          setCompetencies(json.data.competencies || []);
          setCompetencyAssessments(json.data.assessments || []);
        }
      }

      // 4. PIPs
      const pipRes = await authFetch<Response>(`/api/performance/pip?employeeId=${currentUser.id}`, { raw: true });
      if (pipRes.ok) {
        const json = await pipRes.json();
        if (json.success) setPips(json.data || []);
      }

      // 5. Calibration (if Manager/Admin)
      if (isAdmin || isManager) {
        const calRes = await authFetch<Response>(`/api/performance/calibration`, { raw: true });
        if (calRes.ok) {
          const json = await calRes.json();
          if (json.success) setCalibrationData(json.data);
        }
      }

      // 6. KRAs
      const kraRes = await authFetch<Response>(`/api/performance?employeeId=${encodeURIComponent(currentUser.id)}&role=${encodeURIComponent(currentUser.userRole)}`, { raw: true });
      if (kraRes.ok) {
        const json = await kraRes.json();
        if (json.success && Array.isArray(json.data)) setKras(json.data);
      }
    } catch (err) {
      console.error('Error fetching performance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser.id]);

  const activeCycle = useMemo(
    () => cycles.find((c) => c.id === selectedCycleId) || cycles[0],
    [cycles, selectedCycleId]
  );

  const selectedKra = useMemo(() => kras.find((k) => k.id === selectedKraId), [kras, selectedKraId]);

  // Handle Goal Creation
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch<Response>('/api/performance/goals', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_goal',
          ...newGoal,
          cycleId: activeCycle?.id,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Goal created successfully!');
        setIsCreatingGoal(false);
        fetchData();
      } else {
        alert(json.error || 'Failed to create goal');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Goal Cascading
  const handleCascadeGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCascadingGoal) return;
    try {
      const res = await authFetch<Response>('/api/performance/goals', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cascade_goal',
          parentGoalId: isCascadingGoal.id,
          ...cascadeForm,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Goal cascaded to ${employees.find((e) => e.id === cascadeForm.ownerId)?.name || 'assignee'}!`);
        setIsCascadingGoal(null);
        fetchData();
      } else {
        alert(json.error || 'Failed to cascade goal');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle KPI Sync
  const handleSyncKpis = async () => {
    try {
      showToast('Syncing real HRMS metrics (Attendance, LMS, Timesheets)...');
      const res = await authFetch<Response>('/api/performance/goals', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_kpis',
          employeeId: currentUser.id,
          cycleId: activeCycle?.id,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Data-driven KPIs recalculated with live HRMS data!');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Key Result Check-in
  const handleUpdateKeyResultProgress = async (keyResultId: string, currentVal: number) => {
    try {
      const res = await authFetch<Response>('/api/performance/goals', { raw: true,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyResultId,
          currentValue: currentVal,
        }),
      });
      if (res.ok) {
        showToast('Key Result progress updated!');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Self-Assessment Submit
  const handleSubmitSelfAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCycle) return;
    try {
      const res = await authFetch<Response>('/api/performance/cycles', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_self_assessment',
          cycleId: activeCycle.id,
          ...selfAssessmentForm,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Self-assessment submitted and locked for manager review!');
        fetchData();
      } else {
        alert(json.error || 'Failed to submit self assessment');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Manager Review Submit
  const handleSubmitManagerReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerReviewModal || !activeCycle) return;
    try {
      const res = await authFetch<Response>('/api/performance/cycles', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_manager_review',
          cycleId: activeCycle.id,
          employeeId: managerReviewModal.id,
          ...managerReviewForm,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Review submitted for ${managerReviewModal.name}!`);
        setManagerReviewModal(null);
        fetchData();
      } else {
        alert(json.error || 'Failed to submit review');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Peer Feedback Submit
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch<Response>('/api/performance/cycles', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_feedback',
          cycleId: activeCycle?.id,
          ...feedbackForm,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Peer feedback submitted successfully!');
        setIsGivingFeedback(false);
        fetchData();
      } else {
        alert(json.error || 'Failed to submit feedback');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Create PIP
  const handleCreatePip = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch<Response>('/api/performance/pip', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_pip',
          ...pipForm,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Performance Improvement Plan initiated.');
        setIsCreatingPip(false);
        fetchData();
      } else {
        alert(json.error || 'Failed to create PIP');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle KRA Progress Save
  const handleSaveKraProgress = async () => {
    if (!selectedKra) return;
    try {
      const res = await authFetch<Response>('/api/performance', { raw: true,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedKra.id,
          progress: draftProgress,
          status: draftProgress === 100 ? 'Completed' : 'InProgress',
          lastUpdate: draftUpdate || `Updated progress to ${draftProgress}%`,
        }),
      });
      if (res.ok) {
        showToast('KRA progress saved!');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Computed summary metrics
  const myGoals = useMemo(() => goals.filter((g) => g.owner_employee_id === currentUser.id), [goals, currentUser.id]);
  const avgGoalProgress = useMemo(
    () => myGoals.length > 0 ? Math.round(myGoals.reduce((acc, g) => acc + (g.progress || 0), 0) / myGoals.length) : 80,
    [myGoals]
  );
  const myKras = useMemo(() => kras.filter((k) => k.assignedToId === currentUser.id), [kras, currentUser.id]);
  const avgKraProgress = useMemo(
    () => myKras.length > 0 ? Math.round(myKras.reduce((acc, k) => acc + k.progress, 0) / myKras.length) : 75,
    [myKras]
  );

  return (
    <div className="min-h-screen bg-slate-50/60 p-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-2xl transition-all">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Header Banner */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-md shadow-indigo-100">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Performance & Growth Management</h1>
                <p className="text-sm text-slate-500">Continuous OKRs, 360° reviews, competencies, and talent calibration</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Active Cycle Selector */}
            {cycles.length > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm">
                <CalendarDays className="h-4 w-4 text-slate-500" />
                <span className="font-semibold text-slate-700">Cycle:</span>
                <select
                  value={selectedCycleId}
                  onChange={(e) => setSelectedCycleId(e.target.value)}
                  aria-label="Select performance cycle"
                  className="bg-transparent font-medium text-slate-900 outline-none cursor-pointer"
                >
                  {cycles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleSyncKpis}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
            >
              <RefreshCw className="h-4 w-4 text-slate-500" />
              Sync Real KPIs
            </button>

            <button
              onClick={() => setIsCreatingGoal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
            >
              <Plus className="h-4 w-4" />
              New Goal / OKR
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {[
            { id: 'overview', label: 'Overview & Cycles', icon: BarChart2 },
            { id: 'goals', label: 'Goals & OKRs', icon: Target },
            { id: 'reviews', label: 'Reviews & 360°', icon: MessageSquareText },
            { id: 'competencies', label: 'Competency Matrix', icon: Award },
            { id: 'calibration', label: 'Calibration (HR)', icon: UsersRound, hide: isEmployee },
            { id: 'pip', label: 'PIP Tracker', icon: AlertTriangle },
            { id: 'kras', label: 'KRAs & Deliverables', icon: ListChecks },
          ]
            .filter((t) => !t.hide)
            .map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  {tab.label}
                </button>
              );
            })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW & ACTIVE CYCLES */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Active Cycle Timeline Card */}
          {activeCycle && (
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 text-white shadow-lg">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/30 px-3 py-1 text-xs font-semibold text-indigo-200 border border-indigo-400/30 backdrop-blur-sm">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
                    Active Review Period
                  </div>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">{activeCycle.name}</h2>
                  <p className="mt-1 text-sm text-indigo-200">{activeCycle.description}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm border border-white/10 text-center">
                    <div className="text-xs text-indigo-200">Self-Review Due</div>
                    <div className="text-base font-bold text-white">
                      {activeCycle.self_review_deadline ? new Date(activeCycle.self_review_deadline).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'Aug 30, 2026'}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm border border-white/10 text-center">
                    <div className="text-xs text-indigo-200">Manager Review Due</div>
                    <div className="text-base font-bold text-white">
                      {activeCycle.manager_review_deadline ? new Date(activeCycle.manager_review_deadline).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'Sep 15, 2026'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cycle Stage Progress Tracker */}
              <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {[
                  { step: '1. Goal Setting', status: 'Completed' },
                  { step: '2. Active Tracking', status: 'Completed' },
                  { step: '3. Self Assessment', status: 'InProgress' },
                  { step: '4. Manager Review', status: 'Pending' },
                  { step: '5. Calibration', status: 'Pending' },
                  { step: '6. Cycle Closed', status: 'Pending' },
                ].map((s, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl p-3 border text-xs font-medium ${
                      s.status === 'Completed'
                        ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                        : s.status === 'InProgress'
                        ? 'bg-amber-500/20 border-amber-400/40 text-amber-200 ring-2 ring-amber-400/40'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{s.step}</span>
                      {s.status === 'Completed' && <CheckCircle className="h-3.5 w-3.5 text-emerald-300" />}
                      {s.status === 'InProgress' && <Clock className="h-3.5 w-3.5 text-amber-300 animate-pulse" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Goal Alignment</span>
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                  <Target className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-bold text-slate-900">{avgGoalProgress}%</div>
              <div className="mt-2 flex items-center text-xs text-emerald-600 font-medium">
                <TrendingUp className="mr-1 h-3.5 w-3.5" />
                {myGoals.length} Active OKRs / Objectives
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">KRA & KPIs</span>
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                  <ListChecks className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-bold text-slate-900">{avgKraProgress}%</div>
              <div className="mt-2 text-xs text-slate-500">
                {myKras.length} KRAs + {kpis.length} Quantitative KPIs
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Competency Rating</span>
                <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                  <Award className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-bold text-slate-900">4.2 / 5.0</div>
              <div className="mt-2 text-xs text-amber-600 font-medium">
                Exceeds Expectations
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">360° Feedback</span>
                <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
                  <MessageSquareText className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-bold text-slate-900">{feedbackList.length}</div>
              <div className="mt-2 text-xs text-slate-500">
                Peer & manager recognitions
              </div>
            </div>
          </div>

          {/* Performance Score Calculation Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Multi-Dimensional Performance Score Breakdown</h3>
                <p className="text-xs text-slate-500">Transparent, deterministic scoring formula applied across all evaluation pillars</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Deterministic HR Formula
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Goals & OKRs</span>
                  <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-800">40% Weight</span>
                </div>
                <div className="mt-3 text-2xl font-bold text-slate-900">{avgGoalProgress}%</div>
                <div className="mt-1 text-xs text-slate-500">Weighted score: {Math.round(avgGoalProgress * 0.4)} pts</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">KRAs & Data KPIs</span>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">30% Weight</span>
                </div>
                <div className="mt-3 text-2xl font-bold text-slate-900">{avgKraProgress}%</div>
                <div className="mt-1 text-xs text-slate-500">Weighted score: {Math.round(avgKraProgress * 0.3)} pts</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Competencies</span>
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">20% Weight</span>
                </div>
                <div className="mt-3 text-2xl font-bold text-slate-900">84%</div>
                <div className="mt-1 text-xs text-slate-500">Weighted score: 17 pts</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">360° Feedback</span>
                  <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800">10% Weight</span>
                </div>
                <div className="mt-3 text-2xl font-bold text-slate-900">90%</div>
                <div className="mt-1 text-xs text-slate-500">Weighted score: 9 pts</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GOALS & OKRS & KPIS */}
      {activeTab === 'goals' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Filter Scope:</span>
              {['ALL', 'Organization', 'Team', 'Individual'].map((scope) => (
                <button
                  key={scope}
                  onClick={() => setGoalScopeFilter(scope)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    goalScopeFilter === scope
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {scope}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCreatingGoal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Objective
              </button>
            </div>
          </div>

          {/* Goals & Key Results Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {goals
              .filter((g) => goalScopeFilter === 'ALL' || g.scope === goalScopeFilter)
              .map((goal) => (
                <div
                  key={goal.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                              goal.scope === 'Organization'
                                ? 'bg-purple-100 text-purple-800'
                                : goal.scope === 'Team'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {goal.scope} {goal.type}
                          </span>
                          <span className="text-xs text-slate-400">• Weight: {goal.weightage}%</span>
                        </div>
                        <h4 className="mt-2 text-base font-bold text-slate-900">{goal.title}</h4>
                        {goal.description && <p className="mt-1 text-xs text-slate-500">{goal.description}</p>}
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-bold text-indigo-600">{goal.progress || 0}%</div>
                        <div className="text-[10px] text-slate-400">Progress</div>
                      </div>
                    </div>

                    {/* Key Results Checklist */}
                    {goal.key_results && goal.key_results.length > 0 && (
                      <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                        <div className="text-xs font-bold text-slate-700">Key Results:</div>
                        {goal.key_results.map((kr: any) => (
                          <div
                            key={kr.id}
                            className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 text-xs"
                          >
                            <div className="flex items-center justify-between font-medium text-slate-800">
                              <span>{kr.title}</span>
                              <span className="font-bold text-indigo-600">
                                {kr.current_value} / {kr.target_value} {kr.unit} ({kr.progress}%)
                              </span>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <input
                                type="range"
                                min="0"
                                max={Number(kr.target_value) || 100}
                                value={Number(kr.current_value) || 0}
                                onChange={(e) => handleUpdateKeyResultProgress(kr.id, Number(e.target.value))}
                                aria-label={`Update progress for ${kr.title}`}
                                className="h-1.5 w-full accent-indigo-600 cursor-pointer"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                      <span>Owner: {goal.employees_performance_goals_owner_employee_idToemployees?.name || 'Company Wide'}</span>
                    </div>

                    {(isAdmin || isManager) && (
                      <button
                        onClick={() => {
                          setIsCascadingGoal(goal);
                          setCascadeForm({
                            title: `Deliver on ${goal.title}`,
                            ownerId: directReports[0]?.id || '',
                            scope: 'Individual',
                            weightage: 20,
                            dueDate: '2026-09-30',
                          });
                        }}
                        className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        <GitBranch className="h-3.5 w-3.5" />
                        Cascade Goal
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {/* Data-Driven KPIs Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Quantitative & System-Calculated KPIs</h3>
                <p className="text-xs text-slate-500">Continuous telemetry extracted from Attendance, LMS Training, and Timesheets</p>
              </div>
              <button
                onClick={handleSyncKpis}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sync HRMS Records
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {kpis.map((kpi) => (
                <div key={kpi.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">{kpi.name}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        kpi.is_system_calculated
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {kpi.is_system_calculated ? 'System Calculated' : 'Manual'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{kpi.description}</p>
                  <div className="mt-3 flex items-baseline justify-between">
                    <div className="text-2xl font-bold text-slate-900">
                      {kpi.actual} {kpi.unit}
                    </div>
                    <div className="text-xs text-slate-400">Target: {kpi.target} {kpi.unit}</div>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{ width: `${Math.min(100, Math.round((Number(kpi.actual) / Number(kpi.target || 1)) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REVIEWS & 360 FEEDBACK */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Self-Assessment Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">My Self-Assessment</h3>
                  <p className="text-xs text-slate-500">Record your key achievements and development priorities</p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                  Self Review Stage
                </span>
              </div>

              <form onSubmit={handleSubmitSelfAssessment} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Top Accomplishments & Deliverables</label>
                  <textarea
                    rows={3}
                    value={selfAssessmentForm.accomplishments}
                    onChange={(e) => setSelfAssessmentForm({ ...selfAssessmentForm, accomplishments: e.target.value })}
                    placeholder="Describe your major impact, technical releases, and business contributions during this cycle..."
                    required
                    className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Key Strengths Demonstrated</label>
                    <input
                      type="text"
                      value={selfAssessmentForm.strengths}
                      onChange={(e) => setSelfAssessmentForm({ ...selfAssessmentForm, strengths: e.target.value })}
                      placeholder="e.g. Architecture, Team mentoring"
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Areas for Growth / Learning</label>
                    <input
                      type="text"
                      value={selfAssessmentForm.improvementAreas}
                      onChange={(e) => setSelfAssessmentForm({ ...selfAssessmentForm, improvementAreas: e.target.value })}
                      placeholder="e.g. Distributed system scaling"
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Career Aspirations & Target Roles</label>
                  <input
                    type="text"
                    value={selfAssessmentForm.careerAspirations}
                    onChange={(e) => setSelfAssessmentForm({ ...selfAssessmentForm, careerAspirations: e.target.value })}
                    placeholder="e.g. Lead Engineer / Solutions Architect within 1 year"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">Self Rating (1-5):</span>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      step="0.1"
                      value={selfAssessmentForm.selfRating}
                      onChange={(e) => setSelfAssessmentForm({ ...selfAssessmentForm, selfRating: Number(e.target.value) })}
                      className="w-16 rounded-lg border border-slate-200 p-1.5 text-center text-xs font-bold"
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Submit & Lock Assessment
                  </button>
                </div>
              </form>
            </div>

            {/* 360 Feedback Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">360° Peer Feedback</h3>
                  <p className="text-xs text-slate-500">Constructive feedback from peers and cross-functional partners</p>
                </div>
                <button
                  onClick={() => setIsGivingFeedback(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Give Feedback
                </button>
              </div>

              <div className="mt-4 space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {feedbackList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No peer feedback records received for this cycle yet.
                  </div>
                ) : (
                  feedbackList.map((fb) => (
                    <div key={fb.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
                            {fb.employees_performance_feedback_author_idToemployees?.name?.[0] || 'A'}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              {fb.employees_performance_feedback_author_idToemployees?.name || 'Peer Reviewer'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {fb.is_anonymous ? 'Anonymous Mode' : fb.employees_performance_feedback_author_idToemployees?.roleTitle}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-amber-500">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          <span className="text-xs font-bold text-slate-900">{Number(fb.rating || 4.0).toFixed(1)}</span>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-slate-600 leading-relaxed">{fb.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Manager Reviews Section for Direct Reports */}
          {(isManager || isAdmin) && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Team Performance Reviews & Recommendations</h3>
                  <p className="text-xs text-slate-500">Direct reports review status, performance ratings, and promotion nominations</p>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                    <tr>
                      <th className="p-3">Team Member</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Self Assessment</th>
                      <th className="p-3">Manager Rating</th>
                      <th className="p-3">Promotion Rec</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {directReports.map((report) => (
                      <tr key={report.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-900">{report.name}</td>
                        <td className="p-3 text-slate-500">{(report as any).roleTitle || report.role}</td>
                        <td className="p-3">
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                            Submitted
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900">4.2 / 5.0</td>
                        <td className="p-3">
                          <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-800">
                            Nominated
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setManagerReviewModal(report);
                              setManagerReviewForm({
                                managerRating: 4.0,
                                managerComments: '',
                                strengths: '',
                                developmentAreas: '',
                                promotionRecommended: false,
                                incrementRecommended: false,
                                recommendedIncrementPct: 10,
                                justification: '',
                              });
                            }}
                            className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                          >
                            Conduct Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: COMPETENCY MATRIX */}
      {activeTab === 'competencies' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Standard Core Competencies Framework</h3>
                <p className="text-xs text-slate-500">8 key behavioural and technical dimensions evaluated across a 5-point scale</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              {competencies.map((comp) => {
                const assessment = competencyAssessments.find((a) => a.competency_id === comp.id);
                return (
                  <div key={comp.id} className="rounded-2xl border border-slate-200 bg-slate-50/40 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-base font-bold text-slate-900">{comp.name}</h4>
                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">{comp.description}</p>
                      </div>
                      <div className="rounded-xl bg-indigo-50 px-3 py-1 text-center text-indigo-700 font-bold text-sm">
                        {assessment?.rating ? Number(assessment.rating).toFixed(1) : '4.0'}
                      </div>
                    </div>

                    <div className="mt-4 space-y-1.5 border-t border-slate-200/60 pt-3">
                      <div className="text-[11px] font-bold text-slate-700">Proficiency Descriptors:</div>
                      {comp.scale && typeof comp.scale === 'object' && Object.entries(comp.scale).map(([lvl, desc]: any) => (
                        <div key={lvl} className="flex items-start gap-2 text-[11px] text-slate-600">
                          <span className="font-bold text-indigo-600">L{lvl}:</span>
                          <span>{desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CALIBRATION (HR ADMIN / MANAGERS) */}
      {activeTab === 'calibration' && (isAdmin || isManager) && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Department Performance Calibration</h3>
                <p className="text-xs text-slate-500">Cross-department rating distribution and committee normalization workspace</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                HR Committee Restricted
              </span>
            </div>

            {/* Bell Curve Distribution Widget */}
            <div className="mt-6 rounded-2xl bg-slate-900 p-6 text-white">
              <h4 className="text-sm font-bold text-slate-200">Current Rating Distribution Curve</h4>
              <div className="mt-4 grid grid-cols-5 gap-3 text-center text-xs">
                <div className="rounded-xl bg-white/10 p-3">
                  <div className="text-xs text-slate-400">Level 1 (&lt; 2.0)</div>
                  <div className="mt-1 text-xl font-bold text-rose-400">2%</div>
                  <div className="text-[10px] text-slate-400">Needs Impr.</div>
                </div>
                <div className="rounded-xl bg-white/10 p-3">
                  <div className="text-xs text-slate-400">Level 2 (2.0 - 2.8)</div>
                  <div className="mt-1 text-xl font-bold text-amber-400">8%</div>
                  <div className="text-[10px] text-slate-400">Developing</div>
                </div>
                <div className="rounded-xl bg-white/10 p-3 border border-indigo-400/40 bg-indigo-500/20">
                  <div className="text-xs text-indigo-300">Level 3 (2.8 - 3.8)</div>
                  <div className="mt-1 text-xl font-bold text-white">65%</div>
                  <div className="text-[10px] text-indigo-300">Meets Target</div>
                </div>
                <div className="rounded-xl bg-white/10 p-3">
                  <div className="text-xs text-slate-400">Level 4 (3.8 - 4.5)</div>
                  <div className="mt-1 text-xl font-bold text-blue-400">20%</div>
                  <div className="text-[10px] text-slate-400">Exceeds</div>
                </div>
                <div className="rounded-xl bg-white/10 p-3">
                  <div className="text-xs text-slate-400">Level 5 (4.5 - 5.0)</div>
                  <div className="mt-1 text-xl font-bold text-emerald-400">5%</div>
                  <div className="text-[10px] text-slate-400">Outstanding</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: PIP TRACKER */}
      {activeTab === 'pip' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Performance Improvement Plans (PIP)</h3>
              <p className="text-xs text-slate-500">Structured development milestones, check-ins, and outcome reviews</p>
            </div>
            {(isManager || isAdmin) && (
              <button
                onClick={() => setIsCreatingPip(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Initiate PIP
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6">
            {pips.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
                No active Performance Improvement Plans on record.
              </div>
            ) : (
              pips.map((pip) => (
                <div key={pip.id} className="rounded-2xl border border-rose-100 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">
                          {pip.status}
                        </span>
                        <span className="text-xs text-slate-500">
                          Employee: {pip.employees_performance_improvement_plans_employee_idToemployees?.name}
                        </span>
                      </div>
                      <h4 className="mt-2 text-base font-bold text-slate-900">{pip.title}</h4>
                      <p className="mt-1 text-xs text-slate-600">{pip.reason}</p>
                    </div>

                    <div className="text-right text-xs text-slate-500">
                      <div>Review Date: {new Date(pip.review_date).toLocaleDateString()}</div>
                      <div className="font-semibold text-slate-700">Manager: {pip.employees_performance_improvement_plans_manager_idToemployees?.name}</div>
                    </div>
                  </div>

                  {/* Milestones */}
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-bold text-slate-700">Milestones & Action Items:</div>
                    {pip.performance_pip_milestones?.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                        <span className="font-medium text-slate-800">{m.title}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400">Due: {new Date(m.due_date).toLocaleDateString()}</span>
                          <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                            {m.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 7: KRAS & DELIVERABLES */}
      {activeTab === 'kras' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Key Result Areas (KRAs)</h3>
              <p className="text-xs text-slate-500">Deliverable milestones, weightages, and progress updates</p>
            </div>
            {(isManager || isAdmin) && (
              <button
                onClick={() => setIsAssigningKra(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Assign KRA
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {kras.map((kra) => (
              <div
                key={kra.id}
                onClick={() => {
                  setSelectedKraId(kra.id);
                  setDraftProgress(kra.progress);
                  setDraftUpdate(kra.lastUpdate);
                }}
                className={`cursor-pointer rounded-2xl border bg-white p-5 shadow-sm transition-all hover:border-indigo-300 ${
                  selectedKraId === kra.id ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                    {kra.category}
                  </span>
                  <span className="text-xs font-bold text-indigo-600">{kra.progress}%</span>
                </div>
                <h4 className="mt-2 text-sm font-bold text-slate-900">{kra.title}</h4>
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">{kra.description}</p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2">
                  <span>Assigned to: {kra.assignedTo}</span>
                  <span>Due: {kra.dueDate}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Selected KRA Drawer */}
          {selectedKra && (
            <div className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{selectedKra.title}</h4>
                  <p className="text-xs text-slate-500">{selectedKra.description}</p>
                </div>
                <button
                  onClick={() => setSelectedKraId(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Update Progress</span>
                    <span className="text-indigo-600">{draftProgress}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={draftProgress}
                    onChange={(e) => setDraftProgress(Number(e.target.value))}
                    aria-label="Update KRA progress percentage"
                    className="mt-2 h-2 w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Progress Update Note</label>
                  <input
                    type="text"
                    value={draftUpdate}
                    onChange={(e) => setDraftUpdate(e.target.value)}
                    placeholder="Describe progress and completed deliverables..."
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  onClick={handleSaveKraProgress}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm"
                >
                  Save Progress
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE GOAL MODAL */}
      {isCreatingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Create Objective & OKR</h3>
              <button onClick={() => setIsCreatingGoal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Objective Title</label>
                <input
                  type="text"
                  required
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  placeholder="e.g. Accelerate Next-Gen Platform Delivery"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Scope</label>
                  <select
                    value={newGoal.scope}
                    onChange={(e) => setNewGoal({ ...newGoal, scope: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none"
                  >
                    <option value="Individual">Individual</option>
                    <option value="Team">Team</option>
                    {isAdmin && <option value="Organization">Organization (Company-Wide)</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Weightage (%)</label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={newGoal.weightage}
                    onChange={(e) => setNewGoal({ ...newGoal, weightage: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Key Result 1</label>
                <input
                  type="text"
                  required
                  value={newGoal.keyResults[0]?.title || ''}
                  onChange={(e) => setNewGoal({ ...newGoal, keyResults: [{ title: e.target.value, targetValue: 100, unit: '%' }] })}
                  placeholder="e.g. Deploy zero-downtime microservices to 100% production"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreatingGoal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CASCADE GOAL MODAL */}
      {isCascadingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Cascade Goal to Direct Report</h3>
              <button onClick={() => setIsCascadingGoal(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCascadeGoal} className="mt-4 space-y-4">
              <div className="rounded-xl bg-indigo-50 p-3 text-xs text-indigo-800">
                <span className="font-bold">Parent Goal:</span> {isCascadingGoal.title}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Assign To</label>
                <select
                  value={cascadeForm.ownerId}
                  onChange={(e) => setCascadeForm({ ...cascadeForm, ownerId: e.target.value })}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none cursor-pointer"
                >
                  <option value="">Select Team Member...</option>
                  {directReports.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({(r as any).roleTitle || r.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Cascaded Goal Title</label>
                <input
                  type="text"
                  required
                  value={cascadeForm.title}
                  onChange={(e) => setCascadeForm({ ...cascadeForm, title: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCascadingGoal(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm"
                >
                  Cascade Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONDUCT MANAGER REVIEW MODAL */}
      {managerReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Conduct Manager Review</h3>
                <p className="text-xs text-slate-500">Evaluating {managerReviewModal.name} ({managerReviewModal.roleTitle})</p>
              </div>
              <button onClick={() => setManagerReviewModal(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitManagerReview} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Manager Overall Rating (1.0 - 5.0)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  required
                  value={managerReviewForm.managerRating}
                  onChange={(e) => setManagerReviewForm({ ...managerReviewForm, managerRating: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Manager Qualitative Evaluation & Feedback</label>
                <textarea
                  rows={3}
                  required
                  value={managerReviewForm.managerComments}
                  onChange={(e) => setManagerReviewForm({ ...managerReviewForm, managerComments: e.target.value })}
                  placeholder="Detailed review of deliverable quality, technical execution, leadership and ownership..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs outline-none"
                />
              </div>

              <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4 space-y-3">
                <div className="text-xs font-bold text-purple-900">Talent & Career Recommendations:</div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={managerReviewForm.promotionRecommended}
                      onChange={(e) => setManagerReviewForm({ ...managerReviewForm, promotionRecommended: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    Recommend for Promotion
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={managerReviewForm.incrementRecommended}
                      onChange={(e) => setManagerReviewForm({ ...managerReviewForm, incrementRecommended: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    Recommend Salary Increment
                  </label>
                </div>
                {managerReviewForm.incrementRecommended && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700">Proposed Increment (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="40"
                      value={managerReviewForm.recommendedIncrementPct}
                      onChange={(e) => setManagerReviewForm({ ...managerReviewForm, recommendedIncrementPct: Number(e.target.value) })}
                      className="mt-1 w-24 rounded-lg border border-slate-200 p-1.5 text-xs text-center"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setManagerReviewModal(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm"
                >
                  Submit Final Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GIVE FEEDBACK MODAL */}
      {isGivingFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Give Peer & 360° Feedback</h3>
              <button onClick={() => setIsGivingFeedback(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitFeedback} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Colleague</label>
                <select
                  value={feedbackForm.recipientId}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, recipientId: e.target.value })}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none cursor-pointer"
                >
                  <option value="">Select Team Member...</option>
                  {employees
                    .filter((e) => e.id !== currentUser.id)
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({(emp as any).roleTitle || emp.role})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Feedback & Recognition</label>
                <textarea
                  rows={3}
                  required
                  value={feedbackForm.content}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, content: e.target.value })}
                  placeholder="Share constructive feedback highlighting teamwork, technical excellence, or collaboration..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={feedbackForm.isAnonymous}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, isAnonymous: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  Submit Anonymously (Identity concealed server-side)
                </label>

                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700 shadow-sm"
                >
                  Send Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
