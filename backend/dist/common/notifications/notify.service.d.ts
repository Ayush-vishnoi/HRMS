import { PrismaService } from '../../prisma/prisma.service';
export interface NotifyInput {
    userId: string;
    title: string;
    message: string;
    type?: string;
    linkUrl?: string | null;
}
export declare class NotifyService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    notifyUser(input: NotifyInput): Promise<void>;
    notifyUsers(userIds: string[], payload: Omit<NotifyInput, 'userId'>): Promise<void>;
    notifyAdmins(payload: Omit<NotifyInput, 'userId'>): Promise<void>;
    notifyManagerOf(employeeId: string, payload: Omit<NotifyInput, 'userId'>): Promise<void>;
}
