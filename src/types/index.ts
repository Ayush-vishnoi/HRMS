export type UserRole = 'SUPER_ADMIN' | 'HR_MANAGER' | 'EMPLOYEE'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatarUrl?: string
  department?: string
}

export interface AuthTokens { accessToken: string; refreshToken: string }
export interface AuthResponse extends AuthTokens { user: User }
export interface LoginRequest { email: string; password: string }
export interface Pagination { page: number; limit: number; total: number; totalPages: number }
export interface PaginatedResponse<T> { data: T[]; pagination: Pagination }

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE'
export interface Employee {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  department: string
  jobTitle: string
  role: UserRole
  status: EmployeeStatus
  joiningDate: string
  avatarUrl?: string
}
export interface EmployeeQuery { page?: number; limit?: number; search?: string; department?: string; status?: EmployeeStatus }
export type EmployeeInput = Omit<Employee, 'id'>

export interface DashboardStats { totalEmployees: number; presentToday: number; onLeave: number; openPositions: number }
export interface AttendanceTrend { month: string; present: number; absent: number }
export interface Activity { id: string; title: string; description: string; timestamp: string; type: 'employee' | 'leave' | 'payroll' | 'attendance' }
export interface DashboardData { stats: DashboardStats; attendanceTrend: AttendanceTrend[]; recentActivity: Activity[] }

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'WEEKEND'
export interface AttendanceRecord { id: string; employeeId: string; employeeName: string; date: string; checkIn?: string; checkOut?: string; workHours?: number; status: AttendanceStatus }
export interface AttendanceSummary { checkedIn: boolean; checkInTime?: string; records: AttendanceRecord[] }

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export interface LeaveBalance { type: string; used: number; total: number }
export interface LeaveRequest { id: string; employeeId: string; employeeName: string; type: string; startDate: string; endDate: string; days: number; reason: string; status: LeaveStatus; requestedAt: string }
export interface LeaveInput { type: string; startDate: string; endDate: string; reason: string }
export interface LeaveData { balances: LeaveBalance[]; requests: LeaveRequest[] }

export interface PayrollRecord { id: string; employeeId: string; employeeName: string; month: string; gross: number; deductions: number; net: number; status: 'DRAFT' | 'PROCESSED' | 'PAID' }
export interface PayrollData { gross: number; deductions: number; net: number; records: PayrollRecord[] }
export interface Payslip extends PayrollRecord { department: string; jobTitle: string; earnings: { label: string; amount: number }[]; deductionItems: { label: string; amount: number }[] }

export interface ReportData { headcountByDepartment: { name: string; value: number }[]; attendanceByMonth: AttendanceTrend[]; turnoverRate: number; rows: Record<string, string | number>[] }
export interface AiChatMessage { id: string; role: 'user' | 'assistant'; content: string; timestamp: string }
export interface AttritionInsight { riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'; summary: string; factors: string[] }
