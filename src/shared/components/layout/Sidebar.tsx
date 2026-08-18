'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  Building2,
  ChevronRight,
  LockKeyhole,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';
import { isNavigationItemActive, NAV_ITEMS } from '@/shared/lib/navigation';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { currentUser } = useHRMS();

  const role = currentUser.userRole;
  const allowedNav = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const navSections = Array.from(new Set(allowedNav.map((item) => item.section)));

  const getRoleBadge = () => {
    switch (role) {
      case 'admin':
        return { label: 'HR Admin Portal', icon: ShieldCheck, color: 'bg-amber-500/15 text-amber-700 border-amber-500/30' };
      case 'manager':
        return { label: 'Manager Portal', icon: Briefcase, color: 'bg-[#B0D0EA]/30 text-[#17324A] border-[#B0D0EA]' };
      default:
        return { label: 'Employee ESS Portal', icon: UserCheck, color: 'bg-[#EAF2F8] text-[#315B76] border-[#9FC2DC]' };
    }
  };

  const badge = getRoleBadge();
  const BadgeIcon = badge.icon;

  return (
    <aside className="sticky top-0 z-40 flex h-screen w-60 shrink-0 select-none flex-col overflow-hidden border-r border-[#C8D9E6] bg-white text-secondary shadow-[5px_0_24px_rgba(23,50,74,0.05)] lg:w-64">
      {/* Brand Header */}
      <div className="relative overflow-hidden border-b border-[#315B76] bg-gradient-to-br from-[#17324A] via-[#234B68] to-[#315B76] px-4 py-4 text-white">
        <div className="absolute -right-7 -top-9 h-24 w-24 rounded-full bg-[#B0D0EA]/15" />
        <div className="absolute -bottom-8 right-12 h-16 w-16 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-12 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white p-1.5 shadow-sm">
            <img
              src="/m360-logo.jpeg"
              alt="MYLOTIC GROUP Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xs font-bold tracking-tight" title="MYLOTIC GROUP PVT.LTD">
              MYLOTIC GROUP
            </h1>
            <span className="mt-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#DCEAF4]">
              <Building2 className="h-3 w-3" />
              People Workspace
            </span>
          </div>
        </div>
      </div>

      {/* Role Indicator Banner */}
      <div className="px-3.5 pb-2 pt-3.5">
        <div className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[11px] font-semibold shadow-sm ${badge.color}`}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/70 shadow-sm">
            <BadgeIcon className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate">{badge.label}</span>
            <span className="mt-0.5 block text-[9px] font-medium opacity-70">Active workspace</span>
          </span>
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 ring-2 ring-white" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3 pt-1" aria-label="Primary navigation">
        {navSections.map((section, sectionIndex) => (
          <div key={section} className={sectionIndex === 0 ? '' : 'mt-4'}>
            <div className="mb-1.5 px-2.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#8A9AAA]">
              {section}
            </div>
            <div className="space-y-1">
              {allowedNav
                .filter((item) => item.section === section)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = isNavigationItemActive(pathname, item);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={`group relative flex min-h-10 items-center justify-between overflow-hidden rounded-xl border px-2.5 py-2 text-xs font-medium transition-all duration-200 ${
                        isActive
                          ? 'border-[#9FC2DC] bg-gradient-to-r from-[#DCECF7] to-[#EEF6FB] font-bold text-[#17324A] shadow-sm'
                          : 'border-transparent text-[#5F7180] hover:border-[#D9E5EE] hover:bg-[#F5F9FC] hover:text-[#17324A]'
                      }`}
                    >
                      {isActive && <span className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-[#315B76]" />}
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                          isActive
                            ? 'bg-white text-[#234B68] shadow-sm ring-1 ring-[#B0D0EA]/60'
                            : 'bg-[#F1F5F8] text-[#6F7F90] group-hover:bg-[#E5F0F7] group-hover:text-[#315B76]'
                        }`}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="truncate">{item.name}</span>
                      </span>
                      <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-all ${
                        isActive
                          ? 'translate-x-0 text-[#315B76] opacity-100'
                          : '-translate-x-1 text-[#8A9AAA] opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                      }`} />
                    </Link>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[#D9E5EE] bg-[#F8FBFD] p-3">
        <div className="flex items-center gap-2.5 rounded-xl border border-[#D9E5EE] bg-white px-3 py-2.5 shadow-sm">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <LockKeyhole className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-bold text-[#17324A]">Secure HR workspace</span>
            <span className="mt-0.5 block truncate text-[9px] text-[#7B8B99]">Protected employee data</span>
          </span>
        </div>
      </div>
    </aside>
  );
};

