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

  /**
   * PATCH /api/help-desk body: { id, status, resolution?, resolvedById? }
   * Handles status transitions (Open / In Progress / Resolved) and,
   * when resolving, persists resolution + resolver + resolvedAt.
   */
  async update(
    id: string,
    data: { status?: 'Open' | 'In Progress' | 'Resolved'; resolution?: string; resolvedById?: string },
  ) {
    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (typeof data.resolution === 'string' && data.resolution.trim()) updateData.resolution = data.resolution;
    if (data.status === 'Resolved') {
      updateData.resolvedById = data.resolvedById;
      updateData.resolvedAt = new Date().toISOString();
    }
    return this.prisma.helpDeskTicket.update({ where: { id }, data: updateData });
  }
}
