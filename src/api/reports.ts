import { apiClient } from './client'
import type { DashboardData, ReportData } from '../types'

export const reportsApi = {
  dashboard: async () => (await apiClient.get<DashboardData>('/api/reports/dashboard')).data,
  overview: async (range?: string) => (await apiClient.get<ReportData>('/api/reports', { params: { range } })).data,
}
