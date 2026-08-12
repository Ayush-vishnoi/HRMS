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
