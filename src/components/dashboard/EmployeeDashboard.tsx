'use client';

import React, { useState } from 'react';
import {
  CalendarDays,
  Clock,
  CreditCard,
  Target,
  PlusCircle,
  FileText,
  CheckCircle2,
  Megaphone,
  ArrowUpRight,
  TrendingUp,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { useHRMS } from '@/context/HRMSContext';
import { ApplyLeaveModal } from '@/components/modals/ApplyLeaveModal';
import { PayslipModal } from '@/components/modals/PayslipModal';
import { MOCK_PAYSLIPS, Payslip } from '@/data/mockData';

export const EmployeeDashboard: React.FC = () => {
  const { currentUser, leaveBalances, isClockedIn, clockInTime, toggleClockIn, leaveRequests } = useHRMS();
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  const pendingLeaves = leaveRequests.filter((r) => r.employeeId === currentUser.id);

  return (
    <div className="space-y-6">
      {/* Welcome Banner Card */}
      <div className="relative overflow-hidden rounded-2xl bg-surface border border-border p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#8B3A4A]/15 text-[#B86B78] border border-[#8B3A4A]/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Employee Self-Service (ESS) Portal
            </div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              Good Morning, {currentUser.name}! 👋
            </h2>
            <p className="text-xs text-secondary max-w-xl">
              Here is your daily HR summary. You have <strong className="text-foreground">8 Casual Leaves</strong> remaining for this year.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#8B3A4A] hover:bg-[#A04456] text-white text-xs font-semibold shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Apply Leave
            </button>
            <button
              onClick={() => setSelectedPayslip(MOCK_PAYSLIPS[0])}
              className="px-4 py-2.5 rounded-xl bg-surface-elevated hover:bg-border text-foreground border border-border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#B86B78]" />
              July Payslip
            </button>
          </div>
        </div>
      </div>

      {/* Leave Balances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#161b22] border border-[#30363d] shadow-md relative overflow-hidden group hover:border-[#8B3A4A]/50 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-[#8B949E]">Casual Leave</span>
            <div className="w-8 h-8 rounded-lg bg-[#21262d] border border-[#30363d] text-[#B86B78] flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-[#F0F2F5]">{leaveBalances.casual.remaining} <span className="text-xs font-normal text-[#8B949E]">/ {leaveBalances.casual.total} Days</span></div>
            <div className="w-full bg-[#21262d] rounded-full h-1.5 mt-2">
              <div className="bg-[#8B3A4A] h-1.5 rounded-full" style={{ width: `${(leaveBalances.casual.remaining / leaveBalances.casual.total) * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#161b22] border border-[#30363d] shadow-md relative overflow-hidden group hover:border-[#8B3A4A]/50 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-[#8B949E]">Sick Leave</span>
            <div className="w-8 h-8 rounded-lg bg-[#21262d] border border-[#30363d] text-[#B86B78] flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-[#F0F2F5]">{leaveBalances.sick.remaining} <span className="text-xs font-normal text-[#8B949E]">/ {leaveBalances.sick.total} Days</span></div>
            <div className="w-full bg-[#21262d] rounded-full h-1.5 mt-2">
              <div className="bg-[#8B3A4A] h-1.5 rounded-full" style={{ width: `${(leaveBalances.sick.remaining / leaveBalances.sick.total) * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#161b22] border border-[#30363d] shadow-md relative overflow-hidden group hover:border-[#8B3A4A]/50 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-[#8B949E]">Earned / Annual</span>
            <div className="w-8 h-8 rounded-lg bg-[#21262d] border border-[#30363d] text-[#B86B78] flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-[#F0F2F5]">{leaveBalances.earned.remaining} <span className="text-xs font-normal text-[#8B949E]">/ {leaveBalances.earned.total} Days</span></div>
            <div className="w-full bg-[#21262d] rounded-full h-1.5 mt-2">
              <div className="bg-[#238636] h-1.5 rounded-full" style={{ width: `${(leaveBalances.earned.remaining / leaveBalances.earned.total) * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#161b22] border border-[#30363d] shadow-md relative overflow-hidden group hover:border-[#8B3A4A]/50 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-[#8B949E]">WFH Balance</span>
            <div className="w-8 h-8 rounded-lg bg-[#21262d] border border-[#30363d] text-[#B86B78] flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-[#F0F2F5]">{leaveBalances.wfh.remaining} <span className="text-xs font-normal text-[#8B949E]">/ {leaveBalances.wfh.total} Days</span></div>
            <div className="w-full bg-[#21262d] rounded-full h-1.5 mt-2">
              <div className="bg-[#8B3A4A] h-1.5 rounded-full" style={{ width: `${(leaveBalances.wfh.remaining / leaveBalances.wfh.total) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Attendance Punch Card & Announcements */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Attendance Punch Card */}
        <div className="p-6 rounded-2xl bg-[#161b22] border border-[#30363d] shadow-md flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#F0F2F5] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#B86B78]" />
              Daily Time Tracker
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#21262d] text-[#8B949E] border border-[#30363d]">
              Shift: 09:00 AM - 06:00 PM
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#21262d] border border-[#30363d] text-center space-y-2">
            <span className="text-[11px] text-[#8B949E] uppercase font-semibold">Today's Check-in Status</span>
            <div className="text-2xl font-black text-[#238636] font-mono">
              {isClockedIn ? clockInTime : 'Not Clocked In'}
            </div>
            <p className="text-[11px] text-[#8B949E]">
              {isClockedIn ? 'Punch in registered • On Time' : 'Click below to register your daily attendance'}
            </p>
          </div>

          <button
            onClick={toggleClockIn}
            className={`w-full py-3 rounded-xl text-xs font-bold transition-all shadow-md ${
              isClockedIn
                ? 'bg-[#da3633]/20 text-[#f85149] border border-[#da3633]/30 hover:bg-[#da3633]/30'
                : 'bg-[#8B3A4A] hover:bg-[#A04456] text-white'
            }`}
          >
            {isClockedIn ? 'Clock Out (End Shift)' : 'Clock In (Start Shift)'}
          </button>
        </div>

        {/* Company Announcements */}
        <div className="md:col-span-2 p-6 rounded-2xl bg-[#161b22] border border-[#30363d] shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#F0F2F5] flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-amber-500" />
              Company Announcements & Updates
            </h3>
            <span className="text-xs text-[#8B949E] font-semibold cursor-pointer hover:text-[#F0F2F5]">View All</span>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-[#21262d] border border-[#30363d] flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[#8B3A4A]/20 border border-[#8B3A4A]/30 text-[#B86B78] shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-[#F0F2F5]">Annual Hackathon 2026 Announced</h4>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-[#8B3A4A]/20 text-[#B86B78] border border-[#8B3A4A]/30 font-semibold">New</span>
                </div>
                <p className="text-xs text-[#8B949E]">Register your team of 4 by August 20th. Cash prizes up to $25,000 for top innovative solutions!</p>
                <span className="text-[10px] text-[#6e7681]">Posted by HR Communications • 2 days ago</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#21262d] border border-[#30363d] flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-[#F0F2F5]">Upcoming Holiday: Independence Day Weekend</h4>
                <p className="text-xs text-[#8B949E]">Office will remain closed on Friday, August 15th. Have a great long weekend!</p>
                <span className="text-[10px] text-[#6e7681]">Posted by Facilities • 4 days ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Applied Leave History Table */}
      <div className="p-6 rounded-2xl bg-[#161b22] border border-[#30363d] shadow-md space-y-4">
        <h3 className="text-sm font-bold text-[#F0F2F5] flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-[#B86B78]" />
          My Recent Leave Requests
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#30363d] text-[#8B949E] font-semibold bg-[#21262d]/50">
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Days</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Applied On</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d] text-[#F0F2F5]">
              {pendingLeaves.map((req) => (
                <tr key={req.id} className="hover:bg-[#21262d]/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-[#F0F2F5]">{req.leaveType} Leave</td>
                  <td className="py-3 px-4 text-[#8B949E]">{req.startDate} to {req.endDate}</td>
                  <td className="py-3 px-4 font-semibold text-[#F0F2F5]">{req.days} Day(s)</td>
                  <td className="py-3 px-4 text-[#8B949E] max-w-xs truncate">{req.reason}</td>
                  <td className="py-3 px-4 text-[#8B949E]">{req.appliedOn}</td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        req.status === 'Approved'
                          ? 'bg-[#238636]/10 text-[#3fb950] border border-[#238636]/20'
                          : req.status === 'Pending'
                          ? 'bg-[#9e6a03]/10 text-[#d29922] border border-[#9e6a03]/20'
                          : 'bg-[#da3633]/10 text-[#f85149] border border-[#da3633]/20'
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
      </div>

      {/* Modals */}
      <ApplyLeaveModal isOpen={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} />
      <PayslipModal payslip={selectedPayslip} onClose={() => setSelectedPayslip(null)} />
    </div>
  );
};
