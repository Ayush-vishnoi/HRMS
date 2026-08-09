'use client';

import React, { useState } from 'react';
import {
  Target,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  CheckSquare,
  Plus,
  Users,
  Filter,
  History,
  FileCheck,
} from 'lucide-react';
import { useHRMS, Task } from '@/context/HRMSContext';
import { AssignTaskModal } from '@/components/modals/AssignTaskModal';
import { SubmitDeliverableModal } from '@/components/modals/SubmitDeliverableModal';
import { ReviewDeliverableModal } from '@/components/modals/ReviewDeliverableModal';
import { TaskAuditLogModal } from '@/components/modals/TaskAuditLogModal';
import { canReviewDeliverable, getAccessibleTasks } from '@/utils/taskAuthorization';

const KRA_PILLARS = [
  {
    id: 'KRA-1',
    title: 'Product Engineering & ML Platform',
    category: 'Engineering',
    progress: 85,
    status: 'On Track',
    targetDate: '30 Sep 2026',
    owner: 'Engineering Team',
    deliverables: 'Deliver onboarding ML model scoring engine and real-time telemetry dashboard.',
  },
  {
    id: 'KRA-2',
    title: 'System Reliability & HR Compliance',
    category: 'Security & Ops',
    progress: 92,
    status: 'Ahead',
    targetDate: '15 Sep 2026',
    owner: 'Platform Operations',
    deliverables: 'Enforce 60-min attendance grace rules, automated shifts, and audit trails.',
  },
  {
    id: 'KRA-3',
    title: 'Design System & Accessibility Standards',
    category: 'Design & UX',
    progress: 78,
    status: 'In Progress',
    targetDate: '30 Sep 2026',
    owner: 'Frontend Guild',
    deliverables: 'Achieve WCAG 2.1 AA standard across all ESS portal drawers and modals.',
  },
  {
    id: 'KRA-4',
    title: 'Talent Acquisition & Team Velocity',
    category: 'People Ops',
    progress: 65,
    status: 'In Progress',
    targetDate: '15 Oct 2026',
    owner: 'HR & Management',
    deliverables: 'Reduce hiring turnaround from 24 days to 14 days for critical engineering roles.',
  },
];

