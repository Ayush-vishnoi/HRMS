import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private analyticsService;
    constructor(analyticsService: AnalyticsService);
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
    }>;
}
