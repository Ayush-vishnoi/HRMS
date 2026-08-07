'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarView, MeetingHeader, MeetingSummary } from '@/features/meetings/CalendarView';
import { MeetingDetailDrawer } from '@/features/meetings/MeetingDetailDrawer';
import { MeetingList } from '@/features/meetings/MeetingList';
import { ScheduleMeetingDrawer } from '@/features/meetings/ScheduleMeetingDrawer';
import { useMeeting, useMeetings } from '@/features/meetings/hooks/useMeetings';
import type { Meeting } from '@/types/meeting';

export function MeetingsPage({ mode = 'calendar', meetingId }: { mode?: 'calendar' | 'list'; meetingId?: string }) {
  const router = useRouter();
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | undefined>();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('2026-08-08');
  const meetings = useMeetings();
  const detail = useMeeting(meetingId ?? null);

  const activeMeeting = selectedMeeting ?? detail.data ?? null;
  const openMeeting = (meeting: Meeting) => { setSelectedMeeting(meeting); router.replace(`/meetings/${meeting.id}`, { scroll: false }); };
  const closeDetail = () => { setSelectedMeeting(null); router.replace(mode === 'list' ? '/meetings/list' : '/meetings/calendar', { scroll: false }); };
  const openSchedule = (date = '2026-08-08') => { setScheduleDate(date); setScheduleOpen(true); };

  return <div className="mx-auto max-w-[1500px] space-y-5">
    {mode === 'calendar' && <MeetingHeader title="Meetings & Calendar" onSchedule={() => openSchedule()} />}
    {mode === 'calendar' && <MeetingSummary meetings={meetings.data ?? []} />}
    {mode === 'calendar' ? <CalendarView onSelect={openMeeting} onSchedule={openSchedule} /> : <MeetingList onSelect={openMeeting} onSchedule={() => openSchedule()} />}
    <MeetingDetailDrawer meeting={activeMeeting} onClose={closeDetail} onEdit={(meeting) => { setEditingMeeting(meeting); setSelectedMeeting(null); setScheduleOpen(true); }} />
    <ScheduleMeetingDrawer open={scheduleOpen} meeting={editingMeeting} initialDate={scheduleDate} onClose={() => { setScheduleOpen(false); setEditingMeeting(undefined); }} />
  </div>;
}
