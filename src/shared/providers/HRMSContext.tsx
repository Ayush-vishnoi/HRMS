'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authFetch, logout as apiLogout, tokenStore, userStore } from '@/lib/api-client';
import { MOCK_EMPLOYEES } from '@/features/employees/data/employees';
import type { Employee } from '@/features/employees/data/employees';
import { INITIAL_LEAVE_REQUESTS, MOCK_LEAVE_BALANCES } from '@/features/leaves/data/leaves';
import type { LeaveRequest } from '@/features/leaves/data/leaves';
import { MOCK_ATTENDANCE_LOGS } from '@/features/attendance/data/attendance';
import type { AttendanceRecord } from '@/features/attendance/data/attendance';

export type UserRole = 'employee' | 'manager' | 'admin';
export type LateClockInRequestStatus = 'pending' | 'approved' | 'rejected';
export type HelpDeskTicketStatus = 'Open' | 'In Progress' | 'Resolved';
export type HelpDeskTicketPriority = 'Low' | 'Medium' | 'High';

export interface HelpDeskTicket {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  category: string;
  priority: HelpDeskTicketPriority;
  subject: string;
  description: string;
  status: HelpDeskTicketStatus;
  createdAt: string;
  resolution?: string;
  resolvedAt?: string;
}

export interface LateClockInRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterCode: string;
  requesterRole: Exclude<UserRole, 'admin'>;
  requestDate: string;
  status: LateClockInRequestStatus;
  reason: string;
  requestedAt: string;
  reviewedAt?: string;
}

export type ClockActionResult =
  | { status: 'clocked-in'; attendanceStatus: 'On Time' | 'Late' }
  | { status: 'clocked-out' }
  | { status: 'permission-required' }
  | { status: 'permission-pending' }
  | { status: 'permission-rejected' }
  | { status: 'error'; message: string };

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  userRole: UserRole;
  department: string;
  avatar: string;
  employeeCode: string;
}

const DEMO_ACCOUNTS: Record<UserRole, UserAccount> = {
  employee: {
    id: 'EMP-001', name: 'Ayush Vishnoi', email: 'ayush.vishnoi@company.com', role: 'AI/ML Intern Developer', userRole: 'employee', department: 'AI/ML',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80', employeeCode: 'EMP-2026-089',
  },
  manager: {
    id: 'EMP-002', name: 'Arjun Mehta', email: 'arjun.mehta@company.com', role: 'Engineering Manager', userRole: 'manager', department: 'Engineering',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', employeeCode: 'EMP-2019-012',
  },
  admin: {
    id: 'EMP-006', name: 'Priya Sharma', email: 'priya.sharma@company.com', role: 'Head of Human Resources', userRole: 'admin', department: 'Human Resources',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', employeeCode: 'EMP-2017-003',
  },
};

const LATE_REQUEST_STORAGE_KEY = 'hrms-late-clock-in-requests';
const SESSION_STATUS_INTERVAL_MS = 30 * 1000;
const PORTAL_START_MINUTES = 8 * 60;
const LATE_CLOCK_IN_MINUTES = 10 * 60;
const PORTAL_END_MINUTES = 18 * 60;
const ACCESS_DENIED_MESSAGE = 'Clock-in access denied. Attendance clock-in is available from 8:00 AM to 6:00 PM.';

const formatDbEmployee = (emp: any, managerName = 'Arjun Mehta'): Employee => ({
  id: emp.id,
  employeeCode: emp.employeeCode || emp.employee_code || `EMP-${emp.id}`,
  name: emp.name,
  role: emp.roleTitle || emp.role || 'Staff Member',
  department: emp.department || 'Engineering',
  email: emp.email,
  phone: emp.phone || '+91 98765 00000',
  avatar: emp.avatarUrl || emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  status: (emp.status === 'OnLeave' || emp.status === 'On Leave') ? 'On Leave' : (emp.status === 'Remote' ? 'Remote' : 'Active'),
  joinDate: emp.joinDate || emp.join_date || '15 Mar 2026',
  location: emp.location || 'Bengaluru, Karnataka',
  salary: Number(emp.salary) || 0,
  manager: typeof emp.manager === 'string' ? emp.manager : managerName,
});

