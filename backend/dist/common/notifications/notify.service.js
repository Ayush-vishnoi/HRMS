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
exports.NotifyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let NotifyService = class NotifyService {
    prisma;
    logger = new common_1.Logger('NotifyService');
    constructor(prisma) {
        this.prisma = prisma;
    }
    async notifyUser(input) {
        try {
            if (!input.userId)
                return;
            await this.prisma.userNotification.create({
                data: {
                    userId: input.userId,
                    title: input.title,
                    message: input.message,
                    type: input.type ?? 'System',
                    linkUrl: input.linkUrl ?? null,
                },
            });
        }
        catch (error) {
            this.logger.error('Failed to create notification', error);
        }
    }
    async notifyUsers(userIds, payload) {
        try {
            const uniqueIds = [...new Set(userIds.filter(Boolean))];
            if (uniqueIds.length === 0)
                return;
            await this.prisma.userNotification.createMany({
                data: uniqueIds.map((userId) => ({
                    userId,
                    title: payload.title,
                    message: payload.message,
                    type: payload.type ?? 'System',
                    linkUrl: payload.linkUrl ?? null,
                })),
            });
        }
        catch (error) {
            this.logger.error('Failed to create notifications', error);
        }
    }
    async notifyAdmins(payload) {
        try {
            const admins = await this.prisma.employee.findMany({
                where: {
                    userRole: 'admin',
                    status: { in: ['Active', 'OnLeave', 'Remote'] },
                },
                select: { id: true },
            });
            await this.notifyUsers(admins.map((admin) => admin.id), payload);
        }
        catch (error) {
            this.logger.error('Failed to notify admins', error);
        }
    }
    async notifyManagerOf(employeeId, payload) {
        try {
            const employee = await this.prisma.employee.findUnique({
                where: { id: employeeId },
                select: { managerId: true },
            });
            if (!employee?.managerId)
                return;
            await this.notifyUser({ ...payload, userId: employee.managerId });
        }
        catch (error) {
            this.logger.error('Failed to notify manager', error);
        }
    }
};
exports.NotifyService = NotifyService;
exports.NotifyService = NotifyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotifyService);
//# sourceMappingURL=notify.service.js.map