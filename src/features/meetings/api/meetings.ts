import type {
  CreateMeetingInput,
  EmployeeSearchResult,
  Meeting,
  MeetingFilters,
  RSVP,
  UpdateMeetingInput,
} from '@/features/meetings/types/meeting';

type ApiResponse<T> = { data?: T; error?: string };

async function readResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  const json = await res.json().catch(() => ({})) as ApiResponse<T>;
  if (!res.ok) throw new Error(json.error || fallbackMessage);
  if (json.data === undefined) throw new Error(fallbackMessage);
  return json.data;
}

export async function getMeetings(filters: MeetingFilters = {}): Promise<Meeting[]> {
  const params = new URLSearchParams();
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.type) params.set('type', filters.type);
  if (filters.department) params.set('department', filters.department);
  if (filters.mine !== undefined) params.set('mine', String(filters.mine));

  const res = await fetch(`/api/meetings?${params.toString()}`);
  return readResponse<Meeting[]>(res, 'Failed to fetch meetings');
}

export async function getMeeting(id: string): Promise<Meeting | undefined> {
  const res = await fetch(`/api/meetings?id=${encodeURIComponent(id)}`);
  if (res.status === 404) return undefined;
  return readResponse<Meeting>(res, 'Failed to fetch meeting');
}

export async function createMeeting(input: CreateMeetingInput): Promise<Meeting> {
  const res = await fetch('/api/meetings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return readResponse<Meeting>(res, 'Failed to create meeting');
}

export async function updateMeeting(id: string, input: UpdateMeetingInput): Promise<Meeting> {
  const res = await fetch('/api/meetings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...input }),
  });
  return readResponse<Meeting>(res, 'Failed to update meeting');
}

export async function cancelMeeting(id: string): Promise<Meeting> {
  const res = await fetch('/api/meetings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action: 'cancel' }),
  });
  return readResponse<Meeting>(res, 'Failed to cancel meeting');
}

export async function updateRsvp(id: string, rsvp: RSVP, reason?: string): Promise<Meeting> {
  const res = await fetch('/api/meetings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action: 'rsvp', rsvp, reason }),
  });
  return readResponse<Meeting>(res, 'Failed to update RSVP');
}

export async function searchEmployees(search = ''): Promise<EmployeeSearchResult[]> {
  const res = await fetch(`/api/meetings?search=${encodeURIComponent(search)}`);
  if (!res.ok) return [];
  return readResponse<EmployeeSearchResult[]>(res, 'Failed to search employees');
}
