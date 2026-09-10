import { PrismaService } from '../prisma/prisma.service';
import { NotifyService } from '../common/notifications/notify.service';
export declare class HelpDeskService {
    private prisma;
    private notify;
    constructor(prisma: PrismaService, notify: NotifyService);
    findAll(employeeId?: string, status?: string, category?: string): Promise<any[]>;
    create(employeeId: string, data: any): Promise<any>;
    update(id: string, data: {
        status?: 'Open' | 'In Progress' | 'Resolved';
        resolution?: string;
        resolvedById?: string;
    }): Promise<any>;
}
