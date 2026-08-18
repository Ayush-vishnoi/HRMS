import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkforceService {
  constructor(private prisma: PrismaService) {}

  async findAll(employeeId?: string) {
    const where = employeeId ? { employee_id: employeeId } : {};
    const [timesheets, attendance, projects] = await Promise.all([
      this.prisma.timesheets.findMany({ where, orderBy: { work_date: 'desc' }, take: 30 }),
      this.prisma.attendanceRecord.findMany({
        where: employeeId ? { employeeId } : {},
        orderBy: { date: 'desc' },
        take: 30,
      }),
      this.prisma.workforce_projects.findMany({ where: { is_active: true } }),
    ]);
    return { timesheets, attendance, projects };
  }

  async logTime(body: any) {
    const { employeeId, date, description, loggedMinutes = 480, billableMinutes = 480, projectId } = body;
    return this.prisma.timesheets.create({
      data: {
        id: `TS-${Date.now().toString(36)}`,
        employee_id: employeeId,
        work_date: date ? new Date(date) : new Date(),
        logged_minutes: Number(loggedMinutes),
        billable_minutes: Number(billableMinutes),
        description: description || 'General feature development',
        project_id: projectId || null,
        status: 'Approved',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
}
