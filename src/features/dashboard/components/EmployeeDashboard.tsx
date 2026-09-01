
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ClockInPermissionModal } from '@/features/attendance/components/ClockInPermissionModal';
import {
  CalendarDays,
  Clock,
  PlusCircle,
  FileText,
  Sparkles
} from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';
import { ApplyLeaveModal } from '@/features/leaves/components/ApplyLeaveModal';
import { PayslipModal } from '@/features/payroll/components/PayslipModal';
import { MOCK_PAYSLIPS } from '@/features/payroll/data/payroll';
import type { Payslip } from '@/features/payroll/data/payroll';
import { UpcomingMeetingsCard } from '@/features/dashboard/components/UpcomingMeetingsCard';
import { TasksSummaryCard } from '@/features/dashboard/components/TasksSummaryCard';
import { CompanyAnnouncementsCard } from '@/features/announcements/components/CompanyAnnouncementsCard';

// Compact "20 Jul" / "20 Jul – 24 Jul" range for the half-width leave card.
const formatLeaveDate = (value: string) =>
  new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00.000Z`));

const formatLeaveRange = (start: string, end: string) =>
  start === end ? formatLeaveDate(start) : `${formatLeaveDate(start)} – ${formatLeaveDate(end)}`;

export const EmployeeDashboard: React.FC = () => {
  const {
    currentUser,
    leaveBalances,
    isClockedIn,
    clockInTime,
    elapsedWorkTime,
    toggleClockIn,
    lateClockInRequest,
    leaveRequests
  } = useHRMS();

  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [clockNotice, setClockNotice] = useState('');

  const handleClockAction = () => {
    const result = toggleClockIn();
    if (result.status === 'permission-required') setIsPermissionModalOpen(true);
    if (result.status === 'permission-pending') setClockNotice('Your late clock-in request is pending HR approval.');
    if (result.status === 'permission-rejected') setClockNotice('HR rejected your late clock-in request for today.');
    if (result.status === 'error') setClockNotice(result.message);
    if (result.status === 'clocked-out') setClockNotice('You have been clocked out.');
    if (result.status === 'clocked-in' && result.attendanceStatus === 'Late') setClockNotice('You are clocked in. Today’s attendance is marked Late.');
  };

  const pendingLeaves = leaveRequests.filter(
    (r) => r.employeeId === currentUser.id
  );

  // Newest first, capped at 5 so the half-width summary card stays compact.
  const recentLeaves = [...pendingLeaves]
    .sort((a, b) => b.appliedOn.localeCompare(a.appliedOn))
    .slice(0, 5);

  return (
    <div className="space-y-6">

      {/* Welcome Banner Card */}
      <div className="relative overflow-hidden rounded-2xl bg-[#FFFFFF] border border-[#D9E5EE] p-6 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">

          <div className="space-y-1">

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#B0D0EA] text-[#17324A] border border-[#9FC5E2]">
              <Sparkles className="w-3.5 h-3.5 text-[#17324A]" />
              Employee Self-Service (ESS) Portal
            </div>

            <h2 className="text-2xl font-bold text-[#17324A] tracking-tight">
              Welcome to your workspace, {currentUser.name}
            </h2>

            <p className="text-xs text-[#5F7180] max-w-xl">
              Here is your daily HR summary. You have{' '}
              <strong className="text-[#17324A]">
                8 Casual Leaves
              </strong>{' '}
              remaining for this year.
            </p>

          </div>

          <div className="flex flex-wrap items-center gap-3">

            <button
              type="button"
              onClick={() => setIsLeaveModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#386a97] hover:bg-[#2c5e81] text-white text-xs font-semibold shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Apply Leave
            </button>

            <button
              type="button"
              onClick={() => setSelectedPayslip(MOCK_PAYSLIPS[0])}
              className="px-4 py-2.5 rounded-xl bg-[#B0D0EA] hover:bg-[#9FC5E2] text-[#3e678b] border border-[#9FC5E2] text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#17324A]" />
              July Payslip
            </button>

          </div>
        </div>
      </div>

      {/* Leave Balances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        {/* Casual Leave */}
        <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#D9E5EE] shadow-sm relative overflow-hidden group hover:border-[#B0D0EA] transition-all">

          <div className="flex justify-between items-start">

            <span className="text-xs font-semibold text-[#5F7180]">
              Casual Leave
            </span>

            <div className="w-8 h-8 rounded-lg bg-[#B0D0EA] border border-[#9FC5E2] text-[#17324A] flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>

          </div>

          <div className="mt-3">

            <div className="text-2xl font-black text-[#17324A]">
              {leaveBalances.casual.remaining}{' '}
              <span className="text-xs font-normal text-[#5F7180]">
                / {leaveBalances.casual.total} Days
              </span>
            </div>

            <div className="w-full bg-[#EAF2F8] rounded-full h-1.5 mt-2">
              <div
                className="bg-[#17324A] h-1.5 rounded-full"
                style={{
                  width: `${(leaveBalances.casual.remaining / leaveBalances.casual.total) * 100}%`
                }}
              />
            </div>

          </div>
        </div>

        {/* Sick Leave */}
        <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#D9E5EE] shadow-sm relative overflow-hidden group hover:border-[#B0D0EA] transition-all">

          <div className="flex justify-between items-start">

            <span className="text-xs font-semibold text-[#5F7180]">
              Sick Leave
            </span>

            <div className="w-8 h-8 rounded-lg bg-[#B0D0EA] border border-[#9FC5E2] text-[#17324A] flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>

          </div>

          <div className="mt-3">

            <div className="text-2xl font-black text-[#17324A]">
              {leaveBalances.sick.remaining}{' '}
              <span className="text-xs font-normal text-[#5F7180]">
                / {leaveBalances.sick.total} Days
              </span>
            </div>

            <div className="w-full bg-[#EAF2F8] rounded-full h-1.5 mt-2">
              <div
                className="bg-[#17324A] h-1.5 rounded-full"
                style={{
                  width: `${(leaveBalances.sick.remaining / leaveBalances.sick.total) * 100}%`
                }}
              />
            </div>

          </div>
        </div>

        {/* Earned / Annual */}
        <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#D9E5EE] shadow-sm relative overflow-hidden group hover:border-[#B0D0EA] transition-all">

          <div className="flex justify-between items-start">

            <span className="text-xs font-semibold text-[#5F7180]">
              Earned / Annual
            </span>

            <div className="w-8 h-8 rounded-lg bg-[#B0D0EA] border border-[#9FC5E2] text-[#17324A] flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>

          </div>

          <div className="mt-3">

            <div className="text-2xl font-black text-[#17324A]">
              {leaveBalances.earned.remaining}{' '}
              <span className="text-xs font-normal text-[#5F7180]">
                / {leaveBalances.earned.total} Days
              </span>
            </div>

            <div className="w-full bg-[#EAF2F8] rounded-full h-1.5 mt-2">
              <div
                className="bg-[#238636] h-1.5 rounded-full"
                style={{
                  width: `${(leaveBalances.earned.remaining / leaveBalances.earned.total) * 100}%`
                }}
              />
            </div>

          </div>
        </div>

        {/* WFH Balance */}
        <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#D9E5EE] shadow-sm relative overflow-hidden group hover:border-[#B0D0EA] transition-all">

          <div className="flex justify-between items-start">

            <span className="text-xs font-semibold text-[#5F7180]">
              WFH Balance
            </span>

            <div className="w-8 h-8 rounded-lg bg-[#B0D0EA] border border-[#9FC5E2] text-[#17324A] flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>

          </div>

          <div className="mt-3">

            <div className="text-2xl font-black text-[#17324A]">
              {leaveBalances.wfh.remaining}{' '}
              <span className="text-xs font-normal text-[#5F7180]">
                / {leaveBalances.wfh.total} Days
              </span>
            </div>

            <div className="w-full bg-[#EAF2F8] rounded-full h-1.5 mt-2">
              <div
                className="bg-[#17324A] h-1.5 rounded-full"
                style={{
                  width: `${(leaveBalances.wfh.remaining / leaveBalances.wfh.total) * 100}%`
                }}
              />
            </div>

          </div>
        </div>

      </div>

      {/* Middle Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Attendance Punch Card */}
        <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#D9E5EE] shadow-sm flex flex-col justify-between space-y-4">

          <div className="flex items-center justify-between">

            <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#17324A]" />
              Daily Time Tracker
            </h3>

            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#B0D0EA] text-[#17324A] border border-[#9FC5E2]">
              Shift: 08:00 AM - 06:00 PM
            </span>

          </div>

          <div className="p-4 rounded-xl bg-[#EAF2F8] border border-[#D9E5EE] text-center space-y-2">

            <span className="text-[11px] text-[#5F7180] uppercase font-semibold">
              Today’s Check-in Status
            </span>

            <div className="text-2xl font-black text-[#238636] font-mono">
              {isClockedIn ? elapsedWorkTime : 'Not Clocked In'}
            </div>

            <p className="text-[11px] text-[#5F7180]">
              {isClockedIn
                ? `Clocked in at ${clockInTime} • Shift active`
                : 'Click below to register your daily attendance'}
            </p>

          </div>

          <button
            onClick={handleClockAction}
            className={`w-full py-3 rounded-xl text-xs font-bold transition-all shadow-sm ${
              isClockedIn
                ? 'bg-[#da3633]/10 text-[#da3633] border border-[#da3633]/20 hover:bg-[#da3633]/15'
                : 'bg-[#2d577b] hover:bg-[#316286] text-white'
            }`}
          >
            {isClockedIn
              ? 'Clock Out (End Shift)'
              : 'Clock In (Start Shift)'}
          </button>

        </div>

        {/* Company Announcements (live from /api/announcements) */}
        <CompanyAnnouncementsCard />

        <UpcomingMeetingsCard />

      </div>

      {/* Bottom row — My Tasks and My Recent Leave Requests share one
          2-column row, continuing the grid rhythm of the row above.
          Days / Reason / Applied On now live on the full Leaves page. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <TasksSummaryCard />

        <section className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E1E5EA] shadow-md space-y-4">

          <div className="flex items-center justify-between gap-3">
            <h3 className="min-w-0 flex items-center gap-2 text-sm font-bold text-[#1F2933]">
              <CalendarDays className="w-4 h-4 shrink-0 text-[#8B3A4A]" />
              <span className="truncate">My Recent Leave Requests</span>
            </h3>

            <Link
              href="/leaves"
              className="shrink-0 whitespace-nowrap text-[10px] font-semibold text-[#667085] hover:text-[#8B3A4A] transition-colors"
            >
              View All
            </Link>
          </div>

          {recentLeaves.length === 0 ? (
            <div className="min-h-32 flex flex-col items-center justify-center gap-2 border border-dashed border-[#E1E5EA] rounded-xl text-center bg-[#F7F8FA]">
              <CalendarDays className="h-5 w-5 text-[#98A2B3]" />

              <p className="text-xs text-[#667085]">No leave requests yet.</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto rounded-xl border border-[#E1E5EA]">

              <table className="w-full text-left text-xs border-collapse bg-white">

                <thead>
                  <tr className="border-b border-[#E1E5EA] text-[#667085] font-semibold bg-[#F7F8FA]">
                    <th className="py-2.5 px-3">Leave Type</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E1E5EA] text-[#1F2933]">

                  {recentLeaves.map((req) => (

                    <tr
                      key={req.id}
                      className="hover:bg-[#F7F8FA] transition-colors"
                    >

                      <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                        {req.leaveType} Leave
                      </td>

                      <td className="py-2.5 px-3 text-[#667085] whitespace-nowrap">
                        {formatLeaveRange(req.startDate, req.endDate)}
                        <span className="text-[#98A2B3]"> · {req.days}d</span>
                      </td>

                      <td className="py-2.5 px-3 text-right">

                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            req.status === 'Approved'
                              ? 'bg-[#238636]/10 text-[#238636] border border-[#238636]/20'
                              : req.status === 'Pending'
                              ? 'bg-[#9e6a03]/10 text-[#9e6a03] border border-[#9e6a03]/20'
                              : 'bg-[#da3633]/10 text-[#da3633] border border-[#da3633]/20'
                          }`}
                        >
                          {req.status}
                        </span>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>
          )}
        </section>

      </div>

      {clockNotice && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          {clockNotice}
        </div>
      )}

      {lateClockInRequest?.status === 'pending' && !isClockedIn && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          Late clock-in permission is pending HR approval.
        </div>
      )}

      {/* Modals */}
      <ApplyLeaveModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
      />

      <PayslipModal
        payslip={selectedPayslip}
        showAmounts={true}
        onClose={() => setSelectedPayslip(null)}
      />

      <ClockInPermissionModal
        isOpen={isPermissionModalOpen}
        onClose={() => setIsPermissionModalOpen(false)}
      />

    </div>
  );
};

