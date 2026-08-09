'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UsersRound,
  Clock,
  CalendarDays,
  CalendarRange,
  CreditCard,
  Headset,
  Archive,
  Target,
  FileText,
  BookOpenCheck,
  BarChart3,
  ScanSearch,
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
  const router = useRouter();
  const { currentUser, logout } = useHRMS();

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  const role = currentUser.userRole;

  const NAV_ITEMS = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['employee', 'manager', 'admin'] },
    { name: 'My Team', href: '/my-team', icon: UsersRound, roles: ['manager'] },
    { name: 'Employee Directory', href: '/employees', icon: Users, roles: ['manager', 'admin'] },
    { name: 'Attendance & Time', href: '/attendance', icon: Clock, roles: ['employee', 'manager', 'admin'] },
    { name: 'Leave Management', href: '/leaves', icon: CalendarDays, roles: ['employee', 'manager', 'admin'] },
    { name: 'Meetings & Calendar', href: '/meetings/calendar', icon: CalendarRange, roles: ['employee', 'manager', 'admin'] },
    { name: 'Payroll & Payslips', href: '/payroll', icon: CreditCard, roles: ['employee', 'admin'] },
    { name: 'KRA', href: '/performance', icon: Target, roles: ['employee', 'manager', 'admin'] },
    { name: 'Documents', href: '/documents', icon: FileText, roles: ['employee', 'manager', 'admin'] },
    { name: 'Policy Center', href: '/policies', icon: BookOpenCheck, roles: ['employee', 'manager', 'admin'] },
    { name: 'Reports & Analytics', href: '/analytics', icon: BarChart3, roles: ['admin'] },
    { name: 'HR Help Desk', href: '/help-desk', icon: Headset, roles: ['admin'] },
    { name: 'Asset & Inventory', href: '/assets', icon: Archive, roles: ['admin'] },
    { name: 'Recruitment', href: '/recruitment', icon: ScanSearch, roles: ['admin'] },
  ];

  const allowedNav = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const getRoleBadge = () => {
    switch (role) {
      case 'admin':
        return { label: 'HR Admin Portal', icon: ShieldCheck, color: 'bg-amber-500/15 text-amber-700 border-amber-500/30' };
      case 'manager':
        return { label: 'Manager Portal', icon: Briefcase, color: 'bg-[#B0D0EA]/30 text-[#17324A] border-[#B0D0EA]' };
      default:
        return { label: 'Employee ESS Portal', icon: UserCheck, color: 'bg-[#C96F58]/15 text-[#A95745] border-[#C96F58]/30' };
    }
  };

  const badge = getRoleBadge();
  const BadgeIcon = badge.icon;

  return (
    <aside className="w-64 bg-surface border-r border-border text-secondary flex flex-col h-screen sticky top-0 z-40 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-border flex items-center gap-3 bg-surface">
        <div className="w-8 h-8 rounded-lg bg-[#B0D0EA]/30 border border-[#B0D0EA] flex items-center justify-center text-[#17324A]">
          <Building2 className="w-4 h-4" />
        </div>
        <div>
          <h1 className="font-semibold text-foreground text-sm tracking-tight leading-none">Apex HRMS</h1>
          <span className="text-[10px] text-muted font-medium tracking-wide uppercase">Enterprise Suite</span>
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
        <div className="px-2 pb-1.5 text-[10px] font-semibold tracking-wider text-muted uppercase">Navigation</div>
        {allowedNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href === '/meetings/calendar' && pathname.startsWith('/meetings'));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-colors group ${
                isActive
                  ? 'bg-[#B0D0EA] text-[#17324A] font-semibold'
                  : 'text-secondary hover:bg-surface-elevated hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#17324A]' : 'text-secondary group-hover:text-foreground'}`} />
                <span>{item.name}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#17324A]/70" />}
            </Link>
          );
        })}
      </nav>

      {/* Profile Footer */}
      <div className="p-3 border-t border-border bg-surface-elevated/50 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-8 h-8 rounded-full object-cover border border-border"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{currentUser.name}</p>
            <p className="text-[10px] text-muted truncate">{currentUser.role}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-1.5 px-2.5 rounded-md bg-error-bg hover:bg-error/20 text-error border border-error/30 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </button>
      </div>
    </aside>
  );
};

