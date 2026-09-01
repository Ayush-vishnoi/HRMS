'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Megaphone } from 'lucide-react';
import {
  categoryStyle,
  fetchAnnouncements,
  formatRelativeTime,
  type Announcement,
} from '@/features/announcements/data/announcements';

/**
 * Live "Company Announcements & Updates" dashboard widget.
 * Fetches the 3 most recent audience-matching, non-expired announcements
 * (pinned first) and keeps the original static card design.
 */
export function CompanyAnnouncementsCard() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchAnnouncements('dashboard')
      .then((data) => {
        if (!cancelled) setAnnouncements(data);
      })
      .catch((err) => console.error('Failed to fetch announcements for dashboard:', err))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#D9E5EE] shadow-sm space-y-4">

      {/* Title truncates with an ellipsis when space runs out; "View All"
          is pinned right with nowrap so it can never wrap. */}
      <div className="flex items-center justify-between gap-3">

        <h3 className="min-w-0 flex items-center gap-2 text-sm font-bold text-[#17324A]">
          <Megaphone className="w-4 h-4 shrink-0 text-amber-500" />
          <span className="truncate">Announcements</span>
        </h3>

        <Link
          href="/announcements"
          className="shrink-0 whitespace-nowrap text-xs font-semibold text-[#5F7180] cursor-pointer hover:text-[#17324A]"
        >
          View All
        </Link>

      </div>

      <div className="space-y-3">
        {isLoading && (
          <p className="text-xs text-[#98A2B3] py-2">Loading announcements…</p>
        )}

        {!isLoading && announcements.length === 0 && (
          <p className="text-xs text-[#98A2B3] py-2">
            No announcements right now. Check back soon!
          </p>
        )}

        {announcements.map((announcement) => {
          const { icon: CategoryIcon, containerClass } = categoryStyle(announcement.category);
          return (
            <div
              key={announcement.id}
              className="p-3.5 rounded-xl bg-[#EAF2F8] border border-[#D9E5EE] flex items-start gap-3"
            >

              <div className={`p-2 rounded-lg shrink-0 ${containerClass}`}>
                <CategoryIcon className="w-4 h-4" />
              </div>

              <div className="space-y-1">

                <div className="flex items-center gap-2">

                  <h4 className="text-xs font-bold text-[#17324A]">
                    {announcement.title}
                  </h4>

                  <span className="text-[9px] px-2 py-0.5 rounded bg-[#B0D0EA] text-[#17324A] border border-[#9FC5E2] font-semibold">
                    {announcement.category}
                  </span>

                </div>

                <p className="text-xs text-[#5F7180]">
                  {announcement.body}
                </p>

                <span className="text-[10px] text-[#98A2B3]">
                  Posted by {announcement.postedByDepartment} • {formatRelativeTime(announcement.publishedAt)}
                </span>

              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}
