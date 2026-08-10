'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  MOCK_EMPLOYEES,
  INITIAL_LEAVE_REQUESTS,
  MOCK_ATTENDANCE_LOGS,
  MOCK_LEAVE_BALANCES,
  Employee,
  LeaveRequest,
  AttendanceRecord,
} from '@/data/mockData';

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

export type LoginResult =
  | { success: true }
  | { success: false; message: string };

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

export const DEMO_ACCOUNTS: Record<UserRole, UserAccount> = {
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

const AUTH_STORAGE_KEY = 'hrms-auth-role';
const HELP_DESK_STORAGE_KEY = 'hrms-help-desk-tickets';
const HELP_DESK_RESET_STORAGE_KEY = 'hrms-help-desk-reset-v1';
const LATE_REQUEST_STORAGE_KEY = 'hrms-late-clock-in-requests';
const LEAVE_REQUEST_STORAGE_KEY = 'hrms-leave-requests';
const PORTAL_START_MINUTES = 8 * 60;
const LATE_CLOCK_IN_MINUTES = 10 * 60;
const PORTAL_END_MINUTES = 18 * 60;
const ACCESS_DENIED_MESSAGE = 'Clock-in access denied. Attendance clock-in is available from 8:00 AM to 6:00 PM.';

const isUserRole = (value: string | null): value is UserRole =>
  value === 'employee' || value === 'manager' || value === 'admin';

interface HRMSContextType {
  isAuthenticated: boolean;
  isAuthReady: boolean;
  currentUser: UserAccount;
  login: (role: UserRole) => LoginResult;
  logout: () => void;
  employees: Employee[];
  addEmployee: (emp: Omit<Employee, 'id' | 'employeeCode'>) => void;
  leaveRequests: LeaveRequest[];
  leaveBalances: typeof MOCK_LEAVE_BALANCES;
  attendanceLogs: AttendanceRecord[];
  isClockedIn: boolean;
  clockInTime: string | null;
  elapsedWorkTime: string;
  lateClockInRequests: LateClockInRequest[];
  lateClockInRequest: LateClockInRequest | null;
  toggleClockIn: () => ClockActionResult;
  submitLateClockInRequest: (reason: string) => { success: boolean; message: string };
  reviewLateClockInRequest: (id: string, status: 'approved' | 'rejected') => void;
  addLeaveRequest: (newLeave: Omit<LeaveRequest, 'id' | 'employeeId' | 'employeeName' | 'employeeAvatar' | 'status' | 'appliedOn'>) => void;
  updateLeaveStatus: (id: string, status: 'Approved' | 'Rejected') => void;
  helpDeskTickets: HelpDeskTicket[];
  submitHelpDeskTicket: (ticket: Pick<HelpDeskTicket, 'category' | 'priority' | 'subject' | 'description'>) => string;
  updateHelpDeskTicket: (id: string, status: HelpDeskTicketStatus, resolution?: string) => void;
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

export const HRMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserAccount>(DEMO_ACCOUNTS.employee);
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(INITIAL_LEAVE_REQUESTS);
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

  useEffect(() => {
    try {
      const storedRole = window.localStorage.getItem(AUTH_STORAGE_KEY);
      const shouldResetHelpDesk = !window.localStorage.getItem(HELP_DESK_RESET_STORAGE_KEY);
      const storedTickets = shouldResetHelpDesk
        ? null
        : window.localStorage.getItem(HELP_DESK_STORAGE_KEY);
      const storedLateRequests = window.localStorage.getItem(LATE_REQUEST_STORAGE_KEY);
      const storedLeaveRequests = window.localStorage.getItem(LEAVE_REQUEST_STORAGE_KEY);
      if (isUserRole(storedRole)) {
        setCurrentUser(DEMO_ACCOUNTS[storedRole]);
        setIsAuthenticated(true);
      }
      if (shouldResetHelpDesk) {
        window.localStorage.removeItem(HELP_DESK_STORAGE_KEY);
        window.localStorage.setItem(HELP_DESK_RESET_STORAGE_KEY, 'completed');
      } else if (storedTickets) {
        setHelpDeskTickets(JSON.parse(storedTickets) as HelpDeskTicket[]);
      }
      if (storedLateRequests) {
        setLateClockInRequests(JSON.parse(storedLateRequests) as LateClockInRequest[]);
      }
      if (storedLeaveRequests) {
        setLeaveRequests(JSON.parse(storedLeaveRequests) as LeaveRequest[]);
      }
    } finally {
      setIsAuthReady(true);
    }
  }, []);

  const persistLateClockInRequests = (requests: LateClockInRequest[]) => {
    setLateClockInRequests(requests);
    window.localStorage.setItem(LATE_REQUEST_STORAGE_KEY, JSON.stringify(requests));
  };

  const finishClockOut = useCallback((date: Date) => {
    if (!clockInAt || !activeAttendanceId) return;
    const workedSeconds = Math.max(0, Math.floor((date.getTime() - clockInAt) / 1000));
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setAttendanceLogs((prev) => prev.map((log) => log.id === activeAttendanceId ? { ...log, checkOut: time, hoursWorked: formatWorkedHours(workedSeconds) } : log));
    setIsClockedIn(false);
    setClockInTime(null);
    setClockInAt(null);
    setActiveAttendanceId(null);
    setElapsedSeconds(0);
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
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(false);
  }, []);

  const elapsedWorkTime = formatElapsedWorkTime(elapsedSeconds);
  const login = (role: UserRole): LoginResult => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, role);
    setCurrentUser(DEMO_ACCOUNTS[role]);
    setIsAuthenticated(true);
    return { success: true };
  };

  const addEmployee = (empData: Omit<Employee, 'id' | 'employeeCode'>) => {
    const newEmployee: Employee = { ...empData, id: `EMP-${String(employees.length + 1).padStart(3, '0')}`, employeeCode: `EMP-2026-${Math.floor(100 + Math.random() * 900)}` };
    setEmployees((prev) => [newEmployee, ...prev]);
  };

  const startClockIn = (now: Date, status: AttendanceRecord['status'] = 'On Time') => {
    const nowTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const id = `ATT-${now.getTime()}`;
    const newLog: AttendanceRecord = { id, date: formatLocalDate(now), checkIn: nowTime, checkOut: 'In Progress', hoursWorked: '0h 0m', status, location: 'Office - HQ' };
    setAttendanceLogs((prev) => [newLog, ...prev]);
    setClockInTime(nowTime); setClockInAt(now.getTime()); setActiveAttendanceId(id); setElapsedSeconds(0); setIsClockedIn(true);
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

  const persistLeaveRequests = (requests: LeaveRequest[]) => {
    setLeaveRequests(requests);
    window.localStorage.setItem(LEAVE_REQUEST_STORAGE_KEY, JSON.stringify(requests));
  };

  const addLeaveRequest = (newLeave: Omit<LeaveRequest, 'id' | 'employeeId' | 'employeeName' | 'employeeAvatar' | 'status' | 'appliedOn'>) => {
    const created: LeaveRequest = { ...newLeave, id: `LR-${Date.now()}`, employeeId: currentUser.id, employeeName: currentUser.name, employeeAvatar: currentUser.avatar, status: 'Pending', appliedOn: formatLocalDate(new Date()) };
    persistLeaveRequests([created, ...leaveRequests]);
  };

  const updateLeaveStatus = (id: string, status: 'Approved' | 'Rejected') => {
    persistLeaveRequests(leaveRequests.map((request) => request.id === id ? { ...request, status } : request));
  };

  const persistHelpDeskTickets = (tickets: HelpDeskTicket[]) => {
    setHelpDeskTickets(tickets);
    window.localStorage.setItem(HELP_DESK_STORAGE_KEY, JSON.stringify(tickets));
  };

  const submitHelpDeskTicket = (ticket: Pick<HelpDeskTicket, 'category' | 'priority' | 'subject' | 'description'>) => {
    const id = `HR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const created: HelpDeskTicket = {
      ...ticket,
      id,
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      employeeCode: currentUser.employeeCode,
      status: 'Open',
      createdAt: new Date().toLocaleString('en-IN'),
    };
    persistHelpDeskTickets([created, ...helpDeskTickets]);
    return id;
  };

  const updateHelpDeskTicket = (id: string, status: HelpDeskTicketStatus, resolution?: string) => {
    const updated = helpDeskTickets.map((ticket) => ticket.id === id ? {
      ...ticket,
      status,
      resolution: resolution?.trim() || ticket.resolution,
      ...(status === 'Resolved' ? { resolvedAt: new Date().toLocaleString('en-IN') } : {}),
    } : ticket);
    persistHelpDeskTickets(updated);
  };

  return <HRMSContext.Provider value={{ isAuthenticated, isAuthReady, currentUser, login, logout, employees, addEmployee, leaveRequests, leaveBalances: MOCK_LEAVE_BALANCES, attendanceLogs, isClockedIn, clockInTime, elapsedWorkTime, lateClockInRequests, lateClockInRequest, toggleClockIn, submitLateClockInRequest, reviewLateClockInRequest, addLeaveRequest, updateLeaveStatus, helpDeskTickets, submitHelpDeskTicket, updateHelpDeskTicket, selectedEmployee, setSelectedEmployee }}>{children}</HRMSContext.Provider>;
};

export const useHRMS = () => {
  const context = useContext(HRMSContext);
  if (!context) throw new Error('useHRMS must be used within an HRMSProvider');
  return context;
};
