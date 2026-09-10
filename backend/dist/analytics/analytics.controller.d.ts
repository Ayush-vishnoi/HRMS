import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private analyticsService;
    constructor(analyticsService: AnalyticsService);
    getMetrics(): Promise<{
        totalHeadcount: number;
        newHiresThisMonth: number;
        openJobCount: number;
        activeJobOpenings: number;
        topOpeningsDept: string;
        attritionRate: string;
        attritionNote: string;
        departedCount: number;
        activeExitRequests: number;
        complianceItems: {
            id: string;
            title: string;
            badge: string;
            detail: string;
            count: number;
        }[];
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
