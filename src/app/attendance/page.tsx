
'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Download,
  MapPin,
  Play,
  Square,
  Users,
} from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';
import { authFetch } from '@/lib/api-client';
import { exportToExcel } from '@/shared/lib/exportUtils';
import { ClockInPermissionModal } from '@/features/attendance/components/ClockInPermissionModal';
import PageLoader from '@/shared/components/PageLoader';

/**
 * The DB stores the enum *key* (OnTime, HalfDay, OnLeave), not the display
 * label, so normalize to the human-readable status the pills key off of.
 */
const normalizeStatus = (raw: string): string => {
  switch (raw) {
    case 'OnTime':
    case 'On Time':
      return 'On Time';
    case 'HalfDay':
    case 'Half Day':
      return 'Half Day';
    case 'OnLeave':
    case 'On Leave':
      return 'On Leave';
    default:
      return raw; // 'Late', 'Absent' already match
  }
};

/** Tailwind classes for a status pill. Green on-time, red late, yellow half-day. */
const statusPillClass = (status: string): string => {
  switch (status) {
    case 'On Time':
      return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
    case 'Late':
      return 'bg-red-50 text-red-600 border border-red-200';
    case 'Half Day':
      return 'bg-yellow-50 text-yellow-700 border border-yellow-300';
    default:
      return 'bg-rose-50 text-rose-600 border border-rose-200';
  }
};

/** One row of the org-wide (CEO) attendance table — includes who it belongs to. */
type OrgAttendanceRow = {
  id: string;
  employeeName: string;
  employeeCode: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hoursWorked: string;
  status: string;
  location: string;
};

