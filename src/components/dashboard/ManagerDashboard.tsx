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
      {/* Header Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Direct Reports</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-slate-100 mt-2">{teamMembers.length}</div>
          <span className="text-[11px] text-emerald-400 font-medium">100% active roster</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Pending Approvals</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-2">{pendingApprovals.length}</div>
          <span className="text-[11px] text-slate-400">Requires your action</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Team Attendance</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-slate-100 mt-2">94.8%</div>
          <span className="text-[11px] text-emerald-400 font-medium">+2.1% this month</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>OKR Completion</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-slate-100 mt-2">78%</div>
          <span className="text-[11px] text-indigo-400 font-medium">Q3 Sprint Targets</span>
        </div>
      </div>

      {/* Pending Leave Approvals Queue */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              Pending Team Leave & WFH Requests
            </h3>
            <p className="text-xs text-slate-400">Review and approve team leave applications</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {pendingApprovals.length} Action Needed
          </span>
        </div>

        {pendingApprovals.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-300">All pending leave requests approved!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingApprovals.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-xl bg-slate-850 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <img
                    src={req.employeeAvatar}
                    alt={req.employeeName}
                    className="w-10 h-10 rounded-full object-cover border border-slate-700 ring-2 ring-indigo-500/20"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">{req.employeeName}</h4>
                    <p className="text-[11px] text-slate-400">
                      Requesting <strong className="text-indigo-300">{req.days} Day(s) {req.leaveType} Leave</strong> ({req.startDate} to {req.endDate})
                    </p>
                    <p className="text-[11px] text-slate-500 italic mt-0.5">"{req.reason}"</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => updateLeaveStatus(req.id, 'Rejected')}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject
                  </button>
                  <button
                    onClick={() => updateLeaveStatus(req.id, 'Approved')}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 shadow-md shadow-emerald-600/30 transition-all"
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
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-indigo-400" />
          Direct Team Attendance Today
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teamMembers.map((emp) => (
            <div key={emp.id} className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={emp.avatar} alt={emp.name} className="w-9 h-9 rounded-full object-cover" />
                <div>
                  <h5 className="text-xs font-bold text-slate-200">{emp.name}</h5>
                  <p className="text-[11px] text-slate-400">{emp.role}</p>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  emp.status === 'Active'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : emp.status === 'Remote'
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
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
