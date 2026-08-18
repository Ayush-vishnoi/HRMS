import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DisciplinaryService {
  constructor(private prisma: PrismaService) {}

  async findAll(user: any, employeeId?: string) {
    let where: any = {};
    if (user.userRole === 'employee') {
      where = { employeeId: user.id, isEmployeeVisible: true };
    } else if (user.userRole === 'manager') {
      const team = await this.prisma.employee.findMany({ where: { managerId: user.id }, select: { id: true } });
      const ids = [user.id, ...team.map((t: any) => t.id)];
      where = employeeId && ids.includes(employeeId) ? { employeeId } : { employeeId: { in: ids } };
    } else if (employeeId) {
      where = { employeeId };
    }
    return this.prisma.employeeWarning.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async create(user: any, body: any) {
    const { employeeId, type = 'Written', severity = 'Medium', reason, incidentDate, actionRequired, isEmployeeVisible = true } = body;
    const warning = await this.prisma.employeeWarning.create({
      data: {
        id: `WARN-${Date.now().toString(36)}`,
        employeeId,
        type,
        severity,
        reason,
        incidentDate: incidentDate || new Date().toISOString().split('T')[0],
        issuedById: user.id,
        issuedByName: user.userRole === 'admin' ? 'HR Operations' : 'Reporting Manager',
        actionRequired: actionRequired || 'Acknowledgment and adherence to company policies',
        isEmployeeVisible: Boolean(isEmployeeVisible),
        status: 'Active',
      },
    });

    await this.prisma.auditLog.create({
      data: { id: `audit-${Date.now()}`, action: 'CREATE', module: 'Disciplinary', employeeId, details: JSON.stringify({ type, severity, reason }) },
    });

    if (isEmployeeVisible) {
      await this.prisma.userNotification.create({
        data: {
          id: `notif-${Date.now()}`,
          userId: employeeId,
          title: `Formal Notice: ${type} Warning Issued`,
          message: `A disciplinary record has been logged. Action required: ${actionRequired}`,
          type: 'Warning',
          linkUrl: '/employee-lifecycle',
        },
      });
    }
    return warning;
  }
}
