'use client';

import React from 'react';
import { Target, TrendingUp, Award, CheckCircle2, AlertCircle, Clock, Sparkles } from 'lucide-react';
import { MOCK_OKRS } from '@/data/mockData';

export default function PerformancePage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Target className="w-5 h-5 text-[#B86B78]" />
            Performance & OKR Goal Tracker
          </h1>
          <p className="text-xs text-secondary">Quarterly Objectives & Key Results (OKRs), KPI scorecards, and 360-degree feedback</p>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-[#8B3A4A]/10 border border-[#8B3A4A]/20 text-[#B86B78] text-xs font-semibold flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          Q3 2026 Review Cycle Active
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-surface border border-border shadow-md">
          <span className="text-xs font-bold text-secondary uppercase tracking-wider">Quarterly Completion</span>
          <div className="text-2xl font-black text-foreground mt-2">71.2%</div>
          <div className="w-full bg-surface-elevated rounded-full h-1.5 mt-2">
            <div className="bg-[#8B3A4A] h-1.5 rounded-full" style={{ width: '71.2%' }} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border shadow-md">
          <span className="text-xs font-bold text-secondary uppercase tracking-wider">Overall Appraisal Score</span>
          <div className="text-2xl font-black text-emerald-500 mt-2">4.8 / 5.0</div>
          <p className="text-[11px] text-secondary mt-1">Exceeds Expectations Band</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border shadow-md">
          <span className="text-xs font-bold text-secondary uppercase tracking-wider">Peer Feedback Received</span>
          <div className="text-2xl font-black text-foreground mt-2">6 Reviews</div>
          <p className="text-[11px] text-secondary mt-1">All 360-degree inputs submitted</p>
        </div>
      </div>

      {/* OKRs & Goals List */}
      <div className="p-6 rounded-2xl bg-surface border border-border shadow-md space-y-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Target className="w-4 h-4 text-[#B86B78]" />
          Active Quarterly Key Results (OKRs)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MOCK_OKRS.map((okr) => (
            <div key={okr.id} className="p-5 rounded-xl bg-surface-elevated border border-border space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-surface border border-border text-secondary">
                    {okr.category}
                  </span>
                  <h4 className="text-sm font-bold text-foreground mt-1.5">{okr.title}</h4>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    okr.status === 'Completed'
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : okr.status === 'In Progress'
                      ? 'bg-[#8B3A4A]/15 text-[#B86B78] border border-[#8B3A4A]/30'
                      : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                  }`}
                >
                  {okr.status}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-secondary">
                  <span>Target Progress</span>
                  <span className="text-foreground font-bold">{okr.progress}%</span>
                </div>
                <div className="w-full bg-surface rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      okr.progress === 100 ? 'bg-emerald-500' : okr.progress < 50 ? 'bg-rose-500' : 'bg-[#8B3A4A]'
                    }`}
                    style={{ width: `${okr.progress}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-secondary pt-1">
                <span>Target Due: {okr.dueDate}</span>
                <span>{okr.quarter}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
