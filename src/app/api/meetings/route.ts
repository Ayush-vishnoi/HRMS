import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
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
        include: {
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
        },
      });

      if (!meeting) return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 });

      const formatted = {
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
        attendees: meeting.attendees.map((att) => ({
          id: att.employee.id,
          name: att.employee.name,
          avatarUrl: att.employee.avatarUrl || undefined,
          department: att.employee.department,
          rsvp: att.rsvp,
        })),
      };

      return NextResponse.json({ success: true, data: formatted });
    }

    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const type = searchParams.get('type');
    const department = searchParams.get('department');
    const employeeId = searchParams.get('employeeId') || 'EMP-001';
    const mine = searchParams.get('mine') === 'true';

    const meetings = await db.meeting.findMany({
      where: {
        ...(type && type !== 'ALL' ? { type: type as any } : {}),
        ...(department && department !== 'ALL' ? {
          OR: [
            { department },
            { type: 'ORG_EVENT' },
          ],
        } : {}),
        ...(from ? { startsAt: { gte: new Date(from) } } : {}),
        ...(to ? { endsAt: { lte: new Date(to) } } : {}),
        ...(mine ? {
          OR: [
            { organizerId: employeeId },
            { attendees: { some: { employeeId } } },
          ],
        } : {}),
      },
      orderBy: { startsAt: 'asc' },
      include: {
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
      },
    });

    const formatted = meetings.map((meeting) => ({
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
      attendees: meeting.attendees.map((att) => ({
        id: att.employee.id,
        name: att.employee.name,
        avatarUrl: att.employee.avatarUrl || undefined,
        department: att.employee.department,
        rsvp: att.rsvp,
      })),
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch meetings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const count = await db.meeting.count();
    const newId = `MTG-${String(count + 1).padStart(3, '0')}`;
    const organizerId = body.organizerId || 'EMP-001';

    const newMeeting = await db.meeting.create({
      data: {
        id: body.id || newId,
        title: body.title,
        type: body.type || 'TEAM',
        description: body.description || null,
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt),
        allDay: body.allDay ?? false,
        location: body.location || null,
        videoLink: body.videoLink || null,
        organizerId,
        department: body.department || null,
        recurrence: body.recurrence || 'NONE',
        reminderMinutes: body.reminderMinutes ?? 15,
        status: body.status || 'UPCOMING',
        attendees: {
          create: (body.attendeeIds || []).map((empId: string) => ({
            id: `MA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            employeeId: empId,
            rsvp: empId === organizerId ? 'ACCEPTED' : 'PENDING',
          })),
        },
      },
      include: {
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
      },
    });

    const formatted = {
      id: newMeeting.id,
      title: newMeeting.title,
      type: newMeeting.type,
      description: newMeeting.description || undefined,
      startsAt: newMeeting.startsAt.toISOString(),
      endsAt: newMeeting.endsAt.toISOString(),
      allDay: newMeeting.allDay,
      location: newMeeting.location || undefined,
      videoLink: newMeeting.videoLink || undefined,
      department: newMeeting.department || undefined,
      recurrence: newMeeting.recurrence,
      reminderMinutes: newMeeting.reminderMinutes ?? 15,
      status: newMeeting.status,
      organizer: {
        id: newMeeting.organizer.id,
        name: newMeeting.organizer.name,
        avatarUrl: newMeeting.organizer.avatarUrl || undefined,
        department: newMeeting.organizer.department,
      },
      attendees: newMeeting.attendees.map((att) => ({
        id: att.employee.id,
        name: att.employee.name,
        avatarUrl: att.employee.avatarUrl || undefined,
        department: att.employee.department,
        rsvp: att.rsvp,
      })),
    };

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error creating meeting:', error);
    return NextResponse.json({ success: false, error: 'Failed to create meeting' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, action, rsvp, employeeId, ...updates } = body;

    if (action === 'cancel') {
      const updated = await db.meeting.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === 'rsvp') {
      const attendee = await db.meetingAttendee.upsert({
        where: {
          meetingId_employeeId: {
            meetingId: id,
            employeeId: employeeId || 'EMP-001',
          },
        },
        update: { rsvp },
        create: {
          id: `MA-${Date.now()}`,
          meetingId: id,
          employeeId: employeeId || 'EMP-001',
          rsvp,
        },
      });
      return NextResponse.json({ success: true, data: attendee });
    }

    const updated = await db.meeting.update({
      where: { id },
      data: {
        ...(updates.title ? { title: updates.title } : {}),
        ...(updates.description !== undefined ? { description: updates.description } : {}),
        ...(updates.startsAt ? { startsAt: new Date(updates.startsAt) } : {}),
        ...(updates.endsAt ? { endsAt: new Date(updates.endsAt) } : {}),
        ...(updates.location !== undefined ? { location: updates.location } : {}),
        ...(updates.videoLink !== undefined ? { videoLink: updates.videoLink } : {}),
        ...(updates.status ? { status: updates.status } : {}),
        ...(updates.recurrence ? { recurrence: updates.recurrence } : {}),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating meeting:', error);
    return NextResponse.json({ success: false, error: 'Failed to update meeting' }, { status: 500 });
  }
}
