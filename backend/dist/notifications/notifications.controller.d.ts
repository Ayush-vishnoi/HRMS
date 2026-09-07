import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private notificationsService;
    constructor(notificationsService: NotificationsService);
    findAll(userId: string): Promise<{
        message: string;
        id: string;
        userId: string;
        title: string;
        type: string;
        linkUrl: string | null;
        isRead: boolean;
        createdAt: Date;
    }[]>;
    markRead(id: string): Promise<{
        message: string;
        id: string;
        userId: string;
        title: string;
        type: string;
        linkUrl: string | null;
        isRead: boolean;
        createdAt: Date;
    }>;
    markAllRead(userId: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
}
