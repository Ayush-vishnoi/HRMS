export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  avatar: string;
  status: 'Active' | 'On Leave' | 'Remote';
  joinDate: string;
  location: string;
  salary: number;
  manager: string;
  employeeCode: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  leaveType: 'Casual' | 'Sick' | 'Earned' | 'WFH';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  appliedOn: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hoursWorked: string;
  status: 'On Time' | 'Late' | 'Half Day' | 'Absent' | 'On Leave';
  location: string;
}

export interface GoalOKR {
  id: string;
  title: string;
  category: string;
  progress: number; // 0 to 100
  dueDate: string;
  status: 'In Progress' | 'Completed' | 'At Risk';
  quarter: string;
}

export interface Payslip {
  id: string;
  monthYear: string;
  basicSalary: number;
  hra: number;
  conveyance: number;
  specialAllowance: number;
  pfDeduction: number;
  taxDeduction: number;
  grossEarnings: number;
  totalDeductions: number;
  netPayable: number;
  paymentDate: string;
  status: 'Paid' | 'Processing';
}

export const CURRENT_USER = {
  id: 'EMP-001',
  name: 'Sarah Jenkins',
  role: 'Senior Product Designer',
  department: 'Design',
  email: 'sarah.j@company.com',
  phone: '+1 (555) 234-5678',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  employeeCode: 'EMP-2023-089',
  joinDate: '15 March 2021',
  location: 'San Francisco, CA',
  salary: 115000,
  manager: 'Alex Rivera',
};

export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'EMP-001',
    name: 'Sarah Jenkins',
    role: 'Senior Product Designer',
    department: 'Design',
    email: 'sarah.j@company.com',
    phone: '+1 (555) 234-5678',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    status: 'Active',
    joinDate: '15 Mar 2021',
    location: 'San Francisco, CA',
    salary: 115000,
    manager: 'Alex Rivera',
    employeeCode: 'EMP-2023-089',
  },
  {
    id: 'EMP-002',
    name: 'Alex Rivera',
    role: 'Engineering Manager',
    department: 'Engineering',
    email: 'alex.rivera@company.com',
    phone: '+1 (555) 345-6789',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    status: 'Active',
    joinDate: '10 Jan 2019',
    location: 'New York, NY',
    salary: 145000,
    manager: 'Elena Vance',
    employeeCode: 'EMP-2019-012',
  },
  {
    id: 'EMP-003',
    name: 'David Chen',
    role: 'Staff Frontend Engineer',
    department: 'Engineering',
    email: 'david.chen@company.com',
    phone: '+1 (555) 456-7890',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    status: 'Active',
    joinDate: '01 Feb 2020',
    location: 'Remote, CA',
    salary: 135000,
    manager: 'Alex Rivera',
    employeeCode: 'EMP-2020-045',
  },
  {
    id: 'EMP-004',
    name: 'Priya Sharma',
    role: 'Lead HR Operations',
    department: 'Human Resources',
    email: 'priya.s@company.com',
    phone: '+1 (555) 567-8901',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    status: 'Active',
    joinDate: '12 Sep 2021',
    location: 'Austin, TX',
    salary: 98000,
    manager: 'Elena Vance',
    employeeCode: 'EMP-2021-112',
  },
  {
    id: 'EMP-005',
    name: 'Marcus Vance',
    role: 'Senior Backend Developer',
    department: 'Engineering',
    email: 'marcus.v@company.com',
    phone: '+1 (555) 678-9012',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    status: 'Remote',
    joinDate: '18 Nov 2022',
    location: 'Seattle, WA',
    salary: 125000,
    manager: 'Alex Rivera',
    employeeCode: 'EMP-2022-156',
  },
  {
    id: 'EMP-006',
    name: 'Elena Vance',
    role: 'VP of Human Resources',
    department: 'Human Resources',
    email: 'elena.vance@company.com',
    phone: '+1 (555) 789-0123',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    status: 'Active',
    joinDate: '01 Jun 2017',
    location: 'San Francisco, CA',
    salary: 175000,
    manager: 'CEO Office',
    employeeCode: 'EMP-2017-003',
  },
  {
    id: 'EMP-007',
    name: 'Jessica Taylor',
    role: 'Product Marketing Manager',
    department: 'Marketing',
    email: 'jessica.t@company.com',
    phone: '+1 (555) 890-1234',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    status: 'On Leave',
    joinDate: '04 Apr 2022',
    location: 'Chicago, IL',
    salary: 108000,
    manager: 'Michael Ross',
    employeeCode: 'EMP-2022-132',
  },
  {
    id: 'EMP-008',
    name: 'Robert Martinez',
    role: 'Financial Analyst',
    department: 'Finance',
    email: 'robert.m@company.com',
    phone: '+1 (555) 901-2345',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    status: 'Active',
    joinDate: '22 Aug 2023',
    location: 'New York, NY',
    salary: 92000,
    manager: 'Samantha Wu',
    employeeCode: 'EMP-2023-201',
  }
];

