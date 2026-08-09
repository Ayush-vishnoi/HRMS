import { Suspense } from 'react';
import { MeetingsPage } from '@/features/meetings/MeetingsPage';

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Suspense fallback={<div className="h-96 animate-pulse bg-[#161b22]" />}><MeetingsPage mode="calendar" meetingId={id} /></Suspense>;
}
