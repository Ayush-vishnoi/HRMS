import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '../api/auth'
import { tokenStore } from '../api/client'
import type { LoginRequest, User, UserRole } from '../types'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isInitializing: boolean
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => void
  can: (...roles: UserRole[]) => boolean
}
const AuthContext = createContext<AuthContextValue | null>(null)
const USER_KEY = 'hrms_user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null') as User | null } catch { return null }
  })
  const [isInitializing, setInitializing] = useState(Boolean(tokenStore.get()))

  const logout = useCallback(() => {
    tokenStore.clear(); localStorage.removeItem(USER_KEY); setUser(null)
  }, [])

  useEffect(() => {
    const handleLogout = () => logout()
    window.addEventListener('auth:logout', handleLogout)
    if (!tokenStore.get()) { setInitializing(false); return () => window.removeEventListener('auth:logout', handleLogout) }
    authApi.me().then((currentUser) => {
      setUser(currentUser); localStorage.setItem(USER_KEY, JSON.stringify(currentUser))
    }).catch(logout).finally(() => setInitializing(false))
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [logout])

  const login = useCallback(async (credentials: LoginRequest) => {
    const response = await authApi.login(credentials)
    tokenStore.set(response); localStorage.setItem(USER_KEY, JSON.stringify(response.user)); setUser(response.user)
  }, [])

  const value = useMemo(() => ({ user, isAuthenticated: Boolean(user), isInitializing, login, logout, can: (...roles: UserRole[]) => Boolean(user && roles.includes(user.role)) }), [user, isInitializing, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
