'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Crown,
  Users,
  TrendingDown,
  Briefcase,
  DoorOpen,
  BarChart3,
  Megaphone,
  Send,
  Pin,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { authFetch } from '@/lib/api-client';
import { useHRMS } from '@/shared/providers/HRMSContext';
import PageLoader from '@/shared/components/PageLoader';

/* ==========================================================================
   EXECUTIVE ANALYTICS DASHBOARD
   Company-wide, live view for the CEO. Every figure is pulled from records
   (no hardcoded numbers):
   - Company Pulse — headcount, attrition, open positions, in-flight exits.
   - Company Analytics — department headcount + hiring funnel.
   - Announcements — company-wide composer + recent feed.
   The CEO's approval/delegation controls live under Governance & Controls.
   ========================================================================== */

type DeptCount = { name: string; count: number; color: string };
type PipelineStage = { stage: string; candidates: number };

type Metrics = {
  totalHeadcount: number;
  newHiresThisMonth: number;
  openJobCount: number;
  activeJobOpenings: number;
  topOpeningsDept: string | null;
  attritionRate: string;
  attritionNote: string;
  departedCount: number;
  activeExitRequests: number;
  openHrActions: number;
  headcountByDept: DeptCount[];
  recruitmentPipeline: PipelineStage[];
};

type Announcement = {
  id: string;
  title: string;
  content: string;
  isPinned?: boolean;
  publishedAt?: string | null;
  postedBy?: { id: string; name: string } | null;
};

const unwrap = <T,>(res: any): T => (res?.data ?? res) as T;

