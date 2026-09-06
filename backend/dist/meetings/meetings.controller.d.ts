import { MeetingsService } from './meetings.service';
export declare class MeetingsController {
    private meetingsService;
    constructor(meetingsService: MeetingsService);
    findAll(userId: string, search?: string, id?: string, from?: string, to?: string, type?: string, department?: string, mine?: string): Promise<{
        success: boolean;
        data: {
            id: string;
            name: string;
            avatarUrl: string | null;
            department: string;
            email: string;
            role: string;
        }[];
    } | {
        success: boolean;
        data: {
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
        };
    } | {
        success: boolean;
        data: {
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
        }[];
    }>;
    create(userId: string, body: any): Promise<{
        success: boolean;
        data: {
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
        };
    }>;
    update(userId: string, body: any): Promise<{
        success: boolean;
        data: {
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
        };
    }>;
}
