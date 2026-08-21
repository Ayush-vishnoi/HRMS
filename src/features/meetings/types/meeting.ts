export type MeetingType = 'TEAM' | 'ORG_EVENT';
export type RSVP = 'ACCEPTED' | 'DECLINED' | 'PENDING';
export type MeetingStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
export type Recurrence = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface MeetingPerson {
  id: string;
  name: string;
  avatarUrl?: string;
  rsvp?: RSVP;
  department?: string;
}

export interface Meeting {
  id: string;
  title: string;
  type: MeetingType;
  description?: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  location?: string;
  videoLink?: string;
  organizer: MeetingPerson;
  attendees: MeetingPerson[];
  recurrence: Recurrence;
  reminderMinutes?: number;
  status: MeetingStatus;
  department?: string;
}

export interface MeetingFilters {
  from?: string;
  to?: string;
  type?: MeetingType | 'ALL';
  mine?: boolean;
  department?: string | 'ALL';
}

export interface CreateMeetingInput {
  title: string;
  type: MeetingType;
  description?: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  location?: string;
  videoLink?: string;
  attendeeIds: string[];
  department?: string;
  recurrence: Recurrence;
  reminderMinutes?: number;
}

export type UpdateMeetingInput = Partial<CreateMeetingInput>;

export interface EmployeeSearchResult extends MeetingPerson {
  email: string;
  role: string;
}

export type CalendarEvent = Meeting;
