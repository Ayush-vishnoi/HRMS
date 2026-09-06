import { authFetch } from '@/lib/api-client';
import type { CalendarEvent } from '@/features/meetings/types/meeting';

export async function getCalendarEvents(from: string, to: string): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({ from, to });
  const res = await authFetch<Response>(`/api/calendar?${params.toString()}`, { raw: true });
  if (!res.ok) throw new Error('Failed to fetch calendar events');
  const json = await res.json();
  return json.data || [];
}
