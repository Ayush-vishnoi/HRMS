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
  name: 'Ayush Vishnoi',
  role: 'AI/ML Intern Developer',
  department: 'AI/ML',
  email: 'ayush.vishnoi@company.com',
  phone: '+91 98765 43210',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  employeeCode: 'EMP-2026-089',
  joinDate: '15 March 2026',
  location: 'Bengaluru, India',
  salary: 550000,
  manager: 'Arjun Mehta',
};

export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'EMP-001',
    name: 'Ayush Vishnoi',
    role: 'AI/ML Intern Developer',
    department: 'AI/ML',
    email: 'ayush.vishnoi@company.com',
    phone: '+91 98765 43210',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    status: 'Active',
    joinDate: '15 Mar 2026',
    location: 'Bengaluru, Karnataka',
    salary: 550000,
    manager: 'Arjun Mehta',
    employeeCode: 'EMP-2026-089',
  },
  {
    id: 'EMP-002',
    name: 'Arjun Mehta',
    role: 'Engineering Manager',
    department: 'Engineering',
    email: 'arjun.mehta@company.com',
    phone: '+91 98100 23456',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    status: 'Active',
    joinDate: '10 Jan 2019',
    location: 'Gurugram, Haryana',
    salary: 3200000,
    manager: 'Rohan Kapoor',
    employeeCode: 'EMP-2019-012',
  },
  {
    id: 'EMP-003',
    name: 'Rahul Verma',
    role: 'Staff Frontend Engineer',
    department: 'Engineering',
    email: 'rahul.verma@company.com',
    phone: '+91 98201 34567',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    status: 'Active',
    joinDate: '01 Feb 2020',
    location: 'Pune, Maharashtra',
    salary: 2600000,
    manager: 'Arjun Mehta',
    employeeCode: 'EMP-2020-045',
  },
  {
    id: 'EMP-004',
    name: 'Neha Iyer',
    role: 'Lead HR Operations',
    department: 'Human Resources',
    email: 'neha.iyer@company.com',
    phone: '+91 98450 45678',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    status: 'Active',
    joinDate: '12 Sep 2021',
    location: 'Chennai, Tamil Nadu',
    salary: 1800000,
    manager: 'Priya Sharma',
    employeeCode: 'EMP-2021-112',
  },
  {
    id: 'EMP-005',
    name: 'Vikram Singh',
    role: 'Senior Backend Developer',
    department: 'Engineering',
    email: 'vikram.singh@company.com',
    phone: '+91 98710 56789',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    status: 'Remote',
    joinDate: '18 Nov 2022',
    location: 'Jaipur, Rajasthan',
    salary: 2400000,
    manager: 'Arjun Mehta',
    employeeCode: 'EMP-2022-156',
  },
  {
    id: 'EMP-006',
    name: 'Priya Sharma',
    role: 'Head of Human Resources',
    department: 'Human Resources',
    email: 'priya.sharma@company.com',
    phone: '+91 98330 67890',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    status: 'Active',
    joinDate: '01 Jun 2017',
    location: 'Mumbai, Maharashtra',
    salary: 3600000,
    manager: 'CEO Office',
    employeeCode: 'EMP-2017-003',
  },
  {
    id: 'EMP-007',
    name: 'Ananya Rao',
    role: 'Product Marketing Manager',
    department: 'Marketing',
    email: 'ananya.rao@company.com',
    phone: '+91 99000 78901',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    status: 'On Leave',
    joinDate: '04 Apr 2022',
    location: 'Hyderabad, Telangana',
    salary: 2000000,
    manager: 'Karan Malhotra',
    employeeCode: 'EMP-2022-132',
  },
  {
    id: 'EMP-008',
    name: 'Siddharth Joshi',
    role: 'Financial Analyst',
    department: 'Finance',
    email: 'siddharth.joshi@company.com',
    phone: '+91 98670 89012',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    status: 'Active',
    joinDate: '22 Aug 2023',
    location: 'Ahmedabad, Gujarat',
    salary: 1400000,
    manager: 'Meera Nair',
    employeeCode: 'EMP-2023-201',
  },
];

export interface TeamMemberMetadata {
  employeeId: string;
  manager: string;
  focus: string;
  workload: number;
  goalProgress: number;
  goalLabel: string;
  nextOneToOne: string;
  risk: 'On track' | 'Needs attention' | 'At risk';
  notes: string;
}

