/**
 * Default annual leave allocation granted to every new employee.
 *
 * Matches the `LeaveType` enum in prisma/schema.prisma (Casual / Sick /
 * Earned / WFH) and the `LeaveBalance` unique constraint
 * [employeeId, year, leaveType]. `used` starts at 0 and `remaining` at
 * `total`, so a brand-new employee's Leave Management page shows a full,
 * untouched allocation instead of falling back to mock data.
 */
export const DEFAULT_LEAVE_BALANCES: ReadonlyArray<{
  leaveType: 'Casual' | 'Sick' | 'Earned' | 'WFH';
  total: number;
}> = [
  { leaveType: 'Casual', total: 12 },
  { leaveType: 'Sick', total: 10 },
  { leaveType: 'Earned', total: 20 },
  { leaveType: 'WFH', total: 12 },
];

export function defaultLeaveBalanceRows(employeeId: string, year: number) {
  return DEFAULT_LEAVE_BALANCES.map((b) => ({
    employeeId,
    year,
    leaveType: b.leaveType,
    total: b.total,
    used: 0,
    remaining: b.total,
  }));
}
