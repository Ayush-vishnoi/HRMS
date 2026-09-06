'use client';

import { authFetch } from '@/lib/api-client';
import React, { useEffect, useState } from 'react';
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
import { useChat } from '@/shared/providers/ChatContext';

type LiveTeam = {
  id: string;
  name: string;
  department: string;
  manager: string;
  leaderId: string;
  focus: string;
  leader: {
    employee: {
      id: string;
      name: string;
      role: string;
      department: string;
      email: string;
      phone: string;
      avatar: string;
      status: string;
    };
  };
  members: Array<{
    employee: {
      id: string;
      name: string;
      role: string;
      avatar: string;
      status: string;
      email: string;
      phone: string;
    };
  }>;
};

export const ManagerDashboard: React.FC = () => {
  const {
    leaveRequests,
    updateLeaveStatus,
    currentUser,
  } = useHRMS();
  const { openChatWith } = useChat();

  const [liveTeams, setLiveTeams] = useState<LiveTeam[]>([]);

  useEffect(() => {
    const fetchLiveTeams = async () => {
      try {
        const res = await authFetch<Response>(`/api/my-team?managerId=${encodeURIComponent(currentUser.id)}`, { raw: true });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setLiveTeams(json.data);
          }
        }
      } catch (err) {
        console.error('Failed to load live teams on Manager Dashboard:', err);
      }
    };

    fetchLiveTeams();
  }, [currentUser.id]);

  const pendingApprovals = leaveRequests.filter(
    (r) => r.status === 'Pending'
  );

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

        {/* Managed Teams */}
        <div className="p-4 rounded-lg bg-white border border-[#B0D0EA] shadow-md hover:border-[#17324A]/40 transition-colors">
          <div className="flex justify-between items-center text-[#17324A]/70 text-xs font-semibold">
            <span>Managed Teams</span>

            <Users className="w-4 h-4 text-[#17324A]" />
          </div>

          <div className="text-2xl font-black text-[#17324A] mt-2">
            {liveTeams.length}
          </div>

          <span className="text-[11px] text-[#17324A]/70 font-medium">
            {liveTeams.length} Team Leaders as direct contacts
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
            94%
          </div>

          <span className="text-[11px] text-[#17324A]/70">
            Today's attendance rate
          </span>
        </div>

        {/* Sprint Delivery */}
        <div className="p-4 rounded-lg bg-white border border-[#B0D0EA] shadow-md hover:border-[#17324A]/40 transition-colors">
          <div className="flex justify-between items-center text-[#17324A]/70 text-xs font-semibold">
            <span>Sprint Delivery</span>

            <TrendingUp className="w-4 h-4 text-[#17324A]" />
          </div>

          <div className="text-2xl font-black text-[#17324A] mt-2">
            88%
          </div>

          <span className="text-[11px] text-[#17324A]/70">
            On-track sprint progress
          </span>
        </div>

      </div>

      {/* Main Grid: Pending Approvals & Attendance Quick Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left 2 Cols: Pending Leave Approvals */}
        <div className="lg:col-span-2 space-y-4 p-5 rounded-lg bg-white border border-[#B0D0EA] shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#17324A]" />
              Pending Leave Approvals ({pendingApprovals.length})
            </h3>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#17324A]/70">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
              All leave requests have been reviewed!
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-[#B0D0EA] bg-[#B0D0EA]/10 hover:bg-[#B0D0EA]/20 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#17324A]">
                        {req.employeeName}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#B0D0EA]/60 text-[#17324A] font-semibold">
                        {req.leaveType}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#17324A]/80">
                      {req.startDate} to {req.endDate} ({req.days} days) — {req.reason}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => updateLeaveStatus(req.id, 'Approved')}
                      className="px-3 py-1.5 rounded-md bg-[#17324A] text-white text-xs font-bold hover:bg-[#17324A]/90 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => updateLeaveStatus(req.id, 'Rejected')}
                      className="px-3 py-1.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Quick Attendance Summary */}
        <div className="p-5 rounded-lg bg-white border border-[#B0D0EA] shadow-md space-y-4">
          <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#17324A]" />
            Attendance Summary
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs p-2.5 rounded-md bg-[#B0D0EA]/20 border border-[#B0D0EA]">
              <span className="font-semibold text-[#17324A]">Present Today</span>
              <span className="font-bold text-[#17324A]">12</span>
            </div>
            <div className="flex justify-between items-center text-xs p-2.5 rounded-md bg-[#B0D0EA]/20 border border-[#B0D0EA]">
              <span className="font-semibold text-[#17324A]">On Leave</span>
              <span className="font-bold text-[#17324A]">2</span>
            </div>
            <div className="flex justify-between items-center text-xs p-2.5 rounded-md bg-[#B0D0EA]/20 border border-[#B0D0EA]">
              <span className="font-semibold text-[#17324A]">Late Clock-ins</span>
              <span className="font-bold text-[#17324A]">1</span>
            </div>
            <div className="flex justify-between items-center text-xs p-2.5 rounded-md bg-[#B0D0EA]/20 border border-[#B0D0EA]">
              <span className="font-semibold text-[#17324A]">Remote / WFH</span>
              <span className="font-bold text-[#17324A]">3</span>
            </div>
          </div>
        </div>

      </div>

      {/* Team Roster & Attendance Status (Live Synchronized from PostgreSQL) */}
      <div className="p-5 rounded-lg bg-white border border-[#B0D0EA] shadow-md space-y-4">

        <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-[#17324A]" />
          Team Leader Coverage Today
        </h3>

        {liveTeams.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#17324A]/70">
            No managed teams loaded from database.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {liveTeams.map((team) => {
              const leader = team.leader.employee;
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
                    <span>{team.members.length} members</span>
                    <div className="flex items-center gap-1.5">
                      <a href={`mailto:${leader.email}`} aria-label={`Email ${leader.name}`} title={`Email ${leader.name}`} className="rounded-md border border-[#B0D0EA] bg-white p-1.5 text-[#17324A] hover:bg-[#EAF2F8]"><Mail className="h-3 w-3" /></a>
                      <a href={`tel:${leader.phone.replace(/\s/g, '')}`} aria-label={`Call ${leader.name}`} title={`Call ${leader.name}`} className="rounded-md border border-[#B0D0EA] bg-white p-1.5 text-[#17324A] hover:bg-[#EAF2F8]"><Phone className="h-3 w-3" /></a>
                      <button type="button" onClick={() => void openChatWith(leader.id)} aria-label={`Message ${leader.name}`} title={`Message ${leader.name}`} className="rounded-md border border-[#B0D0EA] bg-white p-1.5 text-[#17324A] hover:bg-[#EAF2F8] cursor-pointer"><MessageSquare className="h-3 w-3" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
