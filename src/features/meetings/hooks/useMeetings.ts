'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cancelMeeting, createMeeting, getMeeting, getMeetings, searchEmployees, updateMeeting, updateRsvp } from '@/features/meetings/api/meetings';
import type { CreateMeetingInput, MeetingFilters, RSVP, UpdateMeetingInput } from '@/features/meetings/types/meeting';

export const meetingKeys = {
  all: ['meetings'] as const,
  list: (filters: MeetingFilters) => ['meetings', 'list', filters] as const,
  detail: (id: string) => ['meetings', 'detail', id] as const,
};

export function useMeetings(filters: MeetingFilters = {}) {
  return useQuery({ queryKey: meetingKeys.list(filters), queryFn: () => getMeetings(filters) });
}

export function useMeeting(id: string | null) {
  return useQuery({ queryKey: meetingKeys.detail(id ?? ''), queryFn: () => getMeeting(id ?? ''), enabled: Boolean(id) });
}

export function useEmployeeSearch(search: string) {
  return useQuery({ queryKey: ['employees', search], queryFn: () => searchEmployees(search), staleTime: 60_000 });
}

function invalidateMeetings(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  void queryClient.invalidateQueries({ queryKey: meetingKeys.all });
  if (id) void queryClient.invalidateQueries({ queryKey: meetingKeys.detail(id) });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: CreateMeetingInput) => createMeeting(input), onSuccess: () => invalidateMeetings(queryClient) });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ id, input }: { id: string; input: UpdateMeetingInput }) => updateMeeting(id, input), onSuccess: (meeting) => invalidateMeetings(queryClient, meeting.id) });
}

export function useCancelMeeting() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (id: string) => cancelMeeting(id), onSuccess: (meeting) => invalidateMeetings(queryClient, meeting.id) });
}

export function useRsvpMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rsvp, reason }: { id: string; rsvp: RSVP; reason?: string }) => updateRsvp(id, rsvp, reason),
    onSuccess: (meeting) => invalidateMeetings(queryClient, meeting.id),
  });
}
