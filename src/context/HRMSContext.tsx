'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
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
    name: 'Sarah Jenkins',
    email: 'sarah.j@company.com',
    role: 'Senior Product Designer',
    userRole: 'employee',
    department: 'Design',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    employeeCode: 'EMP-2023-089',
  },
  manager: {
    id: 'EMP-002',
    name: 'Alex Rivera',
    email: 'alex.rivera@company.com',
    role: 'Engineering Manager',
    userRole: 'manager',
    department: 'Engineering',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    employeeCode: 'EMP-2019-012',
  },
  admin: {
    id: 'EMP-006',
    name: 'Elena Vance',
    email: 'elena.vance@company.com',
    role: 'VP of Human Resources',
    userRole: 'admin',
    department: 'Human Resources',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
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
  toggleClockIn: () => void;
  addLeaveRequest: (newLeave: Omit<LeaveRequest, 'id' | 'employeeId' | 'employeeName' | 'employeeAvatar' | 'status' | 'appliedOn'>) => void;
  updateLeaveStatus: (id: string, status: 'Approved' | 'Rejected') => void;
  selectedEmployee: Employee | null;
  setSelectedEmployee: (emp: Employee | null) => void;
}

const HRMSContext = createContext<HRMSContextType | undefined>(undefined);

export const HRMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [activeRole, setActiveRole] = useState<UserRole>('employee');
  const [currentUser, setCurrentUser] = useState<UserAccount>(DEMO_ACCOUNTS.employee);
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(INITIAL_LEAVE_REQUESTS);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>(MOCK_ATTENDANCE_LOGS);
  const [isClockedIn, setIsClockedIn] = useState<boolean>(true);
  const [clockInTime, setClockInTime] = useState<string | null>('09:02 AM');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const login = (role: UserRole) => {
    setActiveRole(role);
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
    if (isClockedIn) {
      setIsClockedIn(false);
      setClockInTime(null);
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setAttendanceLogs((prev) =>
        prev.map((log, index) =>
          index === 0 ? { ...log, checkOut: nowTime, hoursWorked: '8h 45m' } : log
        )
      );
    } else {
      setIsClockedIn(true);
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setClockInTime(nowTime);
      const todayStr = new Date().toISOString().split('T')[0];
      const newLog: AttendanceRecord = {
        id: `ATT-${Date.now()}`,
        date: todayStr,
        checkIn: nowTime,
        checkOut: 'In Progress',
        hoursWorked: '0h 01m',
        status: 'On Time',
        location: 'Office - HQ',
      };
      setAttendanceLogs((prev) => [newLog, ...prev]);
    }
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
