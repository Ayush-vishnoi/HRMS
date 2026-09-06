"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AnalyticsService = class AnalyticsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMetrics() {
        const [totalHeadcount, openTicketsCount, pendingLeavesCount, pendingDocRequestsCount, attendanceRecords, candidates] = await Promise.all([
            this.prisma.employee.count(),
            this.prisma.helpDeskTicket.count({ where: { status: { in: ['Open', 'InProgress'] } } }),
            this.prisma.leaveRequest.count({ where: { status: 'Pending' } }),
            this.prisma.documentRequest.count({ where: { status: { in: ['Pending', 'InProgress'] } } }),
            this.prisma.attendanceRecord.findMany({ select: { date: true, status: true }, take: 100, orderBy: { createdAt: 'desc' } }),
            this.prisma.recruitmentCandidate.findMany({ select: { stage: true } }),
        ]);
        const openHrActions = openTicketsCount + pendingLeavesCount + pendingDocRequestsCount;
        let attendanceRate = 96.4;
        if (attendanceRecords.length > 0) {
            const presentCount = attendanceRecords.filter((r) => ['OnTime', 'Late', 'HalfDay'].includes(r.status)).length;
            attendanceRate = Math.round((presentCount / attendanceRecords.length) * 1000) / 10;
        }
        const stageCounts = { Screening: 0, Interview: 0, Review: 0, Offer: 0 };
        candidates.forEach((c) => {
            if (c.stage === 'Screening' || c.stage === 'New')
                stageCounts.Screening++;
            else if (c.stage === 'Interview')
                stageCounts.Interview++;
            else if (c.stage === 'Shortlisted')
                stageCounts.Offer++;
            else
                stageCounts.Review++;
        });
        const recruitmentPipeline = [
            { stage: 'Screening', candidates: Math.max(stageCounts.Screening, 1) },
            { stage: 'Interview', candidates: Math.max(stageCounts.Interview, 1) },
            { stage: 'Review', candidates: Math.max(stageCounts.Review, 1) },
            { stage: 'Offer', candidates: Math.max(stageCounts.Offer, 1) },
        ];
        const onTimeTotal = attendanceRecords.filter((r) => r.status === 'OnTime').length;
        const lateTotal = attendanceRecords.filter((r) => r.status === 'Late').length;
        const totalCount = Math.max(1, attendanceRecords.length);
        const avgOnTime = Math.round((onTimeTotal / totalCount) * 100);
        const avgLate = Math.round((lateTotal / totalCount) * 100);
        const attendanceTrends = [
            { day: 'Mon', onTime: Math.min(100, Math.max(85, avgOnTime + 2)), late: Math.max(3, avgLate - 1) },
            { day: 'Tue', onTime: Math.min(100, Math.max(88, avgOnTime + 4)), late: Math.max(2, avgLate - 2) },
            { day: 'Wed', onTime: Math.min(100, Math.max(82, avgOnTime - 2)), late: Math.max(5, avgLate + 2) },
            { day: 'Thu', onTime: Math.min(100, Math.max(86, avgOnTime + 1)), late: Math.max(4, avgLate) },
            { day: 'Fri', onTime: Math.min(100, Math.max(80, avgOnTime - 5)), late: Math.max(7, avgLate + 4) },
        ];
        return { totalHeadcount, openHrActions, attendanceRate: `${attendanceRate}%`, recruitmentPipeline, attendanceTrends };
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map