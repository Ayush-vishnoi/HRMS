import { apiClient } from './client'
import type { AuthResponse, LoginRequest, User } from '../types'

export const authApi = {
  login: async (payload: LoginRequest) => (await apiClient.post<AuthResponse>('/api/auth/login', payload)).data,
  me: async () => (await apiClient.get<User>('/api/auth/me')).data,
  forgotPassword: async (email: string) => (await apiClient.post<{ message: string }>('/api/auth/forgot-password', { email })).data,
  resetPassword: async (token: string, password: string) => (await apiClient.post<{ message: string }>('/api/auth/reset-password', { token, password })).data,
  changePassword: async (currentPassword: string, newPassword: string) => (await apiClient.post<{ message: string }>('/api/auth/change-password', { currentPassword, newPassword })).data,
}
