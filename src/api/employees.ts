import { apiClient } from './client'
import type { Employee, EmployeeInput, EmployeeQuery, PaginatedResponse } from '../types'

export const employeesApi = {
  list: async (params: EmployeeQuery) => (await apiClient.get<PaginatedResponse<Employee>>('/api/employees', { params })).data,
  get: async (id: string) => (await apiClient.get<Employee>(`/api/employees/${id}`)).data,
  create: async (payload: EmployeeInput) => (await apiClient.post<Employee>('/api/employees', payload)).data,
  update: async (id: string, payload: Partial<EmployeeInput>) => (await apiClient.patch<Employee>(`/api/employees/${id}`, payload)).data,
  remove: async (id: string) => apiClient.delete(`/api/employees/${id}`),
}
