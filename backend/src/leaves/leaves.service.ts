import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeavesService {
  constructor(private prisma: PrismaService) {}

  async getBalances(employeeId: string) {
    return this.prisma.leaveBalance.findMany({ where: { employeeId } });
  }

  async getRequests(employeeId?: string, status?: string) {
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    return this.prisma.leaveRequest.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, employeeCode: true, avatarUrl: true, department: true } },
        reviewer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRequest(data: {
    employeeId: string;
    leaveType: any;
    startDate: string;
    endDate: string;
    days: number;
    reason: string;
  }) {
    return this.prisma.leaveRequest.create({
      data: { ...data, appliedOn: new Date().toISOString().split('T')[0] },
    });
  }

  async reviewRequest(id: string, status: 'Approved' | 'Rejected', reviewerId: string) {
    const req = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Leave request not found');

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status, reviewerId },
    });

    if (status === 'Approved') {
      await this.prisma.leaveBalance.updateMany({
        where: { employeeId: req.employeeId, leaveType: req.leaveType },
        data: { used: { increment: req.days }, remaining: { decrement: req.days } },
      });
    }
    return updated;
  }
}
