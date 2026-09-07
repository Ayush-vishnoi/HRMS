import { HelpDeskService } from './help-desk.service';
export declare class HelpDeskController {
    private helpDeskService;
    constructor(helpDeskService: HelpDeskService);
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
    create(userId: string, body: any): Promise<{
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
    update(body: {
        id: string;
        status?: 'Open' | 'In Progress' | 'Resolved';
        resolution?: string;
        resolvedById?: string;
    }, userId: string): Promise<{
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
