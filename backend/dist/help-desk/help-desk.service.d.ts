import { PrismaService } from '../prisma/prisma.service';
export declare class HelpDeskService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(employeeId?: string, status?: string, category?: string): Promise<({
        employee: {
            id: string;
            name: string;
            employeeCode: string;
            avatarUrl: string | null;
        };
        resolvedBy: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: string;
        status: import("@prisma/client").$Enums.TicketStatus;
        employeeId: string;
        description: string;
        category: import("@prisma/client").$Enums.TicketCategory;
        priority: import("@prisma/client").$Enums.TicketPriority;
        subject: string;
        resolution: string | null;
        resolvedAt: string | null;
        resolvedById: string | null;
    })[]>;
    create(employeeId: string, data: any): Promise<{
        id: string;
        createdAt: string;
        status: import("@prisma/client").$Enums.TicketStatus;
        employeeId: string;
        description: string;
        category: import("@prisma/client").$Enums.TicketCategory;
        priority: import("@prisma/client").$Enums.TicketPriority;
        subject: string;
        resolution: string | null;
        resolvedAt: string | null;
        resolvedById: string | null;
    }>;
    update(id: string, data: {
        status?: 'Open' | 'In Progress' | 'Resolved';
        resolution?: string;
        resolvedById?: string;
    }): Promise<{
        id: string;
        createdAt: string;
        status: import("@prisma/client").$Enums.TicketStatus;
        employeeId: string;
        description: string;
        category: import("@prisma/client").$Enums.TicketCategory;
        priority: import("@prisma/client").$Enums.TicketPriority;
        subject: string;
        resolution: string | null;
        resolvedAt: string | null;
        resolvedById: string | null;
    }>;
}
