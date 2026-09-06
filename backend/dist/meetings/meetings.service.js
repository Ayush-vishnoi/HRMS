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
exports.MeetingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const uuid_1 = require("uuid");
let MeetingsService = class MeetingsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(employeeId, from, to) {
        const where = {
            OR: [
                { organizerId: employeeId },
                { attendees: { some: { employeeId } } },
            ],
        };
        if (from || to) {
            where.startsAt = {};
            if (from)
                where.startsAt.gte = new Date(from);
            if (to)
                where.startsAt.lte = new Date(to);
        }
        return this.prisma.meeting.findMany({
            where,
            include: {
                organizer: { select: { id: true, name: true, avatarUrl: true } },
                attendees: {
                    include: { employee: { select: { id: true, name: true, avatarUrl: true } } },
                },
            },
            orderBy: { startsAt: 'asc' },
        });
    }
    async findOne(id) {
        const meeting = await this.prisma.meeting.findUnique({
            where: { id },
            include: {
                organizer: { select: { id: true, name: true, avatarUrl: true } },
                attendees: {
                    include: { employee: { select: { id: true, name: true, avatarUrl: true } } },
                },
            },
        });
        if (!meeting)
            throw new common_1.NotFoundException('Meeting not found');
        return meeting;
    }
    async create(organizerId, data) {
        const { attendeeIds = [], ...meetingData } = data;
        return this.prisma.meeting.create({
            data: {
                id: (0, uuid_1.v4)(),
                ...meetingData,
                organizerId,
                attendees: {
                    create: attendeeIds.map((empId) => ({ employeeId: empId })),
                },
            },
            include: {
                attendees: { include: { employee: { select: { id: true, name: true } } } },
            },
        });
    }
    async rsvp(meetingId, employeeId, status, reason) {
        return this.prisma.meetingAttendee.updateMany({
            where: { meetingId, employeeId },
            data: { rsvp: status, responseReason: reason },
        });
    }
    async cancel(id) {
        return this.prisma.meeting.update({ where: { id }, data: { status: 'CANCELLED' } });
    }
};
exports.MeetingsService = MeetingsService;
exports.MeetingsService = MeetingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MeetingsService);
//# sourceMappingURL=meetings.service.js.map