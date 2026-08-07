'use client';

import React from 'react';
import {
  Users,
  DollarSign,
  TrendingUp,
  Briefcase,
  AlertTriangle,
  FileCheck,
  Building,
  UserPlus
} from 'lucide-react';
import { MOCK_ANALYTICS } from '@/data/mockData';

export const AdminDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Total Headcount</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-slate-100 mt-2">105</div>
          <span className="text-[11px] text-emerald-400 font-medium">+8 new hires this month</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Monthly Payroll Expense</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-slate-100 mt-2">$220,000</div>
          <span className="text-[11px] text-slate-400">July 2026 Processed</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Active Job Openings</span>
            <UserPlus className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400 mt-2">14</div>
          <span className="text-[11px] text-indigo-400 font-medium">Engineering & Product</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Attrition Rate</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-slate-100 mt-2">2.4%</div>
          <span className="text-[11px] text-emerald-400 font-medium">Below industry avg (5%)</span>
        </div>
      </div>

      {/* Admin Quick Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Department Headcount Breakdown */}
        <div className="md:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-400" />
              Company Headcount by Department
            </h3>
            <span className="text-xs text-indigo-400 font-semibold cursor-pointer hover:underline">Full Report</span>
          </div>

          <div className="space-y-3">
            {MOCK_ANALYTICS.headcountByDept.map((dept) => (
              <div key={dept.name} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-300">
                  <span>{dept.name}</span>
                  <span>{dept.count} Employees</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${(dept.count / 42) * 100}%`,
                      backgroundColor: dept.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* HR Compliance & Action Items */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Compliance & Action Items
          </h3>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Form I-9 Verifications</span>
                <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">3 Pending</span>
              </div>
              <p className="text-[11px] text-slate-400">3 new hires require identity verification completion.</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">August Payroll Pre-Run</span>
                <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">Ready</span>
              </div>
              <p className="text-[11px] text-slate-400">Monthly tax withholding & PF calculations updated.</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Q3 Appraisal Cycle</span>
                <span className="text-[9px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">Scheduled</span>
              </div>
              <p className="text-[11px] text-slate-400">360-degree feedback reviews launch Sept 1st.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
