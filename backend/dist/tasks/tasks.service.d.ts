import { PrismaService } from '../prisma/prisma.service';
import { NotifyService } from '../common/notifications/notify.service';
export declare class TasksService {
    private prisma;
    private notify;
    constructor(prisma: PrismaService, notify: NotifyService);
    private formatTask;
    findAll(userId: string, scope?: string): Promise<{
        id: any;
        title: any;
        description: any;
        dueDate: string | null;
        priority: any;
        status: any;
        createdAt: string | null;
        completedAt: string | null;
        assignedTo: any;
        assignedBy: any;
    }[] | {
        overdueCount: number;
        data: {
            id: any;
            title: any;
            description: any;
            dueDate: string | null;
            priority: any;
            status: any;
            createdAt: string | null;
            completedAt: string | null;
            assignedTo: any;
            assignedBy: any;
        }[];
    }>;
    create(userId: string, body: any): Promise<{
        id: any;
        title: any;
        description: any;
        dueDate: string | null;
        priority: any;
        status: any;
        createdAt: string | null;
        completedAt: string | null;
        assignedTo: any;
        assignedBy: any;
    }>;
    update(userId: string, body: any): Promise<{
        id: any;
        title: any;
        description: any;
        dueDate: string | null;
        priority: any;
        status: any;
        createdAt: string | null;
        completedAt: string | null;
        assignedTo: any;
        assignedBy: any;
    }>;
    delete(userId: string, id: string): Promise<{
        success: boolean;
        id: string;
    }>;
    getDirectReports(userId: string): Promise<{
        id: string;
        name: string;
        email: string;
        roleTitle: string;
        avatarUrl: string | null;
    }[]>;
}
