'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  CreditCard,
  Target,
  BarChart3,
  Building2,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Briefcase,
  LogOut
} from 'lucide-react';
import { useHRMS } from '@/context/HRMSContext';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { currentUser, logout } = useHRMS();

  const role = currentUser.userRole;

  const NAV_ITEMS = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['employee', 'manager', 'admin'] },
    { name: 'Employee Directory', href: '/employees', icon: Users, roles: ['manager', 'admin'] },
    { name: 'Attendance & Time', href: '/attendance', icon: Clock, roles: ['employee', 'manager', 'admin'] },
    { name: 'Leave Management', href: '/leaves', icon: CalendarDays, roles: ['employee', 'manager', 'admin'] },
    { name: 'Payroll & Payslips', href: '/payroll', icon: CreditCard, roles: ['employee', 'admin'] },
    { name: 'Performance & OKRs', href: '/performance', icon: Target, roles: ['employee', 'manager', 'admin'] },
    { name: 'Reports & Analytics', href: '/analytics', icon: BarChart3, roles: ['admin'] },
  ];

  const allowedNav = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const getRoleBadge = () => {
    switch (role) {
      case 'admin':
        return { label: 'HR Admin Portal', icon: ShieldCheck, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'manager':
        return { label: 'Manager Portal', icon: Briefcase, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      default:
        return { label: 'Employee ESS Portal', icon: UserCheck, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    }
  };

  const badge = getRoleBadge();
  const BadgeIcon = badge.icon;

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col h-screen sticky top-0 z-40 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-slate-100 text-lg tracking-tight leading-none">Apex HRMS</h1>
          <span className="text-[11px] text-indigo-400 font-medium tracking-wide uppercase">Enterprise Suite</span>
        </div>
      </div>

      {/* Role Indicator Banner */}
      <div className="px-4 pt-4 pb-2">
        <div className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-2 ${badge.color}`}>
          <BadgeIcon className="w-4 h-4" />
          <span>{badge.label}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-500 uppercase">Navigation</div>
        {allowedNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                <span>{item.name}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-200" />}
            </Link>
          );
        })}
      </nav>

      {/* Profile Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50 space-y-3">
        <div className="flex items-center gap-3">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-9 h-9 rounded-full object-cover border border-slate-700 ring-2 ring-indigo-500/20"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-100 truncate">{currentUser.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{currentUser.role}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full py-1.5 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          Switch Account / Logout
        </button>
      </div>
    </aside>
  );
};
