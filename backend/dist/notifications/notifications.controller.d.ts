import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private notificationsService;
    constructor(notificationsService: NotificationsService);
    findAll(userId: string): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        type: string;
        userId: string;
        message: string;
        linkUrl: string | null;
        isRead: boolean;
    }[]>;
    markRead(id: string): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        type: string;
        userId: string;
        message: string;
        linkUrl: string | null;
        isRead: boolean;
    }>;
    markAllRead(userId: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
}
