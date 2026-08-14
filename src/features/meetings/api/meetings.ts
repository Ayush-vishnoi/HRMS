import type {
  CreateMeetingInput,
  EmployeeSearchResult,
  Meeting,
  MeetingFilters,
  RSVP,
  UpdateMeetingInput,
} from '@/features/meetings/types/meeting';

export async function getMeetings(filters: MeetingFilters = {}): Promise<Meeting[]> {
  const params = new URLSearchParams();
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.type) params.set('type', filters.type);
  if (filters.department) params.set('department', filters.department);
  if (filters.mine !== undefined) params.set('mine', String(filters.mine));

  const res = await fetch(`/api/meetings?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch meetings');
  const json = await res.json();
  return json.data || [];
}

export async function getMeeting(id: string): Promise<Meeting | undefined> {
  const res = await fetch(`/api/meetings?id=${encodeURIComponent(id)}`);
  if (!res.ok) return undefined;
  const json = await res.json();
  return json.data;
}

export async function createMeeting(input: CreateMeetingInput): Promise<Meeting> {
  const res = await fetch('/api/meetings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to create meeting');
  const json = await res.json();
  return json.data;
}

export async function updateMeeting(id: string, input: UpdateMeetingInput): Promise<Meeting> {
  const res = await fetch('/api/meetings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...input }),
  });
  if (!res.ok) throw new Error('Failed to update meeting');
  const json = await res.json();
  return json.data;
}

export async function cancelMeeting(id: string): Promise<Meeting> {
  const res = await fetch('/api/meetings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action: 'cancel' }),
  });
  if (!res.ok) throw new Error('Failed to cancel meeting');
  const json = await res.json();
  return json.data;
}

export async function updateRsvp(id: string, rsvp: RSVP): Promise<Meeting> {
  const res = await fetch('/api/meetings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action: 'rsvp', rsvp }),
  });
  if (!res.ok) throw new Error('Failed to update RSVP');
  const json = await res.json();
  return json.data;
}

export async function searchEmployees(search = ''): Promise<EmployeeSearchResult[]> {
  const res = await fetch(`/api/meetings?search=${encodeURIComponent(search)}`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}