const formatDbAttendance = (log: any): AttendanceRecord => {
  let status: AttendanceRecord['status'] = 'On Time';
  if (log.status === 'Late') status = 'Late';
  else if (log.status === 'HalfDay' || log.status === 'Half Day') status = 'Half Day';
  else if (log.status === 'Absent') status = 'Absent';
  else if (log.status === 'OnLeave' || log.status === 'On Leave') status = 'On Leave';

  return {
    id: log.id,
    date: log.date,
    checkIn: log.checkIn,
    checkOut: log.checkOut || 'In Progress',
    hoursWorked: log.hoursWorked || '0h 0m',
    status,
    location: log.location || 'Office - HQ',
  };
};

const formatDbLeave = (req: any): LeaveRequest => ({
  id: req.id,
  employeeId: req.employeeId,
  employeeName: req.employee?.name || 'Ayush Vishnoi',
  employeeAvatar: req.employee?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  leaveType: req.leaveType || 'Casual',
  startDate: req.startDate,
  endDate: req.endDate,
  days: Number(req.days) || 1,
  reason: req.reason || 'Personal leave',
  status: req.status || 'Pending',
  appliedOn: req.appliedOn || new Date().toISOString().split('T')[0],
});

const formatDbTicket = (t: any): HelpDeskTicket => ({
  id: t.id,
  employeeId: t.employeeId,
  employeeName: t.employee?.name || 'Employee',
  employeeCode: t.employee?.employeeCode || t.employeeId,
  category: t.category,
  priority: (t.priority as HelpDeskTicketPriority) || 'Medium',
  subject: t.subject,
  description: t.description,
  status: (t.status as HelpDeskTicketStatus) || 'Open',
  createdAt: t.createdAt,
  resolution: t.resolution || undefined,
  resolvedAt: t.resolvedAt || undefined,
});

interface HRMSContextType {
  isAuthenticated: boolean;
  isAuthReady: boolean;
  currentUser: UserAccount;
  logout: () => void;
  employees: Employee[];
  addEmployee: (emp: Omit<Employee, 'id' | 'employeeCode'>) => Promise<void>;
  leaveRequests: LeaveRequest[];
  leaveBalances: typeof MOCK_LEAVE_BALANCES;
  setLeaveBalances: React.Dispatch<React.SetStateAction<typeof MOCK_LEAVE_BALANCES>>;
  attendanceLogs: AttendanceRecord[];
  isClockedIn: boolean;
  clockInTime: string | null;
  elapsedWorkTime: string;
  lateClockInRequests: LateClockInRequest[];
  lateClockInRequest: LateClockInRequest | null;
  toggleClockIn: () => ClockActionResult;
  submitLateClockInRequest: (reason: string) => { success: boolean; message: string };
  reviewLateClockInRequest: (id: string, status: 'approved' | 'rejected') => void;
  addLeaveRequest: (newLeave: Omit<LeaveRequest, 'id' | 'employeeId' | 'employeeName' | 'employeeAvatar' | 'status' | 'appliedOn'>) => Promise<void>;
  updateLeaveStatus: (id: string, status: 'Approved' | 'Rejected') => Promise<void>;
  helpDeskTickets: HelpDeskTicket[];
  submitHelpDeskTicket: (ticket: Pick<HelpDeskTicket, 'category' | 'priority' | 'subject' | 'description'>) => Promise<string>;
  updateHelpDeskTicket: (id: string, status: HelpDeskTicketStatus, resolution?: string) => Promise<void>;
  selectedEmployee: Employee | null;
  setSelectedEmployee: (emp: Employee | null) => void;
}

const HRMSContext = createContext<HRMSContextType | undefined>(undefined);

const formatElapsedWorkTime = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, totalSeconds);
  return `${String(Math.floor(safeSeconds / 3600)).padStart(2, '0')}:${String(Math.floor((safeSeconds % 3600) / 60)).padStart(2, '0')}:${String(safeSeconds % 60).padStart(2, '0')}`;
};

const formatWorkedHours = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, totalSeconds);
  return `${Math.floor(safeSeconds / 3600)}h ${Math.floor((safeSeconds % 3600) / 60)}m`;
};

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMinutesSinceMidnight = (date: Date) => date.getHours() * 60 + date.getMinutes();

