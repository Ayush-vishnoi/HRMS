"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RATING_BANDS = exports.DEFAULT_WEIGHTS = void 0;
exports.getRatingBand = getRatingBand;
exports.calculateEmployeePerformanceScore = calculateEmployeePerformanceScore;
exports.DEFAULT_WEIGHTS = {
    goalsWeight: 40,
    kraKpiWeight: 30,
    competenciesWeight: 20,
    feedbackWeight: 10,
};
exports.RATING_BANDS = [
    { level: 5, min: 4.5, max: 5.0, label: 'Outstanding', description: 'Consistently far exceeds role expectations and demonstrates exemplary leadership.', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { level: 4, min: 3.8, max: 4.49, label: 'Exceeds Expectations', description: 'Regularly surpasses targets and delivers high-quality outcomes.', badgeColor: 'bg-blue-100 text-blue-800 border-blue-300' },
    { level: 3, min: 2.8, max: 3.79, label: 'Meets Expectations', description: 'Consistently delivers on goals and satisfies core responsibilities.', badgeColor: 'bg-slate-100 text-slate-800 border-slate-300' },
    { level: 2, min: 2.0, max: 2.79, label: 'Needs Improvement', description: 'Fails to meet some targets; development and coaching plan required.', badgeColor: 'bg-amber-100 text-amber-800 border-amber-300' },
    { level: 1, min: 0.0, max: 1.99, label: 'Needs Significant Improvement', description: 'Critical performance gaps; immediate PIP intervention mandated.', badgeColor: 'bg-rose-100 text-rose-800 border-rose-300' },
];
function getRatingBand(rating5) {
    const rounded = Math.round(rating5 * 100) / 100;
    for (const band of exports.RATING_BANDS) {
        if (rounded >= band.min && rounded <= band.max) {
            return band;
        }
    }
    return exports.RATING_BANDS[2];
}
async function calculateEmployeePerformanceScore(prisma, employeeId, cycleId, customWeights) {
    const weights = {
        ...exports.DEFAULT_WEIGHTS,
        ...(customWeights || {}),
    };
    const [goals, kras, kpis, competencyAssessments, feedbackList] = await Promise.all([
        prisma.performanceGoal.findMany({
            where: {
                owner_employee_id: employeeId,
                ...(cycleId ? { cycle_id: cycleId } : {}),
            },
            include: { key_results: true },
        }),
        prisma.performanceKra.findMany({
            where: { assignedToId: employeeId },
        }),
        prisma.performance_kpis.findMany({
            where: {
                employee_id: employeeId,
                ...(cycleId ? { cycle_id: cycleId } : {}),
            },
        }),
        prisma.performance_competency_assessments.findMany({
            where: {
                employee_id: employeeId,
                ...(cycleId ? { cycle_id: cycleId } : {}),
            },
            include: { performance_competencies: true },
        }),
        prisma.performance_feedback.findMany({
            where: {
                recipient_id: employeeId,
                ...(cycleId ? { cycle_id: cycleId } : {}),
            },
        }),
    ]);
    let goalsProgressSum = 0;
    let goalsWeightSum = 0;
    if (goals.length > 0) {
        for (const g of goals) {
            const gWeight = g.weightage || 10;
            let gProgress = g.progress || 0;
            if (g.key_results && g.key_results.length > 0) {
                const krWeightSum = g.key_results.reduce((acc, kr) => acc + (kr.weightage || 25), 0);
                const krWeightedProgress = g.key_results.reduce((acc, kr) => acc + (kr.progress * (kr.weightage || 25)), 0);
                gProgress = krWeightSum > 0 ? Math.round(krWeightedProgress / krWeightSum) : gProgress;
            }
            goalsProgressSum += gProgress * gWeight;
            goalsWeightSum += gWeight;
        }
    }
    const rawGoalScore100 = goalsWeightSum > 0 ? Math.round(goalsProgressSum / goalsWeightSum) : 75;
    const rawGoalRating5 = Math.round((1 + (rawGoalScore100 / 100) * 4) * 100) / 100;
    let kraKpiScore100 = 70;
    let kraKpiDetails = 'Evaluated based on assigned KRAs & quantitative KPIs';
    const kraProgressWeighted = kras.length > 0
        ? kras.reduce((acc, k) => acc + k.progress * (k.weightage || 20), 0) /
            Math.max(1, kras.reduce((acc, k) => acc + (k.weightage || 20), 0))
        : 70;
    const kpiAchievementWeighted = kpis.length > 0
        ? kpis.reduce((acc, kpi) => {
            const target = Number(kpi.target) || 1;
            const actual = Number(kpi.actual) || 0;
            const achieve = Math.min(150, Math.round((actual / target) * 100));
            return acc + achieve * (kpi.weightage || 20);
        }, 0) / Math.max(1, kpis.reduce((acc, kpi) => acc + (kpi.weightage || 20), 0))
        : 70;
    if (kras.length > 0 && kpis.length > 0) {
        kraKpiScore100 = Math.round(kraProgressWeighted * 0.5 + kpiAchievementWeighted * 0.5);
        kraKpiDetails = `${kras.length} KRAs (${Math.round(kraProgressWeighted)}% avg) + ${kpis.length} KPIs (${Math.round(kpiAchievementWeighted)}% achievement)`;
    }
    else if (kras.length > 0) {
        kraKpiScore100 = Math.round(kraProgressWeighted);
        kraKpiDetails = `${kras.length} KRAs (${Math.round(kraProgressWeighted)}% weighted progress)`;
    }
    else if (kpis.length > 0) {
        kraKpiScore100 = Math.round(kpiAchievementWeighted);
        kraKpiDetails = `${kpis.length} measurable KPIs (${Math.round(kpiAchievementWeighted)}% weighted achievement)`;
    }
    const rawKraKpiRating5 = Math.round((1 + (kraKpiScore100 / 100) * 4) * 100) / 100;
    let competencyRating5 = 3.5;
    let competencyDetails = 'Assessed across core competency framework';
    if (competencyAssessments.length > 0) {
        const sumRatings = competencyAssessments.reduce((acc, c) => acc + Number(c.rating || 3.0), 0);
        competencyRating5 = Math.round((sumRatings / competencyAssessments.length) * 100) / 100;
        competencyDetails = `Average of ${competencyAssessments.length} competency assessments`;
    }
    const competencyScore100 = Math.round(((competencyRating5 - 1) / 4) * 100);
    let feedbackRating5 = 3.8;
    let feedbackDetails = '360° feedback and peer recognitions';
    const ratedFeedback = feedbackList.filter((f) => f.rating !== null && f.rating !== undefined);
    if (ratedFeedback.length > 0) {
        const sumRating = ratedFeedback.reduce((acc, f) => acc + Number(f.rating), 0);
        feedbackRating5 = Math.round((sumRating / ratedFeedback.length) * 100) / 100;
        feedbackDetails = `Synthesized from ${ratedFeedback.length} peer and manager reviews`;
    }
    const feedbackScore100 = Math.round(((feedbackRating5 - 1) / 4) * 100);
    const totalWeight = weights.goalsWeight + weights.kraKpiWeight + weights.competenciesWeight + weights.feedbackWeight;
    const weightedGoal5 = (rawGoalRating5 * weights.goalsWeight) / totalWeight;
    const weightedKraKpi5 = (rawKraKpiRating5 * weights.kraKpiWeight) / totalWeight;
    const weightedComp5 = (competencyRating5 * weights.competenciesWeight) / totalWeight;
    const weightedFeedback5 = (feedbackRating5 * weights.feedbackWeight) / totalWeight;
    const finalRating5 = Math.round((weightedGoal5 + weightedKraKpi5 + weightedComp5 + weightedFeedback5) * 100) / 100;
    const finalScore100 = Math.round(((rawGoalScore100 * weights.goalsWeight) / totalWeight) +
        ((kraKpiScore100 * weights.kraKpiWeight) / totalWeight) +
        ((competencyScore100 * weights.competenciesWeight) / totalWeight) +
        ((feedbackScore100 * weights.feedbackWeight) / totalWeight));
    const ratingBand = getRatingBand(finalRating5);
    return {
        employeeId,
        cycleId,
        finalRating5,
        finalScore100,
        ratingBand,
        components: {
            goals: {
                label: 'Goals & OKR Alignment',
                weightPercentage: weights.goalsWeight,
                rawScore100: rawGoalScore100,
                rawRating5: rawGoalRating5,
                weightedContribution5: Math.round(weightedGoal5 * 100) / 100,
                weightedContribution100: Math.round((rawGoalScore100 * weights.goalsWeight) / totalWeight),
                details: `${goals.length} Goals/OKRs evaluated (${rawGoalScore100}% completion)`,
            },
            kraKpi: {
                label: 'KRAs & Measurable KPIs',
                weightPercentage: weights.kraKpiWeight,
                rawScore100: kraKpiScore100,
                rawRating5: rawKraKpiRating5,
                weightedContribution5: Math.round(weightedKraKpi5 * 100) / 100,
                weightedContribution100: Math.round((kraKpiScore100 * weights.kraKpiWeight) / totalWeight),
                details: kraKpiDetails,
            },
            competencies: {
                label: 'Core Competency Dimensions',
                weightPercentage: weights.competenciesWeight,
                rawScore100: competencyScore100,
                rawRating5: competencyRating5,
                weightedContribution5: Math.round(weightedComp5 * 100) / 100,
                weightedContribution100: Math.round((competencyScore100 * weights.competenciesWeight) / totalWeight),
                details: competencyDetails,
            },
            feedback: {
                label: '360° & Peer Feedback',
                weightPercentage: weights.feedbackWeight,
                rawScore100: feedbackScore100,
                rawRating5: feedbackRating5,
                weightedContribution5: Math.round(weightedFeedback5 * 100) / 100,
                weightedContribution100: Math.round((feedbackScore100 * weights.feedbackWeight) / totalWeight),
                details: feedbackDetails,
            },
        },
        weightsApplied: weights,
        calculatedAt: new Date().toISOString(),
    };
}
//# sourceMappingURL=score-engine.js.map