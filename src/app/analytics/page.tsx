'use client';

import React from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Users,
  DollarSign,
  Download,
  Filter
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { MOCK_ANALYTICS } from '@/data/mockData';

export default function AnalyticsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#B86B78]" />
            Executive Reports & HR Analytics
          </h1>
          <p className="text-xs text-secondary">Headcount metrics, payroll expense trends, and organizational compliance insights</p>
        </div>

        <button
          onClick={() => alert('Exporting Analytics PDF Report...')}
          className="px-4 py-2.5 rounded-xl bg-[#8B3A4A] hover:bg-[#A04456] text-white text-xs font-semibold shadow-md flex items-center gap-2 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Export Executive Summary
        </button>
      </div>

      {/* Analytics KPI Stat Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-surface border border-border shadow-md">
          <span className="text-xs font-bold text-secondary uppercase tracking-wider">Total Headcount</span>
          <div className="text-2xl font-black text-foreground mt-2">105 Employees</div>
          <span className="text-[11px] text-emerald-500 font-medium">+8.2% YoY Growth</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border shadow-md">
          <span className="text-xs font-bold text-secondary uppercase tracking-wider">Avg Salary Per Employee</span>
          <div className="text-2xl font-black text-emerald-500 mt-2">$118,500 / yr</div>
          <span className="text-[11px] text-secondary">Market Competitive Index 1.05</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border shadow-md">
          <span className="text-xs font-bold text-secondary uppercase tracking-wider">Monthly Attendance Rate</span>
          <div className="text-2xl font-black text-[#B86B78] mt-2">96.4%</div>
          <span className="text-[11px] text-emerald-500 font-medium">+1.2% versus last month</span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Payroll Expense Chart */}
        <div className="p-6 rounded-2xl bg-surface border border-border shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              Monthly Payroll Expense Trend ($)
            </h3>
            <span className="text-xs text-secondary">2026 YTD</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_ANALYTICS.monthlyPayrollCost}>
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--secondary)" fontSize={11} />
                <YAxis stroke="var(--secondary)" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--surface-elevated)', borderColor: 'var(--border)', borderRadius: '12px', fontSize: '12px', color: 'var(--foreground)' }}
                />
                <Area type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCost)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance Adherence Trends */}
        <div className="p-6 rounded-2xl bg-surface border border-border shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#B86B78]" />
              Weekly Attendance Adherence (%)
            </h3>
            <span className="text-xs text-secondary">This Week</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_ANALYTICS.attendanceTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--secondary)" fontSize={11} />
                <YAxis stroke="var(--secondary)" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--surface-elevated)', borderColor: 'var(--border)', borderRadius: '12px', fontSize: '12px', color: 'var(--foreground)' }}
                />
                <Bar dataKey="onTime" fill="#8B3A4A" radius={[4, 4, 0, 0]} name="On Time (%)" />
                <Bar dataKey="late" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Late (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
