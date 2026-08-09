'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Crown,
  Users,
  CheckSquare,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  FileCheck,
  Plus,
  Sparkles,
  Building,
  CheckCircle2,
  History,
  ShieldCheck,
  Activity,
  DollarSign,
  Briefcase,
  Target,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Filter,
  BarChart3,
  UserPlus,
  FileText,
  PieChart as PieIcon,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useHRMS, Task } from '@/context/HRMSContext';
import {
  TOTAL_HEADCOUNT,
  MOCK_WORKFORCE_BUDGET,
  MOCK_DEPARTMENT_PERFORMANCE,
  DepartmentPerformanceItem,
} from '@/data/mockData';
import { AssignTaskModal } from '@/components/modals/AssignTaskModal';
import { ReviewDeliverableModal } from '@/components/modals/ReviewDeliverableModal';
import { TaskAuditLogModal } from '@/components/modals/TaskAuditLogModal';

export const CeoDashboard: React.FC = () => {
  const {
    currentUser,
    tasks,
    executiveActions,
    companyHealthScore,
    executiveEvents,
    handleApproveAction,
    handleRejectAction,
  } = useHRMS();

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTaskForReview, setSelectedTaskForReview] = useState<Task | null>(null);
  const [selectedTaskForAudit, setSelectedTaskForAudit] = useState<Task | null>(null);

  // Timeframe filter for Headcount Growth
  const [growthTimeframe, setGrowthTimeframe] = useState<'6M' | '12M' | 'YTD'>('12M');

  // Action Center Filter & Modal
  const [actionCategoryFilter, setActionCategoryFilter] = useState<'ALL' | 'CRITICAL' | 'ATTENTION' | 'INFORMATION'>('ALL');
  const [showAllActionsModal, setShowAllActionsModal] = useState(false);

  // Department Performance Drill-Down Modal
  const [selectedDeptDrillDown, setSelectedDeptDrillDown] = useState<DepartmentPerformanceItem | null>(null);

  // Workforce Budget Drill-Down Modal
  const [showBudgetDrillDown, setShowBudgetDrillDown] = useState(false);

  const totalTasks = tasks.length;
  const activeTasks = tasks.filter((t) => t.status === 'In Progress' || t.status === 'Under Review' || t.status === 'Pending');
  const completedTasks = tasks.filter((t) => t.status === 'Completed');
  const pendingApprovals = tasks.filter(
    (t) => t.status === 'Under Review' || t.deliverable?.status === 'Under Review' || t.deliverable?.status === 'Resubmitted'
  );

  const overdueTasks = tasks.filter((t) => {
    if (t.status === 'Completed') return false;
    const deadlineDate = new Date(t.deadline);
    const today = new Date('2026-08-09');
    return deadlineDate < today;
  });

  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 100;

  // Headcount growth chart data by timeframe
  const headcountData6M = [
    { month: 'Mar', headcount: 97, hires: 5, exits: 2, net: 3 },
    { month: 'Apr', headcount: 101, hires: 6, exits: 2, net: 4 },
    { month: 'May', headcount: 103, hires: 4, exits: 2, net: 2 },
    { month: 'Jun', headcount: 104, hires: 3, exits: 2, net: 1 },
    { month: 'Jul', headcount: 105, hires: 4, exits: 3, net: 1 },
    { month: 'Aug', headcount: 105, hires: 2, exits: 2, net: 0 },
  ];

  const headcountData12M = [
    { month: 'Sep 25', headcount: 88, hires: 4, exits: 1, net: 3 },
    { month: 'Oct 25', headcount: 90, hires: 3, exits: 1, net: 2 },
    { month: 'Nov 25', headcount: 91, hires: 3, exits: 2, net: 1 },
    { month: 'Dec 25', headcount: 92, hires: 2, exits: 1, net: 1 },
    { month: 'Jan 26', headcount: 93, hires: 3, exits: 2, net: 1 },
    { month: 'Feb 26', headcount: 95, hires: 4, exits: 2, net: 2 },
    { month: 'Mar 26', headcount: 97, hires: 5, exits: 2, net: 3 },
    { month: 'Apr 26', headcount: 101, hires: 6, exits: 2, net: 4 },
    { month: 'May 26', headcount: 103, hires: 4, exits: 2, net: 2 },
    { month: 'Jun 26', headcount: 104, hires: 3, exits: 2, net: 1 },
    { month: 'Jul 26', headcount: 105, hires: 4, exits: 3, net: 1 },
    { month: 'Aug 26', headcount: 105, hires: 2, exits: 2, net: 0 },
  ];

  const headcountDataYTD = headcountData12M.slice(4); // Jan to Aug

  const getActiveGrowthData = () => {
    if (growthTimeframe === '6M') return headcountData6M;
    if (growthTimeframe === 'YTD') return headcountDataYTD;
    return headcountData12M;
  };

  const filteredActions = executiveActions.filter((item) => {
    if (actionCategoryFilter === 'ALL') return true;
    return item.category === actionCategoryFilter;
  });

  return (
    <div className="space-y-6 select-none">

      {/* 1. CEO EXECUTIVE HEADER & COMMAND CENTER BANNER */}
      <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <Crown className="w-3.5 h-3.5 text-purple-700" />
            <span>Executive Command Center</span>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
            <span className="text-[10px] text-purple-700 font-medium">Live Enterprise Mode</span>
          </div>
          <h2 className="text-2xl font-black text-[#17324A] tracking-tight">
            Apex HRMS Organization Dashboard
          </h2>
          <p className="text-xs text-[#5F7180] max-w-2xl">
            Welcome back, <strong className="text-[#17324A]">{currentUser.name}</strong>. Here is your enterprise-wide performance, workforce velocity, and executive review queue.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#17324A] hover:bg-[#234B68] text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Assign Executive Task
          </button>
          <Link
            href="/employees?view=org-chart"
            className="px-3.5 py-2.5 rounded-xl bg-[#EAF2F8] hover:bg-[#D9E5EE] text-[#17324A] border border-[#B0D0EA] text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Building className="w-3.5 h-3.5" />
            Org Chart
          </Link>
          <Link
            href="/analytics"
            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#F5F9FC] text-[#17324A] border border-[#D9E5EE] text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Reports
          </Link>
        </div>
      </div>

      {/* 2. TOP 7 EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {/* Total Headcount */}
        <div className="p-3.5 rounded-2xl bg-white border border-[#B0D0EA] shadow-sm hover:border-[#17324A]/40 transition-colors flex flex-col justify-between">
          <div className="flex justify-between items-center text-[11px] font-bold text-[#5F7180]">
            <span>Total Headcount</span>
            <Users className="w-3.5 h-3.5 text-[#17324A]" />
          </div>
          <div className="my-1.5">
            <span className="text-2xl font-black text-[#17324A]">{TOTAL_HEADCOUNT}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
            <ArrowUpRight className="w-3 h-3" />
            <span>+8.2% YoY</span>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="p-3.5 rounded-2xl bg-white border border-[#B0D0EA] shadow-sm hover:border-[#17324A]/40 transition-colors flex flex-col justify-between">
          <div className="flex justify-between items-center text-[11px] font-bold text-[#5F7180]">
            <span>Attendance</span>
            <Clock className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="my-1.5">
            <span className="text-2xl font-black text-[#17324A]">96.4%</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
            <ArrowUpRight className="w-3 h-3" />
            <span>+1.2% vs last month</span>
          </div>
        </div>

        {/* Attrition Rate */}
        <div className="p-3.5 rounded-2xl bg-white border border-[#B0D0EA] shadow-sm hover:border-[#17324A]/40 transition-colors flex flex-col justify-between">
          <div className="flex justify-between items-center text-[11px] font-bold text-[#5F7180]">
            <span>Attrition Rate</span>
            <Activity className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="my-1.5">
            <span className="text-2xl font-black text-[#17324A]">4.2%</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
            <ArrowDownRight className="w-3 h-3" />
            <span>↓ 1.1% vs Q2</span>
          </div>
        </div>

        {/* Monthly Payroll */}
        <div className="p-3.5 rounded-2xl bg-white border border-[#B0D0EA] shadow-sm hover:border-[#17324A]/40 transition-colors flex flex-col justify-between">
          <div className="flex justify-between items-center text-[11px] font-bold text-[#5F7180]">
            <span>Monthly Payroll</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="my-1.5">
            <span className="text-2xl font-black text-[#17324A]">₹2.15 Cr</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
            <ArrowUpRight className="w-3 h-3" />
            <span>+7.4% YoY</span>
          </div>
        </div>

        {/* Open Positions */}
        <div className="p-3.5 rounded-2xl bg-white border border-[#B0D0EA] shadow-sm hover:border-[#17324A]/40 transition-colors flex flex-col justify-between">
          <div className="flex justify-between items-center text-[11px] font-bold text-[#5F7180]">
            <span>Open Positions</span>
            <Briefcase className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="my-1.5">
            <span className="text-2xl font-black text-purple-700">4</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-[#5F7180]">
            <span>+1 active this month</span>
          </div>
        </div>

        {/* Goal / OKR Completion */}
        <div className="p-3.5 rounded-2xl bg-white border border-[#B0D0EA] shadow-sm hover:border-[#17324A]/40 transition-colors flex flex-col justify-between">
          <div className="flex justify-between items-center text-[11px] font-bold text-[#5F7180]">
            <span>OKR Completion</span>
            <Target className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="my-1.5">
            <span className="text-2xl font-black text-[#17324A]">82%</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
            <ArrowUpRight className="w-3 h-3" />
            <span>+5% vs Q2 target</span>
          </div>
        </div>

        {/* Pending Executive Approvals */}
        <div className="p-3.5 rounded-2xl bg-white border border-[#B0D0EA] shadow-sm hover:border-[#17324A]/40 transition-colors flex flex-col justify-between">
          <div className="flex justify-between items-center text-[11px] font-bold text-[#5F7180]">
            <span>Pending Approvals</span>
            <FileCheck className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="my-1.5">
            <span className="text-2xl font-black text-amber-600">{executiveActions.length}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700">
            <span>{executiveActions.filter((a) => a.category === 'CRITICAL').length} Critical Action Needed</span>
          </div>
        </div>
      </div>

      {/* 3. EXECUTIVE ACTION CENTER & COMPANY HEALTH SCORE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* EXECUTIVE ACTION CENTER (2 Columns) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-[#B0D0EA] shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#17324A] flex items-center gap-2">
                <Crown className="w-4 h-4 text-purple-700" />
                Executive Action Center
              </h3>
              <p className="text-xs text-[#5F7180]">
                High-priority decision pipeline requiring CEO sign-off or executive review
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 bg-[#F5F9FC] p-1 rounded-xl border border-[#D9E5EE]">
              {(['ALL', 'CRITICAL', 'ATTENTION', 'INFORMATION'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActionCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    actionCategoryFilter === cat
                      ? 'bg-[#17324A] text-white shadow-xs'
                      : 'text-[#5F7180] hover:text-[#17324A]'
                  }`}
                >
                  {cat === 'ALL' ? 'All' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Action List */}
          {filteredActions.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-[#D9E5EE] rounded-xl bg-[#F5F9FC]">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-[#17324A]">No pending executive items in this category</p>
              <p className="text-[11px] text-[#5F7180]">All operational approvals are up to date.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActions.slice(0, 5).map((action) => (
                <div
                  key={action.id}
                  className="p-3.5 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#B0D0EA] transition-all"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {action.category === 'CRITICAL' && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                          🔴 Critical
                        </span>
                      )}
                      {action.category === 'ATTENTION' && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          🟡 Attention Required
                        </span>
                      )}
                      {action.category === 'INFORMATION' && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                          🔵 Information
                        </span>
                      )}
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#B0D0EA] text-[#17324A]">
                        {action.department}
                      </span>
                      <span className="text-xs font-bold text-[#17324A] truncate">{action.title}</span>
                    </div>

                    <p className="text-xs text-[#5F7180] line-clamp-1">{action.description}</p>
                    <div className="flex items-center gap-3 text-[11px] text-[#5F7180]">
                      <span>Owner: <strong className="text-[#17324A]">{action.responsiblePerson}</strong></span>
                      <span>•</span>
                      <span>Due: <strong>{action.dueDate}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleApproveAction(action.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#17324A] hover:bg-[#234B68] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                    >
                      {action.actionText}
                    </button>
                    <button
                      onClick={() => handleRejectAction(action.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-[#D9E5EE] text-[#5F7180] hover:text-red-600 hover:bg-red-50 text-xs font-semibold transition-all cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}

              {filteredActions.length > 5 && (
                <div className="pt-1 text-center">
                  <button
                    onClick={() => setShowAllActionsModal(true)}
                    className="text-xs font-bold text-[#17324A] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    View All {filteredActions.length} Executive Action Items
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* COMPANY HEALTH SCORE WIDGET (1 Column) */}
        <div className="p-6 rounded-2xl bg-white border border-[#B0D0EA] shadow-md space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#17324A] flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              Company Health
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
              Q3 Index
            </span>
          </div>

          {/* Radial Score Gauge */}
          <div className="flex items-center justify-center py-2">
            <div className="relative w-32 h-32 flex items-center justify-center rounded-full bg-gradient-to-tr from-[#17324A] to-purple-800 p-3 shadow-lg">
              <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black text-[#17324A]">{companyHealthScore.overallScore}</span>
                <span className="text-[10px] font-bold text-[#5F7180] uppercase tracking-wider">/ 100 Health</span>
              </div>
            </div>
          </div>

          {/* Sub-Pillar Progress Bars */}
          <div className="space-y-2.5 text-xs font-semibold text-[#17324A]">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span>Workforce Stability</span>
                <span className="font-bold">{companyHealthScore.workforce}</span>
              </div>
              <div className="w-full bg-[#EAF2F8] rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-[#17324A]" style={{ width: `${companyHealthScore.workforce}%` }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span>Attendance & Time</span>
                <span className="font-bold">{companyHealthScore.attendance}</span>
              </div>
              <div className="w-full bg-[#EAF2F8] rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-blue-600" style={{ width: `${companyHealthScore.attendance}%` }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span>OKR Performance</span>
                <span className="font-bold">{companyHealthScore.performance}</span>
              </div>
              <div className="w-full bg-[#EAF2F8] rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-indigo-600" style={{ width: `${companyHealthScore.performance}%` }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span>Employee Retention</span>
                <span className="font-bold">{companyHealthScore.retention}</span>
              </div>
              <div className="w-full bg-[#EAF2F8] rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-emerald-600" style={{ width: `${companyHealthScore.retention}%` }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span>Compliance & Audit</span>
                <span className="font-bold">{companyHealthScore.compliance}</span>
              </div>
              <div className="w-full bg-[#EAF2F8] rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-purple-600" style={{ width: `${companyHealthScore.compliance}%` }} />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 4. WORKFORCE GROWTH CHART & WORKFORCE BUDGET VS ACTUAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* WORKFORCE GROWTH CHART (2 Columns) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-[#B0D0EA] shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#17324A] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#17324A]" />
                Workforce Growth & Net Velocity
              </h3>
              <p className="text-xs text-[#5F7180]">
                Monthly employee trajectory, active onboarding headcount, and exit management
              </p>
            </div>

            {/* Timeframe selector */}
            <div className="flex items-center gap-1 bg-[#F5F9FC] p-1 rounded-xl border border-[#D9E5EE]">
              {(['6M', '12M', 'YTD'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setGrowthTimeframe(tf)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    growthTimeframe === tf
                      ? 'bg-[#17324A] text-white shadow-xs'
                      : 'text-[#5F7180] hover:text-[#17324A]'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getActiveGrowthData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHeadcount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#17324A" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#17324A" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorHires" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAF2F8" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#5F7180' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#5F7180' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#B0D0EA', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="headcount" name="Total Headcount" stroke="#17324A" strokeWidth={2.5} fillOpacity={1} fill="url(#colorHeadcount)" />
                <Area type="monotone" dataKey="hires" name="New Hires" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorHires)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* WORKFORCE BUDGET VS ACTUAL (1 Column) */}
        <div className="p-6 rounded-2xl bg-white border border-[#B0D0EA] shadow-md space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#17324A] flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Workforce Budget vs Actual
              </h3>
              <button
                onClick={() => setShowBudgetDrillDown(true)}
                className="text-[10px] font-bold uppercase tracking-wider text-[#17324A] hover:underline cursor-pointer"
              >
                Drill Down
              </button>
            </div>
            <p className="text-xs text-[#5F7180] mt-0.5">
              Q3 fiscal commitment & department allocation
            </p>
          </div>

          {/* Budget Line Items */}
          <div className="space-y-3">
            {/* Payroll Budget */}
            <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE] space-y-1">
              <div className="flex justify-between text-xs font-bold text-[#17324A]">
                <span>Payroll Budget</span>
                <span className="text-emerald-700">₹{MOCK_WORKFORCE_BUDGET.payroll.actual} Cr / ₹{MOCK_WORKFORCE_BUDGET.payroll.budget} Cr</span>
              </div>
              <div className="w-full bg-[#EAF2F8] rounded-full h-2">
                <div className="h-2 rounded-full bg-[#17324A]" style={{ width: `${(MOCK_WORKFORCE_BUDGET.payroll.actual / MOCK_WORKFORCE_BUDGET.payroll.budget) * 100}%` }} />
              </div>
            </div>

            {/* Hiring Budget */}
            <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE] space-y-1">
              <div className="flex justify-between text-xs font-bold text-[#17324A]">
                <span>Hiring & Acquisition</span>
                <span className="text-purple-700">₹{MOCK_WORKFORCE_BUDGET.hiring.actual}L / ₹{MOCK_WORKFORCE_BUDGET.hiring.budget}L</span>
              </div>
              <div className="w-full bg-[#EAF2F8] rounded-full h-2">
                <div className="h-2 rounded-full bg-purple-600" style={{ width: `${(MOCK_WORKFORCE_BUDGET.hiring.actual / MOCK_WORKFORCE_BUDGET.hiring.budget) * 100}%` }} />
              </div>
            </div>

            {/* Training & Dev */}
            <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE] space-y-1">
              <div className="flex justify-between text-xs font-bold text-[#17324A]">
                <span>Training & Development</span>
                <span className="text-blue-700">₹{MOCK_WORKFORCE_BUDGET.training.actual}L / ₹{MOCK_WORKFORCE_BUDGET.training.budget}L</span>
              </div>
              <div className="w-full bg-[#EAF2F8] rounded-full h-2">
                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${(MOCK_WORKFORCE_BUDGET.training.actual / MOCK_WORKFORCE_BUDGET.training.budget) * 100}%` }} />
              </div>
            </div>

            {/* Total Utilization Banner */}
            <div className="p-3.5 rounded-xl bg-[#17324A] text-white flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#B0D0EA] tracking-wider block">Total Fiscal Utilization</span>
                <span className="text-lg font-black">{MOCK_WORKFORCE_BUDGET.totalUtilizationPct}%</span>
              </div>
              <button
                onClick={() => setShowBudgetDrillDown(true)}
                className="px-3 py-1.5 rounded-lg bg-[#B0D0EA] text-[#17324A] text-xs font-bold hover:bg-white transition-colors cursor-pointer"
              >
                View Department Breakdown
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* 5. DEPARTMENT PERFORMANCE BREAKDOWN WITH MULTI-LEVEL DRILL DOWN */}
      <div className="p-6 rounded-2xl bg-white border border-[#B0D0EA] shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#17324A] flex items-center gap-2">
              <Building className="w-4 h-4 text-[#17324A]" />
              Department Performance & Organization Execution
            </h3>
            <p className="text-xs text-[#5F7180]">
              Click any department row to drill down into managers, teams, and employee metrics
            </p>
          </div>
          <span className="text-xs font-bold text-[#17324A] bg-[#F5F9FC] px-3 py-1.5 rounded-xl border border-[#D9E5EE]">
            Company → Department → Manager → Team → Employee
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#D9E5EE] text-[#5F7180] uppercase tracking-wider font-bold text-[10px] bg-[#F5F9FC]">
                <th className="py-3 px-4 rounded-l-xl">Department</th>
                <th className="py-3 px-4">Headcount</th>
                <th className="py-3 px-4">Attendance</th>
                <th className="py-3 px-4">OKR Completion</th>
                <th className="py-3 px-4">Task Completion</th>
                <th className="py-3 px-4">Overall Score</th>
                <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAF2F8]">
              {MOCK_DEPARTMENT_PERFORMANCE.map((dept) => (
                <tr
                  key={dept.department}
                  onClick={() => setSelectedDeptDrillDown(dept)}
                  className="hover:bg-[#F5F9FC] transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-4 font-bold text-[#17324A]">
                    <div className="flex items-center gap-2.5">
                      <img src={dept.managerAvatar} alt={dept.managerName} className="w-7 h-7 rounded-full object-cover border border-[#B0D0EA]" />
                      <div>
                        <div className="text-xs font-black text-[#17324A] group-hover:text-purple-700 transition-colors">{dept.department}</div>
                        <div className="text-[10px] font-medium text-[#5F7180]">Head: {dept.managerName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#17324A]">{dept.headcount} employees</td>
                  <td className="py-3.5 px-4 font-semibold text-emerald-700">{dept.attendanceRate}%</td>
                  <td className="py-3.5 px-4 font-semibold text-indigo-700">{dept.okrCompletion}%</td>
                  <td className="py-3.5 px-4 font-semibold text-blue-700">{dept.taskCompletion}%</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 font-extrabold text-[11px] border border-purple-200">
                      {dept.overallScore} / 100
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button className="px-3 py-1.5 rounded-lg bg-[#EAF2F8] group-hover:bg-[#17324A] group-hover:text-white text-[#17324A] font-bold text-[11px] transition-all">
                      Drill Down →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. HIRING OVERVIEW, RISKS & ALERTS, UPCOMING EXECUTIVE EVENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* RECRUITMENT & HIRING OVERVIEW */}
        <div className="p-6 rounded-2xl bg-white border border-[#B0D0EA] shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-purple-600" />
              Recruitment Executive Summary
            </h3>
            <Link href="/recruitment" className="text-xs font-bold text-[#17324A] hover:underline flex items-center gap-1">
              View Portal <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE]">
              <span className="text-[10px] font-bold text-[#5F7180] uppercase">Open Positions</span>
              <div className="text-xl font-black text-[#17324A] mt-1">4</div>
            </div>
            <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE]">
              <span className="text-[10px] font-bold text-[#5F7180] uppercase">In Pipeline</span>
              <div className="text-xl font-black text-purple-700 mt-1">54 Candidates</div>
            </div>
            <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE]">
              <span className="text-[10px] font-bold text-[#5F7180] uppercase">Avg Time to Hire</span>
              <div className="text-xl font-black text-emerald-700 mt-1">18 Days</div>
            </div>
            <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE]">
              <span className="text-[10px] font-bold text-[#5F7180] uppercase">Offers Released</span>
              <div className="text-xl font-black text-blue-700 mt-1">3 Offers</div>
            </div>
          </div>
        </div>

        {/* RISKS & ALERTS */}
        <div className="p-6 rounded-2xl bg-white border border-[#B0D0EA] shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Risks & Operational Alerts
            </h3>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
              Active Watch
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-red-600 shrink-0 mt-1" />
              <div>
                <span className="font-bold text-red-900 block">Critical Overdue Deliverable</span>
                <span className="text-red-700 text-[11px]">WCAG Modal Accessibility Audit overdue by 2 days.</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0 mt-1" />
              <div>
                <span className="font-bold text-amber-900 block">Engineering Attrition Warning</span>
                <span className="text-amber-800 text-[11px]">Senior Frontend role open for more than 30 days.</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 mt-1" />
              <div>
                <span className="font-bold text-emerald-900 block">Compliance Audit Readiness</span>
                <span className="text-emerald-800 text-[11px]">Policy acknowledgment score reached 99.2%.</span>
              </div>
            </div>
          </div>
        </div>

        {/* UPCOMING EXECUTIVE EVENTS */}
        <div className="p-6 rounded-2xl bg-white border border-[#B0D0EA] shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#17324A]" />
              Upcoming Executive Events
            </h3>
            <Link
              href="/meetings/calendar"
              className="text-xs font-bold text-[#17324A] hover:underline flex items-center gap-1"
            >
              View Calendar <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {executiveEvents.map((evt) => (
              <div key={evt.id} className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE] flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-[#17324A] text-white text-center shrink-0 w-12">
                  <span className="text-[10px] uppercase font-bold tracking-wider block opacity-80">{evt.formattedDate.split(' ')[0]}</span>
                  <span className="text-sm font-black leading-none">{evt.formattedDate.split(' ')[1]}</span>
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <span className="text-xs font-bold text-[#17324A] block truncate">{evt.title}</span>
                  <span className="text-[10px] text-[#5F7180] block">{evt.time} • {evt.location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* MODAL: VIEW ALL ACTIONS */}
      {showAllActionsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#B0D0EA] shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#D9E5EE] pb-3">
              <h3 className="text-base font-bold text-[#17324A] flex items-center gap-2">
                <Crown className="w-4 h-4 text-purple-700" />
                All Executive Action Center Items ({executiveActions.length})
              </h3>
              <button onClick={() => setShowAllActionsModal(false)} className="p-1 rounded-lg hover:bg-[#F5F9FC] text-[#5F7180]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {executiveActions.map((action) => (
                <div key={action.id} className="p-4 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE] flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-[#17324A]">{action.title}</span>
                    <p className="text-xs text-[#5F7180]">{action.description}</p>
                    <span className="text-[10px] text-[#5F7180]">Owner: {action.responsiblePerson} • Due: {action.dueDate}</span>
                  </div>
                  <button
                    onClick={() => {
                      handleApproveAction(action.id);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[#17324A] text-white text-xs font-bold shrink-0"
                  >
                    {action.actionText}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DEPARTMENT PERFORMANCE DRILL DOWN */}
      {selectedDeptDrillDown && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#B0D0EA] shadow-xl max-w-3xl w-full p-6 space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#D9E5EE] pb-3">
              <div className="flex items-center gap-3">
                <img src={selectedDeptDrillDown.managerAvatar} alt={selectedDeptDrillDown.managerName} className="w-10 h-10 rounded-full object-cover border border-[#B0D0EA]" />
                <div>
                  <h3 className="text-lg font-black text-[#17324A]">{selectedDeptDrillDown.department} Department Drill-Down</h3>
                  <p className="text-xs text-[#5F7180]">Head of Department: {selectedDeptDrillDown.managerName} • {selectedDeptDrillDown.headcount} Employees across {selectedDeptDrillDown.teamsCount} Sub-teams</p>
                </div>
              </div>
              <button onClick={() => setSelectedDeptDrillDown(null)} className="p-1 rounded-lg hover:bg-[#F5F9FC] text-[#5F7180]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE]">
                <span className="text-[10px] font-bold text-[#5F7180] uppercase">Attendance</span>
                <div className="text-lg font-black text-emerald-700">{selectedDeptDrillDown.attendanceRate}%</div>
              </div>
              <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE]">
                <span className="text-[10px] font-bold text-[#5F7180] uppercase">OKR Completion</span>
                <div className="text-lg font-black text-indigo-700">{selectedDeptDrillDown.okrCompletion}%</div>
              </div>
              <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE]">
                <span className="text-[10px] font-bold text-[#5F7180] uppercase">Task Velocity</span>
                <div className="text-lg font-black text-blue-700">{selectedDeptDrillDown.taskCompletion}%</div>
              </div>
              <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE]">
                <span className="text-[10px] font-bold text-[#5F7180] uppercase">Overall Score</span>
                <div className="text-lg font-black text-purple-700">{selectedDeptDrillDown.overallScore} / 100</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              <h4 className="text-xs font-bold text-[#17324A] uppercase tracking-wider">Sub-Teams & Team Leads</h4>
              <div className="p-3.5 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#17324A]">Frontend & Mobile Systems Team</span>
                  <p className="text-[11px] text-[#5F7180]">Lead: Rahul Verma • 14 Engineers • OKR: 88%</p>
                </div>
                <Link href="/my-team" className="px-3 py-1 rounded-lg bg-[#17324A] text-white text-xs font-bold">
                  View Team
                </Link>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#17324A]">Backend & Microservices Platform</span>
                  <p className="text-[11px] text-[#5F7180]">Lead: Vikram Singh • 18 Engineers • OKR: 82%</p>
                </div>
                <Link href="/my-team" className="px-3 py-1 rounded-lg bg-[#17324A] text-white text-xs font-bold">
                  View Team
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: WORKFORCE BUDGET DRILL DOWN */}
      {showBudgetDrillDown && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#B0D0EA] shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#D9E5EE] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#17324A]">Workforce Departmental Budget Breakdown</h3>
                <p className="text-xs text-[#5F7180]">Total Fiscal Commitment: ₹2.20 Cr • Utilization: 94%</p>
              </div>
              <button onClick={() => setShowBudgetDrillDown(false)} className="p-1 rounded-lg hover:bg-[#F5F9FC] text-[#5F7180]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {MOCK_WORKFORCE_BUDGET.deptBreakdown.map((item) => (
                <div key={item.department} className="p-3.5 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE] space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-[#17324A]">
                    <span>{item.department} ({item.employees} Employees)</span>
                    <span className="text-emerald-700">Actual: ₹{item.actual}L / Budget: ₹{item.budget}L</span>
                  </div>
                  <div className="w-full bg-[#EAF2F8] rounded-full h-2">
                    <div className="h-2 rounded-full bg-[#17324A]" style={{ width: `${(item.actual / item.budget) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Standard Modals */}
      <AssignTaskModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
      />

      <ReviewDeliverableModal
        task={selectedTaskForReview}
        isOpen={!!selectedTaskForReview}
        onClose={() => setSelectedTaskForReview(null)}
      />

      <TaskAuditLogModal
        task={selectedTaskForAudit}
        isOpen={!!selectedTaskForAudit}
        onClose={() => setSelectedTaskForAudit(null)}
      />

    </div>
  );
};