const formatDate = (value: string | null | undefined) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// PLACEHOLDER — remainder of the component is appended below.
export const ExecutiveDashboard: React.FC = () => {
  const { currentUser } = useHRMS();
  const isCeo = currentUser.rawRole === 'ceo';

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const loadAnnouncements = useCallback(async () => {
    try {
      const res = await authFetch<any>('/api/announcements?scope=admin');
      const rows = unwrap<Announcement[]>(res);
      setAnnouncements(Array.isArray(rows) ? rows.slice(0, 6) : []);
    } catch {
      setAnnouncements([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch<any>('/api/analytics');
        if (!cancelled) setMetrics(unwrap<Metrics>(res) ?? null);
      } catch {
        if (!cancelled) setMetrics(null);
      }
      await loadAnnouncements();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAnnouncements]);

  const postAnnouncement = async () => {
    if (!annTitle.trim() || !annBody.trim()) return;
    setPosting(true);
    setBanner(null);
    try {
      await authFetch('/api/announcements', {
        method: 'POST',
        body: { title: annTitle.trim(), content: annBody.trim(), targetAudience: 'All' },
      });
      setAnnTitle('');
      setAnnBody('');
      await loadAnnouncements();
      setBanner({ tone: 'ok', text: 'Announcement published company-wide.' });
    } catch (err) {
      setBanner({ tone: 'err', text: (err as Error).message || 'Could not publish announcement.' });
    } finally {
      setPosting(false);
    }
  };

  const deptChart = useMemo(
    () => (metrics?.headcountByDept ?? []).filter((d) => d.count > 0),
    [metrics],
  );
  const maxFunnel = useMemo(
    () => Math.max(...(metrics?.recruitmentPipeline ?? []).map((s) => s.candidates), 1),
    [metrics],
  );

  if (loading) return <PageLoader label="Loading executive dashboard..." cards={4} />;

  const pulse = [
    {
      label: 'Total Headcount',
      value: metrics ? String(metrics.totalHeadcount) : '—',
      hint: metrics ? `${metrics.newHiresThisMonth} new this month` : '',
      icon: Users,
      tone: 'text-[#17324A]',
    },
    {
      label: 'Attrition Rate',
      value: metrics?.attritionRate ?? '—',
      hint: metrics?.attritionNote ?? '',
      icon: TrendingDown,
      tone: 'text-rose-600',
    },
    {
      label: 'Open Positions',
      value: metrics ? String(metrics.activeJobOpenings) : '—',
      hint: metrics
        ? `${metrics.openJobCount} req${metrics.openJobCount === 1 ? '' : 's'}${metrics.topOpeningsDept ? ` · most in ${metrics.topOpeningsDept}` : ''}`
        : '',
      icon: Briefcase,
      tone: 'text-[#17324A]',
    },
    {
      label: 'In-flight Exits',
      value: metrics ? String(metrics.activeExitRequests) : '—',
      hint: metrics ? `${metrics.openHrActions} open HR actions` : '',
      icon: DoorOpen,
      tone: 'text-amber-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#17324A]/70">Executive Leadership</p>
        <h1 className="flex items-center gap-2 text-xl font-bold text-[#17324A]">
          <Crown className="h-5 w-5 text-[#B7791F]" />
          Executive Dashboard
        </h1>
        <p className="mt-1 text-xs text-[#17324A]/70">
          Company-wide pulse and analytics, live from records. Approvals and delegation live under Governance &amp; Controls.
        </p>
      </div>

      {banner && (
        <div
          className={`rounded-xl border px-4 py-2.5 text-xs font-semibold ${
            banner.tone === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* Company Pulse */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {pulse.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-[#B0D0EA] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#52677A]">{card.label}</p>
                <Icon className={`h-4 w-4 ${card.tone}`} />
              </div>
              <p className={`mt-2 text-2xl font-bold ${card.tone}`}>{card.value}</p>
              {card.hint && <p className="mt-1 text-[11px] text-[#667085]">{card.hint}</p>}
            </div>
          );
        })}
      </div>

      {/* Company Analytics */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Headcount by department */}
        <section className="rounded-2xl border border-[#B0D0EA] bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-bold text-[#17324A]">
            <BarChart3 className="h-4 w-4" /> Headcount by Department
          </h2>
          {deptChart.length === 0 ? (
            <p className="py-12 text-center text-xs text-[#667085]">No department data available.</p>
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptChart} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4EBF1" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#52677A' }} interval={0} angle={-20} textAnchor="end" height={54} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#52677A' }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #D9E5EE' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {deptChart.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Hiring funnel */}
        <section className="rounded-2xl border border-[#B0D0EA] bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-bold text-[#17324A]">
            <Briefcase className="h-4 w-4" /> Hiring Funnel
          </h2>
          <div className="mt-4 space-y-3">
            {(metrics?.recruitmentPipeline ?? []).map((s) => (
              <div key={s.stage}>
                <div className="mb-1 flex items-center justify-between text-[11px] text-[#52677A]">
                  <span className="font-semibold">{s.stage}</span>
                  <span>{s.candidates}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#EEF4F9]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#17324A] to-[#315B76]"
                    style={{ width: `${Math.round((s.candidates / maxFunnel) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {(metrics?.recruitmentPipeline ?? []).length === 0 && (
              <p className="py-8 text-center text-xs text-[#667085]">No candidates in the pipeline.</p>
            )}
          </div>
        </section>
      </div>

      {/* Announcements */}
      <section className="rounded-2xl border border-[#B0D0EA] bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-bold text-[#17324A]">
          <Megaphone className="h-4 w-4" /> Company Announcements
        </h2>

        {isCeo && (
          <div className="mt-4 space-y-2 rounded-xl border border-[#E4EBF1] bg-[#F9FBFD] p-4">
            <input
              type="text"
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              placeholder="Announcement title"
              className="w-full rounded-lg border border-[#D9E5EE] bg-white px-3 py-2 text-xs text-[#17324A] outline-none placeholder:text-[#98A2B3] focus:border-[#6FA6C9]"
            />
            <textarea
              value={annBody}
              onChange={(e) => setAnnBody(e.target.value)}
              placeholder="Share an update with the whole company…"
              rows={3}
              className="w-full resize-none rounded-lg border border-[#D9E5EE] bg-white px-3 py-2 text-xs text-[#17324A] outline-none placeholder:text-[#98A2B3] focus:border-[#6FA6C9]"
            />
            <div className="flex justify-end">
              <button
                type="button"
                disabled={!annTitle.trim() || !annBody.trim() || posting}
                onClick={postAnnouncement}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#17324A] px-3 py-2 text-[11px] font-bold text-white hover:bg-[#22496B] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" /> Publish
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-2">
          {announcements.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#667085]">No announcements yet.</p>
          ) : (
            announcements.map((a) => (
              <article key={a.id} className="rounded-xl border border-[#D9E5EE] bg-white p-3">
                <div className="flex items-center gap-2">
                  {a.isPinned && <Pin className="h-3.5 w-3.5 text-amber-600" />}
                  <span className="text-xs font-bold text-[#17324A]">{a.title}</span>
                  {formatDate(a.publishedAt) && (
                    <span className="ml-auto text-[10px] text-[#98A2B3]">{formatDate(a.publishedAt)}</span>
                  )}
                </div>
                <p className="mt-1 text-[11px] leading-4 text-[#52677A]">{a.content}</p>
                {a.postedBy?.name && (
                  <p className="mt-1 text-[10px] text-[#98A2B3]">— {a.postedBy.name}</p>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