export default function PerformancePage() {
  const { tasks, currentUser, employees } = useHRMS();

  const [filterTab, setFilterTab] = useState<'ALL' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'COMPLETED' | 'MY_TASKS'>('ALL');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTaskForSubmit, setSelectedTaskForSubmit] = useState<Task | null>(null);
  const [selectedTaskForReview, setSelectedTaskForReview] = useState<Task | null>(null);
  const [selectedTaskForAudit, setSelectedTaskForAudit] = useState<Task | null>(null);

  const canAssign = currentUser.userRole !== 'employee';
  const accessibleTasks = getAccessibleTasks(currentUser, tasks, employees);

  const filteredTasks = accessibleTasks.filter((t) => {
    if (filterTab === 'IN_PROGRESS') return t.status === 'In Progress' || t.status === 'Changes Requested';
    if (filterTab === 'UNDER_REVIEW') return t.status === 'Under Review';
    if (filterTab === 'COMPLETED') return t.status === 'Completed';
    if (filterTab === 'MY_TASKS') return t.assignedTo === currentUser.id;
    return true;
  });

  const completedCount = accessibleTasks.filter((t) => t.status === 'Completed').length;
  const inProgressCount = accessibleTasks.filter((t) => t.status === 'In Progress' || t.status === 'Under Review').length;

  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#17324A]">
            Key Result Areas (KRA) & Task Deliverables
          </h1>
          <p className="mt-1 text-sm text-[#667085]">
            Track organizational Key Result Areas, manage team tasks, and review delivery progress
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-[#B0D0EA] border border-[#9FC5E2] text-[#17324A] text-xs font-semibold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#17324A]" />
            Q3 2026 KRA Review Cycle
          </div>

          {canAssign && (
            <button
              onClick={() => setIsAssignModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#17324A] hover:bg-[#234B68] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Assign Task
            </button>
          )}
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        {/* KRA Health */}
        <div className="p-4 rounded-2xl bg-white border border-[#D9E5EE] shadow-md">
          <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
            Overall KRA Score
          </span>
          <div className="text-2xl font-black text-[#17324A] mt-2">
            80.0%
          </div>
          <div className="w-full bg-[#EAF2F8] rounded-full h-1.5 mt-2">
            <div className="bg-[#17324A] h-1.5 rounded-full" style={{ width: '80%' }} />
          </div>
          <span className="text-[11px] text-[#667085] mt-1 block">
            4 Strategic Pillars on track
          </span>
        </div>

        {/* Total Tasks */}
        <div className="p-4 rounded-2xl bg-white border border-[#D9E5EE] shadow-md">
          <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
            Accessible Tasks
          </span>
          <div className="text-2xl font-black text-[#17324A] mt-2">
            {accessibleTasks.length}
          </div>
          <span className="text-[11px] text-[#667085] mt-1 block">
            Across your authorized hierarchy
          </span>
        </div>

        {/* In Progress */}
        <div className="p-4 rounded-2xl bg-white border border-[#D9E5EE] shadow-md">
          <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
            Active Deliverables
          </span>
          <div className="text-2xl font-black text-amber-600 mt-2">
            {inProgressCount}
          </div>
          <span className="text-[11px] text-[#667085] mt-1 block">
            Currently undergoing execution & review
          </span>
        </div>

        {/* Completed */}
        <div className="p-4 rounded-2xl bg-white border border-[#D9E5EE] shadow-md">
          <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
            Completed Tasks
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-2">
            {completedCount}
          </div>
          <span className="text-[11px] text-[#667085] mt-1 block">
            {accessibleTasks.length > 0 ? Math.round((completedCount / accessibleTasks.length) * 100) : 100}% completion rate
          </span>
        </div>

      </div>

      {/* Strategic KRA Pillars */}
      <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
              <Target className="w-4 h-4 text-[#17324A]" />
              Strategic Key Result Areas (KRAs)
            </h3>
            <p className="text-xs text-[#5F7180] mt-0.5">
              Organizational focus pillars aligned with Q3 corporate roadmap
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {KRA_PILLARS.map((kra) => (
            <div
              key={kra.id}
              className="p-5 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE] space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EAF2F8] border border-[#D9E5EE] text-[#667085]">
                    {kra.category}
                  </span>
                  <h4 className="text-sm font-bold text-[#17324A] mt-1.5">
                    {kra.title}
                  </h4>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    kra.status === 'Ahead'
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : kra.status === 'On Track'
                      ? 'bg-[#B0D0EA] text-[#17324A] border border-[#9FC5E2]'
                      : 'bg-amber-50 text-amber-600 border border-amber-200'
                  }`}
                >
                  {kra.status}
                </span>
              </div>

              <p className="text-xs text-[#5F7180] leading-relaxed">
                {kra.deliverables}
              </p>

              {/* Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-[#667085]">
                  <span>KRA Progress</span>
                  <span className="text-[#17324A] font-bold">{kra.progress}%</span>
                </div>
                <div className="w-full bg-[#EAF2F8] rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-[#17324A] transition-all"
                    style={{ width: `${kra.progress}%` }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-[11px] text-[#667085] pt-1 border-t border-[#D9E5EE]/60">
                <span>Owner: <strong className="text-[#17324A]">{kra.owner}</strong></span>
                <span>Target: <strong>{kra.targetDate}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Tasks & Deliverables Queue */}
      <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#17324A]" />
              Task & Deliverable Management Center
            </h3>
            <p className="text-xs text-[#5F7180] mt-0.5">
              Submit deliverables, perform hierarchical reviews, and track full lifecycle audit trails
            </p>
          </div>

          {/* Segmented Filter */}
          <div className="flex items-center gap-1">
            {(['ALL', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED', 'MY_TASKS'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  filterTab === tab
                    ? 'bg-[#B0D0EA] text-[#17324A] border border-[#9FC5E2] font-semibold shadow-sm'
                    : 'bg-[#F5F9FC] text-[#667085] hover:bg-[#EAF2F8] hover:text-[#17324A]'
                }`}
              >
                {tab === 'ALL' ? 'All Tasks' : tab === 'IN_PROGRESS' ? 'In Progress' : tab === 'UNDER_REVIEW' ? 'Under Review' : tab === 'COMPLETED' ? 'Completed' : 'My Tasks'}
              </button>
            ))}
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[#D9E5EE] rounded-xl bg-[#F5F9FC]">
            <CheckSquare className="w-8 h-8 text-[#5F7180] mx-auto mb-2" />
            <p className="text-xs font-semibold text-[#17324A]">No tasks match this filter</p>
            <p className="text-[11px] text-[#5F7180]">Assign or submit a new task deliverable to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTasks.map((task) => {
              const isAssignedToMe = task.assignedTo === currentUser.id;
              const canReview = canReviewDeliverable(currentUser, task, employees);
              const latestReview = task.deliverable?.reviews[task.deliverable.reviews.length - 1];

              return (
                <div
                  key={task.id}
                  className="p-4 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE] flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#B0D0EA] text-[#17324A] border border-[#9FC5E2]">
                          {task.kraCategory || 'KRA Deliverable'}
                        </span>
                        {task.ceoApprovalRequired && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">
                            CEO Sign-Off
                          </span>
                        )}
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          task.priority === 'High'
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : task.priority === 'Medium'
                            ? 'bg-amber-50 text-amber-600 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        }`}
                      >
                        {task.priority} Priority
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-[#17324A]">{task.title}</h4>
                    <p className="text-[11px] text-[#5F7180] leading-relaxed">{task.description}</p>
                    
                    <p className="text-[11px] text-[#17324A] bg-white p-2 rounded-lg border border-[#D9E5EE]">
                      <strong>Expected Deliverable:</strong> {task.expectedDeliverable}
                    </p>

                    {task.status === 'Changes Requested' && latestReview && (
                      <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                        <strong>Changes Requested by {latestReview.reviewedByName}:</strong> "{latestReview.feedback}"
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#D9E5EE] space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-[#5F7180]">
                      <span>Assignee: <strong className="text-[#17324A]">{task.assignedToName}</strong></span>
                      <span>Due: <strong className="text-[#17324A]">{task.deadline}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTaskForAudit(task)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-[#D9E5EE] text-[#5F7180] hover:text-[#17324A] text-xs font-semibold"
                        title="Audit History"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>

                      {task.status === 'Completed' ? (
                        <div className="flex-1 p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-center text-xs text-emerald-700 font-semibold">
                          Completed & Approved
                        </div>
                      ) : isAssignedToMe && (task.status === 'In Progress' || task.status === 'Changes Requested' || task.status === 'Pending') ? (
                        <button
                          type="button"
                          onClick={() => setSelectedTaskForSubmit(task)}
                          className="flex-1 py-1.5 rounded-lg bg-[#17324A] hover:bg-[#234B68] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {task.status === 'Changes Requested' ? 'Resubmit Deliverable' : 'Submit Deliverable'}
                        </button>
                      ) : canReview && task.status === 'Under Review' ? (
                        <button
                          type="button"
                          onClick={() => setSelectedTaskForReview(task)}
                          className="flex-1 py-1.5 rounded-lg bg-[#17324A] hover:bg-[#234B68] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          Review Deliverable
                        </button>
                      ) : (
                        <div className="flex-1 p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-center text-xs text-slate-700 font-medium">
                          Status: {task.status}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Modals */}
      <AssignTaskModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
      />

      <SubmitDeliverableModal
        task={selectedTaskForSubmit}
        isOpen={!!selectedTaskForSubmit}
        onClose={() => setSelectedTaskForSubmit(null)}
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
}
