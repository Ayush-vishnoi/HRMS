import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MeetingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(employeeId: string, from?: string, to?: string) {
    const where: any = {
      OR: [
        { organizerId: employeeId },
        { attendees: { some: { employeeId } } },
      ],
    };
    if (from || to) {
      where.startsAt = {};
      if (from) where.startsAt.gte = new Date(from);
      if (to) where.startsAt.lte = new Date(to);
    }
    return this.prisma.meeting.findMany({
      where,
      include: {
        organizer: { select: { id: true, name: true, avatarUrl: true } },
        attendees: {
          include: { employee: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id },
      include: {
        organizer: { select: { id: true, name: true, avatarUrl: true } },
        attendees: {
          include: { employee: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    });
    if (!meeting) throw new NotFoundException('Meeting not found');
    return meeting;
  }

  async create(organizerId: string, data: any) {
    const { attendeeIds = [], ...meetingData } = data;
    return this.prisma.meeting.create({
      data: {
        id: uuidv4(),
        ...meetingData,
        organizerId,
        attendees: {
          create: attendeeIds.map((empId: string) => ({ employeeId: empId })),
        },
      },
      include: {
        attendees: { include: { employee: { select: { id: true, name: true } } } },
      },
    });
  }

  async rsvp(meetingId: string, employeeId: string, status: 'ACCEPTED' | 'DECLINED', reason?: string) {
    return this.prisma.meetingAttendee.updateMany({
      where: { meetingId, employeeId },
      data: { inviteStatus: status, rsvp: status === 'ACCEPTED' ? 'ACCEPTED' : 'DECLINED', responseReason: reason },
    });
  }

  async cancel(id: string) {
    return this.prisma.meeting.update({ where: { id }, data: { status: 'CANCELLED' } });
  }
}
