'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowUpRight,
  History,
  KeyRound,
  LoaderCircle,
  ShieldPlus,
  Users,
} from 'lucide-react';
import { authFetch } from '@/lib/api-client';
import { useHRMS } from '@/shared/providers/HRMSContext';

interface SystemOverview {
  totalEmployees: number;
  activeSessions: number;
  auditLogCount: number;
  privilegedAccounts: number;
  workforceByRole: { role: string; label: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
}

export const SuperAdminDashboard: React.FC = () => {
  const { currentUser } = useHRMS();
  const [overview, setOverview] = useState<SystemOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    authFetch<{ success: boolean; data: SystemOverview }>('/api/administration/overview')
      .then((res) => {
        if (cancelled) return;
        if (res?.success && res.data) setOverview(res.data);
        else setError('System overview is unavailable right now.');
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the system overview.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = overview
    ? [
        { label: 'Total Users', value: String(overview.totalEmployees), icon: Users, hint: 'Accounts in the directory' },
        { label: 'Privileged Accounts', value: String(overview.privilegedAccounts), icon: ShieldPlus, hint: 'Admin, CEO & Super Admin' },
        { label: 'Active Sessions', value: String(overview.activeSessions), icon: Activity, hint: 'Currently signed in' },
        { label: 'Audit Log Entries', value: String(overview.auditLogCount), icon: History, hint: 'Total recorded events' },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-[#2b1b52] via-[#3b2d6b] to-[#17324A] px-6 py-6 text-white shadow-sm">
        <div className="absolute -right-6 -top-10 h-32 w-32 rounded-full bg-white/5" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
              <ShieldPlus className="h-5 w-5 text-violet-200" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200">System Administration</p>
              <h1 className="text-lg font-bold">Welcome, {currentUser.name.split(' ')[0]}</h1>
              <p className="text-xs text-violet-100/80">Manage users, roles, and the organization&apos;s audit trail.</p>
            </div>
          </div>
          <Link
            href="/administration"
            className="hidden items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/20 transition-colors hover:bg-white/20 sm:inline-flex"
          >
            <KeyRound className="h-3.5 w-3.5" />
            Open console
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-[#D9E5EE] bg-white py-10 text-sm text-[#5F7180]">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Loading system overview…
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">{error}</div>
      )}

      {!isLoading && overview && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-xl border border-[#D9E5EE] bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#7B8B99]">{stat.label}</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-[#17324A]">{stat.value}</p>
                  <p className="mt-1 text-[11px] text-[#7B8B99]">{stat.hint}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Role distribution */}
            <div className="rounded-xl border border-[#D9E5EE] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-[#315B76]" />
                <h2 className="text-sm font-bold text-[#17324A]">Accounts by Role</h2>
              </div>
              <div className="space-y-2">
                {overview.workforceByRole.map((row) => (
                  <div key={row.role} className="flex items-center justify-between rounded-lg border border-[#E7EEF4] bg-[#F8FBFD] px-3 py-2">
                    <span className="text-xs font-medium text-[#3D4C59]">{row.label}</span>
                    <span className="text-xs font-bold text-[#17324A]">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status breakdown */}
            <div className="rounded-xl border border-[#D9E5EE] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#315B76]" />
                <h2 className="text-sm font-bold text-[#17324A]">Employment Status</h2>
              </div>
              <div className="space-y-2">
                {overview.statusBreakdown.map((row) => (
                  <div key={row.status} className="flex items-center justify-between rounded-lg border border-[#E7EEF4] bg-[#F8FBFD] px-3 py-2">
                    <span className="text-xs font-medium text-[#3D4C59]">{row.status}</span>
                    <span className="text-xs font-bold text-[#17324A]">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Link
            href="/administration"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D9E5EE] bg-white px-4 py-2.5 text-xs font-semibold text-[#17324A] shadow-sm transition-colors hover:bg-[#F5F9FC] sm:hidden"
          >
            <KeyRound className="h-4 w-4" />
            Open System Administration console
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </>
      )}
    </div>
  );
};
