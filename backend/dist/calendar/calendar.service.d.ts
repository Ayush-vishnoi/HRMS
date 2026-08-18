import { PrismaService } from '../prisma/prisma.service';
export declare class CalendarService {
    private prisma;
    constructor(prisma: PrismaService);
    getEvents(user: any, from: string, to: string): Promise<any[]>;
}
