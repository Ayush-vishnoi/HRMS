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
  // No `mine` filter here: the API already scopes meetings to the signed-in
  // employee (organizer, attendee, or company-wide event).
  const { data: meetings = [], isLoading, isError } = useMeetings();

  const upcoming = meetings
    .filter(
      (meeting) =>
        meeting.status === 'UPCOMING' || meeting.status === 'ONGOING'
    )
    .sort(
      (left, right) =>
        new Date(left.startsAt).getTime() -
        new Date(right.startsAt).getTime()
    )
    .slice(0, 3);

  return (
    <section className="p-6 rounded-2xl bg-white border border-[#E1E5EA] shadow-md space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#1F2933] flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-[#8B3A4A]" />
          Upcoming Meetings
        </h3>

        <Link
          href="/meetings"
          className="text-[10px] font-semibold text-[#667085] hover:text-[#8B3A4A] transition-colors"
        >
          View All
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <div
          className="space-y-2"
          aria-label="Loading upcoming meetings"
        >
          {Array.from({ length: 2 }, (_, index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded-lg bg-[#F1F3F5]"
            />
          ))}
        </div>
      ) : isError ? (
        <p className="text-xs text-rose-600">
          Upcoming meetings could not be loaded.
        </p>
      ) : upcoming.length === 0 ? (
        <div className="min-h-32 flex flex-col items-center justify-center gap-2 border border-dashed border-[#E1E5EA] rounded-xl text-center bg-[#F7F8FA]">
          <CalendarDays className="h-5 w-5 text-[#98A2B3]" />

          <p className="text-xs text-[#667085]">
            No upcoming meetings.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#E1E5EA] border border-[#E1E5EA] rounded-xl overflow-hidden bg-white">
          {upcoming.map((meeting) => (
            <Link
              key={meeting.id}
              href={`/meetings/${meeting.id}`}
              className="block p-3 hover:bg-[#F7F8FA] transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                {/* Meeting Information */}
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-[#1F2933]">
                    {meeting.title}
                  </p>

                  <p className="mt-1 flex items-center gap-1 text-[10px] text-[#667085]">
                    <Clock3 className="h-3 w-3 shrink-0 text-[#8B3A4A]" />

                    {meeting.allDay
                      ? 'All day'
                      : formatMeetingTime(meeting.startsAt)}
                  </p>

                  {meeting.location && (
                    <p className="mt-1 flex items-center gap-1 truncate text-[10px] text-[#98A2B3]">
                      <MapPin className="h-3 w-3 shrink-0 text-[#8B3A4A]" />
                      {meeting.location}
                    </p>
                  )}
                </div>

                {/* Meeting Type */}
                <span
                  className={`shrink-0 px-2 py-1 rounded-full text-[9px] font-semibold border ${
                    meeting.type === 'ORG_EVENT'
                      ? 'bg-[#8B3A4A]/10 text-[#8B3A4A] border-[#8B3A4A]/20'
                      : 'bg-[#F1F3F5] text-[#667085] border-[#E1E5EA]'
                  }`}
                >
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
