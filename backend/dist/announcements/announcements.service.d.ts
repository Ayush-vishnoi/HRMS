import { PrismaService } from '../prisma/prisma.service';
export declare class AnnouncementsService {
    private prisma;
    constructor(prisma: PrismaService);
    private serialize;
    findAll(userId: string, scope?: string): Promise<{
        id: any;
        title: any;
        body: any;
        category: any;
        postedByDepartment: any;
        postedByName: any;
        isPinned: any;
        publishedAt: string | null;
        expiresAt: string | null;
        targetAudience: any;
        targetDepartment: any;
        targetLocation: any;
        targetRole: any;
        isArchived: any;
        createdAt: string | null;
        updatedAt: string | null;
    }[]>;
    create(userId: string, body: any): Promise<{
        id: any;
        title: any;
        body: any;
        category: any;
        postedByDepartment: any;
        postedByName: any;
        isPinned: any;
        publishedAt: string | null;
        expiresAt: string | null;
        targetAudience: any;
        targetDepartment: any;
        targetLocation: any;
        targetRole: any;
        isArchived: any;
        createdAt: string | null;
        updatedAt: string | null;
    }>;
    update(userId: string, id: string, body: any): Promise<{
        id: any;
        title: any;
        body: any;
        category: any;
        postedByDepartment: any;
        postedByName: any;
        isPinned: any;
        publishedAt: string | null;
        expiresAt: string | null;
        targetAudience: any;
        targetDepartment: any;
        targetLocation: any;
        targetRole: any;
        isArchived: any;
        createdAt: string | null;
        updatedAt: string | null;
    }>;
    delete(userId: string, id: string): Promise<{
        success: boolean;
        id: string;
    }>;
}
