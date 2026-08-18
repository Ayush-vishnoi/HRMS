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

  async clockIn(employeeId: string, location: string) {
    const today = new Date().toISOString().split('T')[0];
    const checkIn = new Date().toTimeString().slice(0, 5);
    return this.prisma.attendanceRecord.create({
      data: { employeeId, date: today, checkIn, checkOut: '', location },
    });
  }

  async clockOut(employeeId: string) {
    const today = new Date().toISOString().split('T')[0];
    const checkOut = new Date().toTimeString().slice(0, 5);
    const record = await this.prisma.attendanceRecord.findFirst({
      where: { employeeId, date: today },
    });
    if (!record) return null;
    return this.prisma.attendanceRecord.update({
      where: { id: record.id },
      data: { checkOut },
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
