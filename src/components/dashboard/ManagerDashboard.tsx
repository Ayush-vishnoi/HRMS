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
  Briefcase
} from 'lucide-react';
import { useHRMS } from '@/context/HRMSContext';

export const ManagerDashboard: React.FC = () => {
  const { leaveRequests, updateLeaveStatus, employees } = useHRMS();

  const pendingApprovals = leaveRequests.filter((r) => r.status === 'Pending');
  const teamMembers = employees.filter((e) => e.department === 'Engineering' || e.department === 'Design');

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase text-[#B86B78]">Manager workspace</p>
        <h2 className="text-xl font-bold text-[#F0F2F5]">Team overview</h2>
        <p className="text-xs text-[#8B949E]">Review approvals, attendance, and delivery progress for your direct reports.</p>
      </div>

      {/* Header Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-[#161b22] border border-[#30363d] shadow-md hover:border-[#8B3A4A]/50 transition-colors">
          <div className="flex justify-between items-center text-[#8B949E] text-xs font-semibold">
            <span>Direct Reports</span>
            <Users className="w-4 h-4 text-[#B86B78]" />
          </div>
          <div className="text-2xl font-black text-[#F0F2F5] mt-2">{teamMembers.length}</div>
          <span className="text-[11px] text-[#3fb950] font-medium">100% active roster</span>
        </div>

        <div className="p-4 rounded-lg bg-[#161b22] border border-[#30363d] shadow-md hover:border-[#8B3A4A]/50 transition-colors">
          <div className="flex justify-between items-center text-[#8B949E] text-xs font-semibold">
            <span>Pending Approvals</span>
            <AlertCircle className="w-4 h-4 text-[#d29922]" />
          </div>
          <div className="text-2xl font-black text-[#d29922] mt-2">{pendingApprovals.length}</div>
          <span className="text-[11px] text-[#8B949E]">Requires your action</span>
        </div>

        <div className="p-4 rounded-lg bg-[#161b22] border border-[#30363d] shadow-md hover:border-[#8B3A4A]/50 transition-colors">
          <div className="flex justify-between items-center text-[#8B949E] text-xs font-semibold">
            <span>Team Attendance</span>
            <Clock className="w-4 h-4 text-[#3fb950]" />
          </div>
          <div className="text-2xl font-black text-[#F0F2F5] mt-2">94.8%</div>
          <span className="text-[11px] text-[#3fb950] font-medium">+2.1% this month</span>
        </div>

        <div className="p-4 rounded-lg bg-[#161b22] border border-[#30363d] shadow-md hover:border-[#8B3A4A]/50 transition-colors">
          <div className="flex justify-between items-center text-[#8B949E] text-xs font-semibold">
            <span>OKR Completion</span>
            <TrendingUp className="w-4 h-4 text-[#B86B78]" />
          </div>
          <div className="text-2xl font-black text-[#F0F2F5] mt-2">78%</div>
          <span className="text-[11px] text-[#B86B78] font-medium">Q3 sprint targets</span>
        </div>
      </div>

      {/* Pending Leave Approvals Queue */}
      <div className="p-5 rounded-lg bg-[#161b22] border border-[#30363d] shadow-md space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#F0F2F5] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#d29922]" />
              Pending Team Leave & WFH Requests
            </h3>
            <p className="text-xs text-[#8B949E]">Review and approve team leave applications</p>
          </div>
          <span className="w-fit px-2.5 py-1 rounded-md text-xs font-bold bg-[#d29922]/10 text-[#d29922] border border-[#d29922]/20">
            {pendingApprovals.length} action needed
          </span>
        </div>

        {pendingApprovals.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[#30363d] rounded-lg bg-[#0d1117]/40">
            <CheckCircle2 className="w-8 h-8 text-[#3fb950] mx-auto mb-2" />
            <p className="text-xs font-semibold text-[#F0F2F5]">All pending leave requests approved</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingApprovals.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-lg bg-[#21262d] border border-[#30363d] flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <img
                    src={req.employeeAvatar}
                    alt={req.employeeName}
                    className="w-10 h-10 rounded-full object-cover border border-[#30363d] ring-2 ring-[#8B3A4A]/20"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-[#F0F2F5]">{req.employeeName}</h4>
                    <p className="text-[11px] text-[#8B949E]">
                      Requesting <strong className="text-[#B86B78]">{req.days} day(s) {req.leaveType} leave</strong> ({req.startDate} to {req.endDate})
                    </p>
                    <p className="text-[11px] text-[#6e7681] italic mt-0.5">{req.reason}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => updateLeaveStatus(req.id, 'Rejected')}
                    className="px-3 py-1.5 rounded-md bg-[#da3633]/10 hover:bg-[#da3633]/20 text-[#f85149] border border-[#da3633]/30 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject
                  </button>
                  <button
                    onClick={() => updateLeaveStatus(req.id, 'Approved')}
                    className="px-4 py-1.5 rounded-md bg-[#8B3A4A] hover:bg-[#A04456] text-white text-xs font-semibold flex items-center gap-1 transition-colors"
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
      <div className="p-5 rounded-lg bg-[#161b22] border border-[#30363d] shadow-md space-y-4">
        <h3 className="text-sm font-bold text-[#F0F2F5] flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-[#B86B78]" />
          Direct Team Attendance Today
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {teamMembers.map((emp) => (
            <div key={emp.id} className="p-3.5 rounded-lg bg-[#21262d] border border-[#30363d] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img src={emp.avatar} alt={emp.name} className="w-9 h-9 rounded-full object-cover border border-[#30363d]" />
                <div className="min-w-0">
                  <h5 className="text-xs font-bold text-[#F0F2F5] truncate">{emp.name}</h5>
                  <p className="text-[11px] text-[#8B949E] truncate">{emp.role}</p>
                </div>
              </div>
              <span
                className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-bold ${
                  emp.status === 'Active'
                    ? 'bg-[#238636]/15 text-[#3fb950] border border-[#238636]/30'
                    : emp.status === 'Remote'
                    ? 'bg-[#8B3A4A]/15 text-[#B86B78] border border-[#8B3A4A]/30'
                    : 'bg-[#d29922]/10 text-[#d29922] border border-[#d29922]/20'
                }`}
              >
                {emp.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
