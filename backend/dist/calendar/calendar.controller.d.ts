import { CalendarService } from './calendar.service';
export declare class CalendarController {
    private calendarService;
    constructor(calendarService: CalendarService);
    getEvents(user: any, from: string, to: string): Promise<{
        success: boolean;
        data: any[];
    }>;
}
