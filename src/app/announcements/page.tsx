'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Megaphone, Pin } from 'lucide-react';
import {
  ANNOUNCEMENT_CATEGORIES,
  categoryStyle,
  fetchAnnouncements,
  formatAnnouncementDate,
  formatRelativeTime,
  type Announcement,
} from '@/features/announcements/data/announcements';

/**
 * Full announcements list page — the "View All" destination from the
 * employee dashboard widget. Shows every live announcement matching the
 * signed-in employee's audience (pinned first, then newest).
 */
export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All categories');

  useEffect(() => {
    let cancelled = false;
    fetchAnnouncements()
      .then((data) => {
        if (!cancelled) setAnnouncements(data);
      })
      .catch((err) => {
        console.error('Failed to fetch announcements:', err);
        if (!cancelled) setError('Failed to load announcements.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () =>
      categoryFilter === 'All categories'
        ? announcements
        : announcements.filter((a) => a.category === categoryFilter),
    [announcements, categoryFilter],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#5B91B5]">
            <Megaphone className="h-4 w-4" /> Company communications
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#17324A]">Announcements & Updates</h1>
          <p className="mt-1 text-sm text-[#667085]">
            Every announcement shared with you by HR — events, holidays, and company-wide updates.
          </p>
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="self-start rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs text-[#17324A]"
        >
          <option>All categories</option>
          {ANNOUNCEMENT_CATEGORIES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      {isLoading && <p className="py-10 text-center text-xs text-[#667085]">Loading announcements…</p>}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-[#D9E5EE] bg-white py-16 text-center text-xs text-[#667085] shadow-md">
          <Megaphone className="h-6 w-6" />
          No announcements to show right now. Check back soon!
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((announcement) => {
          const { icon: CategoryIcon, containerClass } = categoryStyle(announcement.category);
          return (
            <article
              key={announcement.id}
              className="rounded-2xl border border-[#D9E5EE] bg-white p-5 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-lg shrink-0 ${containerClass}`}>
                  <CategoryIcon className="w-5 h-5" />
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-bold text-[#17324A]">{announcement.title}</h2>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-[#B0D0EA] text-[#17324A] border border-[#9FC5E2] font-semibold">
                      {announcement.category}
                    </span>
                    {announcement.isPinned && (
                      <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 font-semibold">
                        <Pin className="h-2.5 w-2.5" /> Pinned
                      </span>
                    )}
                  </div>

                  <p className="text-xs leading-relaxed text-[#5F7180]">{announcement.body}</p>

                  <p className="text-[10px] text-[#98A2B3]">
                    Posted by {announcement.postedByDepartment}
                    {announcement.postedByDepartment && announcement.postedByName ? ` (${announcement.postedByName})` : ''} •{' '}
                    {formatRelativeTime(announcement.publishedAt)} · {formatAnnouncementDate(announcement.publishedAt)}
                    {announcement.expiresAt
                      ? ` · Expires ${formatAnnouncementDate(announcement.expiresAt)}`
                      : ''}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
