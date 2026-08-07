'use client';

import React from 'react';
import { Clock, Calendar, MapPin, CheckCircle2, AlertTriangle, ShieldCheck, Play, Square, Download } from 'lucide-react';
import { useHRMS } from '@/context/HRMSContext';
import { exportToExcel } from '@/utils/exportUtils';

export default function AttendancePage() {
  const { isClockedIn, clockInTime, toggleClockIn, attendanceLogs, currentUser } = useHRMS();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#B86B78]" />
            Attendance & Shift Management
          </h1>
          <p className="text-xs text-secondary">Track biometric check-ins, work hours, shift schedules, and monthly logs</p>
        </div>

        <button
          onClick={() => {
            const todayStr = new Date().toISOString().split('T')[0];
            const filename = `attendance-report-${todayStr}.xlsx`;
            const columns = [
              { header: 'Log ID', key: 'id' as const },
              { header: 'Employee Name', key: () => currentUser.name },
              { header: 'Date', key: 'date' as const },
              { header: 'Check-In', key: 'checkIn' as const },
              { header: 'Check-Out', key: 'checkOut' as const },
              { header: 'Hours Worked', key: 'hoursWorked' as const },
              { header: 'Status', key: 'status' as const },
              { header: 'Location', key: 'location' as const },
            ];
            exportToExcel(attendanceLogs, columns, filename, 'Attendance Report');
          }}
          className="px-4 py-2.5 rounded-xl bg-[#8B3A4A] hover:bg-[#A04456] text-white text-xs font-semibold shadow-md flex items-center gap-2 transition-all cursor-pointer"
          title="Download Attendance Data as Excel"
        >
          <Download className="w-4 h-4" />
          Export Excel
        </button>
      </div>

      {/* Clock In Widget & Shift Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Punch Card */}
        <div className="p-6 rounded-2xl bg-surface border border-border shadow-md space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-secondary uppercase tracking-wider">Live Punch Widget</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-elevated text-secondary border border-border">
              Shift A (General)
            </span>
          </div>

          <div className="text-center py-2 space-y-1">
            <span className="text-[11px] text-secondary">Current Status</span>
            <div className="text-3xl font-black font-mono text-foreground">
              {isClockedIn ? clockInTime : '00:00:00'}
            </div>
            <p className="text-xs font-semibold text-emerald-500">
              {isClockedIn ? '● Shift Active • Recorded at HQ Office' : '○ Shift Inactive • Ready to Punch In'}
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

        {/* Shift Details & Monthly Summary */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Shift Policy Details</h3>
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 flex justify-between">
              <span className="text-slate-400">Standard Working Hours</span>
              <span className="font-bold text-slate-100">09:00 AM - 06:00 PM</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 flex justify-between">
              <span className="text-slate-400">Grace Period Allowance</span>
              <span className="font-bold text-amber-400">15 Minutes</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 flex justify-between">
              <span className="text-slate-400">Break Duration</span>
              <span className="font-bold text-slate-100">1 Hour (1:00 PM - 2:00 PM)</span>
            </div>
          </div>
        </div>

        {/* Monthly Attendance Metrics */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">August Attendance Record</h3>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Days Present</span>
              <div className="text-xl font-bold text-emerald-400 mt-1">18 / 18</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Late Arrivals</span>
              <div className="text-xl font-bold text-amber-400 mt-1">1 Day</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Hours Worked</span>
              <div className="text-xl font-bold text-indigo-400 mt-1">144 hrs</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Adherence Score</span>
              <div className="text-xl font-bold text-slate-100 mt-1">98.5%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-400" />
          Daily Attendance Logs
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-850/50">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Check In</th>
                <th className="py-3 px-4">Check Out</th>
                <th className="py-3 px-4">Hours Worked</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {attendanceLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-100">{log.date}</td>
                  <td className="py-3 px-4 font-mono text-emerald-400">{log.checkIn}</td>
                  <td className="py-3 px-4 font-mono text-slate-300">{log.checkOut}</td>
                  <td className="py-3 px-4 font-semibold text-slate-200">{log.hoursWorked}</td>
                  <td className="py-3 px-4 text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
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
