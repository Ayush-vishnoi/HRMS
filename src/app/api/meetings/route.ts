import { MeetingStatus, MeetingType, Recurrence, RsvpStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  AuthorizationError,
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
} from '@/lib/auth-session';

const meetingInclude = {
  organizer: {
    select: { id: true, name: true, avatarUrl: true, department: true },
  },
  attendees: {
    include: {
      employee: {
        select: { id: true, name: true, avatarUrl: true, department: true },
      },
    },
  },
} satisfies Prisma.MeetingInclude;

type MeetingWithRelations = Prisma.MeetingGetPayload<{ include: typeof meetingInclude }>;

function formatMeeting(meeting: MeetingWithRelations) {
  return {
    id: meeting.id,
    title: meeting.title,
    type: meeting.type,
    description: meeting.description || undefined,
    startsAt: meeting.startsAt.toISOString(),
    endsAt: meeting.endsAt.toISOString(),
    allDay: meeting.allDay,
    location: meeting.location || undefined,
    videoLink: meeting.videoLink || undefined,
    department: meeting.department || undefined,
    recurrence: meeting.recurrence,
    reminderMinutes: meeting.reminderMinutes ?? 15,
    status: meeting.status,
    organizer: {
      id: meeting.organizer.id,
      name: meeting.organizer.name,
      avatarUrl: meeting.organizer.avatarUrl || undefined,
      department: meeting.organizer.department,
    },
    attendees: meeting.attendees.map((attendee) => ({
      id: attendee.employee.id,
      name: attendee.employee.name,
      avatarUrl: attendee.employee.avatarUrl || undefined,
      department: attendee.employee.department,
      rsvp: attendee.rsvp,
      responseReason: attendee.responseReason || undefined,
    })),
  };
}

const meetingTypes = new Set<MeetingType>([MeetingType.TEAM, MeetingType.ORG_EVENT]);
const recurrences = new Set<Recurrence>([Recurrence.NONE, Recurrence.DAILY, Recurrence.WEEKLY, Recurrence.MONTHLY]);
const meetingStatuses = new Set<MeetingStatus>([
  MeetingStatus.UPCOMING,
  MeetingStatus.ONGOING,
  MeetingStatus.COMPLETED,
  MeetingStatus.CANCELLED,
]);

function isMeetingType(value: unknown): value is MeetingType {
  return typeof value === 'string' && meetingTypes.has(value as MeetingType);
}

function isRecurrence(value: unknown): value is Recurrence {
  return typeof value === 'string' && recurrences.has(value as Recurrence);
}

function isMeetingStatus(value: unknown): value is MeetingStatus {
  return typeof value === 'string' && meetingStatuses.has(value as MeetingStatus);
}

function isRsvpStatus(value: unknown): value is RsvpStatus {
  return value === RsvpStatus.ACCEPTED || value === RsvpStatus.DECLINED || value === RsvpStatus.PENDING;
}

function newMeetingAttendeeId() {
  return `MA-${crypto.randomUUID().replaceAll('-', '').slice(0, 33)}`;
}

function validateMeetingInput(body: Record<string, unknown>, partial = false) {
  if ((!partial || body.title !== undefined) && (typeof body.title !== 'string' || body.title.trim().length < 3)) return 'Meeting title must be at least 3 characters';
  if ((!partial || body.startsAt !== undefined) && (typeof body.startsAt !== 'string' || Number.isNaN(Date.parse(body.startsAt)))) return 'Choose a valid start date and time';
  if ((!partial || body.endsAt !== undefined) && (typeof body.endsAt !== 'string' || Number.isNaN(Date.parse(body.endsAt)))) return 'Choose a valid end date and time';
  if (body.type !== undefined && !isMeetingType(body.type)) return 'Choose a valid meeting type';
  if (body.recurrence !== undefined && !isRecurrence(body.recurrence)) return 'Choose a valid recurrence';
  if (body.attendeeIds !== undefined && (!Array.isArray(body.attendeeIds) || body.attendeeIds.some((id) => typeof id !== 'string'))) return 'Attendees are invalid';
  if (typeof body.startsAt === 'string' && typeof body.endsAt === 'string' && new Date(body.endsAt) <= new Date(body.startsAt)) return 'End time must be after start time';
  return null;
}

