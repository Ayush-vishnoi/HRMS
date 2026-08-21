'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useHRMS } from '@/shared/providers/HRMSContext';
import { CalendarView, MeetingHeader, MeetingSummary } from '@/features/meetings/CalendarView';
import { MeetingDetailDrawer } from '@/features/meetings/MeetingDetailDrawer';
import { MeetingList } from '@/features/meetings/MeetingList';
import { ScheduleMeetingDrawer } from '@/features/meetings/ScheduleMeetingDrawer';
import { useMeeting, useMeetings } from '@/features/meetings/hooks/useMeetings';
import type { Meeting } from '@/features/meetings/types/meeting';

const pad = (value: number) => String(value).padStart(2, '0');
const localDateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function MeetingsPage({ mode = 'calendar', meetingId }: { mode?: 'calendar' | 'list'; meetingId?: string }) {
  const router = useRouter();
  const { currentUser } = useHRMS();
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | undefined>();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(() => localDateKey(new Date()));
  const meetings = useMeetings();
  const detail = useMeeting(meetingId ?? null);

  const canManageMeetings = currentUser.userRole !== 'employee';
  const activeMeeting = selectedMeeting ?? detail.data ?? null;
  const openMeeting = (meeting: Meeting) => { setSelectedMeeting(meeting); router.replace(`/meetings/${meeting.id}`, { scroll: false }); };
  const closeDetail = () => { setSelectedMeeting(null); router.replace(mode === 'list' ? '/meetings/list' : '/meetings/calendar', { scroll: false }); };
  const openSchedule = (date = localDateKey(new Date())) => {
    if (!canManageMeetings) return;
    setEditingMeeting(undefined);
    setScheduleDate(date);
    setScheduleOpen(true);
  };

  return <div className="mx-auto max-w-[1500px] space-y-5">
    {mode === 'calendar' && <MeetingHeader title="Meetings & Calendar" onSchedule={() => openSchedule()} canSchedule={canManageMeetings} />}
    {mode === 'calendar' && <MeetingSummary meetings={meetings.data ?? []} />}
    {mode === 'calendar' ? <CalendarView onSelect={openMeeting} onSchedule={openSchedule} canSchedule={canManageMeetings} /> : <MeetingList onSelect={openMeeting} onSchedule={() => openSchedule()} canSchedule={canManageMeetings} />}
    <MeetingDetailDrawer meeting={activeMeeting} onClose={closeDetail} onEdit={(meeting) => {
      if (!canManageMeetings) return;
      setEditingMeeting(meeting);
      setScheduleDate(localDateKey(new Date(meeting.startsAt)));
      setSelectedMeeting(null);
      setScheduleOpen(true);
    }} />
    {canManageMeetings && <ScheduleMeetingDrawer open={scheduleOpen} meeting={editingMeeting} initialDate={scheduleDate} onClose={() => { setScheduleOpen(false); setEditingMeeting(undefined); }} />}
  </div>;
}
