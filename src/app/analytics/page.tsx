'use client';

import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Users,
  DollarSign,
  Download,
  Filter,
  Building,
  Target,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  MapPin,
  Briefcase,
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
  Cell,
  Legend,
} from 'recharts';
import { MOCK_ANALYTICS, TOTAL_HEADCOUNT } from '@/data/mockData';
import { formatCompactINR, formatINR } from '@/utils/formatters';
import { exportToExcel } from '@/utils/exportUtils';
import { useHRMS } from '@/context/HRMSContext';

export default function AnalyticsPage() {
  const { currentUser, employees } = useHRMS();

  // Tab State
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<
    'workforce' | 'compensation' | 'performance' | 'compliance'
  >('workforce');

  // Filters State
  const [dateRange, setDateRange] = useState('YTD 2026');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [employmentType, setEmploymentType] = useState('All');

  const deptDistributionData = [
    { name: 'Engineering', count: 42, color: '#17324A' },
    { name: 'Sales & Success', count: 25, color: '#2563eb' },
    { name: 'Marketing & Brand', count: 15, color: '#7c3aed' },
    { name: 'HR & Operations', count: 10, color: '#d97706' },
    { name: 'Finance & Legal', count: 8, color: '#4b5563' },
    { name: 'Product & Design', count: 5, color: '#059669' },
  ];

  const handleExportExecutiveSummary = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const filename = `apex-hrms-executive-summary-${todayStr}.xlsx`;

    const summaryRows = [
      { Metric: 'Total Headcount', Value: '105 Employees', Target: '110', Variance: 'On Track' },
      { Metric: 'Monthly Payroll Expense', Value: '₹2.15 Cr', Target: '₹2.20 Cr', Variance: '+₹5L Savings' },
      { Metric: 'Annual Payroll Commitment', Value: '₹25.8 Cr', Target: '₹26.4 Cr', Variance: 'Within Budget' },
      { Metric: 'Average Employee CTC', Value: '₹11.85 Lakhs', Target: '₹12.0 Lakhs', Variance: 'Market Standard' },
      { Metric: 'Attendance Adherence Rate', Value: '96.4%', Target: '95.0%', Variance: '+1.4% Above Target' },
      { Metric: 'Annual Attrition Rate', Value: '4.2%', Target: '< 6.0%', Variance: 'Low Risk' },
      { Metric: 'OKR Completion Rate', Value: '82.0%', Target: '85.0%', Variance: '-3.0% Slight Lag' },
      { Metric: 'Compliance Score', Value: '99.2%', Target: '100.0%', Variance: 'SOC2 Compliant' },
    ];

    const columns = [
      { header: 'Executive Key Metric', key: 'Metric' as const },
      { header: 'Current Value', key: 'Value' as const },
      { header: 'Benchmark Target', key: 'Target' as const },
      { header: 'Variance & Status', key: 'Variance' as const },
    ];

    exportToExcel(summaryRows, columns, filename, 'Executive HR Summary');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 select-none">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#17324A] flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#17324A]" />
            Reports & Executive HR Analytics
          </h1>
          <p className="text-xs text-[#5F7180]">
            Organization-wide analytics for workforce velocity, payroll expenditure, OKR performance, and legal compliance
          </p>
        </div>

        <button
          onClick={handleExportExecutiveSummary}
          className="px-4 py-2.5 rounded-xl bg-[#17324A] hover:bg-[#234B68] text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Export Executive Summary (Excel)
        </button>
      </div>

      {/* Global Executive Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#17324A]" />
          <span className="text-xs font-bold text-[#17324A]">Executive Analytics Filters:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div>
            <label className="text-[10px] font-bold uppercase text-[#5F7180] block mb-0.5">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="p-2 rounded-xl border border-[#D9E5EE] bg-[#F5F9FC] text-xs font-semibold focus:outline-none focus:border-[#17324A]"
            >
              <option value="YTD 2026">YTD 2026</option>
              <option value="Q3 2026">Q3 2026 (Jul - Sep)</option>
              <option value="Q2 2026">Q2 2026 (Apr - Jun)</option>
              <option value="Full Year 2025">Full Year 2025</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-[#5F7180] block mb-0.5">Department</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="p-2 rounded-xl border border-[#D9E5EE] bg-[#F5F9FC] text-xs font-semibold focus:outline-none focus:border-[#17324A]"
            >
              <option value="All">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Sales">Sales & Success</option>
              <option value="Marketing">Marketing</option>
              <option value="HR">Human Resources</option>
              <option value="Finance">Finance & Legal</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-[#5F7180] block mb-0.5">Location</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="p-2 rounded-xl border border-[#D9E5EE] bg-[#F5F9FC] text-xs font-semibold focus:outline-none focus:border-[#17324A]"
            >
              <option value="All">All Locations</option>
              <option value="Bengaluru">Bengaluru HQ</option>
              <option value="Mumbai">Mumbai Regional</option>
              <option value="Pune">Pune Tech Center</option>
              <option value="Remote">Remote</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-[#5F7180] block mb-0.5">Employment Type</label>
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className="p-2 rounded-xl border border-[#D9E5EE] bg-[#F5F9FC] text-xs font-semibold focus:outline-none focus:border-[#17324A]"
            >
              <option value="All">All Types</option>
              <option value="Full-Time">Full-Time Permanent</option>
              <option value="Contract">Contract & Consultant</option>
            </select>
          </div>
        </div>
      </div>

      {/* Analytics Module Navigation Tabs */}
      <div className="flex items-center gap-2 bg-[#F5F9FC] p-1.5 rounded-2xl border border-[#D9E5EE] overflow-x-auto">
        <button
          onClick={() => setActiveAnalyticsTab('workforce')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeAnalyticsTab === 'workforce'
              ? 'bg-[#17324A] text-white shadow-md'
              : 'text-[#5F7180] hover:text-[#17324A]'
          }`}
        >
          <Users className="w-4 h-4" />
          Workforce Analytics
        </button>

        <button
          onClick={() => setActiveAnalyticsTab('compensation')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeAnalyticsTab === 'compensation'
              ? 'bg-[#17324A] text-white shadow-md'
              : 'text-[#5F7180] hover:text-[#17324A]'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Compensation Analytics
        </button>

        <button
          onClick={() => setActiveAnalyticsTab('performance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeAnalyticsTab === 'performance'
              ? 'bg-[#17324A] text-white shadow-md'
              : 'text-[#5F7180] hover:text-[#17324A]'
          }`}
        >
          <Target className="w-4 h-4" />
          Performance & OKRs
        </button>

        <button
          onClick={() => setActiveAnalyticsTab('compliance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeAnalyticsTab === 'compliance'
              ? 'bg-[#17324A] text-white shadow-md'
              : 'text-[#5F7180] hover:text-[#17324A]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Compliance & Governance
        </button>
      </div>

      {/* TAB 1: WORKFORCE ANALYTICS */}
      {activeAnalyticsTab === 'workforce' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md">
              <span className="text-xs font-bold text-[#5F7180] uppercase tracking-wider">Total Headcount</span>
              <div className="text-2xl font-black text-[#17324A] mt-2">{TOTAL_HEADCOUNT} Employees</div>
              <span className="text-[11px] text-emerald-600 font-bold">+8.2% YoY Growth</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md">
              <span className="text-xs font-bold text-[#5F7180] uppercase tracking-wider">Annual Attrition Rate</span>
              <div className="text-2xl font-black text-amber-600 mt-2">4.2%</div>
              <span className="text-[11px] text-emerald-600 font-bold">↓ 1.1% vs Q2</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md">
              <span className="text-xs font-bold text-[#5F7180] uppercase tracking-wider">Hiring Velocity</span>
              <div className="text-2xl font-black text-emerald-600 mt-2">18 Days Avg</div>
              <span className="text-[11px] text-[#5F7180]">Turnaround for senior roles</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Distribution Pie Chart */}
            <div className="p-6 rounded-2xl bg-white border border-[#B0D0EA] shadow-md space-y-4">
              <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-[#17324A]" />
                Department Headcount Distribution (Total {TOTAL_HEADCOUNT})
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={deptDistributionData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {deptDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Attendance Trends */}
            <div className="p-6 rounded-2xl bg-white border border-[#B0D0EA] shadow-md space-y-4">
              <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#17324A]" />
                Weekly Attendance Adherence (%)
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MOCK_ANALYTICS.attendanceTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAF2F8" />
                    <XAxis dataKey="day" stroke="#5F7180" fontSize={11} />
                    <YAxis stroke="#5F7180" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#B0D0EA', fontSize: '12px' }} />
                    <Bar dataKey="onTime" fill="#17324A" radius={[4, 4, 0, 0]} name="On Time (%)" />
                    <Bar dataKey="late" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Late (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPENSATION ANALYTICS */}
      {activeAnalyticsTab === 'compensation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md">
              <span className="text-xs font-bold text-[#5F7180] uppercase tracking-wider">Monthly Payroll</span>
              <div className="text-2xl font-black text-[#17324A] mt-2">₹2.15 Cr</div>
              <span className="text-[11px] text-emerald-600 font-bold">+7.4% YoY</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md">
              <span className="text-xs font-bold text-[#5F7180] uppercase tracking-wider">Average CTC</span>
              <div className="text-2xl font-black text-emerald-600 mt-2">{formatINR(1185000)} / yr</div>
              <span className="text-[11px] text-[#5F7180]">Market Index 1.05</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md">
              <span className="text-xs font-bold text-[#5F7180] uppercase tracking-wider">Compensation Utilization</span>
              <div className="text-2xl font-black text-indigo-700 mt-2">97.7%</div>
              <span className="text-[11px] text-[#5F7180]">Budget: ₹2.20 Cr</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#B0D0EA] shadow-md space-y-4">
            <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Monthly Payroll Expenditure Trend (INR)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MOCK_ANALYTICS.monthlyPayrollCost}>
                  <defs>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EAF2F8" />
                  <XAxis dataKey="month" stroke="#5F7180" fontSize={11} />
                  <YAxis stroke="#5F7180" fontSize={11} tickFormatter={(value) => formatCompactINR(Number(value))} />
                  <Tooltip formatter={(value) => formatINR(Number(value))} contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#B0D0EA', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCost)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PERFORMANCE & OKRS */}
      {activeAnalyticsTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md">
              <span className="text-xs font-bold text-[#5F7180] uppercase tracking-wider">Overall OKR Completion</span>
              <div className="text-2xl font-black text-indigo-700 mt-2">82%</div>
              <span className="text-[11px] text-emerald-600 font-bold">+5% vs Q2 Target</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md">
              <span className="text-xs font-bold text-[#5F7180] uppercase tracking-wider">Top Performing Dept</span>
              <div className="text-2xl font-black text-emerald-600 mt-2">HR & Operations</div>
              <span className="text-[11px] text-[#5F7180]">95/100 Index Score</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md">
              <span className="text-xs font-bold text-[#5F7180] uppercase tracking-wider">At-Risk KRAs</span>
              <div className="text-2xl font-black text-amber-600 mt-1">1 KRA</div>
              <span className="text-[11px] text-[#5F7180]">Onboarding turnaround reduction</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COMPLIANCE & GOVERNANCE */}
      {activeAnalyticsTab === 'compliance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md">
              <span className="text-xs font-bold text-[#5F7180] uppercase tracking-wider">Compliance Score</span>
              <div className="text-2xl font-black text-emerald-600 mt-2">99.2%</div>
              <span className="text-[11px] text-[#5F7180]">SOC2 & ISO 27001 Certified</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md">
              <span className="text-xs font-bold text-[#5F7180] uppercase tracking-wider">Policy Acknowledgment</span>
              <div className="text-2xl font-black text-purple-700 mt-2">100% Signed</div>
              <span className="text-[11px] text-[#5F7180]">Across all 105 workforce</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md">
              <span className="text-xs font-bold text-[#5F7180] uppercase tracking-wider">Pending Compliance Actions</span>
              <div className="text-2xl font-black text-emerald-600 mt-2">0 Urgent</div>
              <span className="text-[11px] text-emerald-600 font-bold">All audits clear</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
