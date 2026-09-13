'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Briefcase,
  Building2,
  Crown,
  Gauge,
  LoaderCircle,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import { authFetch } from '@/lib/api-client';
import { useHRMS } from '@/shared/providers/HRMSContext';

interface ExecutiveSummary {
  generatedAt: string;
  headline: {
    totalHeadcount: number;
    newHiresThisMonth: number;
    attritionRate: string;
    attritionNote: string;
    openPositions: number;
    openHrActions: number;
    attendanceRate: string;
    activeExitRequests: number;
  };
  headcountByDept: { name: string; count: number; color: string }[];
  workforceByRole: { role: string; count: number }[];
  recruitmentPipeline: { stage: string; candidates: number }[];
  compliance: { id: string; title: string; badge: string; detail: string; count: number }[];
}

const ROLE_LABELS: Record<string, string> = {
  employee: 'Employees',
  manager: 'Managers',
  admin: 'HR Admins',
  ceo: 'CEO',
  super_admin: 'Super Admins',
};

export const CeoDashboard: React.FC = () => {
  const { currentUser } = useHRMS();
  const [summary, setSummary] = useState<ExecutiveSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    authFetch<{ success: boolean; data: ExecutiveSummary }>('/api/analytics/executive')
      .then((res) => {
        if (cancelled) return;
        if (res?.success && res.data) setSummary(res.data);
        else setError('Executive summary is unavailable right now.');
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the executive summary.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const maxDept = Math.max(1, ...(summary?.headcountByDept.map((d) => d.count) ?? [1]));
  const totalRoleCount = Math.max(1, (summary?.workforceByRole ?? []).reduce((sum, r) => sum + r.count, 0));

  const kpis = summary
    ? [
        { label: 'Total Headcount', value: String(summary.headline.totalHeadcount), icon: Users, hint: `${summary.headline.newHiresThisMonth} new this month` },
        { label: 'Attrition Rate', value: summary.headline.attritionRate, icon: TrendingUp, hint: summary.headline.attritionNote },
        { label: 'Open Positions', value: String(summary.headline.openPositions), icon: Briefcase, hint: 'Active job openings' },
        { label: 'Attendance Rate', value: summary.headline.attendanceRate, icon: Gauge, hint: 'Recent org-wide average' },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Executive header */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-[#17324A] via-[#243a6b] to-[#3b2d6b] px-6 py-6 text-white shadow-sm">
        <div className="absolute -right-6 -top-10 h-32 w-32 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
            <Crown className="h-5 w-5 text-amber-300" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-200">Executive Overview</p>
            <h1 className="text-lg font-bold">Welcome, {currentUser.name.split(' ')[0]}</h1>
            <p className="text-xs text-indigo-100/80">A company-wide, read-only view of the people organization.</p>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-[#D9E5EE] bg-white py-10 text-sm text-[#5F7180]">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Loading executive summary…
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">{error}</div>
      )}

      {!isLoading && summary && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.label} className="rounded-xl border border-[#D9E5EE] bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#7B8B99]">{kpi.label}</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF2F8] text-[#17324A]">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-[#17324A]">{kpi.value}</p>
                  <p className="mt-1 text-[11px] text-[#7B8B99]">{kpi.hint}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Headcount by department */}
            <div className="rounded-xl border border-[#D9E5EE] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#315B76]" />
                <h2 className="text-sm font-bold text-[#17324A]">Headcount by Department</h2>
              </div>
              <div className="space-y-3">
                {summary.headcountByDept.map((dept) => (
                  <div key={dept.name}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-[#3D4C59]">{dept.name}</span>
                      <span className="font-semibold text-[#17324A]">{dept.count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#EEF3F7]">
                      <div className="h-full rounded-full" style={{ width: `${(dept.count / maxDept) * 100}%`, backgroundColor: dept.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Workforce by role */}
            <div className="rounded-xl border border-[#D9E5EE] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-[#315B76]" />
                <h2 className="text-sm font-bold text-[#17324A]">Workforce by Access Level</h2>
              </div>
              <div className="space-y-3">
                {summary.workforceByRole.map((row) => (
                  <div key={row.role} className="flex items-center justify-between rounded-lg border border-[#E7EEF4] bg-[#F8FBFD] px-3 py-2">
                    <span className="text-xs font-medium text-[#3D4C59]">{ROLE_LABELS[row.role] ?? row.role}</span>
                    <span className="text-xs font-bold text-[#17324A]">
                      {row.count}
                      <span className="ml-1 font-normal text-[#8A9AAA]">({Math.round((row.count / totalRoleCount) * 100)}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Recruitment pipeline */}
            <div className="rounded-xl border border-[#D9E5EE] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-[#315B76]" />
                <h2 className="text-sm font-bold text-[#17324A]">Recruitment Pipeline</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {summary.recruitmentPipeline.map((stage) => (
                  <div key={stage.stage} className="rounded-lg border border-[#E7EEF4] bg-[#F8FBFD] p-3 text-center">
                    <p className="text-lg font-bold text-[#17324A]">{stage.candidates}</p>
                    <p className="text-[11px] text-[#7B8B99]">{stage.stage}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Attention required */}
            <div className="rounded-xl border border-[#D9E5EE] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#315B76]" />
                <h2 className="text-sm font-bold text-[#17324A]">Requires Attention</h2>
              </div>
              <div className="space-y-2">
                {summary.compliance.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-[#E7EEF4] px-3 py-2">
                    <span className="text-xs text-[#3D4C59]">{item.title}</span>
                    <span className="rounded-full bg-[#EAF2F8] px-2 py-0.5 text-[10px] font-semibold text-[#315B76]">{item.badge}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Link to full analytics (CEO inherits admin access) */}
          <Link
            href="/analytics"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D9E5EE] bg-white px-4 py-2.5 text-xs font-semibold text-[#17324A] shadow-sm transition-colors hover:bg-[#F5F9FC]"
          >
            <BarChart3 className="h-4 w-4" />
            Open full People Analytics
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </>
      )}
    </div>
  );
};