export const MOCK_LEAVE_BALANCES = {
  casual: { total: 12, used: 4, remaining: 8 },
  sick: { total: 10, used: 1, remaining: 9 },
  earned: { total: 20, used: 5, remaining: 15 },
  wfh: { total: 12, used: 8, remaining: 4 },
};

export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: 'LR-101',
    employeeId: 'EMP-007',
    employeeName: 'Jessica Taylor',
    employeeAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    leaveType: 'Earned',
    startDate: '2026-08-10',
    endDate: '2026-08-14',
    days: 5,
    reason: 'Annual family vacation trip to Hawaii',
    status: 'Pending',
    appliedOn: '2026-08-04',
  },
  {
    id: 'LR-102',
    employeeId: 'EMP-003',
    employeeName: 'David Chen',
    employeeAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    leaveType: 'Sick',
    startDate: '2026-08-07',
    endDate: '2026-08-07',
    days: 1,
    reason: 'Dental appointment & wisdom tooth recovery',
    status: 'Pending',
    appliedOn: '2026-08-05',
  },
  {
    id: 'LR-103',
    employeeId: 'EMP-001',
    employeeName: 'Sarah Jenkins',
    employeeAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    leaveType: 'Casual',
    startDate: '2026-07-20',
    endDate: '2026-07-21',
    days: 2,
    reason: 'Personal home relocation work',
    status: 'Approved',
    appliedOn: '2026-07-15',
  },
  {
    id: 'LR-104',
    employeeId: 'EMP-005',
    employeeName: 'Marcus Vance',
    employeeAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    leaveType: 'WFH',
    startDate: '2026-08-01',
    endDate: '2026-08-02',
    days: 2,
    reason: 'Internet upgrade & maintenance at residence',
    status: 'Approved',
    appliedOn: '2026-07-28',
  },
];

export const MOCK_ATTENDANCE_LOGS: AttendanceRecord[] = [
  { id: 'ATT-001', date: '2026-08-06', checkIn: '09:02 AM', checkOut: 'In Progress', hoursWorked: '7h 20m', status: 'On Time', location: 'Office - HQ' },
  { id: 'ATT-002', date: '2026-08-05', checkIn: '09:00 AM', checkOut: '06:15 PM', hoursWorked: '9h 15m', status: 'On Time', location: 'Office - HQ' },
  { id: 'ATT-003', date: '2026-08-04', checkIn: '09:35 AM', checkOut: '06:30 PM', hoursWorked: '8h 55m', status: 'Late', location: 'Office - HQ' },
  { id: 'ATT-004', date: '2026-08-03', checkIn: '08:55 AM', checkOut: '05:45 PM', hoursWorked: '8h 50m', status: 'On Time', location: 'Remote WFH' },
  { id: 'ATT-005', date: '2026-07-31', checkIn: '09:10 AM', checkOut: '06:00 PM', hoursWorked: '8h 50m', status: 'On Time', location: 'Office - HQ' },
  { id: 'ATT-006', date: '2026-07-30', checkIn: '09:05 AM', checkOut: '01:30 PM', hoursWorked: '4h 25m', status: 'Half Day', location: 'Office - HQ' },
];

