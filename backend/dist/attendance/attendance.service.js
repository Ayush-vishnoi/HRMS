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
let AttendanceService = class AttendanceService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
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
        return this.prisma.lateClockInRequest.create({
            data: {
                requesterId,
                requestDate,
                reason,
                requestedAt: new Date().toISOString(),
            },
        });
    }
    async reviewLateRequest(id, status, reviewedById) {
        return this.prisma.lateClockInRequest.update({
            where: { id },
            data: { status, reviewedById, reviewedAt: new Date().toISOString() },
        });
    }
};
exports.AttendanceService = AttendanceService;
exports.AttendanceService = AttendanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AttendanceService);
//# sourceMappingURL=attendance.service.js.map