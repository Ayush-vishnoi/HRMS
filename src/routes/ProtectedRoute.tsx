import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { UserRole } from '../types'
import { Skeleton } from '../components/ui'

export function ProtectedRoute({ requiredRoles }: { requiredRoles?: UserRole[] }) {
  const { user, isAuthenticated, isInitializing } = useAuth(); const location = useLocation()
  if (isInitializing) return <div className="flex min-h-screen items-center justify-center bg-background"><Skeleton className="h-12 w-52" /></div>
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  if (requiredRoles && (!user || !requiredRoles.includes(user.role))) return <Navigate to="/forbidden" replace />
  return <Outlet />
}
