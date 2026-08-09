
'use client';

import React from 'react';
import {
  Target,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { MOCK_OKRS } from '@/data/mockData';

export default function PerformancePage() {
  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#17324A]">
            Performance & OKR Goal Tracker
          </h1>

          <p className="mt-1 text-sm text-[#667085]">
            Quarterly Objectives & Key Results (OKRs), KPI scorecards, and 360-degree feedback
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-[#B0D0EA] border border-[#9FC5E2] text-[#17324A] text-xs font-semibold flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-[#17324A]" />
          Q3 2026 Review Cycle Active
        </div>

      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Quarterly Completion */}
        <div className="p-4 rounded-2xl bg-white border border-[#D9E5EE] shadow-md">

          <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
            Quarterly Completion
          </span>

          <div className="text-2xl font-black text-[#17324A] mt-2">
            71.2%
          </div>

          <div className="w-full bg-[#EAF2F8] rounded-full h-1.5 mt-2">
            <div
              className="bg-[#B0D0EA] h-1.5 rounded-full"
              style={{ width: '71.2%' }}
            />
          </div>

        </div>

        {/* Overall Appraisal */}
        <div className="p-4 rounded-2xl bg-white border border-[#D9E5EE] shadow-md">

          <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
            Overall Appraisal Score
          </span>

          <div className="text-2xl font-black text-emerald-500 mt-2">
            4.8 / 5.0
          </div>

          <p className="text-[11px] text-[#667085] mt-1">
            Exceeds Expectations Band
          </p>

        </div>

        {/* Peer Feedback */}
        <div className="p-4 rounded-2xl bg-white border border-[#D9E5EE] shadow-md">

          <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
            Peer Feedback Received
          </span>

          <div className="text-2xl font-black text-[#17324A] mt-2">
            6 Reviews
          </div>

          <p className="text-[11px] text-[#667085] mt-1">
            All 360-degree inputs submitted
          </p>

        </div>

      </div>

      {/* OKRs & Goals List */}
      <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-md space-y-4">

        <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
          <Target className="w-4 h-4 text-[#17324A]" />
          Active Quarterly Key Results (OKRs)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {MOCK_OKRS.map((okr) => (

            <div
              key={okr.id}
              className="p-5 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE] space-y-3"
            >

              <div className="flex items-start justify-between">

                <div>

                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EAF2F8] border border-[#D9E5EE] text-[#667085]">
                    {okr.category}
                  </span>

                  <h4 className="text-sm font-bold text-[#17324A] mt-1.5">
                    {okr.title}
                  </h4>

                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    okr.status === 'Completed'
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : okr.status === 'In Progress'
                      ? 'bg-[#B0D0EA] text-[#17324A] border border-[#9FC5E2]'
                      : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                  }`}
                >
                  {okr.status}
                </span>

              </div>

              {/* Progress */}
              <div className="space-y-1">

                <div className="flex justify-between text-xs font-semibold text-[#667085]">

                  <span>
                    Target Progress
                  </span>

                  <span className="text-[#17324A] font-bold">
                    {okr.progress}%
                  </span>

                </div>

                <div className="w-full bg-[#EAF2F8] rounded-full h-2">

                  <div
                    className={`h-2 rounded-full transition-all ${
                      okr.progress === 100
                        ? 'bg-emerald-500'
                        : okr.progress < 50
                        ? 'bg-rose-500'
                        : 'bg-[#B0D0EA]'
                    }`}
                    style={{
                      width: `${okr.progress}%`,
                    }}
                  />

                </div>

              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-[11px] text-[#667085] pt-1">

                <span>
                  Target Due: {okr.dueDate}
                </span>

                <span className="font-semibold text-[#17324A]">
                  {okr.quarter}
                </span>

              </div>

            </div>

          ))}

        </div>
      </div>

    </div>
  );
}


