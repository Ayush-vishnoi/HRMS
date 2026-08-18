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
exports.LeavesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let LeavesService = class LeavesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getBalances(employeeId) {
        return this.prisma.leaveBalance.findMany({ where: { employeeId } });
    }
    async getRequests(employeeId, status) {
        const where = {};
        if (employeeId)
            where.employeeId = employeeId;
        if (status)
            where.status = status;
        return this.prisma.leaveRequest.findMany({
            where,
            include: {
                employee: { select: { id: true, name: true, employeeCode: true, avatarUrl: true, department: true } },
                reviewer: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createRequest(data) {
        return this.prisma.leaveRequest.create({
            data: { ...data, appliedOn: new Date().toISOString().split('T')[0] },
        });
    }
    async reviewRequest(id, status, reviewerId) {
        const req = await this.prisma.leaveRequest.findUnique({ where: { id } });
        if (!req)
            throw new common_1.NotFoundException('Leave request not found');
        const updated = await this.prisma.leaveRequest.update({
            where: { id },
            data: { status, reviewerId },
        });
        if (status === 'Approved') {
            await this.prisma.leaveBalance.updateMany({
                where: { employeeId: req.employeeId, leaveType: req.leaveType },
                data: { used: { increment: req.days }, remaining: { decrement: req.days } },
            });
        }
        return updated;
    }
};
exports.LeavesService = LeavesService;
exports.LeavesService = LeavesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LeavesService);
//# sourceMappingURL=leaves.service.js.map