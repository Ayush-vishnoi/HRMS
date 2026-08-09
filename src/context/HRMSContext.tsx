'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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

export interface LateClockInRequest {
  status: LateClockInRequestStatus;
  reason: string;
  requestedAt: string;
}

export type ClockActionResult =
  | { status: 'clocked-in' }
  | { status: 'clocked-out' }
  | { status: 'permission-required' }
  | { status: 'permission-pending' }
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

const isUserRole = (value: string | null): value is UserRole =>
  value === 'employee' || value === 'manager' || value === 'admin';

interface HRMSContextType {
  isAuthenticated: boolean;
  isAuthReady: boolean;
  currentUser: UserAccount;
  login: (role: UserRole) => void;
  logout: () => void;
  employees: Employee[];
  addEmployee: (emp: Omit<Employee, 'id' | 'employeeCode'>) => void;
  leaveRequests: LeaveRequest[];
  leaveBalances: typeof MOCK_LEAVE_BALANCES;
  attendanceLogs: AttendanceRecord[];
  isClockedIn: boolean;
  clockInTime: string | null;
  elapsedWorkTime: string;
  lateClockInRequest: LateClockInRequest | null;
  toggleClockIn: () => ClockActionResult;
  submitLateClockInRequest: (reason: string) => { success: boolean; message: string };
  addLeaveRequest: (newLeave: Omit<LeaveRequest, 'id' | 'employeeId' | 'employeeName' | 'employeeAvatar' | 'status' | 'appliedOn'>) => void;
  updateLeaveStatus: (id: string, status: 'Approved' | 'Rejected') => void;
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
  const [lateClockInRequest, setLateClockInRequest] = useState<LateClockInRequest | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    try {
      const storedRole = window.localStorage.getItem(AUTH_STORAGE_KEY);
      if (isUserRole(storedRole)) {
        setCurrentUser(DEMO_ACCOUNTS[storedRole]);
        setIsAuthenticated(true);
      }
    } finally {
      setIsAuthReady(true);
    }
  }, []);

  const finishClockOut = (date: Date, automatic = false) => {
    if (!clockInAt || !activeAttendanceId) return;
    const workedSeconds = Math.max(0, Math.floor((date.getTime() - clockInAt) / 1000));
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setAttendanceLogs((prev) => prev.map((log) => log.id === activeAttendanceId ? { ...log, checkOut: time, hoursWorked: formatWorkedHours(workedSeconds), ...(automatic ? { status: 'On Time' as const } : {}) } : log));
    setIsClockedIn(false);
    setClockInTime(null);
    setClockInAt(null);
    setActiveAttendanceId(null);
    setElapsedSeconds(0);
  };

  useEffect(() => {
    if (!isClockedIn || clockInAt === null) return;
    const updateElapsedTime = () => {
      const now = new Date();
      const shiftEnd = new Date(now);
      shiftEnd.setHours(18, 0, 0, 0);
      if (now.getTime() >= shiftEnd.getTime()) {
        finishClockOut(shiftEnd, true);
        return;
      }
      setElapsedSeconds(Math.max(0, Math.floor((now.getTime() - clockInAt) / 1000)));
    };
    updateElapsedTime();
    const intervalId = window.setInterval(updateElapsedTime, 1000);
    return () => window.clearInterval(intervalId);
  }, [clockInAt, isClockedIn]);

  const elapsedWorkTime = formatElapsedWorkTime(elapsedSeconds);
  const login = (role: UserRole) => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, role);
    setCurrentUser(DEMO_ACCOUNTS[role]);
    setIsAuthenticated(true);
  };
  const logout = () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(false);
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
    const minutes = now.getHours() * 60 + now.getMinutes();
    if (minutes < 9 * 60 || minutes >= 10 * 60) {
      if (lateClockInRequest?.status === 'pending') return { status: 'permission-pending' };
      return { status: 'permission-required' };
    }
    startClockIn(now);
    return { status: 'clocked-in' };
  };

  const submitLateClockInRequest = (reason: string) => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) return { success: false, message: 'A reason is required before sending the HR permission request.' };
    if (lateClockInRequest?.status === 'pending') return { success: false, message: 'Your late clock-in request is already pending with HR.' };
    setLateClockInRequest({ status: 'pending', reason: trimmedReason, requestedAt: new Date().toLocaleString() });
    return { success: true, message: 'Permission request sent to HR. Clock-in will be available after approval.' };
  };

  const addLeaveRequest = (newLeave: Omit<LeaveRequest, 'id' | 'employeeId' | 'employeeName' | 'employeeAvatar' | 'status' | 'appliedOn'>) => {
    const created: LeaveRequest = { ...newLeave, id: `LR-${Date.now()}`, employeeId: currentUser.id, employeeName: currentUser.name, employeeAvatar: currentUser.avatar, status: 'Pending', appliedOn: formatLocalDate(new Date()) };
    setLeaveRequests((prev) => [created, ...prev]);
  };
  const updateLeaveStatus = (id: string, status: 'Approved' | 'Rejected') => setLeaveRequests((prev) => prev.map((req) => req.id === id ? { ...req, status } : req));

  return <HRMSContext.Provider value={{ isAuthenticated, isAuthReady, currentUser, login, logout, employees, addEmployee, leaveRequests, leaveBalances: MOCK_LEAVE_BALANCES, attendanceLogs, isClockedIn, clockInTime, elapsedWorkTime, lateClockInRequest, toggleClockIn, submitLateClockInRequest, addLeaveRequest, updateLeaveStatus, selectedEmployee, setSelectedEmployee }}>{children}</HRMSContext.Provider>;
};

export const useHRMS = () => {
  const context = useContext(HRMSContext);
  if (!context) throw new Error('useHRMS must be used within an HRMSProvider');
  return context;
};
