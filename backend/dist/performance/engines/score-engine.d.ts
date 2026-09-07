import { PrismaService } from '../../prisma/prisma.service';
export interface PerformanceScoringWeights {
    goalsWeight: number;
    kraKpiWeight: number;
    competenciesWeight: number;
    feedbackWeight: number;
}
export interface ScoreComponentBreakdown {
    label: string;
    weightPercentage: number;
    rawScore100: number;
    rawRating5: number;
    weightedContribution5: number;
    weightedContribution100: number;
    details: string;
}
export interface PerformanceScoreResult {
    employeeId: string;
    cycleId?: string;
    finalRating5: number;
    finalScore100: number;
    ratingBand: {
        level: number;
        label: string;
        description: string;
        badgeColor: string;
    };
    components: {
        goals: ScoreComponentBreakdown;
        kraKpi: ScoreComponentBreakdown;
        competencies: ScoreComponentBreakdown;
        feedback: ScoreComponentBreakdown;
    };
    weightsApplied: PerformanceScoringWeights;
    calculatedAt: string;
}
export declare const DEFAULT_WEIGHTS: PerformanceScoringWeights;
export declare const RATING_BANDS: {
    level: number;
    min: number;
    max: number;
    label: string;
    description: string;
    badgeColor: string;
}[];
export declare function getRatingBand(rating5: number): {
    level: number;
    min: number;
    max: number;
    label: string;
    description: string;
    badgeColor: string;
};
export declare function calculateEmployeePerformanceScore(prisma: PrismaService, employeeId: string, cycleId?: string, customWeights?: Partial<PerformanceScoringWeights>): Promise<PerformanceScoreResult>;
