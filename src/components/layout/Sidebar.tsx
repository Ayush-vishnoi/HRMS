'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UsersRound,
  Clock,
  CalendarDays,
  CalendarRange,
  CreditCard,
  Target,
  BarChart3,
  ScanSearch,
  Building2,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Briefcase,
  Crown,
  FileText,
  BookOpen,
  LogOut,
  Network,
  CheckSquare,
  User,
} from 'lucide-react';
import { useHRMS } from '@/context/HRMSContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
}

interface NavGroup {
  groupName: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { currentUser, logout } = useHRMS();

  const role = currentUser.userRole;

  const NAV_GROUPS: NavGroup[] = [
    {
      groupName: 'EXECUTIVE',
      items: [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['employee', 'team_lead', 'manager', 'admin', 'ceo'] },
        { name: 'My Team', href: '/my-team', icon: UsersRound, roles: ['team_lead', 'manager', 'ceo'] },
        { name: 'Organization Chart', href: '/employees?view=org-chart', icon: Network, roles: ['manager', 'admin', 'ceo'] },
        { name: 'Executive Approvals', href: '/performance', icon: CheckSquare, roles: ['admin', 'ceo'] },
      ],
    },
    {
      groupName: 'PEOPLE',
      items: [
        { name: 'Employee Directory', href: '/employees', icon: Users, roles: ['team_lead', 'manager', 'admin', 'ceo'] },
        { name: 'Attendance & Workforce', href: '/attendance', icon: Clock, roles: ['employee', 'team_lead', 'manager', 'admin', 'ceo'] },
        { name: 'Leave & Time Off', href: '/leaves', icon: CalendarDays, roles: ['employee', 'team_lead', 'manager', 'admin', 'ceo'] },
        { name: 'Performance & OKRs', href: '/performance', icon: Target, roles: ['employee', 'team_lead', 'manager', 'admin', 'ceo'] },
        { name: 'Meetings & Calendar', href: '/meetings/calendar', icon: CalendarRange, roles: ['employee', 'team_lead', 'manager', 'admin', 'ceo'] },
      ],
    },
    {
      groupName: 'TALENT',
      items: [
        { name: 'Recruitment', href: '/recruitment', icon: ScanSearch, roles: ['admin', 'ceo'] },
      ],
    },
    {
      groupName: 'COMPENSATION',
      items: [
        { name: 'Payroll & Compensation', href: '/payroll', icon: CreditCard, roles: ['employee', 'team_lead', 'manager', 'admin', 'ceo'] },
      ],
    },
    {
      groupName: 'GOVERNANCE',
      items: [
        { name: 'Policies & Governance', href: '/policies', icon: BookOpen, roles: ['employee', 'team_lead', 'manager', 'admin', 'ceo'] },
        { name: 'Documents', href: '/documents', icon: FileText, roles: ['employee', 'team_lead', 'manager', 'admin', 'ceo'] },
        { name: 'Reports & Analytics', href: '/analytics', icon: BarChart3, roles: ['admin', 'ceo'] },
      ],
    },
    {
      groupName: 'PERSONAL',
      items: [
        { name: 'My Attendance', href: '/attendance?tab=personal', icon: Clock, roles: ['employee', 'team_lead', 'manager', 'admin', 'ceo'] },
        { name: 'My Leave', href: '/leaves?tab=personal', icon: CalendarDays, roles: ['employee', 'team_lead', 'manager', 'admin', 'ceo'] },
        { name: 'My Payslips', href: '/payroll?tab=personal', icon: CreditCard, roles: ['employee', 'team_lead', 'manager', 'admin', 'ceo'] },
      ],
    },
  ];

  const getRoleBadge = () => {
    switch (role) {
      case 'ceo':
        return { label: 'CEO Executive Portal', icon: Crown, color: 'bg-purple-500/15 text-purple-700 border-purple-500/30' };
      case 'admin':
        return { label: 'HR Admin Portal', icon: ShieldCheck, color: 'bg-amber-500/15 text-amber-700 border-amber-500/30' };
      case 'manager':
        return { label: 'Manager Portal', icon: Briefcase, color: 'bg-[#B0D0EA]/30 text-[#17324A] border-[#B0D0EA]' };
      case 'team_lead':
        return { label: 'Team Lead Portal', icon: UsersRound, color: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' };
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

      {/* Grouped Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => item.roles.includes(role));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.groupName} className="space-y-1">
              <div className="px-2.5 text-[10px] font-bold tracking-wider text-muted uppercase">
                {group.groupName}
              </div>

              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/' && !item.href.includes('?') && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors group ${
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
            </div>
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
          onClick={logout}
          className="w-full py-1.5 px-2.5 rounded-md bg-error-bg hover:bg-error/20 text-error border border-error/30 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </button>
      </div>
    </aside>
  );
};


