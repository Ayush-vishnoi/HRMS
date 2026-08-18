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
exports.ExitService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ExitService = class ExitService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(userId, userRole, employeeId) {
        const targetId = employeeId || userId;
        const [exitRequests, alumniRecords, assignedAssets] = await Promise.all([
            this.prisma.exitRequest.findMany({ where: { employeeId: targetId }, include: { clearances: true, interview: true, settlement: true, ktTasks: true }, orderBy: { createdAt: 'desc' } }),
            this.prisma.alumniRecord.findMany({ where: { employeeId: targetId }, orderBy: { createdAt: 'desc' } }),
            this.prisma.asset.findMany({ where: { assignedToId: targetId }, select: { id: true, assetTag: true, name: true, serialNumber: true, category: true, status: true } }),
        ]);
        return { exitRequests, alumniRecords, assignedAssets };
    }
    async handleAction(userId, body) {
        const { action } = body;
        if (action === 'submit_resignation') {
            const todayStr = new Date().toISOString().split('T')[0];
            const empId = body.employeeId || userId;
            return this.prisma.exitRequest.create({
                data: {
                    id: `EXIT-${Date.now().toString(36)}`,
                    employeeId: empId,
                    resignationDate: todayStr,
                    requestedRelievingDate: body.requestedRelievingDate,
                    reasonCategory: body.reasonCategory,
                    reasonDetails: body.reasonDetails,
                    noticePeriodDays: Number(body.noticePeriodDays || 60),
                    status: 'Submitted',
                    clearances: { create: ['IT', 'Finance', 'HR', 'Manager', 'Admin'].map((dept) => ({ employeeId: empId, department: dept, status: 'Pending' })) },
                },
                include: { clearances: true, ktTasks: true },
            });
        }
        if (action === 'clearance_update') {
            return this.prisma.exitDepartmentClearance.update({
                where: { id: body.clearanceId },
                data: { status: body.status, clearedById: userId, clearedAt: body.status === 'Cleared' ? new Date() : null, remarks: body.remarks || undefined, assetReturnedCount: body.assetReturnedCount !== undefined ? Number(body.assetReturnedCount) : undefined, duesPendingAmount: body.duesPendingAmount !== undefined ? Number(body.duesPendingAmount) : undefined },
            });
        }
        if (action === 'calculate_ff') {
            const totalEarnings = Number(body.basicPay) + Number(body.leaveEncashmentAmount || 0) + Number(body.gratuityAmount || 0) + Number(body.bonusPayable || 0);
            const totalDeductions = Number(body.pendingDuesDeduction || 0) + Number(body.taxDeduction || 0);
            const exitReq = await this.prisma.exitRequest.findUnique({ where: { id: body.exitRequestId }, select: { employeeId: true } });
            return this.prisma.fullAndFinalSettlement.upsert({
                where: { exitRequestId: body.exitRequestId },
                update: { totalPayableDays: Number(body.totalPayableDays), basicPay: Number(body.basicPay), leaveEncashmentAmount: Number(body.leaveEncashmentAmount || 0), gratuityAmount: Number(body.gratuityAmount || 0), bonusPayable: Number(body.bonusPayable || 0), pendingDuesDeduction: Number(body.pendingDuesDeduction || 0), taxDeduction: Number(body.taxDeduction || 0), netSettlementAmount: totalEarnings - totalDeductions, status: 'Calculated' },
                create: { id: `FF-${Date.now().toString(36)}`, exitRequestId: body.exitRequestId, employeeId: exitReq.employeeId, totalPayableDays: Number(body.totalPayableDays), basicPay: Number(body.basicPay), leaveEncashmentAmount: Number(body.leaveEncashmentAmount || 0), gratuityAmount: Number(body.gratuityAmount || 0), bonusPayable: Number(body.bonusPayable || 0), pendingDuesDeduction: Number(body.pendingDuesDeduction || 0), taxDeduction: Number(body.taxDeduction || 0), netSettlementAmount: totalEarnings - totalDeductions, status: 'Calculated' },
            });
        }
        throw new Error('Invalid exit action');
    }
};
exports.ExitService = ExitService;
exports.ExitService = ExitService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExitService);
//# sourceMappingURL=exit.service.js.map