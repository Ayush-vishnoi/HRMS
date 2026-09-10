import { HelpDeskService } from './help-desk.service';
export declare class HelpDeskController {
    private helpDeskService;
    constructor(helpDeskService: HelpDeskService);
    findAll(employeeId?: string, status?: string, category?: string): Promise<any[]>;
    create(userId: string, body: any): Promise<any>;
    update(body: {
        id: string;
        status?: 'Open' | 'In Progress' | 'Resolved';
        resolution?: string;
        resolvedById?: string;
    }, userId: string): Promise<any>;
}
