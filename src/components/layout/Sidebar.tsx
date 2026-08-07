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
        return { label: 'HR Admin Portal', icon: ShieldCheck, color: 'bg-[#9e6a03]/15 text-[#d29922] border-[#9e6a03]/30' };
      case 'manager':
        return { label: 'Manager Portal', icon: Briefcase, color: 'bg-[#1f6feb]/15 text-[#58a6ff] border-[#1f6feb]/30' };
      default:
        return { label: 'Employee ESS Portal', icon: UserCheck, color: 'bg-[#8B3A4A]/15 text-[#B86B78] border-[#8B3A4A]/30' };
    }
  };

  const badge = getRoleBadge();
  const BadgeIcon = badge.icon;

  return (
    <aside className="w-64 bg-[#161b22] border-r border-[#30363d] text-[#8b949e] flex flex-col h-screen sticky top-0 z-40 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#30363d] flex items-center gap-3 bg-[#161b22]">
        <div className="w-8 h-8 rounded-lg bg-[#8B3A4A]/20 border border-[#8B3A4A]/30 flex items-center justify-center text-[#B86B78]">
          <Building2 className="w-4 h-4" />
        </div>
        <div>
          <h1 className="font-semibold text-[#f0f6fc] text-sm tracking-tight leading-none">Apex HRMS</h1>
          <span className="text-[10px] text-[#8b949e] font-medium tracking-wide uppercase">Enterprise Suite</span>
        </div>
      </div>

      {/* Role Indicator Banner */}
      <div className="px-3 pt-3 pb-1">
        <div className={`px-2.5 py-1.5 rounded-md border text-[11px] font-medium flex items-center gap-2 ${badge.color}`}>
          <BadgeIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{badge.label}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <div className="px-2 pb-1.5 text-[10px] font-semibold tracking-wider text-[#6e7681] uppercase">Navigation</div>
        {allowedNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-colors group ${
                isActive
                  ? 'bg-[#8B3A4A] text-white font-semibold'
                  : 'text-[#8b949e] hover:bg-[#21262d] hover:text-[#f0f6fc]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#8b949e] group-hover:text-[#f0f6fc]'}`} />
                <span>{item.name}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70" />}
            </Link>
          );
        })}
      </nav>

      {/* Profile Footer */}
      <div className="p-3 border-t border-[#30363d] bg-[#0d1117]/50 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-8 h-8 rounded-full object-cover border border-[#30363d]"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#f0f6fc] truncate">{currentUser.name}</p>
            <p className="text-[10px] text-[#8b949e] truncate">{currentUser.role}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full py-1.5 px-2.5 rounded-md bg-[#da3633]/10 hover:bg-[#da3633]/20 text-[#f85149] border border-[#da3633]/30 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Switch Account / Logout
        </button>
      </div>
    </aside>
  );
};

