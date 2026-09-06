import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private notificationsService;
    constructor(notificationsService: NotificationsService);
    findAll(userId: string): Promise<{
        message: string;
        id: string;
        createdAt: Date;
        title: string;
        type: string;
        userId: string;
        linkUrl: string | null;
        isRead: boolean;
    }[]>;
    markRead(id: string): Promise<{
        message: string;
        id: string;
        createdAt: Date;
        title: string;
        type: string;
        userId: string;
        linkUrl: string | null;
        isRead: boolean;
    }>;
    markAllRead(userId: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
}
