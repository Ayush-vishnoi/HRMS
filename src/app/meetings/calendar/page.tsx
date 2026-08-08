import { Suspense } from 'react';
import { MeetingsPage } from '@/features/meetings/MeetingsPage';

export default function MeetingsCalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="h-96 animate-pulse bg-[#B0D0EA] text-[#17324A] rounded-2xl" />
      }
    >
      <MeetingsPage mode="calendar" />
    </Suspense>
  );
}
