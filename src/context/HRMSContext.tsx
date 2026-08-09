'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  MOCK_EMPLOYEES,
  INITIAL_LEAVE_REQUESTS,
  MOCK_ATTENDANCE_LOGS,
  MOCK_LEAVE_BALANCES,
  MOCK_EXECUTIVE_ACTIONS,
  MOCK_COMPANY_HEALTH,
  MOCK_WORKFORCE_BUDGET,
  MOCK_EXECUTIVE_EVENTS,
  MOCK_POLICIES,
  TOTAL_HEADCOUNT,
  Employee,
  LeaveRequest,
  AttendanceRecord,
  ExecutiveActionItem,
  CompanyHealthMetrics,
  ExecutiveEvent,
  PolicyDocument,
} from '@/data/mockData';
import {
  UserRole,
  UserAccount,
  Task,
  TaskStatus,
  Deliverable,
  DeliverableStatus,
  DeliverableReview,
  AuditLogEntry,
  canAssignTask,
  canSubmitDeliverable,
  canReviewDeliverable,
  canApproveDeliverable,
  getAccessibleTasks,
  getAccessibleAssignees,
} from '@/utils/taskAuthorization';

export type { UserRole, UserAccount, Task, TaskStatus, Deliverable, DeliverableStatus, DeliverableReview, AuditLogEntry, LeaveRequest, AttendanceRecord };

// For backwards compatibility
export type TeamTask = Task;

export interface LateClockInRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  reason: string;
  requestTime: string;
  requestDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  employeeName: string;
  title: string;
  category: 'Identity' | 'Education' | 'Experience' | 'Tax & Finance' | 'Other';
  fileName: string;
  fileSize: string;
  uploadedOn: string;
  status: 'Verified' | 'Pending Review';
}

export interface DocumentRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  documentType: 'Salary Certificate' | 'Experience Letter' | 'Relieving Letter' | 'Bonafide Certificate' | 'Form 16' | 'Visa Support Letter';
  purpose: string;
  neededBy: string;
  appliedOn: string;
  status: 'Pending' | 'Approved' | 'Issued' | 'Rejected';
  remarks?: string;
}

