import { apiClient } from './client'
import type { AttendanceRecord, AttendanceSummary } from '../types'

export const attendanceApi = {
  summary: async (month?: string) => (await apiClient.get<AttendanceSummary>('/api/attendance', { params: { month } })).data,
  logs: async (params: { employeeId?: string; month?: string }) => (await apiClient.get<AttendanceRecord[]>('/api/attendance/logs', { params })).data,
  checkIn: async () => (await apiClient.post<AttendanceRecord>('/api/attendance/check-in')).data,
  checkOut: async () => (await apiClient.post<AttendanceRecord>('/api/attendance/check-out')).data,
}
