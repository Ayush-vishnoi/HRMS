'use client';

import { useQuery } from '@tanstack/react-query';
import { getCalendarEvents } from '@/features/meetings/api/calendar';

export const calendarKeys = {
  all: ['calendar'] as const,
  range: (from: string, to: string) => ['calendar', 'range', from, to] as const,
};

export function useCalendarEvents(from: string, to: string) {
  return useQuery({
    queryKey: calendarKeys.range(from, to),
    queryFn: () => getCalendarEvents(from, to),
    enabled: Boolean(from && to),
    staleTime: 60_000,
  });
}
