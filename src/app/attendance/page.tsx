
'use client';

import React, { useState } from 'react';
import {
  Calendar,
  MapPin,
  Play,
  Square,
  Download,
} from 'lucide-react';
import { useHRMS } from '@/context/HRMSContext';
import { exportToExcel } from '@/utils/exportUtils';
import { ClockInPermissionModal } from '@/components/modals/ClockInPermissionModal';

export default function AttendancePage() {
  const {
    isClockedIn,
    clockInTime,
    elapsedWorkTime,
    toggleClockIn,
    lateClockInRequest,
    attendanceLogs,
    currentUser,
  } = useHRMS();

  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [clockNotice, setClockNotice] = useState('');

  const handleClockAction = () => {
    const result = toggleClockIn();
    if (result.status === 'permission-required') setIsPermissionModalOpen(true);
    if (result.status === 'permission-pending') setClockNotice('Your late clock-in request is pending HR approval.');
    if (result.status === 'clocked-out') setClockNotice('You have been clocked out successfully.');
  };

  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#17324A]">
            Attendance & Shift Management
          </h1>

          <p className="mt-1 text-sm text-[#667085]">
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
          className="px-4 py-2.5 rounded-xl bg-[#B0D0EA] hover:bg-[#9FC5E2] text-[#17324A] border border-[#9FC5E2] text-xs font-semibold shadow-md flex items-center gap-2 transition-all cursor-pointer"
          title="Download Attendance Data as Excel"
        >
          <Download className="w-4 h-4" />
          Export Excel
        </button>
      </div>

      {/* Clock In / Shift / Monthly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Live Punch Widget */}
        <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-md space-y-4">

          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
              Live Punch Widget
            </span>

            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#B0D0EA] text-[#17324A] border border-[#9FC5E2]">
              Shift A (General)
            </span>
          </div>

          <div className="text-center py-2 space-y-1">
            <span className="text-[11px] text-[#667085]">
              Current Status
            </span>

            <div className="text-3xl font-black font-mono text-[#17324A]">
              {isClockedIn ? elapsedWorkTime : '00:00:00'}
            </div>

            <p className="text-xs font-semibold text-emerald-600">
              {isClockedIn
                ? `● Shift Active • Clocked in at ${clockInTime}`
                : '○ Shift Inactive • Ready to Punch In'}
            </p>
          </div>

          {/* Clock In / Clock Out */}
          <button
            onClick={handleClockAction}
            className="w-full py-3 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer bg-[#B0D0EA] hover:bg-[#9FC5E2] text-[#17324A] border border-[#9FC5E2]"
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
        <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-md space-y-4">

          <h3 className="text-xs font-bold text-[#667085] uppercase tracking-wider">
            Shift Policy Details
          </h3>

          <div className="space-y-3 text-xs">

            <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE] flex justify-between gap-4">
              <span className="text-[#667085]">
                Standard Working Hours
              </span>

              <span className="font-bold text-[#17324A]">
                09:00 AM - 06:00 PM
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE] flex justify-between gap-4">
              <span className="text-[#667085]">
                Normal Clock-in Window
              </span>

              <span className="font-bold text-amber-600">
                09:00 AM - 10:00 AM
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE] flex justify-between gap-4">
              <span className="text-[#667085]">
                Break Duration
              </span>

              <span className="font-bold text-[#17324A]">
                1 Hour (1:00 PM - 2:00 PM)
              </span>
            </div>

          </div>
        </div>

        {/* Monthly Attendance */}
        <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-md space-y-4">

          <h3 className="text-xs font-bold text-[#667085] uppercase tracking-wider">
            August Attendance Record
          </h3>

          <div className="grid grid-cols-2 gap-3 text-center">

            <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE]">
              <span className="text-[10px] text-[#667085] uppercase font-semibold">
                Days Present
              </span>

              <div className="text-xl font-bold text-emerald-600 mt-1">
                18 / 18
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE]">
              <span className="text-[10px] text-[#667085] uppercase font-semibold">
                Late Arrivals
              </span>

              <div className="text-xl font-bold text-amber-600 mt-1">
                1 Day
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE]">
              <span className="text-[10px] text-[#667085] uppercase font-semibold">
                Total Hours Worked
              </span>

              <div className="text-xl font-bold text-[#17324A] mt-1">
                144 hrs
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE]">
              <span className="text-[10px] text-[#667085] uppercase font-semibold">
                Adherence Score
              </span>

              <div className="text-xl font-bold text-[#17324A] mt-1">
                98.5%
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Attendance History */}
      <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-md space-y-4">

        <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#17324A]" />
          Daily Attendance Logs
        </h3>

        <div className="overflow-x-auto">

          <table className="w-full text-left text-xs border-collapse">

            <thead>
              <tr className="border-b border-[#D9E5EE] text-[#667085] font-semibold bg-[#EAF2F8]">

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

            <tbody className="divide-y divide-[#D9E5EE] text-[#667085]">

              {attendanceLogs.map((log) => (

                <tr
                  key={log.id}
                  className="hover:bg-[#F5F9FC] transition-colors"
                >

                  <td className="py-3 px-4 font-bold text-[#17324A]">
                    {log.date}
                  </td>

                  <td className="py-3 px-4 font-mono text-emerald-600">
                    {log.checkIn}
                  </td>

                  <td className="py-3 px-4 font-mono text-[#667085]">
                    {log.checkOut}
                  </td>

                  <td className="py-3 px-4 font-semibold text-[#17324A]">
                    {log.hoursWorked}
                  </td>

                  <td className="py-3 px-4 text-[#667085] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#667085]" />
                    {log.location}
                  </td>

                  <td className="py-3 px-4 text-right">

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        log.status === 'On Time'
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : log.status === 'Late'
                          ? 'bg-amber-50 text-amber-600 border border-amber-200'
                          : 'bg-rose-50 text-rose-600 border border-rose-200'
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

      {clockNotice && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">{clockNotice}</div>}
      {lateClockInRequest?.status === 'pending' && !isClockedIn && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">Late clock-in permission is pending HR approval.</div>}
      <ClockInPermissionModal isOpen={isPermissionModalOpen} onClose={() => setIsPermissionModalOpen(false)} />
    </div>
  );
}

