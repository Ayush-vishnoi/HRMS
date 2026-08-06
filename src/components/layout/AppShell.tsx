import { useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Bell, Bot, CalendarCheck, ChevronDown, FileBarChart, LayoutDashboard, Menu, Moon, Search, Settings, Sun, Users, WalletCards, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import type { UserRole } from '../../types'
import { cn } from '../../lib/utils'
import { Avatar, Button, Input } from '../ui'

const navItems: { label: string; path: string; icon: typeof LayoutDashboard; roles: UserRole[] }[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'HR_MANAGER', 'EMPLOYEE'] },
  { label: 'Employees', path: '/employees', icon: Users, roles: ['SUPER_ADMIN', 'HR_MANAGER'] },
  { label: 'Attendance', path: '/attendance', icon: CalendarCheck, roles: ['SUPER_ADMIN', 'HR_MANAGER', 'EMPLOYEE'] },
  { label: 'Leave', path: '/leave', icon: CalendarCheck, roles: ['SUPER_ADMIN', 'HR_MANAGER', 'EMPLOYEE'] },
  { label: 'Payroll', path: '/payroll', icon: WalletCards, roles: ['SUPER_ADMIN', 'HR_MANAGER', 'EMPLOYEE'] },
  { label: 'Reports', path: '/reports', icon: FileBarChart, roles: ['SUPER_ADMIN', 'HR_MANAGER'] },
  { label: 'AI Assistant', path: '/ai', icon: Bot, roles: ['SUPER_ADMIN', 'HR_MANAGER'] },
  { label: 'Settings', path: '/settings', icon: Settings, roles: ['SUPER_ADMIN', 'HR_MANAGER', 'EMPLOYEE'] },
]

function Sidebar({ open, close }: { open: boolean; close: () => void }) {
  const { user } = useAuth()
  const items = navItems.filter((item) => user && item.roles.includes(user.role))
  return <><div className={cn('fixed inset-0 z-40 bg-black/50 lg:hidden', open ? 'block' : 'hidden')} onClick={close} /><aside className={cn('fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#302052] text-white transition-transform duration-200 lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}><div className="flex h-20 items-center justify-between border-b border-white/10 px-6"><Link to="/dashboard" className="flex items-center gap-3" onClick={close}><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent font-heading text-lg font-bold text-white">H</span><span><strong className="block font-heading text-lg">Hearth HR</strong><small className="text-white/60">People, thoughtfully</small></span></Link><button onClick={close} className="lg:hidden" aria-label="Close navigation"><X /></button></div><nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto p-4" aria-label="Main navigation">{items.map(({ label, path, icon: Icon }) => <NavLink key={path} to={path} onClick={close} className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition', isActive ? 'bg-accent text-white shadow-md' : 'text-white/70 hover:bg-white/10 hover:text-white')}><Icon size={19} />{label}</NavLink>)}</nav><div className="border-t border-white/10 p-4"><div className="flex items-center gap-3 rounded-lg bg-white/5 p-3"><Avatar name={user?.name ?? 'User'} src={user?.avatarUrl} /><div className="min-w-0"><p className="truncate text-sm font-semibold">{user?.name}</p><p className="truncate text-xs text-white/50">{user?.role.replace('_', ' ')}</p></div></div></div></aside></>
}

export function AppShell({ children }: { children?: ReactNode }) {
  const [mobileNav, setMobileNav] = useState(false); const [profileOpen, setProfileOpen] = useState(false)
  const { user, logout } = useAuth(); const { theme, toggleTheme } = useTheme(); const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)
  return <div className="min-h-screen bg-background"><Sidebar open={mobileNav} close={() => setMobileNav(false)} /><div className="lg:pl-64"><header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur md:px-8"><Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu /></Button><div className="hidden w-full max-w-md md:block"><Input icon={<Search size={17} />} placeholder="Search employees, reports..." aria-label="Global search" /></div><div className="ml-auto flex items-center gap-1"><Button variant="ghost" size="sm" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>{theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}</Button><Button variant="ghost" size="sm" aria-label="Notifications" className="relative"><Bell size={19} /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" /></Button><div className="relative ml-2"><button onClick={() => setProfileOpen((value) => !value)} className="flex items-center gap-2 rounded-lg p-1 hover:bg-background" aria-expanded={profileOpen}><Avatar name={user?.name ?? 'User'} src={user?.avatarUrl} size="sm" /><span className="hidden text-sm font-semibold sm:block">{user?.name.split(' ')[0]}</span><ChevronDown size={15} /></button>{profileOpen && <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-surface p-2 shadow-xl"><Link to="/settings" className="block rounded-lg px-3 py-2 text-sm hover:bg-background" onClick={() => setProfileOpen(false)}>Profile settings</Link><button onClick={logout} className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-500/10">Sign out</button></div>}</div></div></header><main className="p-4 md:p-8"><nav className="mb-5 flex items-center gap-2 text-sm text-muted" aria-label="Breadcrumb"><Link to="/dashboard" className="hover:text-primary">Home</Link>{segments.map((segment, index) => <span key={segment} className="flex items-center gap-2"><span>/</span><span className={index === segments.length - 1 ? 'text-foreground' : ''}>{segment.replaceAll('-', ' ')}</span></span>)}</nav>{children ?? <Outlet />}</main></div></div>
}
