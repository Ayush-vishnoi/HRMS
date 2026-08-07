import { Suspense } from 'react';
import { MeetingsPage } from '@/features/meetings/MeetingsPage';

export default function MeetingsCalendarPage() {
  return <Suspense fallback={<div className="h-96 animate-pulse bg-[#161b22]" />}><MeetingsPage mode="calendar" /></Suspense>;
}
