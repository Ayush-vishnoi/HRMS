
'use client';

import React from 'react';
import {
  Users,
  DollarSign,
  TrendingUp,
  Building,
  UserPlus,
  AlertTriangle,
} from 'lucide-react';

import { MOCK_ANALYTICS } from '@/data/mockData';
import { formatINR } from '@/utils/formatters';

export const AdminDashboard: React.FC = () => {
  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#17324A]/70">
          HR Administration
        </p>

        <h1 className="text-xl font-bold text-[#17324A] flex items-center gap-2">
          <Users className="w-5 h-5 text-[#17324A]" />
          HR Admin Dashboard
        </h1>

        <p className="text-xs text-[#17324A]/70 mt-1">
          Monitor workforce, payroll, recruitment, and HR operations.
        </p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Total Headcount */}
        <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-sm hover:border-[#17324A]/40 transition-colors">
          <div className="flex justify-between items-center text-[#17324A]/70 text-xs font-semibold">
            <span>Total Headcount</span>
            <Users className="w-4 h-4 text-[#17324A]" />
          </div>

          <div className="text-2xl font-black text-[#17324A] mt-2">
            105
          </div>

          <span className="text-[11px] text-[#17324A]/70 font-medium">
            +8 new hires this month
          </span>
        </div>

        {/* Payroll */}
        <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-sm hover:border-[#17324A]/40 transition-colors">
          <div className="flex justify-between items-center text-[#17324A]/70 text-xs font-semibold">
            <span>Monthly Payroll Expense</span>
            <DollarSign className="w-4 h-4 text-[#17324A]" />
          </div>

          <div className="text-2xl font-black text-[#17324A] mt-2">
            {formatINR(
              MOCK_ANALYTICS.monthlyPayrollCost.at(-1)?.cost ?? 0
            )}
          </div>

          <span className="text-[11px] text-[#17324A]/60">
            July 2026 Processed
          </span>
        </div>

        {/* Job Openings */}
        <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-sm hover:border-[#17324A]/40 transition-colors">
          <div className="flex justify-between items-center text-[#17324A]/70 text-xs font-semibold">
            <span>Active Job Openings</span>
            <UserPlus className="w-4 h-4 text-[#17324A]" />
          </div>

          <div className="text-2xl font-black text-[#17324A] mt-2">
            14
          </div>

          <span className="text-[11px] text-[#17324A]/70 font-medium">
            Engineering & Product
          </span>
        </div>

        {/* Attrition */}
        <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-sm hover:border-[#17324A]/40 transition-colors">
          <div className="flex justify-between items-center text-[#17324A]/70 text-xs font-semibold">
            <span>Attrition Rate</span>
            <TrendingUp className="w-4 h-4 text-[#17324A]" />
          </div>

          <div className="text-2xl font-black text-[#17324A] mt-2">
            2.4%
          </div>

          <span className="text-[11px] text-[#17324A]/70 font-medium">
            Below industry avg (5%)
          </span>
        </div>
      </div>

      {/* Admin Quick Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Department Headcount */}
        <div className="md:col-span-2 p-6 rounded-2xl bg-white border border-[#B0D0EA] shadow-sm space-y-4">

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
              <Building className="w-4 h-4 text-[#17324A]" />
              Company Headcount by Department
            </h3>

            <span className="text-xs text-[#17324A]/70 font-semibold cursor-pointer hover:text-[#17324A]">
              Full Report
            </span>
          </div>

          <div className="space-y-3">
            {MOCK_ANALYTICS.headcountByDept.map((dept) => (
              <div key={dept.name} className="space-y-1">

                <div className="flex justify-between text-xs font-semibold text-[#17324A]/70">
                  <span>{dept.name}</span>
                  <span>{dept.count} Employees</span>
                </div>

                <div className="w-full bg-[#B0D0EA]/40 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all bg-[#17324A]"
                    style={{
                      width: `${(dept.count / 42) * 100}%`,
                    }}
                  />
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* HR Compliance */}
        <div className="p-6 rounded-2xl bg-white border border-[#B0D0EA] shadow-sm space-y-4">

          <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#17324A]" />
            Compliance & Action Items
          </h3>

          <div className="space-y-3">

            {/* KYC */}
            <div className="p-3 rounded-xl bg-[#B0D0EA]/25 border border-[#B0D0EA] space-y-1">

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#17324A]">
                  Employee KYC Verifications
                </span>

                <span className="text-[9px] px-2 py-0.5 rounded bg-[#B0D0EA]/60 text-[#17324A] border border-[#B0D0EA] font-bold">
                  3 Pending
                </span>
              </div>

              <p className="text-[11px] text-[#17324A]/70">
                3 new hires require Aadhaar and PAN verification completion.
              </p>
            </div>

            {/* Payroll */}
            <div className="p-3 rounded-xl bg-[#B0D0EA]/25 border border-[#B0D0EA] space-y-1">

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#17324A]">
                  August Payroll Pre-Run
                </span>

                <span className="text-[9px] px-2 py-0.5 rounded bg-[#B0D0EA]/60 text-[#17324A] border border-[#B0D0EA] font-bold">
                  Ready
                </span>
              </div>

              <p className="text-[11px] text-[#17324A]/70">
                Monthly tax withholding & PF calculations updated.
              </p>
            </div>

            {/* Appraisal */}
            <div className="p-3 rounded-xl bg-[#B0D0EA]/25 border border-[#B0D0EA] space-y-1">

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#17324A]">
                  Q3 Appraisal Cycle
                </span>

                <span className="text-[9px] px-2 py-0.5 rounded bg-[#B0D0EA]/60 text-[#17324A] border border-[#B0D0EA] font-bold">
                  Scheduled
                </span>
              </div>

              <p className="text-[11px] text-[#17324A]/70">
                360-degree feedback reviews launch Sept 1st.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};


