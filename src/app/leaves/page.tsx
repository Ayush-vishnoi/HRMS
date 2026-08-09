'use client';

import React, { useState } from 'react';
import {
  CalendarDays,
  Plus,
  Filter,
  Check,
  X,
  Clock,
  FileText,
  CheckCircle2,
  Download,
  Crown,
  Building,
  UserCheck,
  UserX,
  Calendar,
} from 'lucide-react';
import { useHRMS } from '@/context/HRMSContext';
import { LeaveRequest } from '@/data/mockData';
import { ApplyLeaveModal } from '@/components/modals/ApplyLeaveModal';
import { exportToExcel } from '@/utils/exportUtils';

export default function LeavesPage() {
  const {
    leaveBalances,
    leaveRequests,
    updateLeaveStatus,
    currentUser,
  } = useHRMS();

  const isCeo = currentUser.userRole === 'ceo' || currentUser.userRole === 'admin';

  // Tab state for CEO context
  const [activeTab, setActiveTab] = useState<'overview' | 'personal'>(
    isCeo ? 'overview' : 'personal'
  );

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');

  // CEO level approval requests (or all requests for executive review)
  const executivePendingLeaves = leaveRequests.filter((req) => req.status === 'Pending');

  const filteredRequests = leaveRequests.filter((req) => {
    if (activeTab === 'personal' && req.employeeId !== currentUser.id) {
      return false;
    }
    if (filterStatus === 'All') return true;
    return req.status === filterStatus;
  });

  return (
    <div className="space-y-6 select-none">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-[#17324A]">
              Leave Management & Time Off
            </h1>
            {isCeo && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                <Crown className="w-3 h-3 text-purple-700" />
                CEO Executive Context
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[#667085]">
            {activeTab === 'overview'
              ? 'Organization-wide time-off utilization, leave trends, and executive sign-off queue'
              : 'Request annual leave, track personal balances, and review time-off history'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsApplyModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#B0D0EA] hover:bg-[#9FC5E2] text-[#17324A] border border-[#9FC5E2] text-xs font-semibold shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Apply for Time Off
          </button>
        </div>
      </div>

      {/* CEO / Executive Context Switcher */}
      {isCeo && (
        <div className="flex items-center gap-2 bg-[#F5F9FC] p-1.5 rounded-2xl border border-[#D9E5EE] w-fit">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#17324A] text-white shadow-md'
                : 'text-[#5F7180] hover:text-[#17324A]'
            }`}
          >
            <Building className="w-4 h-4" />
            Organization Leave Overview (Org View)
          </button>
          <button
            onClick={() => setActiveTab('personal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'personal'
                ? 'bg-[#17324A] text-white shadow-md'
                : 'text-[#5F7180] hover:text-[#17324A]'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            My Leave (Personal Balances)
          </button>
        </div>
      )}

      {/* TAB 1: ORGANIZATION LEAVE OVERVIEW & EXECUTIVE APPROVALS */}
      {activeTab === 'overview' && isCeo && (
        <div className="space-y-6">
          {/* Executive Leave Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md">
              <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">Pending Approvals</span>
              <div className="text-2xl font-black text-amber-600 mt-1">{executivePendingLeaves.length}</div>
              <span className="text-[11px] text-[#667085]">Requires Executive Sign-off</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md">
              <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">Approved This Month</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">14</div>
              <span className="text-[11px] text-emerald-700 font-bold">Planned & Tracked</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md">
              <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">Currently On Leave</span>
              <div className="text-2xl font-black text-[#17324A] mt-1">4</div>
              <span className="text-[11px] text-[#667085]">Coverage active</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md">
              <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">Leave Utilization</span>
              <div className="text-2xl font-black text-indigo-700 mt-1">68%</div>
              <span className="text-[11px] text-[#667085]">Annual Quota Consumption</span>
            </div>
          </div>

          {/* Executive Approvals Queue */}
          <div className="p-6 rounded-2xl bg-white border border-[#B0D0EA] shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#17324A] flex items-center gap-2">
                  <Crown className="w-4 h-4 text-purple-700" />
                  Executive Leave Approvals Queue ({executivePendingLeaves.length})
                </h3>
                <p className="text-xs text-[#5F7180]">
                  Time-off requests submitted by department heads and key strategic personnel
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold border border-purple-200">
                CEO Sign-Off Gate
              </span>
            </div>

            {executivePendingLeaves.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-[#D9E5EE] rounded-xl bg-[#F5F9FC]">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-[#17324A]">All leave approval queues are clear</p>
                <p className="text-[11px] text-[#5F7180]">No executive level leave sign-offs currently pending.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#D9E5EE] text-[#5F7180] uppercase tracking-wider font-bold text-[10px] bg-[#F5F9FC]">
                      <th className="py-3 px-4 rounded-l-xl">Employee</th>
                      <th className="py-3 px-4">Leave Type</th>
                      <th className="py-3 px-4">Dates</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAF2F8]">
                    {executivePendingLeaves.map((req) => (
                      <tr key={req.id} className="hover:bg-[#F5F9FC]">
                        <td className="py-3.5 px-4 font-bold text-[#17324A]">
                          <div className="flex items-center gap-2.5">
                            <img src={req.employeeAvatar} alt={req.employeeName} className="w-8 h-8 rounded-full object-cover border border-[#B0D0EA]" />
                            <div>
                              <span className="block font-black text-xs text-[#17324A]">{req.employeeName}</span>
                              <span className="text-[10px] text-[#5F7180]">Applied {req.appliedOn}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#EAF2F8] text-[#17324A] border border-[#B0D0EA]">
                            {req.leaveType} Leave
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#17324A]">{req.startDate} to {req.endDate}</td>
                        <td className="py-3.5 px-4 font-bold text-[#17324A]">{req.days} Days</td>
                        <td className="py-3.5 px-4 text-[#5F7180] max-w-xs truncate">{req.reason}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-200">
                            Pending CEO Sign-Off
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => updateLeaveStatus(req.id, 'Approved')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updateLeaveStatus(req.id, 'Rejected')}
                            className="px-3 py-1.5 rounded-lg bg-white border border-[#D9E5EE] text-[#5F7180] hover:text-red-600 font-semibold text-[11px] cursor-pointer"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MY LEAVE (PERSONAL CEO BALANCES & APPLY FOR TIME OFF) */}
      {(activeTab === 'personal' || !isCeo) && (
        <div className="space-y-6">
          {/* Personal Leave Balances Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Casual Leave */}
            <div className="p-4 rounded-2xl bg-white border border-[#D9E5EE] shadow-md">
              <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">Casual Leave</span>
              <div className="text-2xl font-black text-[#17324A] mt-2">
                {leaveBalances.casual.remaining} <span className="text-xs font-normal text-[#667085]">/ {leaveBalances.casual.total} Days</span>
              </div>
              <p className="text-[11px] text-[#667085] mt-1">{leaveBalances.casual.used} Days Used</p>
              <div className="w-full h-1.5 bg-[#EAF2F8] rounded-full mt-3">
                <div className="h-1.5 rounded-full bg-[#17324A]" style={{ width: `${(leaveBalances.casual.remaining / leaveBalances.casual.total) * 100}%` }} />
              </div>
            </div>

            {/* Sick Leave */}
            <div className="p-4 rounded-2xl bg-white border border-[#D9E5EE] shadow-md">
              <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">Sick Leave</span>
              <div className="text-2xl font-black text-[#17324A] mt-2">
                {leaveBalances.sick.remaining} <span className="text-xs font-normal text-[#667085]">/ {leaveBalances.sick.total} Days</span>
              </div>
              <p className="text-[11px] text-[#667085] mt-1">{leaveBalances.sick.used} Days Used</p>
              <div className="w-full h-1.5 bg-[#EAF2F8] rounded-full mt-3">
                <div className="h-1.5 rounded-full bg-[#17324A]" style={{ width: `${(leaveBalances.sick.remaining / leaveBalances.sick.total) * 100}%` }} />
              </div>
            </div>

            {/* Earned Leave */}
            <div className="p-4 rounded-2xl bg-white border border-[#D9E5EE] shadow-md">
              <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">Earned / Privilege</span>
              <div className="text-2xl font-black text-emerald-500 mt-2">
                {leaveBalances.earned.remaining} <span className="text-xs font-normal text-[#667085]">/ {leaveBalances.earned.total} Days</span>
              </div>
              <p className="text-[11px] text-[#667085] mt-1">{leaveBalances.earned.used} Days Used</p>
              <div className="w-full h-1.5 bg-[#EAF2F8] rounded-full mt-3">
                <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${(leaveBalances.earned.remaining / leaveBalances.earned.total) * 100}%` }} />
              </div>
            </div>

            {/* WFH Days */}
            <div className="p-4 rounded-2xl bg-white border border-[#D9E5EE] shadow-md">
              <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">WFH Days</span>
              <div className="text-2xl font-black text-[#17324A] mt-2">
                {leaveBalances.wfh.remaining} <span className="text-xs font-normal text-[#667085]">/ {leaveBalances.wfh.total} Days</span>
              </div>
              <p className="text-[11px] text-[#667085] mt-1">{leaveBalances.wfh.used} Days Used</p>
              <div className="w-full h-1.5 bg-[#EAF2F8] rounded-full mt-3">
                <div className="h-1.5 rounded-full bg-[#B0D0EA]" style={{ width: `${(leaveBalances.wfh.remaining / leaveBalances.wfh.total) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* Leave Requests Table */}
          <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#17324A]" />
                My Leave History & Status
              </h3>

              <div className="flex items-center gap-1">
                {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      filterStatus === status
                        ? 'bg-[#B0D0EA] text-[#17324A] border border-[#9FC5E2] shadow-sm'
                        : 'bg-[#F5F9FC] text-[#667085] hover:bg-[#EAF2F8] hover:text-[#17324A]'
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
                  <tr className="border-b border-[#D9E5EE] text-[#667085] font-semibold bg-[#EAF2F8]">
                    <th className="py-3 px-4 rounded-l-xl">Leave Type</th>
                    <th className="py-3 px-4">Start Date</th>
                    <th className="py-3 px-4">End Date</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4 rounded-r-xl">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAF2F8]">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-[#F5F9FC]">
                      <td className="py-3.5 px-4 font-bold text-[#17324A]">{req.leaveType}</td>
                      <td className="py-3.5 px-4 font-semibold text-[#17324A]">{req.startDate}</td>
                      <td className="py-3.5 px-4 font-semibold text-[#17324A]">{req.endDate}</td>
                      <td className="py-3.5 px-4 font-bold text-[#17324A]">{req.days} Days</td>
                      <td className="py-3.5 px-4 text-[#667085]">{req.reason}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${req.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : req.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      <ApplyLeaveModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
      />
    </div>
  );
}
