import { apiClient } from './client'
import type { LeaveData, LeaveInput, LeaveRequest, LeaveStatus } from '../types'

export const leaveApi = {
  list: async () => (await apiClient.get<LeaveData>('/api/leaves')).data,
  apply: async (payload: LeaveInput) => (await apiClient.post<LeaveRequest>('/api/leaves', payload)).data,
  updateStatus: async (id: string, status: Extract<LeaveStatus, 'APPROVED' | 'REJECTED'>) =>
    (await apiClient.patch<LeaveRequest>(`/api/leaves/${id}/status`, { status })).data,
}
