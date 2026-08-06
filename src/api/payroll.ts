import { apiClient } from './client'
import type { PayrollData, Payslip } from '../types'

export const payrollApi = {
  list: async (month?: string) => (await apiClient.get<PayrollData>('/api/payroll', { params: { month } })).data,
  payslip: async (id: string) => (await apiClient.get<Payslip>(`/api/payroll/${id}/payslip`)).data,
  run: async (month: string) => (await apiClient.post<PayrollData>('/api/payroll/run', { month })).data,
}
