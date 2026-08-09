'use client';

import React, { useState } from 'react';
import {
  Calendar,
  MapPin,
  Play,
  Download,
  CheckCircle2,
  Crown,
  Clock,
  Users,
  UserCheck,
  UserX,
  Home,
  AlertTriangle,
  Building,
} from 'lucide-react';
import { useHRMS } from '@/context/HRMSContext';
import { exportToExcel } from '@/utils/exportUtils';
import { LateClockInModal } from '@/components/modals/LateClockInModal';

export default function AttendancePage() {
  const {
    isClockedIn,
    clockInTime,
    elapsedWorkTime,
    toggleClockIn,
    attendanceLogs,
    currentUser,
  } = useHRMS();

  const isCeo = currentUser.userRole === 'ceo' || currentUser.userRole === 'admin';

  // Active Tab for CEO/Admin
  const [activeTab, setActiveTab] = useState<'organization' | 'personal'>(
    isCeo ? 'organization' : 'personal'
  );

  const [isLateModalOpen, setIsLateModalOpen] = useState(false);

  const handleClockInClick = () => {
    if (isClockedIn) {
      return;
    }
    const now = new Date();
    const currentHour = now.getHours();
    if (currentHour < 9 || currentHour >= 10) {
      setIsLateModalOpen(true);
      return;
    }
    toggleClockIn();
  };

  const deptAttendanceData = [
    { department: 'Engineering', total: 42, present: 41, absent: 1, wfh: 4, rate: 97.6 },
    { department: 'Sales & Customer Success', total: 25, present: 23, absent: 2, wfh: 1, rate: 92.0 },
    { department: 'Marketing & Brand', total: 15, present: 14, absent: 1, wfh: 1, rate: 93.3 },
    { department: 'Human Resources & Ops', total: 10, present: 10, absent: 0, wfh: 0, rate: 100.0 },
    { department: 'Finance & Legal', total: 8, present: 8, absent: 0, wfh: 0, rate: 100.0 },
    { department: 'Product & Design', total: 5, present: 5, absent: 0, wfh: 2, rate: 100.0 },
  ];

  return (
    <div className="space-y-6 select-none">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-[#17324A]">
              Attendance & Time Management
            </h1>
            {isCeo && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                <Crown className="w-3 h-3 text-purple-700" />
                CEO Executive Context
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[#667085]">
            {activeTab === 'organization'
              ? 'Organization-wide live presence, daily attendance metrics, and department compliance'
              : 'Track biometric check-ins, personal shift schedules, and monthly attendance logs'}
          </p>
        </div>

        {/* Export Excel */}
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
          className="px-4 py-2.5 rounded-xl bg-[#B0D0EA] hover:bg-[#9FC5E2] text-[#17324A] border border-[#9FC5E2] text-xs font-semibold shadow-md flex items-center gap-2 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Export Attendance Excel
        </button>
      </div>

      {/* CEO / Executive Context Switcher */}
      {isCeo && (
        <div className="flex items-center gap-2 bg-[#F5F9FC] p-1.5 rounded-2xl border border-[#D9E5EE] w-fit">
          <button
            onClick={() => setActiveTab('organization')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'organization'
                ? 'bg-[#17324A] text-white shadow-md'
                : 'text-[#5F7180] hover:text-[#17324A]'
            }`}
          >
            <Building className="w-4 h-4" />
            Organization Attendance (Org View)
          </button>
          <button
            onClick={() => setActiveTab('personal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'personal'
                ? 'bg-[#17324A] text-white shadow-md'
                : 'text-[#5F7180] hover:text-[#17324A]'
            }`}
          >
            <Clock className="w-4 h-4" />
            My Attendance (Personal Clock In)
          </button>
        </div>
      )}

      {/* TAB 1: ORGANIZATION ATTENDANCE (EXECUTIVE VIEW) */}
      {activeTab === 'organization' && isCeo && (
        <div className="space-y-6">
          {/* Executive Attendance Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md text-center">
              <span className="text-[10px] font-bold text-[#5F7180] uppercase tracking-wider block">Present Today</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">96</div>
              <span className="text-[10px] text-[#5F7180]">Office & Remote</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md text-center">
              <span className="text-[10px] font-bold text-[#5F7180] uppercase tracking-wider">Absent Today</span>
              <div className="text-2xl font-black text-rose-600 mt-1">5</div>
              <span className="text-[10px] text-[#5F7180]">Unexcused / Pending</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md text-center">
              <span className="text-[10px] font-bold text-[#5F7180] uppercase tracking-wider">On Approved Leave</span>
              <div className="text-2xl font-black text-amber-600 mt-1">4</div>
              <span className="text-[10px] text-[#5F7180]">Earned & Sick</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md text-center">
              <span className="text-[10px] font-bold text-[#5F7180] uppercase tracking-wider">Work From Home</span>
              <div className="text-2xl font-black text-blue-600 mt-1">8</div>
              <span className="text-[10px] text-[#5F7180]">Approved WFH</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md text-center">
              <span className="text-[10px] font-bold text-[#5F7180] uppercase tracking-wider">Attendance Rate</span>
              <div className="text-2xl font-black text-[#17324A] mt-1">96.4%</div>
              <span className="text-[10px] text-emerald-600 font-bold">+1.2% MoM</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md text-center">
              <span className="text-[10px] font-bold text-[#5F7180] uppercase tracking-wider">Late Arrivals</span>
              <div className="text-2xl font-black text-amber-600 mt-1">3</div>
              <span className="text-[10px] text-[#5F7180]">Grace Used</span>
            </div>
          </div>

          {/* Department-wise Attendance Breakdown Table */}
          <div className="p-6 rounded-2xl bg-white border border-[#B0D0EA] shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#17324A] flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#17324A]" />
                  Department-Wise Live Attendance Breakdown
                </h3>
                <p className="text-xs text-[#5F7180]">Real-time daily presence, leave, and attendance compliance rates across all departments</p>
              </div>
              <span className="text-xs font-bold text-[#17324A] bg-[#F5F9FC] px-3 py-1 rounded-xl border border-[#D9E5EE]">
                105 Workforce Total
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#D9E5EE] text-[#5F7180] uppercase tracking-wider font-bold text-[10px] bg-[#F5F9FC]">
                    <th className="py-3 px-4 rounded-l-xl">Department</th>
                    <th className="py-3 px-4">Total Headcount</th>
                    <th className="py-3 px-4">Present Today</th>
                    <th className="py-3 px-4">Absent</th>
                    <th className="py-3 px-4">WFH</th>
                    <th className="py-3 px-4">Attendance Rate</th>
                    <th className="py-3 px-4 rounded-r-xl">Status Bar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAF2F8]">
                  {deptAttendanceData.map((dept) => (
                    <tr key={dept.department} className="hover:bg-[#F5F9FC]">
                      <td className="py-3.5 px-4 font-bold text-[#17324A]">{dept.department}</td>
                      <td className="py-3.5 px-4 font-semibold text-[#17324A]">{dept.total} employees</td>
                      <td className="py-3.5 px-4 font-semibold text-emerald-600">{dept.present}</td>
                      <td className="py-3.5 px-4 font-semibold text-rose-600">{dept.absent}</td>
                      <td className="py-3.5 px-4 font-semibold text-blue-600">{dept.wfh}</td>
                      <td className="py-3.5 px-4 font-bold text-[#17324A]">{dept.rate}%</td>
                      <td className="py-3.5 px-4 w-48">
                        <div className="w-full bg-[#EAF2F8] rounded-full h-2">
                          <div className="h-2 rounded-full bg-[#17324A]" style={{ width: `${dept.rate}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY ATTENDANCE (PERSONAL CEO CLOCK-IN VIEW) */}
      {(activeTab === 'personal' || !isCeo) && (
        <div className="space-y-6">
          {/* Live Punch Widget & Shift Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Live Punch Widget */}
            <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-md space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">Live Punch Widget</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#B0D0EA] text-[#17324A] border border-[#9FC5E2]">
                  Shift A (Executive)
                </span>
              </div>

              <div className="text-center py-2 space-y-1">
                <span className="text-[11px] text-[#667085]">Current Status</span>
                <div className="text-3xl font-black font-mono text-[#17324A]">
                  {isClockedIn ? elapsedWorkTime : '00:00:00'}
                </div>
                <p className="text-xs font-semibold text-emerald-600">
                  {isClockedIn ? `● Shift Active • Clocked in at ${clockInTime}` : '○ Shift Inactive • Ready to Punch In'}
                </p>
              </div>

              {isClockedIn ? (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
                  <span className="text-xs font-bold text-emerald-700 flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Shift In Progress (Auto Logout at 9h)
                  </span>
                  <p className="text-[10px] text-emerald-600">Standard 9-hour work duration active</p>
                </div>
              ) : (
                <button
                  onClick={handleClockInClick}
                  className="w-full py-3 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer bg-[#B0D0EA] hover:bg-[#9FC5E2] text-[#17324A] border border-[#9FC5E2]"
                >
                  <Play className="w-4 h-4" />
                  Clock In (Start Work Shift)
                </button>
              )}
            </div>

            {/* Shift Policy */}
            <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-md space-y-4">
              <h3 className="text-xs font-bold text-[#667085] uppercase tracking-wider">Shift Policy Details</h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE] flex justify-between gap-4">
                  <span className="text-[#667085]">Standard Hours</span>
                  <span className="font-bold text-[#17324A]">09:00 AM - 06:00 PM</span>
                </div>
                <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE] flex justify-between gap-4">
                  <span className="text-[#667085]">Grace Period Allowance</span>
                  <span className="font-bold text-amber-600">60 Minutes</span>
                </div>
                <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE] flex justify-between gap-4">
                  <span className="text-[#667085]">Break Duration</span>
                  <span className="font-bold text-[#17324A]">1 Hour (1:00 PM - 2:00 PM)</span>
                </div>
              </div>
            </div>

            {/* Monthly Attendance */}
            <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-md space-y-4">
              <h3 className="text-xs font-bold text-[#667085] uppercase tracking-wider">August Personal Attendance</h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE]">
                  <span className="text-[10px] text-[#667085] uppercase font-semibold">Days Present</span>
                  <div className="text-xl font-bold text-emerald-600 mt-1">18 / 18</div>
                </div>
                <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE]">
                  <span className="text-[10px] text-[#667085] uppercase font-semibold">Late Arrivals</span>
                  <div className="text-xl font-bold text-amber-600 mt-1">1 Day</div>
                </div>
                <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE]">
                  <span className="text-[10px] text-[#667085] uppercase font-semibold">Hours Worked</span>
                  <div className="text-xl font-bold text-[#17324A] mt-1">144 hrs</div>
                </div>
                <div className="p-3 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE]">
                  <span className="text-[10px] text-[#667085] uppercase font-semibold">Score</span>
                  <div className="text-xl font-bold text-[#17324A] mt-1">98.5%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance History */}
          <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-md space-y-4">
            <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#17324A]" />
              My Daily Attendance Logs
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#D9E5EE] text-[#667085] uppercase tracking-wider font-bold text-[10px] bg-[#F5F9FC]">
                    <th className="py-3 px-4 rounded-l-xl">Date</th>
                    <th className="py-3 px-4">Check In</th>
                    <th className="py-3 px-4">Check Out</th>
                    <th className="py-3 px-4">Hours Worked</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right rounded-r-xl">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAF2F8]">
                  {attendanceLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F5F9FC]">
                      <td className="py-3.5 px-4 font-bold text-[#17324A]">{log.date}</td>
                      <td className="py-3.5 px-4 text-emerald-700 font-semibold">{log.checkIn}</td>
                      <td className="py-3.5 px-4 text-[#667085]">{log.checkOut}</td>
                      <td className="py-3.5 px-4 font-mono font-semibold">{log.hoursWorked}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${log.status === 'On Time' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-[#667085]">{log.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Late Clock-In Justification Modal */}
      <LateClockInModal
        isOpen={isLateModalOpen}
        onClose={() => setIsLateModalOpen(false)}
      />
    </div>
  );
}
