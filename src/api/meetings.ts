import { MOCK_EMPLOYEES } from '@/data/mockData';
import type { Employee } from '@/data/mockData';
import type {
  CreateMeetingInput,
  EmployeeSearchResult,
  Meeting,
  MeetingFilters,
  MeetingPerson,
  RSVP,
  UpdateMeetingInput,
} from '@/types/meeting';

const currentUser: MeetingPerson = {
  id: 'EMP-001',
  name: 'Ayush Vishnoi',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80',
  department: 'AI/ML',
};

const dayAt = (dayOffset: number, hour: number, minute = 0) => {
  const date = new Date('2026-08-07T00:00:00+05:30');
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const personFor = (employee: Employee, rsvp: RSVP = 'PENDING'): MeetingPerson => ({
  id: employee.id,
  name: employee.name,
  avatarUrl: employee.avatar,
  department: employee.department,
  rsvp,
});

let meetings: Meeting[] = [
  {
    id: 'MTG-001',
    title: 'AI Platform Sprint Planning',
    type: 'TEAM',
    description: 'Align on sprint scope, model evaluation milestones, and delivery owners.',
    startsAt: dayAt(1, 10),
    endsAt: dayAt(1, 11),
    allDay: false,
    location: 'Bengaluru HQ, War Room 2',
    videoLink: 'https://meet.company.com/ai-platform-sprint',
    organizer: personFor(MOCK_EMPLOYEES[1]),
    attendees: [personFor(MOCK_EMPLOYEES[0], 'ACCEPTED'), personFor(MOCK_EMPLOYEES[2]), personFor(MOCK_EMPLOYEES[3])],
    recurrence: 'WEEKLY',
    reminderMinutes: 15,
    status: 'UPCOMING',
    department: 'AI/ML',
  },
  {
    id: 'MTG-002',
    title: 'Independence Day Office Closure',
    type: 'ORG_EVENT',
    description: 'Company holiday across all India offices.',
    startsAt: dayAt(8, 0),
    endsAt: dayAt(8, 23, 59),
    allDay: true,
    organizer: personFor(MOCK_EMPLOYEES[5]),
    attendees: [],
    recurrence: 'NONE',
    status: 'UPCOMING',
  },
  {
    id: 'MTG-003',
    title: 'Product Design Critique',
    type: 'TEAM',
    description: 'Review the employee self-service calendar flows before handoff.',
    startsAt: dayAt(3, 14, 30),
    endsAt: dayAt(3, 15, 30),
    allDay: false,
    location: 'Google Meet',
    organizer: personFor(MOCK_EMPLOYEES[3]),
    attendees: [personFor(MOCK_EMPLOYEES[0], 'PENDING'), personFor(MOCK_EMPLOYEES[4])],
    recurrence: 'NONE',
    status: 'UPCOMING',
    department: 'Design',
  },
  {
    id: 'MTG-004',
    title: 'Quarterly Town Hall',
    type: 'ORG_EVENT',
    description: 'Business update, recognition, and Q3 priorities.',
    startsAt: dayAt(-5, 16),
    endsAt: dayAt(-5, 17),
    allDay: false,
    videoLink: 'https://meet.company.com/town-hall',
    organizer: personFor(MOCK_EMPLOYEES[5]),
    attendees: [],
    recurrence: 'NONE',
    status: 'COMPLETED',
  },
  {
    id: 'MTG-005',
    title: 'Budget Review',
    type: 'TEAM',
    description: 'Review revised operating budgets.',
    startsAt: dayAt(5, 12),
    endsAt: dayAt(5, 13),
    allDay: false,
    location: 'Bengaluru HQ, Finance Room',
    organizer: personFor(MOCK_EMPLOYEES[1]),
    attendees: [personFor(MOCK_EMPLOYEES[0], 'DECLINED')],
    recurrence: 'NONE',
    status: 'CANCELLED',
    department: 'Engineering',
  },
];

const wait = <T,>(value: T): Promise<T> => new Promise((resolve) => setTimeout(() => resolve(value), 120));

export async function getMeetings(filters: MeetingFilters = {}): Promise<Meeting[]> {
  const from = filters.from ? new Date(filters.from).getTime() : Number.NEGATIVE_INFINITY;
  const to = filters.to ? new Date(filters.to).getTime() : Number.POSITIVE_INFINITY;
  return wait(meetings.filter((meeting) => {
    const startsAt = new Date(meeting.startsAt).getTime();
    const matchesDate = startsAt >= from && startsAt <= to;
    const matchesType = !filters.type || filters.type === 'ALL' || meeting.type === filters.type;
    const matchesDepartment = !filters.department || filters.department === 'ALL' || meeting.department === filters.department || meeting.type === 'ORG_EVENT';
    const matchesMine = !filters.mine || meeting.organizer.id === currentUser.id || meeting.attendees.some((attendee) => attendee.id === currentUser.id);
    return matchesDate && matchesType && matchesDepartment && matchesMine;
  }));
}

export async function getMeeting(id: string): Promise<Meeting | undefined> {
  return wait(meetings.find((meeting) => meeting.id === id));
}

export async function createMeeting(input: CreateMeetingInput): Promise<Meeting> {
  const newMeeting: Meeting = {
    id: `MTG-${String(Date.now()).slice(-6)}`,
    ...input,
    organizer: currentUser,
    attendees: input.attendeeIds.map((id) => {
      const employee = MOCK_EMPLOYEES.find((item) => item.id === id);
      return employee ? personFor(employee) : { id, name: 'Invited employee', rsvp: 'PENDING' };
    }),
    status: 'UPCOMING',
  };
  meetings = [newMeeting, ...meetings];
  return wait(newMeeting);
}

export async function updateMeeting(id: string, input: UpdateMeetingInput): Promise<Meeting> {
  const existing = meetings.find((meeting) => meeting.id === id);
  if (!existing) throw new Error('Meeting not found');
  const updated = { ...existing, ...input };
  if (input.attendeeIds) {
    updated.attendees = input.attendeeIds.map((attendeeId) => {
      const employee = MOCK_EMPLOYEES.find((item) => item.id === attendeeId);
      return employee ? personFor(employee) : { id: attendeeId, name: 'Invited employee', rsvp: 'PENDING' };
    });
  }
  meetings = meetings.map((meeting) => meeting.id === id ? updated : meeting);
  return wait(updated);
}

export async function cancelMeeting(id: string): Promise<Meeting> {
  const existing = meetings.find((meeting) => meeting.id === id);
  if (!existing) throw new Error('Meeting not found');
  const updated: Meeting = { ...existing, status: 'CANCELLED' };
  meetings = meetings.map((meeting) => meeting.id === id ? updated : meeting);
  return wait(updated);
}

export async function updateRsvp(id: string, rsvp: RSVP): Promise<Meeting> {
  const existing = meetings.find((meeting) => meeting.id === id);
  if (!existing) throw new Error('Meeting not found');
  const attendees = existing.attendees.some((attendee) => attendee.id === currentUser.id)
    ? existing.attendees.map((attendee) => attendee.id === currentUser.id ? { ...attendee, rsvp } : attendee)
    : [...existing.attendees, { ...currentUser, rsvp }];
  const updated = { ...existing, attendees };
  meetings = meetings.map((meeting) => meeting.id === id ? updated : meeting);
  return wait(updated);
}

export async function searchEmployees(search = ''): Promise<EmployeeSearchResult[]> {
  const query = search.trim().toLowerCase();
  return wait(MOCK_EMPLOYEES.filter((employee) => !query || `${employee.name} ${employee.department} ${employee.email}`.toLowerCase().includes(query)).map((employee) => ({
    id: employee.id,
    name: employee.name,
    avatarUrl: employee.avatar,
    department: employee.department,
    email: employee.email,
    role: employee.role,
  })));
}