export const MOCK_TEAM_METADATA: TeamMemberMetadata[] = [
  {
    employeeId: 'EMP-001',
    manager: 'Arjun Mehta',
    focus: 'ML model monitoring and HRMS onboarding insights',
    workload: 72,
    goalProgress: 68,
    goalLabel: 'Ship onboarding analytics beta',
    nextOneToOne: '12 Aug 2026',
    risk: 'On track',
    notes: 'Pair with Rahul on the new dashboard data contract.',
  },
  {
    employeeId: 'EMP-003',
    manager: 'Arjun Mehta',
    focus: 'Frontend platform and accessibility improvements',
    workload: 88,
    goalProgress: 82,
    goalLabel: 'Complete design system migration',
    nextOneToOne: '10 Aug 2026',
    risk: 'Needs attention',
    notes: 'Review sprint scope after the current release candidate.',
  },
  {
    employeeId: 'EMP-005',
    manager: 'Arjun Mehta',
    focus: 'Payroll services reliability and API performance',
    workload: 61,
    goalProgress: 74,
    goalLabel: 'Reduce payroll API p95 latency',
    nextOneToOne: '14 Aug 2026',
    risk: 'On track',
    notes: 'Share the incident follow-up with the platform team.',
  },
];

export interface RecruitmentJob {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: 'Full-time' | 'Contract';
  openings: number;
  applicants: number;
  status: 'Open' | 'On hold' | 'Closed';
  postedOn: string;
  description: string;
  requirements: string[];
}

export interface RecruitmentCandidate {
  id: string;
  jobId: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  appliedOn: string;
  stage: 'New' | 'Screening' | 'Interview' | 'Shortlisted' | 'Rejected';
  score: number;
  experience: string;
  currentRole: string;
  location: string;
  matchedSkills: string[];
  missingSkills: string[];
  summary: string;
  recommendation: 'Strong match' | 'Review' | 'Low match';
}

export const MOCK_RECRUITMENT_JOBS: RecruitmentJob[] = [
  {
    id: 'JOB-001',
    title: 'Senior Frontend Engineer',
    department: 'Engineering',
    location: 'Bengaluru / Hybrid',
    employmentType: 'Full-time',
    openings: 2,
    applicants: 24,
    status: 'Open',
    postedOn: '01 Aug 2026',
    description: 'Build accessible, high-performance experiences for the Apex HR platform.',
    requirements: ['React', 'TypeScript', 'Next.js', 'Testing', 'System design'],
  },
  {
    id: 'JOB-002',
    title: 'AI/ML Engineer',
    department: 'AI/ML',
    location: 'Bengaluru / Remote',
    employmentType: 'Full-time',
    openings: 1,
    applicants: 18,
    status: 'Open',
    postedOn: '28 Jul 2026',
    description: 'Develop practical ML systems that improve people operations and employee insights.',
    requirements: ['Python', 'Machine learning', 'SQL', 'Model deployment', 'Experimentation'],
  },
  {
    id: 'JOB-003',
    title: 'People Operations Specialist',
    department: 'Human Resources',
    location: 'Mumbai / On-site',
    employmentType: 'Full-time',
    openings: 1,
    applicants: 12,
    status: 'On hold',
    postedOn: '20 Jul 2026',
    description: 'Own employee lifecycle operations and deliver a consistent people experience.',
    requirements: ['HR operations', 'Payroll', 'Employee relations', 'Workday', 'Compliance'],
  },
];

