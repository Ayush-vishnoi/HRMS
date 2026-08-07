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
    id: 'EMP-001',
    name: 'Ayush Vishnoi',
    email: 'ayush.vishnoi@company.com',
    role: 'AI/ML Intern Developer',
    userRole: 'employee',
    department: 'AI/ML',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    employeeCode: 'EMP-2026-089',
  },
  manager: {
    id: 'EMP-002',
    name: 'Arjun Mehta',
    email: 'arjun.mehta@company.com',
    role: 'Engineering Manager',
    userRole: 'manager',
    department: 'Engineering',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    employeeCode: 'EMP-2019-012',
  },
  admin: {
    id: 'EMP-006',
    name: 'Priya Sharma',
    email: 'priya.sharma@company.com',
    role: 'Head of Human Resources',
    userRole: 'admin',
    department: 'Human Resources',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    employeeCode: 'EMP-2017-003',
  },
};

interface HRMSContextType {
  isAuthenticated: boolean;
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
  toggleClockIn: () => void;
  addLeaveRequest: (newLeave: Omit<LeaveRequest, 'id' | 'employeeId' | 'employeeName' | 'employeeAvatar' | 'status' | 'appliedOn'>) => void;
  updateLeaveStatus: (id: string, status: 'Approved' | 'Rejected') => void;
  selectedEmployee: Employee | null;
  setSelectedEmployee: (emp: Employee | null) => void;
}

const HRMSContext = createContext<HRMSContextType | undefined>(undefined);

const formatElapsedWorkTime = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const formatWorkedHours = (totalSeconds: number) => {
  const hours = Math.floor(Math.max(0, totalSeconds) / 3600);
  const minutes = Math.floor((Math.max(0, totalSeconds) % 3600) / 60);

  return `${hours}h ${minutes}m`;
};

export const HRMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserAccount>(DEMO_ACCOUNTS.employee);
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(INITIAL_LEAVE_REQUESTS);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>(MOCK_ATTENDANCE_LOGS);
  const [isClockedIn, setIsClockedIn] = useState<boolean>(false);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [clockInAt, setClockInAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    if (!isClockedIn || clockInAt === null) {
      return;
    }

    const updateElapsedTime = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - clockInAt) / 1000)));
    };

    const intervalId = window.setInterval(updateElapsedTime, 1000);
    return () => window.clearInterval(intervalId);
  }, [clockInAt, isClockedIn]);

  const elapsedWorkTime = formatElapsedWorkTime(elapsedSeconds);

  const login = (role: UserRole) => {
    setCurrentUser(DEMO_ACCOUNTS[role]);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  const addEmployee = (empData: Omit<Employee, 'id' | 'employeeCode'>) => {
    const newId = `EMP-${String(employees.length + 1).padStart(3, '0')}`;
    const code = `EMP-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newEmployee: Employee = {
      ...empData,
      id: newId,
      employeeCode: code,
    };
    setEmployees((prev) => [newEmployee, ...prev]);
  };

  const toggleClockIn = () => {
    const now = new Date();
    const nowTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isClockedIn && clockInAt !== null) {
      const workedSeconds = Math.max(0, Math.floor((now.getTime() - clockInAt) / 1000));
      setAttendanceLogs((prev) =>
        prev.map((log, index) =>
          index === 0
            ? { ...log, checkOut: nowTime, hoursWorked: formatWorkedHours(workedSeconds) }
            : log
        )
      );
      setIsClockedIn(false);
      setClockInTime(null);
      setClockInAt(null);
      setElapsedSeconds(0);
      return;
    }

    const todayStr = now.toISOString().split('T')[0];
    const newLog: AttendanceRecord = {
      id: `ATT-${now.getTime()}`,
      date: todayStr,
      checkIn: nowTime,
      checkOut: 'In Progress',
      hoursWorked: '0h 0m',
      status: 'On Time',
      location: 'Office - HQ',
    };

    setAttendanceLogs((prev) => [newLog, ...prev]);
    setClockInTime(nowTime);
    setClockInAt(now.getTime());
    setElapsedSeconds(0);
    setIsClockedIn(true);
  };

  const addLeaveRequest = (
    newLeave: Omit<LeaveRequest, 'id' | 'employeeId' | 'employeeName' | 'employeeAvatar' | 'status' | 'appliedOn'>
  ) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const created: LeaveRequest = {
      ...newLeave,
      id: `LR-${Date.now()}`,
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      employeeAvatar: currentUser.avatar,
      status: 'Pending',
      appliedOn: todayStr,
    };
    setLeaveRequests((prev) => [created, ...prev]);
  };

  const updateLeaveStatus = (id: string, status: 'Approved' | 'Rejected') => {
    setLeaveRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status } : req))
    );
  };

  return (
    <HRMSContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        login,
        logout,
        employees,
        addEmployee,
        leaveRequests,
        leaveBalances: MOCK_LEAVE_BALANCES,
        attendanceLogs,
        isClockedIn,
        clockInTime,
        elapsedWorkTime,
        toggleClockIn,
        addLeaveRequest,
        updateLeaveStatus,
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
  if (!context) {
    throw new Error('useHRMS must be used within an HRMSProvider');
  }
  return context;
};
