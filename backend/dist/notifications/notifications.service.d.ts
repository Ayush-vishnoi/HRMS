import { PrismaService } from '../prisma/prisma.service';
export declare class NotificationsService {
    private prisma;
    constructor(prisma: PrismaService);
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
