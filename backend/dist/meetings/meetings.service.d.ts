import { PrismaService } from '../prisma/prisma.service';
export declare class MeetingsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(employeeId: string, from?: string, to?: string): Promise<({
        attendees: ({
            employee: {
                id: string;
                name: string;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            updatedAt: Date;
            employeeId: string;
            rsvp: import("@prisma/client").$Enums.RsvpStatus;
            responseReason: string | null;
            meetingId: string;
        })[];
        organizer: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
    } & {
        id: string;
        department: string | null;
        status: import("@prisma/client").$Enums.MeetingStatus;
        location: string | null;
        createdAt: Date;
        updatedAt: Date;
        organizerId: string;
        title: string;
        type: import("@prisma/client").$Enums.MeetingType;
        description: string | null;
        startsAt: Date;
        endsAt: Date;
        allDay: boolean;
        videoLink: string | null;
        recurrence: import("@prisma/client").$Enums.Recurrence;
        reminderMinutes: number | null;
    })[]>;
    findOne(id: string): Promise<{
        attendees: ({
            employee: {
                id: string;
                name: string;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            updatedAt: Date;
            employeeId: string;
            rsvp: import("@prisma/client").$Enums.RsvpStatus;
            responseReason: string | null;
            meetingId: string;
        })[];
        organizer: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
    } & {
        id: string;
        department: string | null;
        status: import("@prisma/client").$Enums.MeetingStatus;
        location: string | null;
        createdAt: Date;
        updatedAt: Date;
        organizerId: string;
        title: string;
        type: import("@prisma/client").$Enums.MeetingType;
        description: string | null;
        startsAt: Date;
        endsAt: Date;
        allDay: boolean;
        videoLink: string | null;
        recurrence: import("@prisma/client").$Enums.Recurrence;
        reminderMinutes: number | null;
    }>;
    create(organizerId: string, data: any): Promise<{
        attendees: ({
            employee: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            updatedAt: Date;
            employeeId: string;
            rsvp: import("@prisma/client").$Enums.RsvpStatus;
            responseReason: string | null;
            meetingId: string;
        })[];
    } & {
        id: string;
        department: string | null;
        status: import("@prisma/client").$Enums.MeetingStatus;
        location: string | null;
        createdAt: Date;
        updatedAt: Date;
        organizerId: string;
        title: string;
        type: import("@prisma/client").$Enums.MeetingType;
        description: string | null;
        startsAt: Date;
        endsAt: Date;
        allDay: boolean;
        videoLink: string | null;
        recurrence: import("@prisma/client").$Enums.Recurrence;
        reminderMinutes: number | null;
    }>;
    rsvp(meetingId: string, employeeId: string, status: 'ACCEPTED' | 'DECLINED', reason?: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
    cancel(id: string): Promise<{
        id: string;
        department: string | null;
        status: import("@prisma/client").$Enums.MeetingStatus;
        location: string | null;
        createdAt: Date;
        updatedAt: Date;
        organizerId: string;
        title: string;
        type: import("@prisma/client").$Enums.MeetingType;
        description: string | null;
        startsAt: Date;
        endsAt: Date;
        allDay: boolean;
        videoLink: string | null;
        recurrence: import("@prisma/client").$Enums.Recurrence;
        reminderMinutes: number | null;
    }>;
}
