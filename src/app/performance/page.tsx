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
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-400" />
            Performance & OKR Goal Tracker
          </h1>
          <p className="text-xs text-slate-400">Quarterly Objectives & Key Results (OKRs), KPI scorecards, and 360-degree feedback</p>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Q3 2026 Review Cycle Active
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quarterly Completion</span>
          <div className="text-2xl font-black text-slate-100 mt-2">71.2%</div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: '71.2%' }} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Appraisal Score</span>
          <div className="text-2xl font-black text-emerald-400 mt-2">4.8 / 5.0</div>
          <p className="text-[11px] text-slate-400 mt-1">Exceeds Expectations Band</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Peer Feedback Received</span>
          <div className="text-2xl font-black text-purple-400 mt-2">6 Reviews</div>
          <p className="text-[11px] text-slate-400 mt-1">All 360-degree inputs submitted</p>
        </div>
      </div>

      {/* OKRs & Goals List */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Target className="w-4 h-4 text-indigo-400" />
          Active Quarterly Key Results (OKRs)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MOCK_OKRS.map((okr) => (
            <div key={okr.id} className="p-5 rounded-xl bg-slate-850 border border-slate-800 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {okr.category}
                  </span>
                  <h4 className="text-sm font-bold text-slate-100 mt-1.5">{okr.title}</h4>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    okr.status === 'Completed'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : okr.status === 'In Progress'
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {okr.status}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-400">
                  <span>Target Progress</span>
                  <span className="text-slate-200 font-bold">{okr.progress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      okr.progress === 100 ? 'bg-emerald-500' : okr.progress < 50 ? 'bg-rose-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${okr.progress}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
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
