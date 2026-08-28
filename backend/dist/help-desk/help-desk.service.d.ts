import { PrismaService } from '../prisma/prisma.service';
export declare class HelpDeskService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(employeeId?: string, status?: string, category?: string): Promise<({
        employee: {
            id: string;
            employeeCode: string;
            name: string;
            avatarUrl: string | null;
        };
        resolvedBy: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        status: import("@prisma/client").$Enums.TicketStatus;
        createdAt: string;
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
        status: import("@prisma/client").$Enums.TicketStatus;
        createdAt: string;
        employeeId: string;
        description: string;
        category: import("@prisma/client").$Enums.TicketCategory;
        priority: import("@prisma/client").$Enums.TicketPriority;
        subject: string;
        resolution: string | null;
        resolvedAt: string | null;
        resolvedById: string | null;
    }>;
    resolve(id: string, resolvedById: string, resolution: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.TicketStatus;
        createdAt: string;
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
