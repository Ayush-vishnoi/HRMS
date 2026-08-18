import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const dateKey = (v: Date) => v.toISOString().slice(0, 10);
const dateOnly = (v: Date | null | undefined) => (v ? dateKey(v) : null);

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  async getEvents(user: any, from: string, to: string) {
    const empCtx = await this.prisma.employee.findUniqueOrThrow({
      where: { id: user.id },
      select: { organization_id: true, work_location_id: true },
    }) as any;

    let visibleIds: string[] | undefined;
    if (user.userRole === 'manager') {
      const team = await this.prisma.employee.findMany({ where: { managerId: user.id }, select: { id: true } });
      visibleIds = [user.id, ...team.map((t: any) => t.id)];
    } else if (user.userRole === 'employee') {
      visibleIds = [user.id];
    }

    const years = Array.from(new Set([from.slice(0, 4), to.slice(0, 4)])).map(Number);
    const holidayCalendarWhere: any = {
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

    const uniqueLeaves = Array.from(
      new Map((leaves as any[]).map((l) => [`${l.employee.id}:${l.leaveType}:${l.startDate}:${l.endDate}`, l])).values(),
    );

    const events: any[] = [
      ...(holidays as any[]).map((h) => ({ id: `holiday-${h.id}`, type: 'HOLIDAY', title: h.name, startsAt: dateKey(h.date), endsAt: dateKey(h.date), allDay: true, optional: h.optional })),
      ...uniqueLeaves.map((l: any) => ({ id: `leave-${l.id}`, type: 'LEAVE', title: `${l.employee.name}: ${l.leaveType} leave`, startsAt: l.startDate < from ? from : l.startDate, endsAt: l.endDate > to ? to : l.endDate, allDay: true, employeeName: l.employee.name, employeeId: l.employee.id })),
      ...(profiles as any[]).flatMap((p) => {
        const entries: any[] = [];
        const birth = dateOnly(p.employee_personal_profiles?.date_of_birth);
        const joining = dateOnly(p.employee_employment_profiles?.date_of_joining);
        for (const year of years) {
          if (birth) { const day = `${year}-${birth.slice(5)}`; if (day >= from && day <= to) entries.push({ id: `birthday-${p.id}-${year}`, type: 'BIRTHDAY', title: `${p.name}'s birthday`, startsAt: day, endsAt: day, allDay: true }); }
          if (joining) { const day = `${year}-${joining.slice(5)}`; if (day >= from && day <= to) entries.push({ id: `anniversary-${p.id}-${year}`, type: 'ANNIVERSARY', title: `${p.name}'s work anniversary`, startsAt: day, endsAt: day, allDay: true }); }
        }
        return entries;
      }),
    ];

    return events;
  }
}
