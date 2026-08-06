import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { useAuth } from './hooks/useAuth'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { LoginPage, ForgotPasswordPage, ResetPasswordPage } from './features/auth/AuthPages'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { EmployeeDetailPage, EmployeesPage } from './features/employees/EmployeesPage'
import { AttendancePage } from './features/attendance/AttendancePage'
import { LeavePage } from './features/leave/LeavePage'
import { PayrollPage, PayslipPage } from './features/payroll/PayrollPage'
import { ReportsPage } from './features/reports/ReportsPage'
import { AiPage } from './features/ai/AiPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { Button, Card } from './components/ui'

function ForbiddenPage() {
  const { user } = useAuth()
  return <div className="flex min-h-[60vh] items-center justify-center"><Card className="max-w-md text-center"><p className="font-mono text-sm text-accent">403 / ACCESS DENIED</p><h1 className="mt-3 text-3xl font-semibold">This area is restricted</h1><p className="mt-2 text-muted">Your {user?.role.replace('_', ' ').toLowerCase()} role does not have access to this page.</p><Button className="mt-6" onClick={() => window.history.back()}>Go back</Button></Card></div>
}

function NotFoundPage() { return <div className="flex min-h-[60vh] items-center justify-center"><Card className="text-center"><h1 className="text-3xl font-semibold">Page not found</h1><p className="mt-2 text-muted">The page you requested does not exist.</p><Button className="mt-5" onClick={() => window.location.assign('/dashboard')}>Back to dashboard</Button></Card></div> }

export default function App() {
  return <Routes><Route path="/login" element={<LoginPage />} /><Route path="/forgot-password" element={<ForgotPasswordPage />} /><Route path="/reset-password" element={<ResetPasswordPage />} /><Route element={<ProtectedRoute />}><Route element={<AppShell />}><Route index element={<Navigate to="/dashboard" replace />} /><Route path="dashboard" element={<DashboardPage />} /><Route path="employees" element={<ProtectedRoute requiredRoles={['SUPER_ADMIN', 'HR_MANAGER']} />}><Route index element={<EmployeesPage />} /><Route path=":id" element={<EmployeeDetailPage />} /></Route><Route path="attendance" element={<AttendancePage />} /><Route path="leave" element={<LeavePage />} /><Route path="payroll" element={<PayrollPage />} /><Route path="payroll/:id" element={<PayslipPage />} /><Route path="reports" element={<ProtectedRoute requiredRoles={['SUPER_ADMIN', 'HR_MANAGER']} />}><Route index element={<ReportsPage />} /></Route><Route path="ai" element={<ProtectedRoute requiredRoles={['SUPER_ADMIN', 'HR_MANAGER']} />}><Route index element={<AiPage />} /></Route><Route path="settings" element={<SettingsPage />} /><Route path="forbidden" element={<ForbiddenPage />} /><Route path="*" element={<NotFoundPage />} /></Route></Route><Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes>
}
