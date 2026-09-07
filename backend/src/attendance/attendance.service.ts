import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async findAll(employeeId?: string, from?: string, to?: string) {
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = from;
      if (to) where.date.lte = to;
    }
    return this.prisma.attendanceRecord.findMany({
      where,
      include: { employee: { select: { id: true, name: true, employeeCode: true, avatarUrl: true } } },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * POST /api/attendance body: { id?, date, checkIn, status, location }
   * The frontend generates the record id client-side (e.g. "ATT-1690..."),
   * so when an id is provided we upsert on it to stay idempotent.
   */
  async create(
    employeeId: string,
    data: { id?: string; date: string; checkIn: string; status?: string; location?: string },
  ) {
    const payload: any = {
      employeeId,
      date: data.date,
      checkIn: data.checkIn,
      checkOut: '',
      hoursWorked: '0h 0m',
      status: (data.status as any) || 'OnTime',
      location: data.location || 'Office - HQ',
    };
    if (data.id) {
      payload.id = data.id;
      const existing = await this.prisma.attendanceRecord.findUnique({ where: { id: data.id } });
      if (existing) {
        return this.prisma.attendanceRecord.update({ where: { id: data.id }, data: payload });
      }
    }
    return this.prisma.attendanceRecord.create({ data: payload });
  }

  /**
   * PATCH /api/attendance body: { id, checkOut, hoursWorked }
   */
  async update(id: string, data: { checkOut?: string; hoursWorked?: string }) {
    return this.prisma.attendanceRecord.update({
      where: { id },
      data: {
        ...(data.checkOut !== undefined ? { checkOut: data.checkOut } : {}),
        ...(data.hoursWorked !== undefined ? { hoursWorked: data.hoursWorked } : {}),
      },
    });
  }

  async getLateRequests(status?: string) {
    return this.prisma.lateClockInRequest.findMany({
      where: status ? { status: status as any } : {},
      include: { requester: { select: { id: true, name: true, employeeCode: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createLateRequest(requesterId: string, requestDate: string, reason: string) {
    return this.prisma.lateClockInRequest.create({
      data: {
        requesterId,
        requestDate,
        reason,
        requestedAt: new Date().toISOString(),
      },
    });
  }

  async reviewLateRequest(id: string, status: 'approved' | 'rejected', reviewedById: string) {
    return this.prisma.lateClockInRequest.update({
      where: { id },
      data: { status, reviewedById, reviewedAt: new Date().toISOString() },
    });
  }
}
