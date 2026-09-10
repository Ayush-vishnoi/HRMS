'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useHRMS } from '@/shared/providers/HRMSContext';
import { CalendarView, MeetingHeader, MeetingSummary } from '@/features/meetings/CalendarView';
import { MeetingDetailDrawer } from '@/features/meetings/MeetingDetailDrawer';
import { MeetingList } from '@/features/meetings/MeetingList';
import { ScheduleMeetingDrawer } from '@/features/meetings/ScheduleMeetingDrawer';
import { useMeeting, useMeetings } from '@/features/meetings/hooks/useMeetings';
import { PendingApprovalsPanel } from '@/features/meetings/PendingApprovalsPanel';
import type { Meeting } from '@/features/meetings/types/meeting';

const pad = (value: number) => String(value).padStart(2, '0');
const localDateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function MeetingsPage({ mode = 'calendar', meetingId }: { mode?: 'calendar' | 'list'; meetingId?: string }) {
  const router = useRouter();
  const { currentUser } = useHRMS();
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Meeting | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | undefined>();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(() => localDateKey(new Date()));
  const meetings = useMeetings();
  const detail = useMeeting(meetingId ?? null);

  const canManageMeetings = currentUser.userRole !== 'employee';
  // Resolve the open meeting from live query data so RSVP and status updates flow
  // straight into the drawer. The snapshot only bridges the gap until the list
  // query returns data for the selected meeting.
  const selectedMeeting = useMemo(() => {
    if (!selectedMeetingId) return null;
    return meetings.data?.find((meeting) => meeting.id === selectedMeetingId) ?? selectedSnapshot;
  }, [meetings.data, selectedMeetingId, selectedSnapshot]);
  const activeMeeting = selectedMeeting ?? detail.data ?? null;
  const openMeeting = (meeting: Meeting) => {
    // Preview stays on the current page so opening a meeting does not remount the calendar.
    setSelectedMeetingId(meeting.id);
    setSelectedSnapshot(meeting);
  };
  const closeDetail = () => {
    setSelectedMeetingId(null);
    setSelectedSnapshot(null);
    if (meetingId) {
      router.replace(mode === 'list' ? '/meetings/list' : '/meetings/calendar', { scroll: false });
    }
  };
  const openSchedule = (date = localDateKey(new Date())) => {
    if (!canManageMeetings) return;
    setEditingMeeting(undefined);
    setScheduleDate(date);
    setScheduleOpen(true);
  };

  return <div className="mx-auto max-w-[1500px] space-y-5">
    <PendingApprovalsPanel />
    {mode === 'calendar' && <MeetingHeader title="Meetings & Calendar" onSchedule={() => openSchedule()} canSchedule={canManageMeetings} />}
    {mode === 'calendar' && <MeetingSummary meetings={meetings.data ?? []} />}
    {mode === 'calendar' ? <CalendarView onSelect={openMeeting} onSchedule={openSchedule} canSchedule={canManageMeetings} /> : <MeetingList onSelect={openMeeting} onSchedule={() => openSchedule()} canSchedule={canManageMeetings} />}
    <MeetingDetailDrawer meeting={activeMeeting} onClose={closeDetail} onEdit={(meeting) => {
      if (!canManageMeetings) return;
      setEditingMeeting(meeting);
      setScheduleDate(localDateKey(new Date(meeting.startsAt)));
      setSelectedMeetingId(null);
      setSelectedSnapshot(null);
      setScheduleOpen(true);
    }} />
    {canManageMeetings && <ScheduleMeetingDrawer open={scheduleOpen} meeting={editingMeeting} initialDate={scheduleDate} onClose={() => { setScheduleOpen(false); setEditingMeeting(undefined); }} />}
  </div>;
}
