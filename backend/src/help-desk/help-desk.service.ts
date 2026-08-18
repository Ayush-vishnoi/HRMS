import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class HelpDeskService {
  constructor(private prisma: PrismaService) {}

  async findAll(employeeId?: string, status?: string, category?: string) {
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    if (category) where.category = category;
    return this.prisma.helpDeskTicket.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, employeeCode: true, avatarUrl: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(employeeId: string, data: any) {
    return this.prisma.helpDeskTicket.create({
      data: {
        id: uuidv4(),
        employeeId,
        ...data,
        createdAt: new Date().toISOString(),
      },
    });
  }

  async resolve(id: string, resolvedById: string, resolution: string) {
    return this.prisma.helpDeskTicket.update({
      where: { id },
      data: {
        status: 'Resolved',
        resolution,
        resolvedById,
        resolvedAt: new Date().toISOString(),
      },
    });
  }
}
