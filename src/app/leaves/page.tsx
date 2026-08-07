'use client';

import React, { useState } from 'react';
import { CalendarDays, Plus, Filter, Check, X, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { useHRMS } from '@/context/HRMSContext';
import { ApplyLeaveModal } from '@/components/modals/ApplyLeaveModal';

export default function LeavesPage() {
  const { leaveBalances, leaveRequests, updateLeaveStatus, currentUser } = useHRMS();
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');

  const filteredRequests = leaveRequests.filter((req) => {
    if (filterStatus === 'All') return true;
    return req.status === filterStatus;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-400" />
            Leave Management & Time Off
          </h1>
          <p className="text-xs text-slate-400">Request annual leave, view balances, and approve team time-off</p>
        </div>

        <button
          onClick={() => setIsApplyModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          Apply for Time Off
        </button>
      </div>

      {/* Leave Balances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Casual Leave</span>
          <div className="text-2xl font-black text-slate-100 mt-2">
            {leaveBalances.casual.remaining} <span className="text-xs font-normal text-slate-500">/ {leaveBalances.casual.total} Days</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{leaveBalances.casual.used} Days Used</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sick Leave</span>
          <div className="text-2xl font-black text-rose-400 mt-2">
            {leaveBalances.sick.remaining} <span className="text-xs font-normal text-slate-500">/ {leaveBalances.sick.total} Days</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{leaveBalances.sick.used} Days Used</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Earned / Privilege</span>
          <div className="text-2xl font-black text-emerald-400 mt-2">
            {leaveBalances.earned.remaining} <span className="text-xs font-normal text-slate-500">/ {leaveBalances.earned.total} Days</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{leaveBalances.earned.used} Days Used</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">WFH Days</span>
          <div className="text-2xl font-black text-purple-400 mt-2">
            {leaveBalances.wfh.remaining} <span className="text-xs font-normal text-slate-500">/ {leaveBalances.wfh.total} Days</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{leaveBalances.wfh.used} Days Used</p>
        </div>
      </div>

      {/* Leave Requests Table Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            Leave Applications Queue
          </h3>

          {/* Status Filters */}
          <div className="flex items-center gap-1">
            {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  filterStatus === status
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-850/50">
                <th className="py-3 px-4">Applicant</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Dates</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Status</th>
                {currentUser.userRole !== 'employee' && <th className="py-3 px-4 text-right">Manager Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <img src={req.employeeAvatar} alt={req.employeeName} className="w-7 h-7 rounded-full object-cover" />
                      <span className="font-bold text-slate-100">{req.employeeName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-200">{req.leaveType} Leave</td>
                  <td className="py-3 px-4 text-slate-300">{req.startDate} to {req.endDate}</td>
                  <td className="py-3 px-4 font-semibold text-slate-100">{req.days} Day(s)</td>
                  <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{req.reason}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        req.status === 'Approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : req.status === 'Pending'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>
                  {currentUser.userRole !== 'employee' && (
                    <td className="py-3 px-4 text-right">
                      {req.status === 'Pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => updateLeaveStatus(req.id, 'Approved')}
                            className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all"
                            title="Approve"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => updateLeaveStatus(req.id, 'Rejected')}
                            className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white transition-all"
                            title="Reject"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-medium">Decided</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ApplyLeaveModal isOpen={isApplyModalOpen} onClose={() => setIsApplyModalOpen(false)} />
    </div>
  );
}
