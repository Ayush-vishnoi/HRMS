
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
} from 'lucide-react';
import { useHRMS } from '@/context/HRMSContext';
import { ApplyLeaveModal } from '@/components/modals/ApplyLeaveModal';
import { exportToExcel } from '@/utils/exportUtils';

export default function LeavesPage() {
  const {
    leaveBalances,
    leaveRequests,
    updateLeaveStatus,
    currentUser,
  } = useHRMS();

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  const [filterStatus, setFilterStatus] = useState<
    'All' | 'Pending' | 'Approved' | 'Rejected'
  >('All');

  const filteredRequests = leaveRequests.filter((req) => {
    if (filterStatus === 'All') return true;
    return req.status === filterStatus;
  });

  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#17324A]">
            Leave Management & Time Off
          </h1>

          <p className="mt-1 text-sm text-[#667085]">
            Request annual leave, view balances, and approve team time-off
          </p>
        </div>

        <div className="flex items-center gap-3">

          {/* Export */}
          <button
            onClick={() => {
              const todayStr = new Date()
                .toISOString()
                .split('T')[0];

              const filename = `leave-report-${todayStr}.xlsx`;

              const exportableData =
                currentUser.userRole === 'employee'
                  ? leaveRequests.filter(
                      (r) => r.employeeId === currentUser.id
                    )
                  : leaveRequests;

              const columns = [
                {
                  header: 'Leave ID',
                  key: 'id' as const,
                },
                {
                  header: 'Employee',
                  key: 'employeeName' as const,
                },
                {
                  header: 'Leave Type',
                  key: 'leaveType' as const,
                },
                {
                  header: 'Start Date',
                  key: 'startDate' as const,
                },
                {
                  header: 'End Date',
                  key: 'endDate' as const,
                },
                {
                  header: 'Number of Days',
                  key: 'days' as const,
                },
                {
                  header: 'Status',
                  key: 'status' as const,
                },
                {
                  header: 'Reason',
                  key: 'reason' as const,
                },
                {
                  header: 'Applied Date',
                  key: 'appliedOn' as const,
                },
              ];

              exportToExcel(
                exportableData,
                columns,
                filename,
                'Leave Report'
              );
            }}
            className="px-4 py-2.5 rounded-xl bg-white border border-[#D9E5EE] hover:bg-[#F5F9FC] text-[#17324A] text-xs font-semibold shadow-md flex items-center gap-2 transition-all cursor-pointer"
            title="Download Leave History as Excel"
          >
            <Download className="w-4 h-4 text-[#17324A]" />
            Export Excel
          </button>

          {/* Apply Leave */}
          <button
            onClick={() => setIsApplyModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#B0D0EA] hover:bg-[#9FC5E2] text-[#17324A] border border-[#9FC5E2] text-xs font-semibold shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Apply for Time Off
          </button>

        </div>
      </div>

      {/* Leave Balances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        {/* Casual Leave */}
        <div className="p-4 rounded-2xl bg-white border border-[#D9E5EE] shadow-md">

          <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
            Casual Leave
          </span>

          <div className="text-2xl font-black text-[#17324A] mt-2">
            {leaveBalances.casual.remaining}{' '}
            <span className="text-xs font-normal text-[#667085]">
              / {leaveBalances.casual.total} Days
            </span>
          </div>

          <p className="text-[11px] text-[#667085] mt-1">
            {leaveBalances.casual.used} Days Used
          </p>

          <div className="w-full h-1.5 bg-[#EAF2F8] rounded-full mt-3">
            <div
              className="h-1.5 rounded-full bg-[#17324A]"
              style={{
                width: `${
                  (leaveBalances.casual.remaining /
                    leaveBalances.casual.total) *
                  100
                }%`,
              }}
            />
          </div>

        </div>

        {/* Sick Leave */}
        <div className="p-4 rounded-2xl bg-white border border-[#D9E5EE] shadow-md">

          <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
            Sick Leave
          </span>

          <div className="text-2xl font-black text-[#17324A] mt-2">
            {leaveBalances.sick.remaining}{' '}
            <span className="text-xs font-normal text-[#667085]">
              / {leaveBalances.sick.total} Days
            </span>
          </div>

          <p className="text-[11px] text-[#667085] mt-1">
            {leaveBalances.sick.used} Days Used
          </p>

          <div className="w-full h-1.5 bg-[#EAF2F8] rounded-full mt-3">
            <div
              className="h-1.5 rounded-full bg-[#17324A]"
              style={{
                width: `${
                  (leaveBalances.sick.remaining /
                    leaveBalances.sick.total) *
                  100
                }%`,
              }}
            />
          </div>

        </div>

        {/* Earned / Privilege */}
        <div className="p-4 rounded-2xl bg-white border border-[#D9E5EE] shadow-md">

          <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
            Earned / Privilege
          </span>

          <div className="text-2xl font-black text-emerald-500 mt-2">
            {leaveBalances.earned.remaining}{' '}
            <span className="text-xs font-normal text-[#667085]">
              / {leaveBalances.earned.total} Days
            </span>
          </div>

          <p className="text-[11px] text-[#667085] mt-1">
            {leaveBalances.earned.used} Days Used
          </p>

          <div className="w-full h-1.5 bg-[#EAF2F8] rounded-full mt-3">
            <div
              className="h-1.5 rounded-full bg-emerald-500"
              style={{
                width: `${
                  (leaveBalances.earned.remaining /
                    leaveBalances.earned.total) *
                  100
                }%`,
              }}
            />
          </div>

        </div>

        {/* WFH */}
        <div className="p-4 rounded-2xl bg-white border border-[#D9E5EE] shadow-md">

          <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
            WFH Days
          </span>

          <div className="text-2xl font-black text-[#17324A] mt-2">
            {leaveBalances.wfh.remaining}{' '}
            <span className="text-xs font-normal text-[#667085]">
              / {leaveBalances.wfh.total} Days
            </span>
          </div>

          <p className="text-[11px] text-[#667085] mt-1">
            {leaveBalances.wfh.used} Days Used
          </p>

          <div className="w-full h-1.5 bg-[#EAF2F8] rounded-full mt-3">
            <div
              className="h-1.5 rounded-full bg-[#B0D0EA]"
              style={{
                width: `${
                  (leaveBalances.wfh.remaining /
                    leaveBalances.wfh.total) *
                  100
                }%`,
              }}
            />
          </div>

        </div>

      </div>

      {/* Leave Requests Table Card */}
      <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-md space-y-4">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

          <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#17324A]" />
            Leave Applications Queue
          </h3>

          {/* Status Filters */}
          <div className="flex items-center gap-1">

            {(
              ['All', 'Pending', 'Approved', 'Rejected'] as const
            ).map((status) => (

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

                <th className="py-3 px-4">
                  Applicant
                </th>

                <th className="py-3 px-4">
                  Type
                </th>

                <th className="py-3 px-4">
                  Dates
                </th>

                <th className="py-3 px-4">
                  Duration
                </th>

                <th className="py-3 px-4">
                  Reason
                </th>

                <th className="py-3 px-4">
                  Status
                </th>

                {currentUser.userRole !== 'employee' && (
                  <th className="py-3 px-4 text-right">
                    Manager Action
                  </th>
                )}

              </tr>
            </thead>

            <tbody className="divide-y divide-[#D9E5EE] text-[#17324A]">

              {filteredRequests.map((req) => (

                <tr
                  key={req.id}
                  className="hover:bg-[#F5F9FC] transition-colors"
                >

                  <td className="py-3 px-4">

                    <div className="flex items-center gap-2.5">

                      <img
                        src={req.employeeAvatar}
                        alt={req.employeeName}
                        className="w-7 h-7 rounded-full object-cover"
                      />

                      <span className="font-bold text-[#17324A]">
                        {req.employeeName}
                      </span>

                    </div>

                  </td>

                  <td className="py-3 px-4 font-semibold text-[#17324A]">
                    {req.leaveType} Leave
                  </td>

                  <td className="py-3 px-4 text-[#667085]">
                    {req.startDate} to {req.endDate}
                  </td>

                  <td className="py-3 px-4 font-semibold text-[#17324A]">
                    {req.days} Day(s)
                  </td>

                  <td className="py-3 px-4 text-[#667085] max-w-xs truncate">
                    {req.reason}
                  </td>

                  <td className="py-3 px-4">

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        req.status === 'Approved'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : req.status === 'Pending'
                          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
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
                            onClick={() =>
                              updateLeaveStatus(
                                req.id,
                                'Approved'
                              )
                            }
                            className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all"
                            title="Approve"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() =>
                              updateLeaveStatus(
                                req.id,
                                'Rejected'
                              )
                            }
                            className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white transition-all"
                            title="Reject"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>

                        </div>

                      ) : (

                        <span className="text-[11px] text-[#667085] font-medium">
                          Decided
                        </span>

                      )}

                    </td>

                  )}

                </tr>

              ))}

            </tbody>

          </table>

        </div>
      </div>

      {/* Apply Leave Modal */}
      <ApplyLeaveModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
      />

    </div>
  );
}

