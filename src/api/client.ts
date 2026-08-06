import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { AuthTokens } from '../types'
import { demoAdapter, isDemoMode } from './demo'

const TOKEN_KEY = 'hrms_tokens'
export const tokenStore = {
  get: (): AuthTokens | null => {
    try { return JSON.parse(localStorage.getItem(TOKEN_KEY) ?? 'null') as AuthTokens | null } catch { return null }
  },
  set: (tokens: AuthTokens) => localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens)),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
  ...(isDemoMode ? { adapter: demoAdapter } : {}),
})

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.get()?.accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean }
let refreshPromise: Promise<string> | null = null

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined
    if (error.response?.status !== 401 || !original || original._retry || original.url?.includes('/api/auth/refresh')) {
      return Promise.reject(error)
    }
    original._retry = true
    const refreshToken = tokenStore.get()?.refreshToken
    if (!refreshToken) {
      window.dispatchEvent(new Event('auth:logout'))
      return Promise.reject(error)
    }
    try {
      refreshPromise ??= apiClient
        .post<{ accessToken: string; refreshToken?: string }>('/api/auth/refresh', { refreshToken })
        .then(({ data }) => {
          tokenStore.set({ accessToken: data.accessToken, refreshToken: data.refreshToken ?? refreshToken })
          return data.accessToken
        })
        .finally(() => { refreshPromise = null })
      const accessToken = await refreshPromise
      original.headers.Authorization = `Bearer ${accessToken}`
      return apiClient(original)
    } catch (refreshError) {
      tokenStore.clear()
      window.dispatchEvent(new Event('auth:logout'))
      return Promise.reject(refreshError)
    }
  },
)

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<{ message?: string }>(error)) return error.response?.data?.message ?? error.message
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}
