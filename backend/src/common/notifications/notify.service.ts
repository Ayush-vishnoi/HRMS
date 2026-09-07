import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface NotifyInput {
  userId: string;
  title: string;
  message: string;
  type?: string;
  linkUrl?: string | null;
}

/**
 * Central notification service (ported from legacy src/lib/notifications/notify.ts).
 *
 * Every helper is fire-and-forget safe: notification failures are logged
 * but NEVER propagated, so a broken notification can never fail the
 * business operation that triggered it.
 */
@Injectable()
export class NotifyService {
  private readonly logger = new Logger('NotifyService');

  constructor(private prisma: PrismaService) {}

  /** Notify a single user. Never throws. */
  async notifyUser(input: NotifyInput): Promise<void> {
    try {
      if (!input.userId) return;
      await this.prisma.userNotification.create({
        data: {
          userId: input.userId,
          title: input.title,
          message: input.message,
          type: input.type ?? 'System',
          linkUrl: input.linkUrl ?? null,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create notification', error as Error);
    }
  }

  /** Notify multiple users at once. Never throws. */
  async notifyUsers(userIds: string[], payload: Omit<NotifyInput, 'userId'>): Promise<void> {
    try {
      const uniqueIds = [...new Set(userIds.filter(Boolean))];
      if (uniqueIds.length === 0) return;

      await this.prisma.userNotification.createMany({
        data: uniqueIds.map((userId) => ({
          userId,
          title: payload.title,
          message: payload.message,
          type: payload.type ?? 'System',
          linkUrl: payload.linkUrl ?? null,
        })),
      });
    } catch (error) {
      this.logger.error('Failed to create notifications', error as Error);
    }
  }

  /** Notify every active admin. Never throws. */
  async notifyAdmins(payload: Omit<NotifyInput, 'userId'>): Promise<void> {
    try {
      const admins = await this.prisma.employee.findMany({
        where: {
          userRole: 'admin',
          status: { in: ['Active', 'OnLeave', 'Remote'] },
        },
        select: { id: true },
      });

      await this.notifyUsers(
        admins.map((admin) => admin.id),
        payload,
      );
    } catch (error) {
      this.logger.error('Failed to notify admins', error as Error);
    }
  }

  /** Notify the manager of the given employee (if one exists). Never throws. */
  async notifyManagerOf(employeeId: string, payload: Omit<NotifyInput, 'userId'>): Promise<void> {
    try {
      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
        select: { managerId: true },
      });

      if (!employee?.managerId) return;
      await this.notifyUser({ ...payload, userId: employee.managerId });
    } catch (error) {
      this.logger.error('Failed to notify manager', error as Error);
    }
  }
}