export const DEMO_ACCOUNTS: Record<UserRole, UserAccount> = {
  employee: {
    id: 'EMP-001',
    name: 'Ayush Vishnoi',
    email: 'ayush.vishnoi@company.com',
    role: 'Software Engineer',
    userRole: 'employee',
    department: 'Engineering',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    employeeCode: 'EMP-2026-089',
  },
  team_lead: {
    id: 'EMP-003',
    name: 'Rahul Verma',
    email: 'rahul.verma@company.com',
    role: 'Frontend Team Lead',
    userRole: 'team_lead',
    department: 'Engineering',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    employeeCode: 'EMP-2020-045',
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
  ceo: {
    id: 'EMP-000',
    name: 'Rohan Kapoor',
    email: 'rohan.kapoor@company.com',
    role: 'Chief Executive Officer (CEO)',
    userRole: 'ceo',
    department: 'Executive Board',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    employeeCode: 'EMP-2015-001',
  },
};

export const INITIAL_TASKS: Task[] = [
  {
    id: 'TSK-101',
    title: 'Deploy ML Model Scoring Telemetry Dashboard',
    description: 'Set up real-time telemetry and error rate tracking for employee analytics models on the ESS portal.',
    department: 'Engineering',
    priority: 'High',
    deadline: '2026-08-15',
    expectedDeliverable: 'Grafana dashboard link, performance metrics report, and test coverage logs.',
    assignedTo: 'EMP-001',
    assignedToName: 'Ayush Vishnoi',
    assignedToRole: 'Software Engineer',
    assignedBy: 'Rahul Verma',
    assignedById: 'EMP-003',
    assignedByRole: 'team_lead',
    assignedDate: '2026-08-01',
    kraCategory: 'Product Engineering & ML Platform',
    ceoApprovalRequired: false,
    status: 'In Progress',
    deliverable: {
      id: 'DEL-101',
      taskId: 'TSK-101',
      submittedBy: 'EMP-001',
      submittedByName: 'Ayush Vishnoi',
      submittedAt: '',
      status: 'Not Submitted',
      notes: '',
      attachments: [],
      reviews: [],
      resubmissionCount: 0,
    },
    auditLogs: [
      {
        id: 'LOG-1',
        taskId: 'TSK-101',
        userId: 'EMP-003',
        userName: 'Rahul Verma',
        userRole: 'team_lead',
        action: 'Task Created & Assigned',
        previousStatus: 'None',
        newStatus: 'Pending',
        timestamp: '2026-08-01 09:30 AM',
        comments: 'Assigned sprint priority task to Ayush Vishnoi.',
      },
      {
        id: 'LOG-2',
        taskId: 'TSK-101',
        userId: 'EMP-001',
        userName: 'Ayush Vishnoi',
        userRole: 'employee',
        action: 'Status Updated',
        previousStatus: 'Pending',
        newStatus: 'In Progress',
        timestamp: '2026-08-02 10:15 AM',
        comments: 'Started development on telemetry pipeline.',
      },
    ],
  },
  {
    id: 'TSK-102',
    title: 'Design System Modal Accessibility Refactoring',
    description: 'Refactor all dialog modals to comply with WCAG 2.1 AA keyboard focus management and screen reader labels.',
    department: 'Engineering',
    priority: 'High',
    deadline: '2026-08-12',
    expectedDeliverable: 'Clean accessibility audit score sheet and PR with unit tests.',
    assignedTo: 'EMP-001',
    assignedToName: 'Ayush Vishnoi',
    assignedBy: 'Rahul Verma',
    assignedById: 'EMP-003',
    assignedByRole: 'team_lead',
    assignedDate: '2026-08-03',
    kraCategory: 'Design System & Accessibility',
    ceoApprovalRequired: false,
    status: 'Changes Requested',
    deliverable: {
      id: 'DEL-102',
      taskId: 'TSK-102',
      submittedBy: 'EMP-001',
      submittedByName: 'Ayush Vishnoi',
      submittedAt: '2026-08-06 04:20 PM',
      status: 'Changes Requested',
      notes: 'Implemented dialog focus trapping and aria-labels on 12 modal components.',
      attachments: [
        { id: 'ATT-1', name: 'WCAG_Audit_Initial_Report.pdf', size: '1.2 MB', uploadedAt: '2026-08-06 04:18 PM' },
      ],
      reviews: [
        {
          id: 'REV-1',
          reviewedBy: 'EMP-003',
          reviewedByName: 'Rahul Verma',
          reviewerRole: 'team_lead',
          action: 'Changes Requested',
          feedback: 'Great start! However, the ESC key dismissal is not handling focus return to the trigger button in the Attendance modal. Please fix and resubmit.',
          reviewedAt: '2026-08-07 11:30 AM',
        },
      ],
      resubmissionCount: 0,
    },
    auditLogs: [
      {
        id: 'LOG-3',
        taskId: 'TSK-102',
        userId: 'EMP-003',
        userName: 'Rahul Verma',
        userRole: 'team_lead',
        action: 'Task Assigned',
        previousStatus: 'None',
        newStatus: 'In Progress',
        timestamp: '2026-08-03 10:00 AM',
      },
      {
        id: 'LOG-4',
        taskId: 'TSK-102',
        userId: 'EMP-001',
        userName: 'Ayush Vishnoi',
        userRole: 'employee',
        action: 'Deliverable Submitted',
        previousStatus: 'In Progress',
        newStatus: 'Submitted',
        timestamp: '2026-08-06 04:20 PM',
        comments: 'Initial submission of WCAG audit and PR.',
      },
      {
        id: 'LOG-5',
        taskId: 'TSK-102',
        userId: 'EMP-003',
        userName: 'Rahul Verma',
        userRole: 'team_lead',
        action: 'Changes Requested',
        previousStatus: 'Submitted',
        newStatus: 'Changes Requested',
        timestamp: '2026-08-07 11:30 AM',
        comments: 'Requested fix for ESC key focus management.',
      },
    ],
  },
  {
    id: 'TSK-103',
    title: 'HRMS Automated Shift & 60-Min Grace Rule Engine',
    description: 'Implement backend business logic enforcing the 09:00 AM to 10:00 AM clock-in window with mandatory late justification.',
    department: 'Engineering',
    priority: 'Medium',
    deadline: '2026-08-08',
    expectedDeliverable: 'Full test suite validation and edge case verification report.',
    assignedTo: 'EMP-001',
    assignedToName: 'Ayush Vishnoi',
    assignedBy: 'Arjun Mehta',
    assignedById: 'EMP-002',
    assignedByRole: 'manager',
    assignedDate: '2026-07-25',
    kraCategory: 'System Reliability & Compliance',
    ceoApprovalRequired: false,
    status: 'Completed',
    deliverable: {
      id: 'DEL-103',
      taskId: 'TSK-103',
      submittedBy: 'EMP-001',
      submittedByName: 'Ayush Vishnoi',
      submittedAt: '2026-08-05 06:00 PM',
      status: 'Approved',
      notes: 'All shift duration logic, grace period calculations, and automated checkout routines verified.',
      attachments: [
        { id: 'ATT-2', name: 'Shift_Rule_Engine_Test_Results.pdf', size: '2.4 MB', uploadedAt: '2026-08-05 05:55 PM' },
      ],
      reviews: [
        {
          id: 'REV-2',
          reviewedBy: 'EMP-002',
          reviewedByName: 'Arjun Mehta',
          reviewerRole: 'manager',
          action: 'Approved',
          feedback: 'Thorough implementation and edge-case testing. Approved for production release.',
          reviewedAt: '2026-08-06 02:00 PM',
        },
      ],
      resubmissionCount: 0,
    },
    auditLogs: [
      {
        id: 'LOG-6',
        taskId: 'TSK-103',
        userId: 'EMP-002',
        userName: 'Arjun Mehta',
        userRole: 'manager',
        action: 'Task Assigned',
        previousStatus: 'None',
        newStatus: 'In Progress',
        timestamp: '2026-07-25 11:00 AM',
      },
      {
        id: 'LOG-7',
        taskId: 'TSK-103',
        userId: 'EMP-001',
        userName: 'Ayush Vishnoi',
        userRole: 'employee',
        action: 'Deliverable Submitted',
        previousStatus: 'In Progress',
        newStatus: 'Submitted',
        timestamp: '2026-08-05 06:00 PM',
      },
      {
        id: 'LOG-8',
        taskId: 'TSK-103',
        userId: 'EMP-002',
        userName: 'Arjun Mehta',
        userRole: 'manager',
        action: 'Deliverable Approved',
        previousStatus: 'Submitted',
        newStatus: 'Completed',
        timestamp: '2026-08-06 02:00 PM',
        comments: 'Task approved and closed.',
      },
    ],
  },
  {
    id: 'TSK-104',
    title: 'Executive Strategic Architecture Overhaul (CEO Approval Required)',
    description: 'Formulate the Q4 2026 Microservices Migration blueprint with zero-downtime database replication strategy.',
    department: 'Engineering',
    priority: 'High',
    deadline: '2026-08-25',
    expectedDeliverable: 'Executive technical architecture specification and multi-region deployment plan.',
    assignedTo: 'EMP-002',
    assignedToName: 'Arjun Mehta',
    assignedBy: 'Rohan Kapoor',
    assignedById: 'EMP-000',
    assignedByRole: 'ceo',
    assignedDate: '2026-08-02',
    kraCategory: 'Product Engineering & ML Platform',
    ceoApprovalRequired: true,
    status: 'Under Review',
    deliverable: {
      id: 'DEL-104',
      taskId: 'TSK-104',
      submittedBy: 'EMP-002',
      submittedByName: 'Arjun Mehta',
      submittedAt: '2026-08-08 03:30 PM',
      status: 'Under Review',
      notes: 'Submitted comprehensive architecture document with cost analysis and phased rollout schedule.',
      attachments: [
        { id: 'ATT-3', name: 'Q4_Microservices_Architecture_Spec.pdf', size: '4.8 MB', uploadedAt: '2026-08-08 03:25 PM' },
      ],
      reviews: [],
      resubmissionCount: 0,
    },
    auditLogs: [
      {
        id: 'LOG-9',
        taskId: 'TSK-104',
        userId: 'EMP-000',
        userName: 'Rohan Kapoor',
        userRole: 'ceo',
        action: 'Task Assigned with CEO Approval Required',
        previousStatus: 'None',
        newStatus: 'In Progress',
        timestamp: '2026-08-02 10:00 AM',
        comments: 'Mandatory executive sign-off required on final blueprint.',
      },
      {
        id: 'LOG-10',
        taskId: 'TSK-104',
        userId: 'EMP-002',
        userName: 'Arjun Mehta',
        userRole: 'manager',
        action: 'Deliverable Submitted',
        previousStatus: 'In Progress',
        newStatus: 'Under Review',
        timestamp: '2026-08-08 03:30 PM',
        comments: 'Awaiting CEO executive review.',
      },
    ],
  },
  {
    id: 'TSK-105',
    title: 'Q3 Enterprise Talent Acquisition & Pipeline Optimization',
    description: 'Streamline the recruitment turnaround from 24 days to 14 days for senior technical positions.',
    department: 'Human Resources',
    priority: 'High',
    deadline: '2026-08-22',
    expectedDeliverable: 'Recruitment velocity report and candidate NPS metrics.',
    assignedTo: 'EMP-004',
    assignedToName: 'Neha Iyer',
    assignedBy: 'Priya Sharma',
    assignedById: 'EMP-006',
    assignedByRole: 'manager',
    assignedDate: '2026-08-01',
    kraCategory: 'Talent Acquisition & Velocity',
    ceoApprovalRequired: false,
    status: 'In Progress',
    deliverable: {
      id: 'DEL-105',
      taskId: 'TSK-105',
      submittedBy: 'EMP-004',
      submittedByName: 'Neha Iyer',
      submittedAt: '',
      status: 'Not Submitted',
      notes: '',
      attachments: [],
      reviews: [],
      resubmissionCount: 0,
    },
    auditLogs: [
      {
        id: 'LOG-11',
        taskId: 'TSK-105',
        userId: 'EMP-006',
        userName: 'Priya Sharma',
        userRole: 'manager',
        action: 'Task Assigned',
        previousStatus: 'None',
        newStatus: 'In Progress',
        timestamp: '2026-08-01 11:30 AM',
      },
    ],
  },
];

export const INITIAL_DOCUMENTS: EmployeeDocument[] = [
  {
    id: 'DOC-001',
    employeeId: 'EMP-001',
    employeeName: 'Ayush Vishnoi',
    title: 'National Identity Proof (Aadhaar / Passport)',
    category: 'Identity',
    fileName: 'Identity_Proof_Aadhaar.pdf',
    fileSize: '1.8 MB',
    uploadedOn: '2026-03-16',
    status: 'Verified',
  },
  {
    id: 'DOC-002',
    employeeId: 'EMP-001',
    employeeName: 'Ayush Vishnoi',
    title: 'Degree Certificate - B.Tech Computer Science',
    category: 'Education',
    fileName: 'Degree_Certificate_BTech.pdf',
    fileSize: '2.3 MB',
    uploadedOn: '2026-03-16',
    status: 'Verified',
  },
  {
    id: 'DOC-003',
    employeeId: 'EMP-001',
    employeeName: 'Ayush Vishnoi',
    title: 'Form 16 Tax Certificate (FY 2025-26)',
    category: 'Tax & Finance',
    fileName: 'Form16_FY2025_2026.pdf',
    fileSize: '950 KB',
    uploadedOn: '2026-06-15',
    status: 'Verified',
  },
];

export const INITIAL_DOC_REQUESTS: DocumentRequest[] = [
  {
    id: 'REQ-501',
    employeeId: 'EMP-001',
    employeeName: 'Ayush Vishnoi',
    documentType: 'Salary Certificate',
    purpose: 'Housing Loan Application with HDFC Bank',
    neededBy: '2026-08-20',
    appliedOn: '2026-08-05',
    status: 'Approved',
  },
  {
    id: 'REQ-502',
    employeeId: 'EMP-001',
    employeeName: 'Ayush Vishnoi',
    documentType: 'Bonafide Certificate',
    purpose: 'Higher Studies Certification & Evening Program',
    neededBy: '2026-08-28',
    appliedOn: '2026-08-07',
    status: 'Pending',
  },
];

interface HRMSContextType {
  isAuthenticated: boolean;
  currentUser: UserAccount;
  login: (role: UserRole) => void;
  logout: () => void;
  employees: Employee[];
  addEmployee: (employee: Omit<Employee, 'id' | 'employeeCode'>) => void;
  leaveRequests: LeaveRequest[];
  leaveBalances: typeof MOCK_LEAVE_BALANCES;
  attendanceLogs: AttendanceRecord[];
  isClockedIn: boolean;
  clockInTime: string | null;
  elapsedWorkTime: string;
  toggleClockIn: () => void;
  addLeaveRequest: (
    leave: Omit<LeaveRequest, 'id' | 'employeeId' | 'employeeName' | 'employeeAvatar' | 'status' | 'appliedOn'>
  ) => void;
  updateLeaveStatus: (id: string, status: 'Approved' | 'Rejected') => void;
  selectedEmployee: Employee | null;
  setSelectedEmployee: (employee: Employee | null) => void;

  // Task & Deliverable Management
  tasks: Task[];
  createTask: (
    taskData: {
      title: string;
      description: string;
      department?: string;
      priority: 'High' | 'Medium' | 'Low';
      deadline: string;
      expectedDeliverable: string;
      assignedTo: string;
      kraCategory?: string;
      ceoApprovalRequired?: boolean;
    }
  ) => { success: boolean; message?: string };
  updateTaskStatus: (taskId: string, newStatus: TaskStatus, note?: string) => void;
  submitDeliverable: (
    taskId: string,
    data: {
      notes: string;
      attachments?: { name: string; size: string }[];
    }
  ) => { success: boolean; message?: string };
  reviewDeliverable: (
    taskId: string,
    data: {
      action: 'Approved' | 'Rejected' | 'Changes Requested';
      feedback: string;
    }
  ) => { success: boolean; message?: string };
  getTaskAuditLogs: (taskId: string) => AuditLogEntry[];

  // Legacy backwards compatibility
  assignTask: (taskData: {
    title: string;
    description: string;
    assignedTo: string;
    assignedToName: string;
    assignedBy: string;
    dueDate: string;
    priority: 'High' | 'Medium' | 'Low';
    kraCategory?: string;
  }) => void;
  completeTask: (taskId: string, completionNote?: string) => void;

  // Late Clock In
  lateClockInRequests: LateClockInRequest[];
  requestLateClockIn: (reason: string) => void;
  approveLateClockIn: (requestId: string) => void;

  // Documents
  documents: EmployeeDocument[];
  uploadDocument: (docData: Omit<EmployeeDocument, 'id' | 'employeeId' | 'employeeName' | 'uploadedOn' | 'status'>) => void;
  documentRequests: DocumentRequest[];
  requestDocument: (reqData: Omit<DocumentRequest, 'id' | 'employeeId' | 'employeeName' | 'appliedOn' | 'status'>) => void;
  updateDocumentRequestStatus: (id: string, status: DocumentRequest['status']) => void;

  // Executive Portal Command Center
  totalHeadcount: number;
  executiveActions: ExecutiveActionItem[];
  companyHealthScore: CompanyHealthMetrics;
  executiveEvents: ExecutiveEvent[];
  policies: PolicyDocument[];
  handleApproveAction: (actionId: string) => void;
  handleRejectAction: (actionId: string) => void;
  updatePolicyStatus: (policyId: string, status: PolicyDocument['status']) => void;
}

const HRMSContext = createContext<HRMSContextType | undefined>(undefined);

const formatWorkedHours = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
};

const formatElapsedWorkTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((val) => val.toString().padStart(2, '0'))
    .join(':');
};

export const HRMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserAccount>(DEMO_ACCOUNTS.employee);
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(INITIAL_LEAVE_REQUESTS);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>(MOCK_ATTENDANCE_LOGS);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Time tracker
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [clockInAt, setClockInAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Tasks & Deliverables
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [lateClockInRequests, setLateClockInRequests] = useState<LateClockInRequest[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>(INITIAL_DOCUMENTS);
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>(INITIAL_DOC_REQUESTS);

  useEffect(() => {
    if (!isClockedIn || clockInAt === null) {
      return;
    }

    const updateElapsedTime = () => {
      const currentSeconds = Math.max(0, Math.floor((Date.now() - clockInAt) / 1000));
      setElapsedSeconds(currentSeconds);

      // Automatic logout after 9 hours (32,400 seconds)
      if (currentSeconds >= 9 * 3600) {
        const now = new Date();
        const nowTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setAttendanceLogs((prev) =>
          prev.map((log, index) =>
            index === 0
              ? { ...log, checkOut: nowTime, hoursWorked: '9h 00m' }
              : log
          )
        );
        setIsClockedIn(false);
        setClockInTime(null);
        setClockInAt(null);
        setElapsedSeconds(0);
        setIsAuthenticated(false);
        alert('Your 9-hour work shift has completed. You have been automatically clocked out and logged out.');
      }
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

  // ---------------- TASK & DELIVERABLE ACTIONS ---------------- //

  const createTask = (taskData: {
    title: string;
    description: string;
    department?: string;
    priority: 'High' | 'Medium' | 'Low';
    deadline: string;
    expectedDeliverable: string;
    assignedTo: string;
    kraCategory?: string;
    ceoApprovalRequired?: boolean;
  }) => {
    // Verify assignment authorization
    if (!canAssignTask(currentUser, taskData.assignedTo, employees)) {
      return { success: false, message: 'Unauthorized: You do not have permission to assign tasks to this employee.' };
    }

    const targetEmp = employees.find((e) => e.id === taskData.assignedTo);
    if (!targetEmp) {
      return { success: false, message: 'Target employee not found.' };
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = `${todayStr} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const newTaskId = `TSK-${Date.now().toString().slice(-4)}`;

    const initialAudit: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      taskId: newTaskId,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.userRole,
      action: taskData.ceoApprovalRequired ? 'Task Assigned (CEO Approval Required)' : 'Task Created & Assigned',
      previousStatus: 'None',
      newStatus: 'In Progress',
      timestamp: timeStr,
      comments: `Assigned by ${currentUser.name} (${currentUser.role}) to ${targetEmp.name}. Expected: ${taskData.expectedDeliverable}`,
    };

    const newTask: Task = {
      id: newTaskId,
      title: taskData.title,
      description: taskData.description,
      department: taskData.department || targetEmp.department,
      priority: taskData.priority,
      deadline: taskData.deadline,
      expectedDeliverable: taskData.expectedDeliverable,
      assignedTo: targetEmp.id,
      assignedToName: targetEmp.name,
      assignedToRole: targetEmp.role,
      assignedBy: currentUser.name,
      assignedById: currentUser.id,
      assignedByRole: currentUser.userRole,
      assignedDate: todayStr,
      kraCategory: taskData.kraCategory || 'Product Engineering & Operations',
      ceoApprovalRequired: !!taskData.ceoApprovalRequired,
      status: 'In Progress',
      deliverable: {
        id: `DEL-${Date.now().toString().slice(-4)}`,
        taskId: newTaskId,
        submittedBy: targetEmp.id,
        submittedByName: targetEmp.name,
        submittedAt: '',
        status: 'Not Submitted',
        notes: '',
        attachments: [],
        reviews: [],
        resubmissionCount: 0,
      },
      auditLogs: [initialAudit],
    };

    setTasks((prev) => [newTask, ...prev]);
    return { success: true };
  };

  const updateTaskStatus = (taskId: string, newStatus: TaskStatus, note?: string) => {
    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;

        const audit: AuditLogEntry = {
          id: `LOG-${Date.now()}`,
          taskId: t.id,
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.userRole,
          action: 'Task Status Updated',
          previousStatus: t.status,
          newStatus: newStatus,
          timestamp: timeStr,
          comments: note || `Status transitioned to ${newStatus}.`,
        };

        return {
          ...t,
          status: newStatus,
          auditLogs: [audit, ...t.auditLogs],
        };
      })
    );
  };

  const submitDeliverable = (
    taskId: string,
    data: {
      notes: string;
      attachments?: { name: string; size: string }[];
    }
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return { success: false, message: 'Task not found.' };

    if (!canSubmitDeliverable(currentUser, task)) {
      return { success: false, message: 'Unauthorized: Only the assigned employee can submit deliverables for active tasks.' };
    }

    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const isResubmission = task.status === 'Changes Requested';

    const newAttachments = (data.attachments || []).map((att, idx) => ({
      id: `ATT-${Date.now()}-${idx}`,
      name: att.name,
      size: att.size,
      uploadedAt: timeStr,
    }));

    const audit: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      taskId,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.userRole,
      action: isResubmission ? 'Deliverable Resubmitted' : 'Deliverable Submitted',
      previousStatus: task.status,
      newStatus: 'Under Review',
      timestamp: timeStr,
      comments: data.notes,
    };

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;

        const currentDel = t.deliverable || {
          id: `DEL-${Date.now()}`,
          taskId,
          submittedBy: currentUser.id,
          submittedByName: currentUser.name,
          submittedAt: timeStr,
          status: 'Under Review',
          notes: data.notes,
          attachments: newAttachments,
          reviews: [],
          resubmissionCount: 0,
        };

        const updatedDeliverable: Deliverable = {
          ...currentDel,
          submittedAt: timeStr,
          status: isResubmission ? 'Resubmitted' : 'Under Review',
          notes: data.notes,
          attachments: [...newAttachments, ...currentDel.attachments],
          resubmissionCount: isResubmission ? currentDel.resubmissionCount + 1 : currentDel.resubmissionCount,
        };

        return {
          ...t,
          status: 'Under Review',
          deliverable: updatedDeliverable,
          auditLogs: [audit, ...t.auditLogs],
        };
      })
    );

    return { success: true };
  };

  const reviewDeliverable = (
    taskId: string,
    data: {
      action: 'Approved' | 'Rejected' | 'Changes Requested';
      feedback: string;
    }
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return { success: false, message: 'Task not found.' };

    if (!canReviewDeliverable(currentUser, task, employees)) {
      return { success: false, message: 'Unauthorized: You do not have permission to review this deliverable.' };
    }

    if (data.action === 'Approved' && !canApproveDeliverable(currentUser, task, employees)) {
      return {
        success: false,
        message: 'CEO Approval Required: This task is flagged for mandatory CEO sign-off before final approval.',
      };
    }

    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    let newStatus: TaskStatus = 'Under Review';
    let newDelStatus: DeliverableStatus = 'Under Review';

    if (data.action === 'Approved') {
      newStatus = 'Completed';
      newDelStatus = 'Approved';
    } else if (data.action === 'Rejected') {
      newStatus = 'Completed';
      newDelStatus = 'Rejected';
    } else if (data.action === 'Changes Requested') {
      newStatus = 'Changes Requested';
      newDelStatus = 'Changes Requested';
    }

    const newReview: DeliverableReview = {
      id: `REV-${Date.now()}`,
      reviewedBy: currentUser.id,
      reviewedByName: currentUser.name,
      reviewerRole: currentUser.userRole,
      action: data.action,
      feedback: data.feedback,
      reviewedAt: timeStr,
    };

    const audit: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      taskId,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.userRole,
      action: `Deliverable Review: ${data.action}`,
      previousStatus: task.status,
      newStatus,
      timestamp: timeStr,
      comments: data.feedback,
    };

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;

        const currentDel = t.deliverable || {
          id: `DEL-${Date.now()}`,
          taskId,
          submittedBy: t.assignedTo,
          submittedByName: t.assignedToName,
          submittedAt: timeStr,
          status: newDelStatus,
          notes: '',
          attachments: [],
          reviews: [],
          resubmissionCount: 0,
        };

        const updatedDeliverable: Deliverable = {
          ...currentDel,
          status: newDelStatus,
          reviews: [newReview, ...currentDel.reviews],
        };

        return {
          ...t,
          status: newStatus,
          deliverable: updatedDeliverable,
          auditLogs: [audit, ...t.auditLogs],
        };
      })
    );

    return { success: true };
  };

  const getTaskAuditLogs = (taskId: string): AuditLogEntry[] => {
    const task = tasks.find((t) => t.id === taskId);
    return task ? task.auditLogs : [];
  };

  // Backwards compatibility wrappers
  const assignTask = (taskData: {
    title: string;
    description: string;
    assignedTo: string;
    assignedToName: string;
    assignedBy: string;
    dueDate: string;
    priority: 'High' | 'Medium' | 'Low';
    kraCategory?: string;
  }) => {
    createTask({
      title: taskData.title,
      description: taskData.description,
      deadline: taskData.dueDate,
      priority: taskData.priority,
      expectedDeliverable: 'Verification and delivery of expected output artifacts.',
      assignedTo: taskData.assignedTo,
      kraCategory: taskData.kraCategory,
    });
  };

  const completeTask = (taskId: string, completionNote?: string) => {
    submitDeliverable(taskId, {
      notes: completionNote || 'Completed work deliverable submitted for review.',
      attachments: [{ name: 'Deliverable_Summary.pdf', size: '1.1 MB' }],
    });
  };

  // Late clock in actions
  const requestLateClockIn = (reason: string) => {
    const now = new Date();
    const newReq: LateClockInRequest = {
      id: `LATE-${Date.now()}`,
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      employeeAvatar: currentUser.avatar,
      reason,
      requestTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      requestDate: now.toISOString().split('T')[0],
      status: 'Pending',
    };
    setLateClockInRequests((prev) => [newReq, ...prev]);
  };

  const approveLateClockIn = (requestId: string) => {
    setLateClockInRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'Approved' } : r))
    );
  };

  // Document actions
  const uploadDocument = (docData: Omit<EmployeeDocument, 'id' | 'employeeId' | 'employeeName' | 'uploadedOn' | 'status'>) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newDoc: EmployeeDocument = {
      ...docData,
      id: `DOC-${Date.now()}`,
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      uploadedOn: todayStr,
      status: 'Pending Review',
    };
    setDocuments((prev) => [newDoc, ...prev]);
  };

  const requestDocument = (reqData: Omit<DocumentRequest, 'id' | 'employeeId' | 'employeeName' | 'appliedOn' | 'status'>) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newReq: DocumentRequest = {
      ...reqData,
      id: `REQ-${Date.now()}`,
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      appliedOn: todayStr,
      status: 'Pending',
    };
    setDocumentRequests((prev) => [newReq, ...prev]);
  };

  const updateDocumentRequestStatus = (id: string, status: DocumentRequest['status']) => {
    setDocumentRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
  };

  // Executive Portal Command Center state & methods
  const [executiveActions, setExecutiveActions] = useState<ExecutiveActionItem[]>(MOCK_EXECUTIVE_ACTIONS);
  const [companyHealthScore] = useState<CompanyHealthMetrics>(MOCK_COMPANY_HEALTH);
  const [executiveEvents] = useState<ExecutiveEvent[]>(MOCK_EXECUTIVE_EVENTS);
  const [policies, setPolicies] = useState<PolicyDocument[]>(MOCK_POLICIES);

  const handleApproveAction = (actionId: string) => {
    setExecutiveActions((prev) => prev.filter((act) => act.id !== actionId));
  };

  const handleRejectAction = (actionId: string) => {
    setExecutiveActions((prev) => prev.filter((act) => act.id !== actionId));
  };

  const updatePolicyStatus = (policyId: string, status: PolicyDocument['status']) => {
    setPolicies((prev) =>
      prev.map((pol) => (pol.id === policyId ? { ...pol, status, lastUpdated: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) } : pol))
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
        tasks,
        createTask,
        updateTaskStatus,
        submitDeliverable,
        reviewDeliverable,
        getTaskAuditLogs,
        assignTask,
        completeTask,
        lateClockInRequests,
        requestLateClockIn,
        approveLateClockIn,
        documents,
        uploadDocument,
        documentRequests,
        requestDocument,
        updateDocumentRequestStatus,
        totalHeadcount: TOTAL_HEADCOUNT,
        executiveActions,
        companyHealthScore,
        executiveEvents,
        policies,
        handleApproveAction,
        handleRejectAction,
        updatePolicyStatus,
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