export const MOCK_RECRUITMENT_CANDIDATES: RecruitmentCandidate[] = [
  {
    id: 'CAN-001', jobId: 'JOB-001', name: 'Kavya Menon', email: 'kavya.menon@email.com', phone: '+91 98450 12345',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', appliedOn: '06 Aug 2026', stage: 'Screening', score: 92, experience: '6 years', currentRole: 'Senior UI Engineer at Fintech Labs', location: 'Bengaluru, Karnataka', matchedSkills: ['React', 'TypeScript', 'Next.js', 'Testing'], missingSkills: ['System design evidence'], summary: 'Strong product engineering background with measurable accessibility and performance improvements.', recommendation: 'Strong match',
  },
  {
    id: 'CAN-002', jobId: 'JOB-001', name: 'Aditya Kulkarni', email: 'aditya.k@email.com', phone: '+91 98220 22556', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', appliedOn: '05 Aug 2026', stage: 'Interview', score: 84, experience: '5 years', currentRole: 'Frontend Developer at Orbit Systems', location: 'Pune, Maharashtra', matchedSkills: ['React', 'TypeScript', 'Testing'], missingSkills: ['Next.js depth'], summary: 'Solid frontend fundamentals and delivery experience; validate architecture ownership during interview.', recommendation: 'Strong match',
  },
  {
    id: 'CAN-003', jobId: 'JOB-001', name: 'Riya Shah', email: 'riya.shah@email.com', phone: '+91 99090 77889', avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150&auto=format&fit=crop&q=80', appliedOn: '04 Aug 2026', stage: 'New', score: 71, experience: '4 years', currentRole: 'Software Engineer at CloudNest', location: 'Ahmedabad, Gujarat', matchedSkills: ['React', 'Next.js', 'Testing'], missingSkills: ['TypeScript', 'System design'], summary: 'Promising match with relevant product work, but needs a deeper technical review.', recommendation: 'Review',
  },
  {
    id: 'CAN-004', jobId: 'JOB-002', name: 'Sanjay Rao', email: 'sanjay.rao@email.com', phone: '+91 98800 33445', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', appliedOn: '03 Aug 2026', stage: 'Shortlisted', score: 95, experience: '7 years', currentRole: 'ML Platform Lead at DataForge', location: 'Bengaluru, Karnataka', matchedSkills: ['Python', 'Machine learning', 'SQL', 'Model deployment'], missingSkills: ['None identified'], summary: 'End-to-end ML platform ownership with strong production deployment and experimentation experience.', recommendation: 'Strong match',
  },
  {
    id: 'CAN-005', jobId: 'JOB-002', name: 'Megha Joshi', email: 'megha.joshi@email.com', phone: '+91 98980 44556', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', appliedOn: '01 Aug 2026', stage: 'New', score: 63, experience: '3 years', currentRole: 'Data Scientist at InsightWorks', location: 'Hyderabad, Telangana', matchedSkills: ['Python', 'Machine learning', 'SQL'], missingSkills: ['Model deployment'], summary: 'Good applied ML foundation; assess production readiness and ownership scope.', recommendation: 'Review',
  },
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
    employeeName: 'Ananya Rao',
    employeeAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    leaveType: 'Earned',
    startDate: '2026-08-10',
    endDate: '2026-08-14',
    days: 5,
    reason: 'Annual family visit to Kerala',
    status: 'Pending',
    appliedOn: '2026-08-04',
  },
  {
    id: 'LR-102',
    employeeId: 'EMP-003',
    employeeName: 'Rahul Verma',
    employeeAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
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
    employeeName: 'Ayush Vishnoi',
    employeeAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
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
    employeeName: 'Vikram Singh',
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
  { id: 'ATT-001', date: '2026-08-06', checkIn: '09:02 AM', checkOut: 'In Progress', hoursWorked: '7h 20m', status: 'On Time', location: 'Bengaluru HQ' },
  { id: 'ATT-002', date: '2026-08-05', checkIn: '09:00 AM', checkOut: '06:15 PM', hoursWorked: '9h 15m', status: 'On Time', location: 'Bengaluru HQ' },
  { id: 'ATT-003', date: '2026-08-04', checkIn: '09:35 AM', checkOut: '06:30 PM', hoursWorked: '8h 55m', status: 'Late', location: 'Bengaluru HQ' },
  { id: 'ATT-004', date: '2026-08-03', checkIn: '08:55 AM', checkOut: '05:45 PM', hoursWorked: '8h 50m', status: 'On Time', location: 'Work from Home' },
  { id: 'ATT-005', date: '2026-07-31', checkIn: '09:10 AM', checkOut: '06:00 PM', hoursWorked: '8h 50m', status: 'On Time', location: 'Bengaluru HQ' },
  { id: 'ATT-006', date: '2026-07-30', checkIn: '09:05 AM', checkOut: '01:30 PM', hoursWorked: '4h 25m', status: 'Half Day', location: 'Bengaluru HQ' },
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
    { name: 'Engineering', count: 42, color: '#8B3A4A' },
    { name: 'Product', count: 18, color: '#A04456' },
    { name: 'Design', count: 12, color: '#B86B78' },
    { name: 'HR & Ops', count: 10, color: '#10b981' },
    { name: 'Marketing', count: 15, color: '#f59e0b' },
    { name: 'Finance', count: 8, color: '#5E6673' },
  ],
  monthlyPayrollCost: [
    { month: 'Jan', cost: 18000000 },
    { month: 'Feb', cost: 18500000 },
    { month: 'Mar', cost: 19200000 },
    { month: 'Apr', cost: 19800000 },
    { month: 'May', cost: 20500000 },
    { month: 'Jun', cost: 21200000 },
    { month: 'Jul', cost: 22000000 },
  ],
  attendanceTrends: [
    { day: 'Mon', onTime: 95, late: 3, absent: 2 },
    { day: 'Tue', onTime: 97, late: 2, absent: 1 },
    { day: 'Wed', onTime: 92, late: 5, absent: 3 },
    { day: 'Thu', onTime: 96, late: 3, absent: 1 },
    { day: 'Fri', onTime: 89, late: 7, absent: 4 },
  ],
};
