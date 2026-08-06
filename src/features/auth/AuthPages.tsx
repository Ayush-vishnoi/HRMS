import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, LockKeyhole, Mail, Moon, Sun } from 'lucide-react'
import { authApi } from '../../api/auth'
import { getErrorMessage } from '../../api/client'
import { isDemoMode } from '../../api/demo'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { Button, Card, Input } from '../../components/ui'
import { useToast } from '../../components/ui/Toast'

const loginSchema = z.object({ email: z.email('Enter a valid email'), password: z.string().min(6, 'Password must be at least 6 characters') })
type LoginValues = z.infer<typeof loginSchema>
const demoAccounts = [
  { label: 'Super Admin', email: 'admin@hearthhr.com' },
  { label: 'HR Manager', email: 'hr@hearthhr.com' },
  { label: 'Employee', email: 'employee@hearthhr.com' },
]

function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme()
  return <main className="grid min-h-screen bg-background lg:grid-cols-2"><section className="relative hidden overflow-hidden bg-[#302052] p-12 text-white lg:flex lg:flex-col lg:justify-between"><div className="absolute -right-32 -top-32 h-96 w-96 rounded-full border-[60px] border-accent/10" /><div className="relative flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent font-heading text-xl font-bold">H</span><span className="font-heading text-xl font-semibold">Hearth HR</span></div><div className="relative max-w-xl"><p className="font-heading text-4xl font-semibold leading-tight text-white">Build a workplace where people and purpose thrive together.</p><p className="mt-5 text-lg text-white/65">A thoughtfully designed people platform for modern teams.</p></div><p className="relative text-sm text-white/40">© 2026 Hearth HR. People, thoughtfully.</p></section><section className="flex items-center justify-center p-5 sm:p-10"><Button variant="ghost" size="sm" className="absolute right-5 top-5" onClick={toggleTheme} aria-label="Toggle theme">{theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}</Button><div className="w-full max-w-md"><div className="mb-8 lg:hidden"><span className="font-heading text-xl font-bold text-primary">Hearth HR</span></div><h1 className="text-3xl font-semibold">{title}</h1><p className="mt-2 text-muted">{subtitle}</p><Card className="mt-7 p-6 sm:p-8">{children}</Card></div></section></main>
}

export function LoginPage() {
  const { login, isAuthenticated } = useAuth(); const navigate = useNavigate(); const location = useLocation(); const { toast } = useToast(); const [show, setShow] = useState(false)
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  const submit = async (values: LoginValues) => { try { await login(values); const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/dashboard'; navigate(from, { replace: true }) } catch (error) { toast(getErrorMessage(error), 'error') } }
  return <AuthLayout title="Welcome back" subtitle="Sign in to continue to your workspace.">{isDemoMode && <div className="mb-6 rounded-xl border border-accent/30 bg-accent/5 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-foreground">Try a demo account</p><span className="rounded-full bg-accent/15 px-2 py-1 font-mono text-[11px] font-semibold text-accent">Demo mode</span></div><p className="mt-1 text-xs text-muted">Choose a role to fill in the credentials. Password: <span className="font-mono font-semibold text-foreground">Demo@123</span></p><div className="mt-3 grid gap-2 sm:grid-cols-3">{demoAccounts.map((account) => <button key={account.email} type="button" className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-primary transition hover:border-accent hover:text-accent focus:outline-none" onClick={() => { setValue('email', account.email, { shouldValidate: true }); setValue('password', 'Demo@123', { shouldValidate: true }) }}>{account.label}</button>)}</div></div>}<form onSubmit={handleSubmit(submit)} className="space-y-5"><Input label="Work email" type="email" autoComplete="email" icon={<Mail size={17} />} error={errors.email?.message} {...register('email')} /><div className="relative"><Input label="Password" type={show ? 'text' : 'password'} autoComplete="current-password" icon={<LockKeyhole size={17} />} error={errors.password?.message} {...register('password')} /><button type="button" className="absolute right-3 top-[38px] text-muted" onClick={() => setShow((value) => !value)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></div><div className="flex items-center justify-between text-sm"><label className="flex items-center gap-2"><input type="checkbox" className="accent-primary" />Remember me</label><Link to="/forgot-password" className="font-semibold text-primary hover:text-accent">Forgot password?</Link></div><Button type="submit" className="w-full" loading={isSubmitting}>Sign in</Button></form></AuthLayout>
}

export function ForgotPasswordPage() {
  const { toast } = useToast(); const [sent, setSent] = useState(false); const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ email: string }>({ resolver: zodResolver(z.object({ email: z.email() })) })
  return <AuthLayout title="Reset your password" subtitle="We'll send a secure reset link to your email.">{sent ? <div className="text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600"><Mail /></div><h2 className="mt-4 text-xl">Check your inbox</h2><p className="mt-2 text-sm text-muted">If an account exists, a reset link is on its way.</p><Link to="/login" className="mt-5 inline-block font-semibold text-primary">Return to sign in</Link></div> : <form onSubmit={handleSubmit(async ({ email }) => { try { await authApi.forgotPassword(email); setSent(true) } catch (error) { toast(getErrorMessage(error), 'error') } })} className="space-y-5"><Input label="Work email" type="email" icon={<Mail size={17} />} error={errors.email?.message} {...register('email')} /><Button type="submit" className="w-full" loading={isSubmitting}>Send reset link</Button><Link to="/login" className="block text-center text-sm font-semibold text-primary">Back to sign in</Link></form>}</AuthLayout>
}

export function ResetPasswordPage() {
  const [params] = useSearchParams(); const navigate = useNavigate(); const { toast } = useToast(); const schema = z.object({ password: z.string().min(8), confirm: z.string() }).refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' }); type Values = z.infer<typeof schema>; const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) })
  return <AuthLayout title="Choose a new password" subtitle="Use at least 8 characters for a strong password."><form className="space-y-5" onSubmit={handleSubmit(async ({ password }) => { try { await authApi.resetPassword(params.get('token') ?? '', password); toast('Password reset successfully', 'success'); navigate('/login') } catch (error) { toast(getErrorMessage(error), 'error') } })}><Input label="New password" type="password" error={errors.password?.message} {...register('password')} /><Input label="Confirm password" type="password" error={errors.confirm?.message} {...register('confirm')} /><Button type="submit" className="w-full" loading={isSubmitting}>Update password</Button></form></AuthLayout>
}
