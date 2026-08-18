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
exports.CalendarService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const dateKey = (v) => v.toISOString().slice(0, 10);
const dateOnly = (v) => (v ? dateKey(v) : null);
let CalendarService = class CalendarService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getEvents(user, from, to) {
        const empCtx = await this.prisma.employee.findUniqueOrThrow({
            where: { id: user.id },
            select: { organization_id: true, work_location_id: true },
        });
        let visibleIds;
        if (user.userRole === 'manager') {
            const team = await this.prisma.employee.findMany({ where: { managerId: user.id }, select: { id: true } });
            visibleIds = [user.id, ...team.map((t) => t.id)];
        }
        else if (user.userRole === 'employee') {
            visibleIds = [user.id];
        }
        const years = Array.from(new Set([from.slice(0, 4), to.slice(0, 4)])).map(Number);
        const holidayCalendarWhere = {
            is_active: true,
            year: { in: years },
            ...(empCtx.organization_id ? { organization_id: empCtx.organization_id } : {}),
            OR: empCtx.work_location_id
                ? [{ work_location_id: null }, { work_location_id: empCtx.work_location_id }]
                : [{ work_location_id: null }],
        };
        const [holidays, leaves, profiles] = await Promise.all([
            this.prisma.holidays.findMany({
                where: { date: { gte: new Date(`${from}T00:00:00Z`), lte: new Date(`${to}T00:00:00Z`) }, holiday_calendars: holidayCalendarWhere },
                include: { holiday_calendars: { select: { name: true } } },
            }),
            this.prisma.leaveRequest.findMany({
                where: { ...(visibleIds ? { employeeId: { in: visibleIds } } : {}), status: 'Approved', startDate: { lte: to }, endDate: { gte: from } },
                include: { employee: { select: { id: true, name: true } } },
            }),
            this.prisma.employee.findMany({
                where: { status: 'Active', ...(empCtx.organization_id ? { organization_id: empCtx.organization_id } : {}) },
                select: { id: true, name: true, employee_personal_profiles: { select: { date_of_birth: true } }, employee_employment_profiles: { select: { date_of_joining: true } } },
            }),
        ]);
        const uniqueLeaves = Array.from(new Map(leaves.map((l) => [`${l.employee.id}:${l.leaveType}:${l.startDate}:${l.endDate}`, l])).values());
        const events = [
            ...holidays.map((h) => ({ id: `holiday-${h.id}`, type: 'HOLIDAY', title: h.name, startsAt: dateKey(h.date), endsAt: dateKey(h.date), allDay: true, optional: h.optional })),
            ...uniqueLeaves.map((l) => ({ id: `leave-${l.id}`, type: 'LEAVE', title: `${l.employee.name}: ${l.leaveType} leave`, startsAt: l.startDate < from ? from : l.startDate, endsAt: l.endDate > to ? to : l.endDate, allDay: true, employeeName: l.employee.name, employeeId: l.employee.id })),
            ...profiles.flatMap((p) => {
                const entries = [];
                const birth = dateOnly(p.employee_personal_profiles?.date_of_birth);
                const joining = dateOnly(p.employee_employment_profiles?.date_of_joining);
                for (const year of years) {
                    if (birth) {
                        const day = `${year}-${birth.slice(5)}`;
                        if (day >= from && day <= to)
                            entries.push({ id: `birthday-${p.id}-${year}`, type: 'BIRTHDAY', title: `${p.name}'s birthday`, startsAt: day, endsAt: day, allDay: true });
                    }
                    if (joining) {
                        const day = `${year}-${joining.slice(5)}`;
                        if (day >= from && day <= to)
                            entries.push({ id: `anniversary-${p.id}-${year}`, type: 'ANNIVERSARY', title: `${p.name}'s work anniversary`, startsAt: day, endsAt: day, allDay: true });
                    }
                }
                return entries;
            }),
        ];
        return events;
    }
};
exports.CalendarService = CalendarService;
exports.CalendarService = CalendarService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CalendarService);
//# sourceMappingURL=calendar.service.js.map