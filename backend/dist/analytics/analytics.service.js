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
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
let AnalyticsService = class AnalyticsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMetrics() {
        const now = new Date();
        const currentYear = now.getUTCFullYear();
        const monthPadded = String(now.getUTCMonth() + 1).padStart(2, '0');
        const monthName = MONTH_NAMES[now.getUTCMonth()];
        const [totalHeadcount, openTicketsCount, pendingLeavesCount, pendingDocRequestsCount, attendanceRecords, candidates, employeesByDept, employeeJoinDates, openJobs, departedCount, activeExitRequests,] = await Promise.all([
            this.prisma.employee.count(),
            this.prisma.helpDeskTicket.count({ where: { status: { in: ['Open', 'InProgress'] } } }),
            this.prisma.leaveRequest.count({ where: { status: 'Pending' } }),
            this.prisma.documentRequest.count({ where: { status: { in: ['Pending', 'InProgress'] } } }),
            this.prisma.attendanceRecord.findMany({ select: { date: true, status: true }, take: 100, orderBy: { createdAt: 'desc' } }),
            this.prisma.recruitmentCandidate.findMany({ select: { stage: true } }),
            this.prisma.employee.groupBy({ by: ['department'], _count: { id: true } }),
            this.prisma.employee.findMany({ select: { joinDate: true } }),
            this.prisma.recruitmentJob.findMany({ where: { status: 'Open' }, select: { department: true, openings: true } }),
            this.prisma.employee.count({ where: { status: { in: ['Offboarded', 'Exited'] } } }),
            this.prisma.exitRequest.count({ where: { status: { notIn: ['Completed', 'Rejected', 'Withdrawn'] } } }),
        ]);
        const openHrActions = openTicketsCount + pendingLeavesCount + pendingDocRequestsCount;
        const newHiresThisMonth = employeeJoinDates.filter((employee) => {
            const joined = employee.joinDate || '';
            return joined.startsWith(`${currentYear}-${monthPadded}`) || joined.includes(` ${monthName} ${currentYear}`);
        }).length;
        const openJobCount = openJobs.length;
        const activeJobOpenings = openJobs.reduce((total, job) => total + (job.openings ?? 1), 0);
        const openingsByDept = {};
        openJobs.forEach((job) => {
            const dept = job.department || 'Other';
            openingsByDept[dept] = (openingsByDept[dept] ?? 0) + (job.openings ?? 1);
        });
        const topOpeningsDept = Object.entries(openingsByDept).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
        const attritionRate = totalHeadcount > 0 ? Math.round((departedCount / totalHeadcount) * 1000) / 10 : 0;
        const attritionNote = departedCount === 0
            ? 'No departures on record'
            : attritionRate < 5
                ? 'Below industry avg (5%)'
                : attritionRate === 5
                    ? 'At industry avg (5%)'
                    : 'Above industry avg (5%)';
        const complianceItems = [
            {
                id: 'document-requests',
                title: 'Pending Document Requests',
                badge: `${pendingDocRequestsCount} Pending`,
                detail: `${pendingDocRequestsCount} employee document request${pendingDocRequestsCount === 1 ? '' : 's'} awaiting HR review.`,
                count: pendingDocRequestsCount,
            },
            {
                id: 'leave-approvals',
                title: 'Pending Leave Approvals',
                badge: `${pendingLeavesCount} Pending`,
                detail: `${pendingLeavesCount} leave request${pendingLeavesCount === 1 ? '' : 's'} awaiting approval.`,
                count: pendingLeavesCount,
            },
            {
                id: 'help-desk-tickets',
                title: 'Open Help Desk Tickets',
                badge: `${openTicketsCount} Open`,
                detail: `${openTicketsCount} help desk ticket${openTicketsCount === 1 ? '' : 's'} open or in progress.`,
                count: openTicketsCount,
            },
            {
                id: 'exit-requests',
                title: 'In-flight Exit Requests',
                badge: `${activeExitRequests} Active`,
                detail: `${activeExitRequests} exit request${activeExitRequests === 1 ? '' : 's'} moving through the clearance workflow.`,
                count: activeExitRequests,
            },
        ];
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
        const DEPT_COLORS = {
            Engineering: '#17324A', 'AI/ML': '#8B3A4A', Product: '#A04456',
            Design: '#B86B78', 'Human Resources': '#10b981', Marketing: '#f59e0b',
            Finance: '#5E6673',
        };
        const headcountByDept = employeesByDept.map((d) => ({
            name: d.department || 'Other',
            count: typeof d._count === 'object' && d._count !== null ? d._count.id ?? 0 : 0,
            color: DEPT_COLORS[d.department || ''] || '#8B9BAA',
        }));
        return {
            totalHeadcount,
            newHiresThisMonth,
            openJobCount,
            activeJobOpenings,
            topOpeningsDept,
            attritionRate: `${attritionRate}%`,
            attritionNote,
            departedCount,
            activeExitRequests,
            complianceItems,
            openHrActions,
            attendanceRate: `${attendanceRate}%`,
            recruitmentPipeline,
            attendanceTrends,
            headcountByDept,
        };
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map