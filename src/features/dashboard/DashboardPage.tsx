import { useQuery } from '@tanstack/react-query'
import { BriefcaseBusiness, CalendarDays, Clock3, UserCheck, Users } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { reportsApi } from '../../api/reports'
import { Card, Skeleton, StatCard, Button } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { formatDate } from '../../lib/utils'

export function DashboardPage() {
  const { user } = useAuth(); const query = useQuery({ queryKey: ['dashboard'], queryFn: reportsApi.dashboard, retry: 1 })
  if (query.isLoading) return <div className="space-y-6"><Skeleton className="h-16 w-80" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />)}</div><Skeleton className="h-96" /></div>
  if (query.isError) return <Card className="text-center"><p className="text-red-600">Unable to load dashboard data.</p><Button className="mt-4" onClick={() => query.refetch()}>Try again</Button></Card>
  const data = query.data!
  const stats = user?.role === 'EMPLOYEE' ? [
    { label: 'Attendance this month', value: '94%', icon: <UserCheck />, accent: 'green' as const },
    { label: 'Leave balance', value: '14 days', icon: <CalendarDays />, accent: 'amber' as const },
    { label: 'Hours this week', value: '38.5', icon: <Clock3 />, accent: 'plum' as const },
    { label: 'Team members', value: data.stats.totalEmployees, icon: <Users />, accent: 'plum' as const },
  ] : [
    { label: 'Total Employees', value: data.stats.totalEmployees, icon: <Users />, trend: '+4.2% from last month', accent: 'plum' as const },
    { label: 'Present Today', value: data.stats.presentToday, icon: <UserCheck />, trend: `${Math.round(data.stats.presentToday / Math.max(data.stats.totalEmployees, 1) * 100)}% attendance`, accent: 'green' as const },
    { label: 'On Leave', value: data.stats.onLeave, icon: <CalendarDays />, trend: 'Across all departments', accent: 'amber' as const },
    { label: 'Open Positions', value: data.stats.openPositions, icon: <BriefcaseBusiness />, trend: 'Hiring in progress', accent: 'red' as const },
  ]
  return <div><div className="mb-7"><p className="text-sm font-semibold uppercase tracking-wider text-accent">Overview</p><h1 className="mt-1 text-3xl font-semibold">Good morning, {user?.name.split(' ')[0]}</h1><p className="mt-1 text-muted">Here’s what’s happening with your workplace today.</p></div><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <StatCard key={stat.label} {...stat} />)}</section><section className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]"><Card><div className="mb-6"><h2 className="text-xl font-semibold">Attendance overview</h2><p className="text-sm text-muted">Present and absent employees over 12 months</p></div><div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.attendanceTrend}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(var(--color-border))" /><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: 'rgb(var(--color-muted))', fontSize: 12 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: 'rgb(var(--color-muted))', fontSize: 12 }} /><Tooltip contentStyle={{ borderRadius: 8, borderColor: 'rgb(var(--color-border))', background: 'rgb(var(--color-surface))' }} /><Legend /><Bar dataKey="present" name="Present" fill="#3D2B6B" radius={[5, 5, 0, 0]} /><Bar dataKey="absent" name="Absent" fill="#C07D3A" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></Card><Card><h2 className="text-xl font-semibold">Recent activity</h2><p className="mb-5 text-sm text-muted">Latest updates across HR</p><div className="space-y-5">{data.recentActivity.length ? data.recentActivity.slice(0, 6).map((item) => <div key={item.id} className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-accent ring-4 ring-accent/10" /><div><p className="text-sm font-semibold text-foreground">{item.title}</p><p className="text-sm text-muted">{item.description}</p><time className="mt-1 block font-mono text-[11px] text-muted">{formatDate(item.timestamp)}</time></div></div>) : <p className="text-sm text-muted">No recent activity.</p>}</div></Card></section></div>
}
