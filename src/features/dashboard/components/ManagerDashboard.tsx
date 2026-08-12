
'use client';

import React from 'react';
import {
  Check,
  X,
  Clock,
  Users,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Briefcase,
  Mail,
  MessageSquare,
  Phone,
} from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';
import { MOCK_MANAGED_TEAMS } from '@/features/teams/data/teams';

export const ManagerDashboard: React.FC = () => {
  const {
    leaveRequests,
    updateLeaveStatus,
    employees,
    currentUser,
  } = useHRMS();

  const pendingApprovals = leaveRequests.filter(
    (r) => r.status === 'Pending'
  );

  const managedTeams = MOCK_MANAGED_TEAMS.filter(
    (team) => team.manager === currentUser.name
  );

  const teamLeaders = managedTeams
    .map((team) => employees.find((employee) => employee.id === team.leaderId))
    .filter((employee): employee is NonNullable<typeof employee> => Boolean(employee));

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#17324A]">
          Manager Workspace
        </h1>

        <p className="mt-1 text-sm text-[#17324A]/70">
          Team overview
        </p>

        <p className="mt-1 text-sm text-[#17324A]/70">
          Review approvals, attendance, and delivery progress through your
          Team Leaders across each managed team.
        </p>
      </div>

      {/* Header Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Direct Reports */}
        <div className="p-4 rounded-lg bg-white border border-[#B0D0EA] shadow-md hover:border-[#17324A]/40 transition-colors">
          <div className="flex justify-between items-center text-[#17324A]/70 text-xs font-semibold">
            <span>Managed Teams</span>

            <Users className="w-4 h-4 text-[#17324A]" />
          </div>

          <div className="text-2xl font-black text-[#17324A] mt-2">
            {managedTeams.length}
          </div>

          <span className="text-[11px] text-[#17324A]/70 font-medium">
            {teamLeaders.length} Team Leaders as direct contacts
          </span>
        </div>

        {/* Pending Approvals */}
        <div className="p-4 rounded-lg bg-white border border-[#B0D0EA] shadow-md hover:border-[#17324A]/40 transition-colors">
          <div className="flex justify-between items-center text-[#17324A]/70 text-xs font-semibold">
            <span>Pending Approvals</span>

            <AlertCircle className="w-4 h-4 text-[#17324A]" />
          </div>

          <div className="text-2xl font-black text-[#17324A] mt-2">
            {pendingApprovals.length}
          </div>

          <span className="text-[11px] text-[#17324A]/70">
            Requires your action
          </span>
        </div>

        {/* Team Attendance */}
        <div className="p-4 rounded-lg bg-white border border-[#B0D0EA] shadow-md hover:border-[#17324A]/40 transition-colors">
          <div className="flex justify-between items-center text-[#17324A]/70 text-xs font-semibold">
            <span>Team Attendance</span>

            <Clock className="w-4 h-4 text-[#17324A]" />
          </div>

          <div className="text-2xl font-black text-[#17324A] mt-2">
            94.8%
          </div>

          <span className="text-[11px] text-[#17324A]/70 font-medium">
            +2.1% this month
          </span>
        </div>

        {/* OKR Completion */}
        <div className="p-4 rounded-lg bg-white border border-[#B0D0EA] shadow-md hover:border-[#17324A]/40 transition-colors">
          <div className="flex justify-between items-center text-[#17324A]/70 text-xs font-semibold">
            <span>OKR Completion</span>

            <TrendingUp className="w-4 h-4 text-[#17324A]" />
          </div>

          <div className="text-2xl font-black text-[#17324A] mt-2">
            78%
          </div>

          <span className="text-[11px] text-[#17324A]/70 font-medium">
            Q3 sprint targets
          </span>
        </div>
      </div>

      {/* Pending Leave Approvals Queue */}
      <div className="p-5 rounded-lg bg-white border border-[#B0D0EA] shadow-md space-y-4">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#17324A]" />
              Pending Team Leave & WFH Requests
            </h3>

            <p className="text-xs text-[#17324A]/70">
              Review and approve team leave applications
            </p>
          </div>

          <span className="w-fit px-2.5 py-1 rounded-md text-xs font-bold bg-[#B0D0EA]/40 text-[#17324A] border border-[#B0D0EA]">
            {pendingApprovals.length} action needed
          </span>
        </div>

        {pendingApprovals.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[#B0D0EA] rounded-lg bg-[#B0D0EA]/20">

            <CheckCircle2 className="w-8 h-8 text-[#17324A] mx-auto mb-2" />

            <p className="text-xs font-semibold text-[#17324A]">
              All pending leave requests approved
            </p>

          </div>
        ) : (
          <div className="space-y-3">

            {pendingApprovals.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-lg bg-[#B0D0EA]/20 border border-[#B0D0EA] flex flex-col md:flex-row md:items-center justify-between gap-4"
              >

                <div className="flex items-center gap-3.5">

                  <img
                    src={req.employeeAvatar}
                    alt={req.employeeName}
                    className="w-10 h-10 rounded-full object-cover border border-[#B0D0EA] ring-2 ring-[#B0D0EA]/60"
                  />

                  <div>
                    <h4 className="text-xs font-bold text-[#17324A]">
                      {req.employeeName}
                    </h4>

                    <p className="text-[11px] text-[#17324A]/70">
                      Requesting{' '}
                      <strong className="text-[#17324A]">
                        {req.days} day(s) {req.leaveType} leave
                      </strong>{' '}
                      ({req.startDate} to {req.endDate})
                    </p>

                    <p className="text-[11px] text-[#17324A]/70 italic mt-0.5">
                      {req.reason}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">

                  {/* Reject */}
                  <button
                    onClick={() =>
                      updateLeaveStatus(req.id, 'Rejected')
                    }
                    className="px-3 py-1.5 rounded-md bg-[#B0D0EA]/30 hover:bg-[#B0D0EA]/60 text-[#17324A] border border-[#B0D0EA] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject
                  </button>

                  {/* Approve */}
                  <button
                    onClick={() =>
                      updateLeaveStatus(req.id, 'Approved')
                    }
                    className="px-4 py-1.5 rounded-md bg-[#B0D0EA] hover:bg-[#9FC5E0] text-[#17324A] border border-[#B0D0EA] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Approve
                  </button>

                </div>
              </div>
            ))}

          </div>
        )}
      </div>

      {/* Team Roster & Attendance Status */}
      <div className="p-5 rounded-lg bg-white border border-[#B0D0EA] shadow-md space-y-4">

        <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-[#17324A]" />
          Team Leader Coverage Today
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

          {managedTeams.map((team) => {
            const leader = teamLeaders.find((employee) => employee.id === team.leaderId);
            if (!leader) return null;

            return (
              <div
                key={team.id}
                className="rounded-lg bg-[#B0D0EA]/20 border border-[#B0D0EA] p-3.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src={leader.avatar}
                      alt={leader.name}
                      className="h-9 w-9 rounded-full border border-[#B0D0EA] object-cover"
                    />
                    <div className="min-w-0">
                      <h5 className="truncate text-xs font-bold text-[#17324A]">{team.name}</h5>
                      <p className="truncate text-[11px] text-[#17324A]/70">Lead: {leader.name}</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-md border border-[#B0D0EA] bg-[#B0D0EA]/50 px-2.5 py-1 text-[10px] font-bold text-[#17324A]">
                    {leader.status}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-[#17324A]/70">
                  <span>{team.memberIds.length} members</span>
                  <div className="flex items-center gap-1.5">
                    <a href={`mailto:${leader.email}`} aria-label={`Email ${leader.name}`} title={`Email ${leader.name}`} className="rounded-md border border-[#B0D0EA] bg-white p-1.5 text-[#17324A] hover:bg-[#EAF2F8]"><Mail className="h-3 w-3" /></a>
                    <a href={`tel:${leader.phone.replace(/\s/g, '')}`} aria-label={`Call ${leader.name}`} title={`Call ${leader.name}`} className="rounded-md border border-[#B0D0EA] bg-white p-1.5 text-[#17324A] hover:bg-[#EAF2F8]"><Phone className="h-3 w-3" /></a>
                    <button type="button" onClick={() => window.alert(`Message ${leader.name}`)} aria-label={`Message ${leader.name}`} title={`Message ${leader.name}`} className="rounded-md border border-[#B0D0EA] bg-white p-1.5 text-[#17324A] hover:bg-[#EAF2F8]"><MessageSquare className="h-3 w-3" /></button>
                  </div>
                </div>
              </div>
            );
          })}

        </div>
      </div>

    </div>
  );
};

