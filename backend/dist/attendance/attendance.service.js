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
exports.AttendanceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notify_service_1 = require("../common/notifications/notify.service");
let AttendanceService = class AttendanceService {
    prisma;
    notify;
    constructor(prisma, notify) {
        this.prisma = prisma;
        this.notify = notify;
    }
    async findAll(employeeId, from, to) {
        const where = {};
        if (employeeId)
            where.employeeId = employeeId;
        if (from || to) {
            where.date = {};
            if (from)
                where.date.gte = from;
            if (to)
                where.date.lte = to;
        }
        return this.prisma.attendanceRecord.findMany({
            where,
            include: { employee: { select: { id: true, name: true, employeeCode: true, avatarUrl: true } } },
            orderBy: { date: 'desc' },
        });
    }
    async create(employeeId, data) {
        const payload = {
            employeeId,
            date: data.date,
            checkIn: data.checkIn,
            checkOut: '',
            hoursWorked: '0h 0m',
            status: data.status || 'OnTime',
            location: data.location || 'Office - HQ',
        };
        if (data.id) {
            payload.id = data.id;
            const existing = await this.prisma.attendanceRecord.findUnique({ where: { id: data.id } });
            if (existing) {
                return this.prisma.attendanceRecord.update({ where: { id: data.id }, data: payload });
            }
        }
        return this.prisma.attendanceRecord.create({ data: payload });
    }
    async update(id, data) {
        return this.prisma.attendanceRecord.update({
            where: { id },
            data: {
                ...(data.checkOut !== undefined ? { checkOut: data.checkOut } : {}),
                ...(data.hoursWorked !== undefined ? { hoursWorked: data.hoursWorked } : {}),
            },
        });
    }
    async getLateRequests(status) {
        return this.prisma.lateClockInRequest.findMany({
            where: status ? { status: status } : {},
            include: { requester: { select: { id: true, name: true, employeeCode: true, avatarUrl: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createLateRequest(requesterId, requestDate, reason) {
        const created = await this.prisma.lateClockInRequest.create({
            data: {
                requesterId,
                requestDate,
                reason,
                requestedAt: new Date().toISOString(),
            },
        });
        const employee = await this.prisma.employee.findUnique({
            where: { id: requesterId },
            select: { name: true },
        });
        await this.notify.notifyAdmins({
            title: 'Late clock-in request',
            message: `${employee?.name ?? 'An employee'} requested permission to clock in late on ${requestDate}.`,
            type: 'Attendance',
            linkUrl: '/attendance',
        });
        return created;
    }
    async reviewLateRequest(id, status, reviewedById) {
        const request = await this.prisma.lateClockInRequest.findUnique({ where: { id } });
        const updated = await this.prisma.lateClockInRequest.update({
            where: { id },
            data: { status, reviewedById, reviewedAt: new Date().toISOString() },
        });
        if (request) {
            await this.notify.notifyUser({
                userId: request.requesterId,
                title: status === 'approved' ? 'Late clock-in approved' : 'Late clock-in rejected',
                message: `Your late clock-in request for ${request.requestDate} has been ${status}.`,
                type: 'Attendance',
                linkUrl: '/attendance',
            });
        }
        return updated;
    }
};
exports.AttendanceService = AttendanceService;
exports.AttendanceService = AttendanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, notify_service_1.NotifyService])
], AttendanceService);
//# sourceMappingURL=attendance.service.js.map