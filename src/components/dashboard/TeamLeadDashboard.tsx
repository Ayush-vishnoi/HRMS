'use client';

import React, { useState } from 'react';
import {
  UsersRound,
  CheckSquare,
  Clock,
  AlertCircle,
  TrendingUp,
  FileCheck,
  Plus,
  Calendar,
  Sparkles,
  CheckCircle2,
  FileText,
  History,
} from 'lucide-react';
import { useHRMS, Task } from '@/context/HRMSContext';
import { getDirectReports } from '@/utils/taskAuthorization';
import { AssignTaskModal } from '@/components/modals/AssignTaskModal';
import { ReviewDeliverableModal } from '@/components/modals/ReviewDeliverableModal';
import { TaskAuditLogModal } from '@/components/modals/TaskAuditLogModal';
import { UpcomingMeetingsCard } from '@/components/dashboard/UpcomingMeetingsCard';

export const TeamLeadDashboard: React.FC = () => {
  const { currentUser, employees, tasks } = useHRMS();

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTaskForReview, setSelectedTaskForReview] = useState<Task | null>(null);
  const [selectedTaskForAudit, setSelectedTaskForAudit] = useState<Task | null>(null);

  const directReports = getDirectReports(currentUser.name, employees);
  const directReportIds = directReports.map((e) => e.id);

  const myTasks = tasks.filter((t) => t.assignedTo === currentUser.id);
  const teamTasks = tasks.filter((t) => directReportIds.includes(t.assignedTo));

  const pendingReviews = teamTasks.filter(
    (t) => t.status === 'Under Review' || t.deliverable?.status === 'Under Review' || t.deliverable?.status === 'Resubmitted'
  );

  const completedTeamTasks = teamTasks.filter((t) => t.status === 'Completed').length;
  const totalTeamTasks = teamTasks.length;
  const completionRate = totalTeamTasks > 0 ? Math.round((completedTeamTasks / totalTeamTasks) * 100) : 100;

  const overdueTasks = teamTasks.filter((t) => {
    if (t.status === 'Completed') return false;
    const deadlineDate = new Date(t.deadline);
    const today = new Date('2026-08-09');
    return deadlineDate < today;
  });

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#B0D0EA] text-[#17324A] border border-[#9FC5E2]">
            <Sparkles className="w-3.5 h-3.5 text-[#17324A]" />
            Team Lead Workspace • {currentUser.department}
          </div>
          <h2 className="text-2xl font-bold text-[#17324A] tracking-tight">
            Welcome back, {currentUser.name}! 🚀
          </h2>
          <p className="text-xs text-[#5F7180]">
            Manage sprint tasks, review team deliverables, and guide {directReports.length} direct engineers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#17324A] hover:bg-[#234B68] text-white text-xs font-bold shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Assign Team Task
          </button>
        </div>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* My Tasks */}
        <div className="p-4 rounded-2xl bg-white border border-[#D9E5EE] shadow-md">
          <div className="flex justify-between items-center text-xs font-bold text-[#17324A]">
            <span>My Tasks</span>
            <CheckSquare className="w-4 h-4 text-[#17324A]" />
          </div>
          <div className="text-2xl font-black text-[#17324A] mt-2">
            {myTasks.length}
          </div>
          <span className="text-[11px] text-[#5F7180]">
            {myTasks.filter((t) => t.status === 'Completed').length} Completed
          </span>
        </div>

        {/* Team Tasks */}
        <div className="p-4 rounded-2xl bg-white border border-[#D9E5EE] shadow-md">
          <div className="flex justify-between items-center text-xs font-bold text-[#17324A]">
            <span>Team Tasks</span>
            <UsersRound className="w-4 h-4 text-[#17324A]" />
          </div>
          <div className="text-2xl font-black text-[#17324A] mt-2">
            {teamTasks.length}
          </div>
          <span className="text-[11px] text-[#5F7180]">
            Across {directReports.length} direct reports
          </span>
        </div>

        {/* Pending Reviews */}
        <div className="p-4 rounded-2xl bg-white border border-[#D9E5EE] shadow-md">
          <div className="flex justify-between items-center text-xs font-bold text-[#17324A]">
            <span>Pending Reviews</span>
            <FileCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">
            {pendingReviews.length}
          </div>
          <span className="text-[11px] text-[#5F7180]">
            Deliverables awaiting your action
          </span>
        </div>

        {/* Team Completion Rate */}
        <div className="p-4 rounded-2xl bg-white border border-[#D9E5EE] shadow-md">
          <div className="flex justify-between items-center text-xs font-bold text-[#17324A]">
            <span>Team Completion Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">
            {completionRate}%
          </div>
          <span className="text-[11px] text-[#5F7180]">
            {overdueTasks.length} overdue deliverables
          </span>
        </div>

      </div>

      {/* Deliverables Awaiting Review */}
      <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-amber-600" />
              Deliverables Awaiting Team Lead Review
            </h3>
            <p className="text-xs text-[#5F7180] mt-0.5">
              Review submitted artifacts, provide constructive feedback, or approve completion
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
            {pendingReviews.length} Pending Actions
          </span>
        </div>

        {pendingReviews.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[#D9E5EE] rounded-xl bg-[#F5F9FC]">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-[#17324A]">All deliverables reviewed!</p>
            <p className="text-[11px] text-[#5F7180]">No pending reviews from your team members.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingReviews.map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE] flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#B0D0EA] transition-all"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#B0D0EA] text-[#17324A]">
                      {task.kraCategory || 'Engineering'}
                    </span>
                    <span className="text-xs font-bold text-[#17324A] truncate">{task.title}</span>
                  </div>
                  <p className="text-xs text-[#5F7180] line-clamp-1">{task.deliverable?.notes || task.description}</p>
                  <div className="flex items-center gap-3 text-[11px] text-[#5F7180]">
                    <span>Submitted by: <strong className="text-[#17324A]">{task.assignedToName}</strong></span>
                    <span>•</span>
                    <span>Deadline: <strong>{task.deadline}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setSelectedTaskForAudit(task)}
                    className="p-2 rounded-lg bg-white border border-[#D9E5EE] text-[#5F7180] hover:text-[#17324A] hover:bg-[#EAF2F8] text-xs font-semibold flex items-center gap-1"
                    title="View History"
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSelectedTaskForReview(task)}
                    className="px-4 py-2 rounded-xl bg-[#17324A] hover:bg-[#234B68] text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    Review Deliverable
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Direct Team Tasks Queue & Upcoming Meetings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Direct Team Tasks Queue */}
        <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-md space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#17324A]" />
                Direct Team Tasks Overview
              </h3>
              <p className="text-xs text-[#5F7180] mt-0.5">
                Active deliverables assigned to engineers reporting directly to you
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#D9E5EE] text-[#5F7180] font-bold bg-[#EAF2F8]">
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E5EE] text-[#17324A]">
                {teamTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-[#F5F9FC] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#17324A] max-w-xs truncate">
                      {task.title}
                    </td>
                    <td className="py-3 px-4 text-[#5F7180]">
                      {task.assignedToName}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        task.priority === 'High' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#5F7180]">
                      {task.deadline}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        task.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : task.status === 'Under Review'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : task.status === 'Changes Requested'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedTaskForAudit(task)}
                          className="p-1.5 rounded-lg bg-white border border-[#D9E5EE] text-[#5F7180] hover:text-[#17324A]"
                          title="History"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        {task.status === 'Under Review' && (
                          <button
                            onClick={() => setSelectedTaskForReview(task)}
                            className="px-2.5 py-1 rounded-lg bg-[#17324A] text-white text-[11px] font-bold hover:bg-[#234B68]"
                          >
                            Review
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Meetings Widget */}
        <div>
          <UpcomingMeetingsCard />
        </div>

      </div>

      {/* Modals */}
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
