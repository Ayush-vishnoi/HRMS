import { Injectable } from '@nestjs/common';
import { TicketCategory, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotifyService } from '../common/notifications/notify.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * The Prisma enums use @map'd DB labels that differ from their member names:
 *   TicketCategory.GrievanceOrComplaint -> "Grievance / Complaint"
 *   TicketStatus.InProgress             -> "In Progress"
 * The Prisma client API only accepts and returns the member names, while the
 * frontend contract speaks the human-readable labels. Translate at this
 * boundary so the REST API keeps using labels in both directions.
 */
const CATEGORY_LABEL_TO_ENUM: Record<string, string> = {
  'Grievance / Complaint': 'GrievanceOrComplaint',
};
const CATEGORY_ENUM_TO_LABEL: Record<string, string> = {
  GrievanceOrComplaint: 'Grievance / Complaint',
};
const STATUS_LABEL_TO_ENUM: Record<string, string> = {
  'In Progress': 'InProgress',
};
const STATUS_ENUM_TO_LABEL: Record<string, string> = {
  InProgress: 'In Progress',
};

const categoryToEnum = (value: string): TicketCategory =>
  (CATEGORY_LABEL_TO_ENUM[value] ?? value) as TicketCategory;
const statusToEnum = (value: string): TicketStatus =>
  (STATUS_LABEL_TO_ENUM[value] ?? value) as TicketStatus;
const toApiTicket = (ticket: any): any => ({
  ...ticket,
  category: CATEGORY_ENUM_TO_LABEL[ticket.category] ?? ticket.category,
  status: STATUS_ENUM_TO_LABEL[ticket.status] ?? ticket.status,
});

@Injectable()
export class HelpDeskService {
  constructor(private prisma: PrismaService, private notify: NotifyService) {}

  async findAll(employeeId?: string, status?: string, category?: string) {
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = statusToEnum(status);
    if (category) where.category = categoryToEnum(category);
    const tickets = await this.prisma.helpDeskTicket.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, employeeCode: true, avatarUrl: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return tickets.map(toApiTicket);
  }

  async create(employeeId: string, data: any) {
    const created = await this.prisma.helpDeskTicket.create({
      data: {
        id: uuidv4(),
        employeeId,
        category: categoryToEnum(data.category),
        priority: data.priority ?? 'Medium',
        subject: data.subject,
        description: data.description,
        createdAt: new Date().toISOString(),
      },
    });
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { name: true },
    });
    await this.notify.notifyAdmins({
      title: 'New help desk ticket',
      message: `${employee?.name ?? 'An employee'} raised a ${data.priority ?? 'Medium'} priority ticket: ${data.subject}.`,
      type: 'HelpDesk',
      linkUrl: '/help-desk',
    });
    return toApiTicket(created);
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
    const ticket = await this.prisma.helpDeskTicket.findUnique({ where: { id } });
    const updateData: any = {};
    if (data.status) updateData.status = statusToEnum(data.status);
    if (typeof data.resolution === 'string' && data.resolution.trim()) updateData.resolution = data.resolution;
    if (data.status === 'Resolved') {
      updateData.resolvedById = data.resolvedById;
      updateData.resolvedAt = new Date().toISOString();
    }
    const updated = await this.prisma.helpDeskTicket.update({ where: { id }, data: updateData });
    if (ticket && data.status) {
      await this.notify.notifyUser({
        userId: ticket.employeeId,
        title: data.status === 'Resolved' ? 'Help desk ticket resolved' : `Ticket ${String(data.status).toLowerCase()}`,
        message:
          data.status === 'Resolved'
            ? `Your ticket "${ticket.subject}" has been resolved${typeof data.resolution === 'string' && data.resolution.trim() ? `: ${data.resolution}` : ''}.`
            : `Your ticket "${ticket.subject}" is now ${data.status}.`,
        type: 'HelpDesk',
        linkUrl: '/help-desk',
      });
    }
    return toApiTicket(updated);
  }
}