export const MOCK_OKRS: GoalOKR[] = [
  { id: 'OKR-1', title: 'Complete HRMS Dashboard Redesign & Design System', category: 'Design', progress: 85, dueDate: '2026-09-30', status: 'In Progress', quarter: 'Q3 2026' },
  { id: 'OKR-2', title: 'Migrate Core Authentication to OAuth2 / SAML SSO', category: 'Engineering', progress: 100, dueDate: '2026-08-15', status: 'Completed', quarter: 'Q3 2026' },
  { id: 'OKR-3', title: 'Hire 3 Senior Frontend & 2 DevOps Engineers', category: 'Recruitment', progress: 60, dueDate: '2026-09-15', status: 'In Progress', quarter: 'Q3 2026' },
  { id: 'OKR-4', title: 'Reduce Employee Onboarding Time from 5 Days to 2 Days', category: 'HR Ops', progress: 40, dueDate: '2026-10-01', status: 'At Risk', quarter: 'Q3 2026' },
];

export const MOCK_PAYSLIPS: Payslip[] = [
  {
    id: 'PAY-2026-07',
    monthYear: 'July 2026',
    basicSalary: 55000,
    hra: 22000,
    conveyance: 5000,
    specialAllowance: 13833,
    pfDeduction: 6600,
    taxDeduction: 13400,
    grossEarnings: 95833,
    totalDeductions: 20000,
    netPayable: 75833,
    paymentDate: '31 July 2026',
    status: 'Paid',
  },
  {
    id: 'PAY-2026-06',
    monthYear: 'June 2026',
    basicSalary: 55000,
    hra: 22000,
    conveyance: 5000,
    specialAllowance: 13833,
    pfDeduction: 6600,
    taxDeduction: 13400,
    grossEarnings: 95833,
    totalDeductions: 20000,
    netPayable: 75833,
    paymentDate: '30 June 2026',
    status: 'Paid',
  },
  {
    id: 'PAY-2026-05',
    monthYear: 'May 2026',
    basicSalary: 55000,
    hra: 22000,
    conveyance: 5000,
    specialAllowance: 13833,
    pfDeduction: 6600,
    taxDeduction: 13400,
    grossEarnings: 95833,
    totalDeductions: 20000,
    netPayable: 75833,
    paymentDate: '31 May 2026',
    status: 'Paid',
  },
];

export const MOCK_ANALYTICS = {
  headcountByDept: [
    { name: 'Engineering', count: 42, color: '#3b82f6' },
    { name: 'Product', count: 18, color: '#8b5cf6' },
    { name: 'Design', count: 12, color: '#ec4899' },
    { name: 'HR & Ops', count: 10, color: '#10b981' },
    { name: 'Marketing', count: 15, color: '#f59e0b' },
    { name: 'Finance', count: 8, color: '#6366f1' },
  ],
  monthlyPayrollCost: [
    { month: 'Jan', cost: 180000 },
    { month: 'Feb', cost: 185000 },
    { month: 'Mar', cost: 192000 },
    { month: 'Apr', cost: 198000 },
    { month: 'May', cost: 205000 },
    { month: 'Jun', cost: 212000 },
    { month: 'Jul', cost: 220000 },
  ],
  attendanceTrends: [
    { day: 'Mon', onTime: 95, late: 3, absent: 2 },
    { day: 'Tue', onTime: 97, late: 2, absent: 1 },
    { day: 'Wed', onTime: 92, late: 5, absent: 3 },
    { day: 'Thu', onTime: 96, late: 3, absent: 1 },
    { day: 'Fri', onTime: 89, late: 7, absent: 4 },
  ],
};
