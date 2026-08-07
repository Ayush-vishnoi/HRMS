'use client';

import React from 'react';
import {
  Calendar,
  MapPin,
  Play,
  Square,
  Download,
} from 'lucide-react';
import { useHRMS } from '@/context/HRMSContext';
import { exportToExcel } from '@/utils/exportUtils';

export default function AttendancePage() {
  const {
    isClockedIn,
    clockInTime,
    elapsedWorkTime,
    toggleClockIn,
    attendanceLogs,
    currentUser,
  } = useHRMS();

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#F0F2F5] space-y-6">

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#F0F2F5]">
            Attendance & Shift Management
          </h1>

          <p className="mt-1 text-sm text-[#8B949E]">
            Track biometric check-ins, work hours, shift schedules, and monthly logs
          </p>
        </div>

        {/* Export */}
        <button
          onClick={() => {
            const todayStr = new Date().toISOString().split('T')[0];

            const filename = `attendance-report-${todayStr}.xlsx`;

            const columns = [
              { header: 'Log ID', key: 'id' as const },
              {
                header: 'Employee Name',
                key: () => currentUser.name,
              },
              { header: 'Date', key: 'date' as const },
              { header: 'Check-In', key: 'checkIn' as const },
              { header: 'Check-Out', key: 'checkOut' as const },
              {
                header: 'Hours Worked',
                key: 'hoursWorked' as const,
              },
              { header: 'Status', key: 'status' as const },
              { header: 'Location', key: 'location' as const },
            ];

            exportToExcel(
              attendanceLogs,
              columns,
              filename,
              'Attendance Report'
            );
          }}
          className="px-4 py-2.5 rounded-xl bg-[#8B3A4A] hover:bg-[#A04456] text-white text-xs font-semibold shadow-md flex items-center gap-2 transition-all cursor-pointer"
          title="Download Attendance Data as Excel"
        >
          <Download className="w-4 h-4" />
          Export Excel
        </button>
      </div>

      {/* Clock In / Shift / Monthly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Live Punch Widget */}
        <div className="p-6 rounded-2xl bg-[#161b22] border border-[#30363d] shadow-md space-y-4">

          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-[#8B949E] uppercase tracking-wider">
              Live Punch Widget
            </span>

            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#21262d] text-[#8B949E] border border-[#30363d]">
              Shift A (General)
            </span>
          </div>

          <div className="text-center py-2 space-y-1">
            <span className="text-[11px] text-[#8B949E]">
              Current Status
            </span>

            <div className="text-3xl font-black font-mono text-[#F0F2F5]">
              {isClockedIn ? elapsedWorkTime : '00:00:00'}
            </div>

            <p className="text-xs font-semibold text-emerald-500">
              {isClockedIn
                ? `● Shift Active • Clocked in at ${clockInTime}`
                : '○ Shift Inactive • Ready to Punch In'}
            </p>
          </div>

          <button
            onClick={toggleClockIn}
            className={`w-full py-3 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
              isClockedIn
                ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30'
                : 'bg-[#8B3A4A] hover:bg-[#A04456] text-white'
            }`}
          >
            {isClockedIn ? (
              <>
                <Square className="w-4 h-4" />
                Clock Out (End Work Shift)
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Clock In (Start Work Shift)
              </>
            )}
          </button>
        </div>

        {/* Shift Policy */}
        <div className="p-6 rounded-2xl bg-[#161b22] border border-[#30363d] shadow-md space-y-4">

          <h3 className="text-xs font-bold text-[#8B949E] uppercase tracking-wider">
            Shift Policy Details
          </h3>

          <div className="space-y-3 text-xs">

            <div className="p-3 rounded-xl bg-[#21262d] border border-[#30363d] flex justify-between gap-4">
              <span className="text-[#8B949E]">
                Standard Working Hours
              </span>

              <span className="font-bold text-[#F0F2F5]">
                09:00 AM - 06:00 PM
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#21262d] border border-[#30363d] flex justify-between gap-4">
              <span className="text-[#8B949E]">
                Grace Period Allowance
              </span>

              <span className="font-bold text-amber-400">
                15 Minutes
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#21262d] border border-[#30363d] flex justify-between gap-4">
              <span className="text-[#8B949E]">
                Break Duration
              </span>

              <span className="font-bold text-[#F0F2F5]">
                1 Hour (1:00 PM - 2:00 PM)
              </span>
            </div>

          </div>
        </div>

        {/* Monthly Attendance */}
        <div className="p-6 rounded-2xl bg-[#161b22] border border-[#30363d] shadow-md space-y-4">

          <h3 className="text-xs font-bold text-[#8B949E] uppercase tracking-wider">
            August Attendance Record
          </h3>

          <div className="grid grid-cols-2 gap-3 text-center">

            <div className="p-3 rounded-xl bg-[#21262d] border border-[#30363d]">
              <span className="text-[10px] text-[#8B949E] uppercase font-semibold">
                Days Present
              </span>

              <div className="text-xl font-bold text-emerald-400 mt-1">
                18 / 18
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#21262d] border border-[#30363d]">
              <span className="text-[10px] text-[#8B949E] uppercase font-semibold">
                Late Arrivals
              </span>

              <div className="text-xl font-bold text-amber-400 mt-1">
                1 Day
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#21262d] border border-[#30363d]">
              <span className="text-[10px] text-[#8B949E] uppercase font-semibold">
                Total Hours Worked
              </span>

              {/* NO BLUE / INDIGO */}
              <div className="text-xl font-bold text-[#B86B78] mt-1">
                144 hrs
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#21262d] border border-[#30363d]">
              <span className="text-[10px] text-[#8B949E] uppercase font-semibold">
                Adherence Score
              </span>

              <div className="text-xl font-bold text-[#F0F2F5] mt-1">
                98.5%
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Attendance History */}
      <div className="p-6 rounded-2xl bg-[#161b22] border border-[#30363d] shadow-md space-y-4">

        <h3 className="text-sm font-bold text-[#F0F2F5] flex items-center gap-2">
          {/* NO BLUE / INDIGO */}
          <Calendar className="w-4 h-4 text-[#B86B78]" />
          Daily Attendance Logs
        </h3>

        <div className="overflow-x-auto">

          <table className="w-full text-left text-xs border-collapse">

            <thead>
              <tr className="border-b border-[#30363d] text-[#8B949E] font-semibold bg-[#21262d]/50">

                <th className="py-3 px-4">
                  Date
                </th>

                <th className="py-3 px-4">
                  Check In
                </th>

                <th className="py-3 px-4">
                  Check Out
                </th>

                <th className="py-3 px-4">
                  Hours Worked
                </th>

                <th className="py-3 px-4">
                  Location
                </th>

                <th className="py-3 px-4 text-right">
                  Status
                </th>

              </tr>
            </thead>

            <tbody className="divide-y divide-[#30363d] text-[#8B949E]">

              {attendanceLogs.map((log) => (

                <tr
                  key={log.id}
                  className="hover:bg-[#21262d]/60 transition-colors"
                >

                  <td className="py-3 px-4 font-bold text-[#F0F2F5]">
                    {log.date}
                  </td>

                  <td className="py-3 px-4 font-mono text-emerald-400">
                    {log.checkIn}
                  </td>

                  <td className="py-3 px-4 font-mono text-[#8B949E]">
                    {log.checkOut}
                  </td>

                  <td className="py-3 px-4 font-semibold text-[#F0F2F5]">
                    {log.hoursWorked}
                  </td>

                  <td className="py-3 px-4 text-[#8B949E] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#8B949E]" />
                    {log.location}
                  </td>

                  <td className="py-3 px-4 text-right">

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        log.status === 'On Time'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : log.status === 'Late'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {log.status}
                    </span>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>
      </div>

    </div>
  );
}