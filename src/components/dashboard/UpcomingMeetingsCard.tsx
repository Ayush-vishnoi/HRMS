'use client';

import Link from 'next/link';
import { CalendarDays, Clock3, MapPin } from 'lucide-react';
import { useMeetings } from '@/features/meetings/hooks/useMeetings';

const formatMeetingTime = (value: string) =>
  new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

export function UpcomingMeetingsCard() {
  const { data: meetings = [], isLoading, isError } = useMeetings({ mine: true });
  const upcoming = meetings
    .filter((meeting) => meeting.status === 'UPCOMING' || meeting.status === 'ONGOING')
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())
    .slice(0, 3);

  return (
    <section className="p-6 rounded-2xl bg-[#161b22] border border-[#30363d] shadow-md space-y-4" aria-labelledby="upcoming-meetings-title">
      <div className="flex items-center justify-between gap-3">
        <h3 id="upcoming-meetings-title" className="text-sm font-bold text-[#F0F2F5] flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-[#B86B78]" />
          Upcoming Meetings
        </h3>
        <Link href="/meetings/calendar" className="text-xs text-[#8B949E] font-semibold hover:text-[#F0F2F5]">
          Calendar
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2" aria-label="Loading upcoming meetings">
          {Array.from({ length: 2 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-lg bg-[#21262d]" />)}
        </div>
      ) : isError ? (
        <p className="text-xs text-[#ff7b72]">Upcoming meetings could not be loaded.</p>
      ) : upcoming.length === 0 ? (
        <div className="min-h-32 flex flex-col items-center justify-center gap-2 border border-dashed border-[#30363d] text-center">
          <CalendarDays className="h-5 w-5 text-[#6e7681]" />
          <p className="text-xs text-[#8B949E]">No upcoming meetings.</p>
        </div>
      ) : (
        <div className="divide-y divide-[#30363d] border border-[#30363d]">
          {upcoming.map((meeting) => (
            <Link key={meeting.id} href={`/meetings/${meeting.id}`} className="block p-3 hover:bg-[#21262d] transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-[#F0F2F5]">{meeting.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-[#8B949E]">
                    <Clock3 className="h-3 w-3 shrink-0" />
                    {meeting.allDay ? 'All day' : formatMeetingTime(meeting.startsAt)}
                  </p>
                  {meeting.location && (
                    <p className="mt-1 flex items-center gap-1 truncate text-[10px] text-[#6e7681]">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {meeting.location}
                    </p>
                  )}
                </div>
                <span className={`type-badge shrink-0 ${meeting.type === 'ORG_EVENT' ? 'type-org' : 'type-team'}`}>
                  {meeting.type === 'ORG_EVENT' ? 'Org' : 'Team'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
