import { PrismaService } from '../prisma/prisma.service';
export declare class AnalyticsService {
    private prisma;
    constructor(prisma: PrismaService);
    getMetrics(): Promise<{
        totalHeadcount: number;
        openHrActions: number;
        attendanceRate: string;
        recruitmentPipeline: {
            stage: string;
            candidates: number;
        }[];
        attendanceTrends: {
            day: string;
            onTime: number;
            late: number;
        }[];
        headcountByDept: {
            name: string;
            count: any;
            color: string;
        }[];
    }>;
}