export default function AttendancePage() {
  const {
    isClockedIn,
    clockInTime,
    elapsedWorkTime,
    toggleClockIn,
    lateClockInRequest,
    attendanceLogs,
    currentUser,
    isDataReady,
  } = useHRMS();

  // The CEO doesn't punch a shift — they oversee everyone's attendance instead.
  const isCeo = currentUser.rawRole === 'ceo';

  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [clockNotice, setClockNotice] = useState('');
  const [orgLogs, setOrgLogs] = useState<OrgAttendanceRow[]>([]);
  const [orgLoading, setOrgLoading] = useState(isCeo);

  useEffect(() => {
    if (!isCeo) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch<any>('/api/attendance?scope=all');
        const rows = (res?.data ?? res) as any[];
        if (!cancelled && Array.isArray(rows)) {
          setOrgLogs(
            rows.map((r) => ({
              id: r.id,
              employeeName: r.employee?.name || 'Employee',
              employeeCode: r.employee?.employeeCode || r.employeeId || '—',
              date: r.date,
              checkIn: r.checkIn,
              checkOut: r.checkOut || 'In Progress',
              hoursWorked: r.hoursWorked || '0h 0m',
              status: normalizeStatus(r.status || 'On Time'),
              location: r.location || 'Office - HQ',
            })),
          );
        }
      } catch {
        if (!cancelled) setOrgLogs([]);
      } finally {
        if (!cancelled) setOrgLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCeo]);

  const handleClockAction = () => {
    const result = toggleClockIn();

    if (result.status === 'permission-required') {
      setClockNotice('Clock-in after 10:00 AM requires HR approval. Submit your reason to continue.');
      setIsPermissionModalOpen(true);
    } else if (result.status === 'permission-pending') {
      setClockNotice('Your late clock-in request is pending HR approval.');
    } else if (result.status === 'permission-rejected') {
      setClockNotice('HR rejected your late clock-in request for today.');
    } else if (result.status === 'error') {
      setClockNotice(result.message);
    } else if (result.status === 'clocked-out') {
      setClockNotice('You have been clocked out successfully.');
    } else if (result.attendanceStatus === 'Late') {
      setClockNotice('You are clocked in. Today’s attendance is marked Late.');
    } else {
      setClockNotice('You are clocked in successfully. Today’s attendance is marked On Time.');
    }
  };

  const noticeIsError =
    clockNotice.includes('denied') ||
    clockNotice.includes('rejected');
  const noticeIsSuccess =
    clockNotice.includes('successfully') ||
    clockNotice.includes('clocked in');

  if (isCeo && orgLoading) {
    return <PageLoader label="Loading organization attendance…" />;
  }

  if (isCeo) {
    return (
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#17324A]">
              Organization Attendance
            </h1>
            <p className="mt-1 text-sm text-[#667085]">
              View check-ins, work hours, and shift status across every employee
            </p>
          </div>

          <button
            onClick={() => {
              const todayStr = new Date().toISOString().split('T')[0];
              const columns = [
                { header: 'Employee', key: 'employeeName' as const },
                { header: 'Employee Code', key: 'employeeCode' as const },
                { header: 'Date', key: 'date' as const },
                { header: 'Check-In', key: 'checkIn' as const },
                { header: 'Check-Out', key: 'checkOut' as const },
                { header: 'Hours Worked', key: 'hoursWorked' as const },
                { header: 'Status', key: 'status' as const },
                { header: 'Location', key: 'location' as const },
              ];
              exportToExcel(orgLogs, columns, `org-attendance-${todayStr}.xlsx`, 'Organization Attendance');
            }}
            className="px-4 py-2.5 rounded-xl bg-[#B0D0EA] hover:bg-[#9FC5E2] text-[#17324A] border border-[#9FC5E2] text-xs font-semibold shadow-md flex items-center gap-2 transition-all cursor-pointer"
            title="Download Organization Attendance as Excel"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
        </div>

        {/* All-employee attendance table */}
        <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-md space-y-4">
          <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#17324A]" />
            Employee Attendance Logs
            <span className="ml-1 rounded-full bg-[#EAF2F8] px-2 py-0.5 text-[10px] font-bold text-[#17324A] border border-[#B0D0EA]">
              {orgLogs.length}
            </span>
          </h3>

          {orgLogs.length === 0 ? (
            <div className="py-10 text-center">
              <Calendar className="mx-auto h-8 w-8 text-[#8FAEC5]" />
              <p className="mt-2 text-xs font-semibold text-[#17324A]">No attendance records yet</p>
              <p className="mt-1 text-[11px] text-[#667085]">Employee check-ins will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#D9E5EE] text-[#667085] font-semibold bg-[#EAF2F8]">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Check In</th>
                    <th className="py-3 px-4">Check Out</th>
                    <th className="py-3 px-4">Hours Worked</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9E5EE] text-[#667085]">
                  {orgLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F5F9FC] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#17324A]">{log.employeeName}</div>
                        <div className="font-mono text-[10px] text-[#667085]">{log.employeeCode}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-[#17324A]">{log.date}</td>
                      <td className="py-3 px-4 font-mono text-emerald-600">{log.checkIn}</td>
                      <td className="py-3 px-4 font-mono text-[#667085]">{log.checkOut}</td>
                      <td className="py-3 px-4 font-semibold text-[#17324A]">{log.hoursWorked}</td>
                      <td className="py-3 px-4 text-[#667085]">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#667085]" />
                          {log.location}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${statusPillClass(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!isDataReady && attendanceLogs.length === 0) {
    return <PageLoader label="Loading attendance…" />;
  }

  // Monthly summary derived live from this employee's own logs, so a freshly
  // onboarded ID starts at zero instead of showing the old seeded demo numbers.
  const now = new Date();
  const monthName = now.toLocaleString('en-US', { month: 'long' });
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthLogs = attendanceLogs.filter((log) => log.date?.startsWith(monthPrefix));
  const presentDays = monthLogs.filter((log) => log.status !== 'Absent' && log.status !== 'On Leave').length;
  const lateDays = monthLogs.filter((log) => log.status === 'Late').length;
  const onTimeDays = monthLogs.filter((log) => log.status === 'On Time').length;
  const totalMinutes = monthLogs.reduce((sum, log) => {
    const match = /(?:(\d+)h)?\s*(?:(\d+)m)?/.exec(log.hoursWorked || '');
    return sum + (match?.[1] ? Number(match[1]) * 60 : 0) + (match?.[2] ? Number(match[2]) : 0);
  }, 0);
  const totalHours = Math.round(totalMinutes / 60);
  const adherence = monthLogs.length === 0 ? null : Math.round((onTimeDays / monthLogs.length) * 1000) / 10;

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
            type="button"
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

          {clockNotice && (
            <div
              role="status"
              aria-live="polite"
              className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold leading-5 ${
                noticeIsError
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : noticeIsSuccess
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              {noticeIsSuccess ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>{clockNotice}</span>
            </div>
          )}

          {lateClockInRequest?.status === 'pending' && !isClockedIn && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold leading-5 text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Late clock-in permission is pending HR approval.</span>
            </div>
          )}
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
                08:00 AM - 06:00 PM
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE] flex justify-between gap-4">
              <span className="text-[#667085]">
                Normal Clock-in Window
              </span>

              <span className="font-bold text-amber-600">
                08:00 AM - 10:00 AM
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
            {monthName} Attendance Record
          </h3>

          <div className="grid grid-cols-2 gap-3 text-center">

            <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE]">
              <span className="text-[10px] text-[#667085] uppercase font-semibold">
                Days Present
              </span>

              <div className="text-xl font-bold text-emerald-600 mt-1">
                {presentDays} / {monthLogs.length}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE]">
              <span className="text-[10px] text-[#667085] uppercase font-semibold">
                Late Arrivals
              </span>

              <div className="text-xl font-bold text-amber-600 mt-1">
                {lateDays} {lateDays === 1 ? 'Day' : 'Days'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE]">
              <span className="text-[10px] text-[#667085] uppercase font-semibold">
                Total Hours Worked
              </span>

              <div className="text-xl font-bold text-[#17324A] mt-1">
                {totalHours} hrs
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE]">
              <span className="text-[10px] text-[#667085] uppercase font-semibold">
                Adherence Score
              </span>

              <div className="text-xl font-bold text-[#17324A] mt-1">
                {adherence === null ? '—' : `${adherence}%`}
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

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${statusPillClass(log.status)}`}>
                      {log.status}
                    </span>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>
      </div>

      <ClockInPermissionModal isOpen={isPermissionModalOpen} onClose={() => setIsPermissionModalOpen(false)} />
    </div>
  );
}

