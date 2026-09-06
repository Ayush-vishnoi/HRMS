import { PrismaService } from '../prisma/prisma.service';
export declare class MeetingsService {
    private prisma;
    constructor(prisma: PrismaService);
    searchEmployees(query: string): Promise<{
        id: string;
        name: string;
        avatarUrl: string | null;
        department: string;
        email: string;
        role: string;
    }[]>;
    findOne(employeeId: string, id: string): Promise<{
        id: any;
        title: any;
        type: any;
        description: any;
        startsAt: any;
        endsAt: any;
        allDay: any;
        location: any;
        videoLink: any;
        department: any;
        recurrence: any;
        reminderMinutes: any;
        status: any;
        organizer: {
            id: any;
            name: any;
            avatarUrl: any;
            department: any;
        };
        attendees: any;
    }>;
    findAll(employeeId: string, filters: {
        from?: string;
        to?: string;
        type?: string;
        department?: string;
        mine?: string;
    }): Promise<{
        id: any;
        title: any;
        type: any;
        description: any;
        startsAt: any;
        endsAt: any;
        allDay: any;
        location: any;
        videoLink: any;
        department: any;
        recurrence: any;
        reminderMinutes: any;
        status: any;
        organizer: {
            id: any;
            name: any;
            avatarUrl: any;
            department: any;
        };
        attendees: any;
    }[]>;
    create(organizerId: string, body: Record<string, unknown>): Promise<{
        id: any;
        title: any;
        type: any;
        description: any;
        startsAt: any;
        endsAt: any;
        allDay: any;
        location: any;
        videoLink: any;
        department: any;
        recurrence: any;
        reminderMinutes: any;
        status: any;
        organizer: {
            id: any;
            name: any;
            avatarUrl: any;
            department: any;
        };
        attendees: any;
    }>;
    update(employeeId: string, body: Record<string, unknown> & {
        id: string;
        action?: string;
        rsvp?: string;
        reason?: string;
    }): Promise<{
        id: any;
        title: any;
        type: any;
        description: any;
        startsAt: any;
        endsAt: any;
        allDay: any;
        location: any;
        videoLink: any;
        department: any;
        recurrence: any;
        reminderMinutes: any;
        status: any;
        organizer: {
            id: any;
            name: any;
            avatarUrl: any;
            department: any;
        };
        attendees: any;
    }>;
    private notifyUsers;
}