const isPortalOpen = (date: Date) => {
  const minutes = getMinutesSinceMidnight(date);
  return minutes >= PORTAL_START_MINUTES && minutes < PORTAL_END_MINUTES;
};

interface HRMSProviderProps {
  children: React.ReactNode;
}

/** Map a backend user (login/session response) to the frontend UserAccount shape. */
const mapBackendUser = (user: {
  id: string;
  email: string;
  name: string;
  employeeCode?: string;
  userRole?: string;
  department?: string | null;
  avatarUrl?: string | null;
}): UserAccount => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.department || 'Staff Member',
  userRole: (user.userRole as UserRole) || 'employee',
  department: user.department || 'General',
  avatar:
    user.avatarUrl ||
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  employeeCode: user.employeeCode || `EMP-${user.id}`,
});

export const HRMSProvider: React.FC<HRMSProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserAccount>(DEMO_ACCOUNTS.employee);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Bootstrap auth from the stored backend JWT on mount (client-side only).
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const token = tokenStore.get();
      if (!token) {
        setIsAuthReady(true);
        return;
      }

      try {
        const session = await authFetch<{
          id: string;
          email: string;
          name: string;
          employeeCode?: string;
          userRole?: string;
          department?: string | null;
          avatarUrl?: string | null;
        } | null>('/api/auth/session');

        if (cancelled) return;

        if (session?.id) {
          const mapped = mapBackendUser(session);
          userStore.set(session);
          setCurrentUser(mapped);
          setIsAuthenticated(true);
          window.sessionStorage.setItem('hrms_tab_user_id', mapped.id);
        } else {
          tokenStore.clear();
        }
      } catch {
        if (!cancelled) tokenStore.clear();
      } finally {
        if (!cancelled) setIsAuthReady(true);
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(INITIAL_LEAVE_REQUESTS);
  const [leaveBalances, setLeaveBalances] = useState(MOCK_LEAVE_BALANCES);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>(MOCK_ATTENDANCE_LOGS);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [clockInAt, setClockInAt] = useState<number | null>(null);
  const [activeAttendanceId, setActiveAttendanceId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lateClockInRequests, setLateClockInRequests] = useState<LateClockInRequest[]>([]);
  const [helpDeskTickets, setHelpDeskTickets] = useState<HelpDeskTicket[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const lateClockInRequest = lateClockInRequests.find((request) => request.requesterId === currentUser.id) ?? null;

  // Load non-auth application state after the first paint. The mock state above
  // keeps the shell responsive while the remote database hydrates the context.
  // Skipped while unauthenticated so we never fire requests that would 401 and
  // trigger the global redirect to /login.
  useEffect(() => {
    if (!isAuthReady || !isAuthenticated) return;

    const storedLateRequests = window.localStorage.getItem(LATE_REQUEST_STORAGE_KEY);
    if (storedLateRequests) {
      setLateClockInRequests(JSON.parse(storedLateRequests) as LateClockInRequest[]);
    }

    // Fetch with a hard timeout and a single retry on network-level failures
    // so a cold-starting or reconnecting backend degrades gracefully
    // instead of hanging hydration (`TypeError: Failed to fetch`).
    const fetchJson = async (path: string, timeoutMs = 20_000): Promise<any | null> => {
      for (let attempt = 0; ; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          return await authFetch<any>(path, { signal: controller.signal });
        } catch (err) {
          if (attempt > 0) {
            console.error(`Error fetching ${path}:`, err);
            return null;
          }
          await new Promise((resolve) => setTimeout(resolve, 1500));
        } finally {
          clearTimeout(timer);
        }
      }
    };

    const fetchData = async () => {
      try {
        const [empRes, leavesRes, ticketsRes, attRes] = await Promise.all([
          fetchJson('/api/employees'),
          fetchJson('/api/leaves'),
          fetchJson('/api/help-desk'),
          fetchJson('/api/attendance'),
        ]);

        if (empRes?.success && Array.isArray(empRes.data) && empRes.data.length > 0) {
          const formatted = empRes.data.map((e: any) => formatDbEmployee(e));
          setEmployees(formatted);
        }

        if (leavesRes?.success && leavesRes.data?.requests && Array.isArray(leavesRes.data.requests)) {
          const formatted = leavesRes.data.requests.map((r: any) => formatDbLeave(r));
          setLeaveRequests(formatted);
        }

        if (leavesRes?.success && Array.isArray(leavesRes.data?.balances) && leavesRes.data.balances.length > 0) {
          const b = leavesRes.data.balances;
          const pick = (type: string) => b.find((x: any) => x.leaveType === type);
          const casual = pick('Casual');
          const sick = pick('Sick');
          const earned = pick('Earned');
          const wfh = pick('WFH');
          setLeaveBalances({
            casual: casual ? { total: casual.total, used: casual.used, remaining: casual.remaining } : MOCK_LEAVE_BALANCES.casual,
            sick: sick ? { total: sick.total, used: sick.used, remaining: sick.remaining } : MOCK_LEAVE_BALANCES.sick,
            earned: earned ? { total: earned.total, used: earned.used, remaining: earned.remaining } : MOCK_LEAVE_BALANCES.earned,
            wfh: wfh ? { total: wfh.total, used: wfh.used, remaining: wfh.remaining } : MOCK_LEAVE_BALANCES.wfh,
          });
        }

        if (ticketsRes?.success && Array.isArray(ticketsRes.data)) {
          const formatted = ticketsRes.data.map((t: any) => formatDbTicket(t));
          setHelpDeskTickets(formatted);
        }

        if (attRes?.success && Array.isArray(attRes.data) && attRes.data.length > 0) {
          const formatted = attRes.data.map((a: any) => formatDbAttendance(a));
          setAttendanceLogs(formatted);
        }
      } catch (err) {
        console.error('Error fetching initial database state:', err);
      }
    };

    let idleCallbackId: number | null = null;
    let timeoutId: number | null = null;

    if (typeof window.requestIdleCallback === 'function') {
      idleCallbackId = window.requestIdleCallback(fetchData, { timeout: 1500 });
    } else {
      timeoutId = window.setTimeout(fetchData, 500);
    }

    return () => {
      if (idleCallbackId !== null) window.cancelIdleCallback(idleCallbackId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [isAuthReady, isAuthenticated]);

  const persistLateClockInRequests = (requests: LateClockInRequest[]) => {
    setLateClockInRequests(requests);
    window.localStorage.setItem(LATE_REQUEST_STORAGE_KEY, JSON.stringify(requests));
  };

  const finishClockOut = useCallback(async (date: Date) => {
    if (!clockInAt || !activeAttendanceId) return;
    const workedSeconds = Math.max(0, Math.floor((date.getTime() - clockInAt) / 1000));
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const hoursWorked = formatWorkedHours(workedSeconds);
    const targetId = activeAttendanceId;

    setAttendanceLogs((prev) => prev.map((log) => log.id === targetId ? { ...log, checkOut: time, hoursWorked } : log));
    setIsClockedIn(false);
    setClockInTime(null);
    setClockInAt(null);
    setActiveAttendanceId(null);
    setElapsedSeconds(0);

    try {
      await authFetch('/api/attendance', {
        method: 'PATCH',
        body: {
          id: targetId,
          checkOut: time,
          hoursWorked,
        },
      });
    } catch (err) {
      console.error('Failed to update clock-out in database:', err);
    }
  }, [activeAttendanceId, clockInAt]);

  useEffect(() => {
    if (!isClockedIn || clockInAt === null) return;
    const updateElapsedTime = () => {
      const now = new Date();
      const shiftEnd = new Date(now);
      shiftEnd.setHours(18, 0, 0, 0);
      if (now.getTime() >= shiftEnd.getTime()) {
        finishClockOut(shiftEnd);
        return;
      }
      setElapsedSeconds(Math.max(0, Math.floor((now.getTime() - clockInAt) / 1000)));
    };
    updateElapsedTime();
    const intervalId = window.setInterval(updateElapsedTime, 1000);
    return () => window.clearInterval(intervalId);
  }, [clockInAt, finishClockOut, isClockedIn]);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    window.sessionStorage.removeItem('hrms_tab_user_id');
    apiLogout();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    let activeController: AbortController | null = null;
    let lastValidatedAt = 0;

    const validateSession = async () => {
      if (Date.now() - lastValidatedAt < SESSION_STATUS_INTERVAL_MS) return;
      lastValidatedAt = Date.now();
      if (activeController) return;

      const controller = new AbortController();
      activeController = controller;

      try {
        const session = await authFetch<{
          id: string;
        } | null>('/api/auth/session', { signal: controller.signal });

        const tabUserId = window.sessionStorage.getItem('hrms_tab_user_id');
        // If the token now belongs to a different user (another tab), log this tab out
        if (tabUserId && session?.id && session.id !== tabUserId) {
          logout();
        }
      } catch (sessionError) {
        if ((sessionError as Error).name !== 'AbortError' && (sessionError as Error).message !== 'Unauthorized') {
          console.warn('Session status check could not reach the server.');
        }
      } finally {
        if (activeController === controller) {
          activeController = null;
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void validateSession();
    };

    const intervalId = window.setInterval(() => void validateSession(), SESSION_STATUS_INTERVAL_MS);
    window.addEventListener('focus', validateSession);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleStorageEvent = (e: StorageEvent) => {
      // Intentionally ignored — tabs run independent sessions
      void e;
    };
    window.addEventListener('storage', handleStorageEvent);

    // The server layout already resolved the initial session. The first client
    // validation can wait for the normal interval or a meaningful tab change.
    return () => {
      activeController?.abort();
      window.clearInterval(intervalId);
      window.removeEventListener('focus', validateSession);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [isAuthenticated, logout]);

  const elapsedWorkTime = formatElapsedWorkTime(elapsedSeconds);

  const addEmployee = async (empData: Omit<Employee, 'id' | 'employeeCode'>) => {
    try {
      const json = await authFetch<{ success: boolean; data?: any }>('/api/employees', {
        method: 'POST',
        body: {
          ...empData,
          roleTitle: empData.role,
          avatarUrl: empData.avatar,
        },
      });
      if (json?.success && json.data) {
        const newEmployee = formatDbEmployee(json.data, empData.manager);
        setEmployees((prev) => [newEmployee, ...prev.filter((e) => e.id !== newEmployee.id)]);
      }
    } catch (error) {
      console.error('Failed to create employee in database:', error);
    }
  };

  const startClockIn = async (now: Date, status: AttendanceRecord['status'] = 'On Time') => {
    const nowTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const id = `ATT-${now.getTime()}`;
    const newLog: AttendanceRecord = { id, date: formatLocalDate(now), checkIn: nowTime, checkOut: 'In Progress', hoursWorked: '0h 0m', status, location: 'Office - HQ' };
    setAttendanceLogs((prev) => [newLog, ...prev]);
    setClockInTime(nowTime);
    setClockInAt(now.getTime());
    setActiveAttendanceId(id);
    setElapsedSeconds(0);
    setIsClockedIn(true);

    try {
      await authFetch('/api/attendance', {
        method: 'POST',
        body: {
          id,
          employeeId: currentUser.id,
          date: formatLocalDate(now),
          checkIn: nowTime,
          status,
          location: 'Office - HQ',
        },
      });
    } catch (err) {
      console.error('Failed to save attendance record to database:', err);
    }
  };

  const toggleClockIn = (): ClockActionResult => {
    const now = new Date();
    if (isClockedIn) { finishClockOut(now); return { status: 'clocked-out' }; }
    if (!isPortalOpen(now)) return { status: 'error', message: ACCESS_DENIED_MESSAGE };

    const minutes = getMinutesSinceMidnight(now);
    if (minutes < LATE_CLOCK_IN_MINUTES) {
      startClockIn(now);
      return { status: 'clocked-in', attendanceStatus: 'On Time' };
    }
    if (currentUser.userRole === 'admin') {
      startClockIn(now, 'Late');
      return { status: 'clocked-in', attendanceStatus: 'Late' };
    }

    const todayRequest = lateClockInRequests.find((request) => request.requesterId === currentUser.id && request.requestDate === formatLocalDate(now));
    if (todayRequest?.status === 'approved') {
      startClockIn(now, 'Late');
      return { status: 'clocked-in', attendanceStatus: 'Late' };
    }
    if (todayRequest?.status === 'pending') return { status: 'permission-pending' };
    if (todayRequest?.status === 'rejected') return { status: 'permission-rejected' };
    return { status: 'permission-required' };
  };

  const submitLateClockInRequest = (reason: string) => {
    const now = new Date();
    const trimmedReason = reason.trim();
    if (!isPortalOpen(now)) return { success: false, message: ACCESS_DENIED_MESSAGE };
    if (getMinutesSinceMidnight(now) < LATE_CLOCK_IN_MINUTES) return { success: false, message: 'HR permission is only required for clock-in after 10:00 AM.' };
    if (currentUser.userRole === 'admin') return { success: false, message: 'HR Admin clock-in does not require approval.' };
    if (!trimmedReason) return { success: false, message: 'A reason is required before sending the HR permission request.' };

    const requestDate = formatLocalDate(now);
    const existingRequest = lateClockInRequests.find((request) => request.requesterId === currentUser.id && request.requestDate === requestDate);
    if (existingRequest?.status === 'pending') return { success: false, message: 'Your late clock-in request is already pending with HR.' };
    if (existingRequest?.status === 'approved') return { success: false, message: 'HR has already approved your late clock-in request for today.' };
    if (existingRequest?.status === 'rejected') return { success: false, message: 'HR rejected your late clock-in request for today.' };

    const created: LateClockInRequest = {
      id: `LATE-${now.getTime()}`,
      requesterId: currentUser.id,
      requesterName: currentUser.name,
      requesterCode: currentUser.employeeCode,
      requesterRole: currentUser.userRole,
      requestDate,
      status: 'pending',
      reason: trimmedReason,
      requestedAt: now.toLocaleString('en-IN'),
    };
    persistLateClockInRequests([created, ...lateClockInRequests]);
    return { success: true, message: 'Permission request sent to HR. Clock-in will be available after approval.' };
  };

  const reviewLateClockInRequest = (id: string, status: 'approved' | 'rejected') => {
    const reviewed = lateClockInRequests.map((request) => request.id === id ? { ...request, status, reviewedAt: new Date().toLocaleString('en-IN') } : request);
    persistLateClockInRequests(reviewed);
  };

  const refreshLeaveBalances = async (employeeId?: string) => {
    const path = employeeId ? `/api/leaves?employeeId=${employeeId}` : '/api/leaves';
    const res = await authFetch<any>(path).catch(() => null);
    if (res?.success && Array.isArray(res.data?.balances) && res.data.balances.length > 0) {
      const b = res.data.balances;
      const pick = (type: string) => b.find((x: any) => x.leaveType === type);
      const casual = pick('Casual'); const sick = pick('Sick'); const earned = pick('Earned'); const wfh = pick('WFH');
      setLeaveBalances({
        casual: casual ? { total: casual.total, used: casual.used, remaining: casual.remaining } : MOCK_LEAVE_BALANCES.casual,
        sick: sick ? { total: sick.total, used: sick.used, remaining: sick.remaining } : MOCK_LEAVE_BALANCES.sick,
        earned: earned ? { total: earned.total, used: earned.used, remaining: earned.remaining } : MOCK_LEAVE_BALANCES.earned,
        wfh: wfh ? { total: wfh.total, used: wfh.used, remaining: wfh.remaining } : MOCK_LEAVE_BALANCES.wfh,
      });
    }
  };

  const addLeaveRequest = async (newLeave: Omit<LeaveRequest, 'id' | 'employeeId' | 'employeeName' | 'employeeAvatar' | 'status' | 'appliedOn'>) => {
    try {
      const json = await authFetch<{ success: boolean; data?: any }>('/api/leaves', {
        method: 'POST',
        body: {
          employeeId: currentUser.id,
          leaveType: newLeave.leaveType,
          startDate: newLeave.startDate,
          endDate: newLeave.endDate,
          days: newLeave.days,
          reason: newLeave.reason,
        },
      });
      if (json?.success && json.data) {
        const created: LeaveRequest = {
          ...newLeave,
          id: json.data.id,
          employeeId: currentUser.id,
          employeeName: currentUser.name,
          employeeAvatar: currentUser.avatar,
          status: json.data.status || 'Pending',
          appliedOn: json.data.appliedOn || formatLocalDate(new Date()),
        };
        setLeaveRequests((prev) => [created, ...prev.filter((r) => r.id !== created.id)]);
        // Optimistically reduce balance on apply
        const key = newLeave.leaveType.toLowerCase() as keyof typeof MOCK_LEAVE_BALANCES;
        setLeaveBalances((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            used: prev[key].used + newLeave.days,
            remaining: Math.max(0, prev[key].remaining - newLeave.days),
          },
        }));
      }
    } catch (err) {
      console.error('Failed to submit leave request to database:', err);
    }
  };

  const updateLeaveStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    const req = leaveRequests.find((r) => r.id === id);
    setLeaveRequests((prev) => prev.map((request) => request.id === id ? { ...request, status } : request));

    // If rejecting a pending leave of current user, restore balance
    if (req && status === 'Rejected' && req.status === 'Pending' && req.employeeId === currentUser.id) {
      const key = req.leaveType.toLowerCase() as keyof typeof MOCK_LEAVE_BALANCES;
      setLeaveBalances((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          used: Math.max(0, prev[key].used - req.days),
          remaining: prev[key].remaining + req.days,
        },
      }));
    }

    try {
      await authFetch('/api/leaves', {
        method: 'PATCH',
        body: { id, status, reviewerId: currentUser.id },
      });
      await refreshLeaveBalances(currentUser.id);
    } catch (err) {
      console.error('Failed to update leave status in database:', err);
    }
  };

  const submitHelpDeskTicket = async (ticket: Pick<HelpDeskTicket, 'category' | 'priority' | 'subject' | 'description'>): Promise<string> => {
    const tempId = `HR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const created: HelpDeskTicket = {
      ...ticket,
      id: tempId,
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      employeeCode: currentUser.employeeCode,
      status: 'Open',
      createdAt: new Date().toLocaleString('en-IN'),
    };
    setHelpDeskTickets((prev) => [created, ...prev]);

    try {
      const json = await authFetch<{ success: boolean; data?: any }>('/api/help-desk', {
        method: 'POST',
        body: {
          employeeId: currentUser.id,
          category: ticket.category,
          priority: ticket.priority,
          subject: ticket.subject,
          description: ticket.description,
        },
      });
      if (json?.success && json.data) {
        setHelpDeskTickets((prev) => prev.map((t) => t.id === tempId ? { ...t, id: json.data.id } : t));
        return json.data.id;
      }
    } catch (err) {
      console.error('Failed to save help desk ticket to database:', err);
    }
    return tempId;
  };

  const updateHelpDeskTicket = async (id: string, status: HelpDeskTicketStatus, resolution?: string) => {
    setHelpDeskTickets((prev) => prev.map((ticket) => ticket.id === id ? {
      ...ticket,
      status,
      resolution: resolution?.trim() || ticket.resolution,
      ...(status === 'Resolved' ? { resolvedAt: new Date().toLocaleString('en-IN') } : {}),
    } : ticket));

    try {
      await authFetch('/api/help-desk', {
        method: 'PATCH',
        body: {
          id,
          status,
          resolution: resolution?.trim(),
          resolvedById: currentUser.id,
        },
      });
    } catch (err) {
      console.error('Failed to update help desk ticket in database:', err);
    }
  };

  return (
    <HRMSContext.Provider
      value={{
        isAuthenticated,
        isAuthReady,
        currentUser,
        logout,
        employees,
        addEmployee,
        leaveRequests,
        leaveBalances,
        setLeaveBalances,
        attendanceLogs,
        isClockedIn,
        clockInTime,
        elapsedWorkTime,
        lateClockInRequests,
        lateClockInRequest,
        toggleClockIn,
        submitLateClockInRequest,
        reviewLateClockInRequest,
        addLeaveRequest,
        updateLeaveStatus,
        helpDeskTickets,
        submitHelpDeskTicket,
        updateHelpDeskTicket,
        selectedEmployee,
        setSelectedEmployee,
      }}
    >
      {children}
    </HRMSContext.Provider>
  );
};

export const useHRMS = () => {
  const context = useContext(HRMSContext);
  if (!context) throw new Error('useHRMS must be used within an HRMSProvider');
  return context;
};
