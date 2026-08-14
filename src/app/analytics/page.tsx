'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useHRMS } from '@/shared/providers/HRMSContext';

type AnalyticsData = {
  totalHeadcount: number;
  openHrActions: number;
  attendanceRate: string;
  recruitmentPipeline: { stage: string; candidates: number }[];
  attendanceTrends: { day: string; onTime: number; late: number }[];
};

export default function AnalyticsPage() {
  const { currentUser } = useHRMS();
  const [data, setData] = useState<AnalyticsData>({
    totalHeadcount: 0,
    openHrActions: 0,
    attendanceRate: '0%',
    recruitmentPipeline: [],
    attendanceTrends: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/analytics');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setData(json.data);
          }
        }
      } catch (err) {
        console.error('Failed to load analytics metrics from database:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (currentUser.userRole !== 'admin') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-[#D9E5EE] bg-white p-8 text-center shadow-md">
          <BarChart3 className="mx-auto mb-4 h-12 w-12 rounded-full bg-[#EAF2F8] p-3 text-[#17324A]" />
          <h2 className="text-lg font-bold text-[#17324A]">HR Admin access required</h2>
          <p className="mt-2 text-sm text-[#55708A]">Executive reports are available only to the HR Admin role.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-[#17324A]">
            <BarChart3 className="h-5 w-5 text-[#C96F58]" />
            Executive Reports & HR Analytics
          </h1>
          <p className="text-xs text-[#667085]">Live headcount metrics, attendance trends, and recruitment pipeline computed from PostgreSQL</p>
        </div>

        <button
          onClick={() => alert('Exporting Analytics PDF Report...')}
          className="flex items-center gap-2 rounded-xl border border-[#9FC2DC] bg-[#B0D0EA] px-4 py-2.5 text-xs font-semibold text-[#17324A] shadow-md transition-all hover:bg-[#9FC2DC]"
        >
          <Download className="w-4 h-4" />
          Export Executive Summary
        </button>
      </div>

      {/* Analytics KPI Stat Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#D9E5EE] bg-white p-4 shadow-md">
          <span className="text-xs font-bold text-secondary uppercase tracking-wider">Total Headcount</span>
          <div className="text-2xl font-black text-foreground mt-2">{data.totalHeadcount} Employees</div>
          <span className="text-[11px] text-emerald-500 font-medium">Recorded in Database</span>
        </div>

        <div className="rounded-2xl border border-[#D9E5EE] bg-white p-4 shadow-md">
          <span className="text-xs font-bold text-secondary uppercase tracking-wider">Open HR Actions</span>
          <div className="text-2xl font-black text-emerald-500 mt-2">{data.openHrActions} Items</div>
          <span className="text-[11px] text-secondary">Pending tickets, leaves & document requests</span>
        </div>

        <div className="rounded-2xl border border-[#D9E5EE] bg-white p-4 shadow-md">
          <span className="text-xs font-bold text-secondary uppercase tracking-wider">Monthly Attendance Rate</span>
          <div className="text-2xl font-black text-[#B86B78] mt-2">{data.attendanceRate}</div>
          <span className="text-[11px] text-emerald-500 font-medium">Calculated from attendance records</span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recruitment pipeline chart */}
        <div className="space-y-4 rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Recruitment Pipeline Activity
            </h3>
            <span className="text-xs text-secondary">Live Candidate Pipeline</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.recruitmentPipeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="stage" stroke="var(--secondary)" fontSize={11} />
                <YAxis stroke="var(--secondary)" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--surface-elevated)', borderColor: 'var(--border)', borderRadius: '12px', fontSize: '12px', color: 'var(--foreground)' }}
                />
                <Bar dataKey="candidates" fill="#10b981" radius={[4, 4, 0, 0]} name="Candidates" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance Adherence Trends */}
        <div className="space-y-4 rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#B86B78]" />
              Weekly Attendance Adherence (%)
            </h3>
            <span className="text-xs text-secondary">From Database Records</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.attendanceTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--secondary)" fontSize={11} />
                <YAxis stroke="var(--secondary)" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--surface-elevated)', borderColor: 'var(--border)', borderRadius: '12px', fontSize: '12px', color: 'var(--foreground)' }}
                />
                <Bar dataKey="onTime" fill="#4F9B68" radius={[4, 4, 0, 0]} name="On Time (%)" />
                <Bar dataKey="late" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Late (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