export async function GET(request: Request) {
  try {
    const employee = await requireEmployee();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const search = searchParams.get('search');

    if (search !== null) {
      const query = search.trim().toLowerCase();
      const employees = await db.employee.findMany({
        where: query ? {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { department: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { roleTitle: { contains: query, mode: 'insensitive' } },
          ],
        } : undefined,
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          department: true,
          email: true,
          roleTitle: true,
        },
      });

      const formatted = employees.map((emp) => ({
        id: emp.id,
        name: emp.name,
        avatarUrl: emp.avatarUrl,
        department: emp.department,
        email: emp.email,
        role: emp.roleTitle,
      }));

      return NextResponse.json({ success: true, data: formatted });
    }

    if (id) {
      const meeting = await db.meeting.findUnique({
        where: { id },
        include: meetingInclude,
      });

      if (!meeting) return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 });

      // Attendee-scoped visibility: a meeting can only be fetched by id when the
      // caller organizes it, is invited to it, or it is a company-wide event
      // (no individual invitation list).
      const isVisible = meeting.organizerId === employee.id
        || meeting.attendees.length === 0
        || meeting.attendees.some((attendee) => attendee.employeeId === employee.id);
      if (!isVisible) {
        return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: formatMeeting(meeting) });
    }

    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const type = searchParams.get('type');
    const department = searchParams.get('department');
    const mine = searchParams.get('mine') === 'true';

    const filters: Prisma.MeetingWhereInput[] = [];
    if (type && type !== 'ALL' && isMeetingType(type)) filters.push({ type });
    if (department && department !== 'ALL') {
      filters.push({ OR: [{ department }, { type: 'ORG_EVENT' }] });
    }
    if (to) filters.push({ startsAt: { lte: new Date(to) } });
    if (from) filters.push({ endsAt: { gte: new Date(from) } });

    // Attendee-scoped visibility: meetings are only returned to the organizer and
    // the employees invited to them. Company-wide events (no invitation list) stay
    // visible to everyone unless the caller asks for "mine" meetings only.
    filters.push({
      OR: [
        { organizerId: employee.id },
        { attendees: { some: { employeeId: employee.id } } },
        ...(mine ? [] : [{ attendees: { none: {} } }]),
      ],
    });

    const meetings = await db.meeting.findMany({
      where: { AND: filters },
      orderBy: { startsAt: 'asc' },
      include: meetingInclude,
    });

    const formatted = meetings.map(formatMeeting);

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching meetings:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch meetings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const organizer = await requireEmployee();
    const body = await request.json() as Record<string, unknown>;
    const validationError = validateMeetingInput(body);
    if (validationError) return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    const count = await db.meeting.count();
    const newId = `MTG-${String(count + 1).padStart(3, '0')}`;
    const organizerId = organizer.id;

    const attendeeIds = Array.isArray(body.attendeeIds)
      ? [...new Set(body.attendeeIds.filter((value): value is string => typeof value === 'string' && value !== organizerId))]
      : [];
    const newMeeting = await db.meeting.create({
      data: {
        id: typeof body.id === 'string' ? body.id : newId,
        title: body.title as string,
        type: isMeetingType(body.type) ? body.type : MeetingType.TEAM,
        description: typeof body.description === 'string' ? body.description : null,
        startsAt: new Date(body.startsAt as string),
        endsAt: new Date(body.endsAt as string),
        allDay: typeof body.allDay === 'boolean' ? body.allDay : false,
        location: typeof body.location === 'string' ? body.location : null,
        videoLink: typeof body.videoLink === 'string' ? body.videoLink : null,
        organizerId,
        department: typeof body.department === 'string' ? body.department : null,
        recurrence: isRecurrence(body.recurrence) ? body.recurrence : Recurrence.NONE,
        reminderMinutes: typeof body.reminderMinutes === 'number' ? body.reminderMinutes : 15,
        status: isMeetingStatus(body.status) ? body.status : MeetingStatus.UPCOMING,
        attendees: {
          create: attendeeIds.map((employeeId) => ({
            id: newMeetingAttendeeId(),
            employeeId,
            rsvp: employeeId === organizerId ? RsvpStatus.ACCEPTED : RsvpStatus.PENDING,
          })),
        },
      },
    });
    const populatedMeeting = await db.meeting.findUnique({ where: { id: newMeeting.id }, include: meetingInclude });
    if (!populatedMeeting) throw new Error('Created meeting could not be loaded');

    return NextResponse.json({ success: true, data: formatMeeting(populatedMeeting) });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error creating meeting:', error);
    return NextResponse.json({ success: false, error: 'Failed to create meeting' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const employee = await requireEmployee();
    const body = await request.json() as Record<string, unknown>;
    const { id, action, rsvp, reason, ...updates } = body;
    if (typeof id !== 'string' || !id) return NextResponse.json({ success: false, error: 'Meeting ID is required' }, { status: 400 });
    const existing = await db.meeting.findUnique({
      where: { id },
      select: { organizerId: true, startsAt: true, endsAt: true, attendees: { select: { employeeId: true, rsvp: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Meeting not found' },
        { status: 404 },
      );
    }

    if (action !== 'rsvp' && employee.userRole !== 'admin' && existing.organizerId !== employee.id) {
      throw new AuthorizationError();
    }

    if (action === 'cancel') {
      await db.meeting.update({
        where: { id },
        data: { status: MeetingStatus.CANCELLED },
      });
      const cancelled = await db.meeting.findUnique({ where: { id }, include: meetingInclude });
      if (!cancelled) throw new Error('Cancelled meeting could not be loaded');
      return NextResponse.json({ success: true, data: formatMeeting(cancelled) });
    }

    if (action === 'rsvp') {
      if (!isRsvpStatus(rsvp)) return NextResponse.json({ success: false, error: 'Choose a valid RSVP status' }, { status: 400 });
      if (!existing.attendees.some((attendee) => attendee.employeeId === employee.id)) {
        return NextResponse.json({ success: false, error: 'You are not invited to this meeting' }, { status: 403 });
      }
      const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
      if (rsvp === RsvpStatus.DECLINED && !trimmedReason) {
        return NextResponse.json({ success: false, error: 'A reason is required when declining or cancelling a meeting' }, { status: 400 });
      }
      if (trimmedReason.length > 500) {
        return NextResponse.json({ success: false, error: 'The reason must be 500 characters or fewer' }, { status: 400 });
      }
      await db.meetingAttendee.upsert({
        where: {
          meetingId_employeeId: {
            meetingId: id,
            employeeId: employee.id,
          },
        },
        update: { rsvp, responseReason: trimmedReason || null },
        create: {
          id: newMeetingAttendeeId(),
          meetingId: id,
          employeeId: employee.id,
          rsvp,
          responseReason: trimmedReason || null,
        },
      });
      const respondedMeeting = await db.meeting.findUnique({ where: { id }, include: meetingInclude });
      if (!respondedMeeting) throw new Error('Updated meeting could not be loaded');
      return NextResponse.json({ success: true, data: formatMeeting(respondedMeeting) });
    }

    const mergedUpdates = {
      ...updates,
      startsAt: updates.startsAt ?? existing.startsAt.toISOString(),
      endsAt: updates.endsAt ?? existing.endsAt.toISOString(),
    };
    const validationError = validateMeetingInput(mergedUpdates, true);
    if (validationError) return NextResponse.json({ success: false, error: validationError }, { status: 400 });

    const attendeeIds = Array.isArray(updates.attendeeIds)
      ? [...new Set((updates.attendeeIds as string[]).filter((employeeId) => employeeId !== existing.organizerId))]
      : undefined;
    const existingRsvps = new Map(
      existing.attendees.map((attendee: { employeeId: string; rsvp: RsvpStatus }) => [
        attendee.employeeId,
        attendee.rsvp,
      ]),
    );
    const updated = await db.meeting.update({
      where: { id },
      data: {
        ...(typeof updates.title === 'string' ? { title: updates.title.trim() } : {}),
        ...(isMeetingType(updates.type) ? { type: updates.type } : {}),
        ...(updates.description !== undefined ? { description: updates.description || null } : {}),
        ...(typeof updates.startsAt === 'string' ? { startsAt: new Date(updates.startsAt) } : {}),
        ...(typeof updates.endsAt === 'string' ? { endsAt: new Date(updates.endsAt) } : {}),
        ...(typeof updates.allDay === 'boolean' ? { allDay: updates.allDay } : {}),
        ...(updates.location !== undefined ? { location: updates.location || null } : {}),
        ...(updates.videoLink !== undefined ? { videoLink: updates.videoLink || null } : {}),
        ...(updates.department !== undefined ? { department: updates.department || null } : {}),
        ...(isRecurrence(updates.recurrence) ? { recurrence: updates.recurrence } : {}),
        ...(typeof updates.reminderMinutes === 'number' ? { reminderMinutes: updates.reminderMinutes } : {}),
        ...(attendeeIds ? {
          attendees: {
            deleteMany: {},
            create: attendeeIds.map((employeeId) => ({
              id: newMeetingAttendeeId(),
              employeeId,
              rsvp: existingRsvps.get(employeeId) ?? (employeeId === existing.organizerId ? RsvpStatus.ACCEPTED : RsvpStatus.PENDING),
            })),
          },
        } : {}),
      },
      include: meetingInclude,
    });

    return NextResponse.json({ success: true, data: formatMeeting(updated) });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error updating meeting:', error);
    return NextResponse.json({ success: false, error: 'Failed to update meeting' }, { status: 500 });
  }
}
