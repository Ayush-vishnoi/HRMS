import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.userNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(id: string) {
    return this.prisma.userNotification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllRead(userId: string) {
    return this.prisma.userNotification.updateMany({ where: { userId }, data: { isRead: true } });
  }

  /** Permanently delete a single notification owned by the user. */
  async remove(id: string, userId: string) {
    const notification = await this.prisma.userNotification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found.');
    }
    return this.prisma.userNotification.delete({ where: { id } });
  }

  /** Permanently delete every notification owned by the user. */
  async removeAll(userId: string) {
    const result = await this.prisma.userNotification.deleteMany({ where: { userId } });
    return { deleted: result.count };
  }
}
