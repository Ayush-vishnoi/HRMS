import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotifyService } from '../common/notifications/notify.service';
import {
  APP_ROLES,
  AppRole,
  isAppRole,
  ROLE_DEFINITIONS,
} from '../common/auth/roles';

interface ActorContext {
  id?: string;
  name?: string;
}

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  employeeCode: true,
  department: true,
  userRole: true,
  status: true,
  avatarUrl: true,
  lastLoginAt: true,
} as const;

/**
 * Super-admin-only system administration: the user & role directory, role
 * changes (with an audit trail), and read access to the audit log. Every method
 * here is reached only through routes guarded by `@Roles('super_admin')`.
 */
@Injectable()
export class AdministrationService {
  constructor(
    private prisma: PrismaService,
    private notify: NotifyService,
  ) {}

  /** Assignable roles with labels + descriptions, for the console's role picker. */
  getRoles() {
    return APP_ROLES.map((role) => ROLE_DEFINITIONS[role]);
  }

  /** A high-level snapshot of the system for the Super Admin dashboard. */
  async getOverview() {
    const [totalEmployees, roleGroups, statusGroups, auditLogCount, activeSessions] =
      await Promise.all([
        this.prisma.employee.count(),
        this.prisma.employee.groupBy({ by: ['userRole'], _count: { id: true } }),
        this.prisma.employee.groupBy({ by: ['status'], _count: { id: true } }),
        this.prisma.auditLog.count(),
        this.prisma.authSession.count({ where: { expires: { gt: new Date() } } }),
      ]);

    const roleCounts: Record<string, number> = {};
    for (const role of APP_ROLES) roleCounts[role] = 0;
    for (const group of roleGroups) roleCounts[group.userRole] = group._count.id;

    const workforceByRole = APP_ROLES.map((role) => ({
      role,
      label: ROLE_DEFINITIONS[role].label,
      count: roleCounts[role] ?? 0,
    }));

    const statusBreakdown = statusGroups.map((group) => ({
      status: group.status,
      count: group._count.id,
    }));

    return {
      totalEmployees,
      activeSessions,
      auditLogCount,
      privilegedAccounts: (roleCounts.admin ?? 0) + (roleCounts.ceo ?? 0) + (roleCounts.super_admin ?? 0),
      workforceByRole,
      statusBreakdown,
    };
  }

  /** The user directory, optionally filtered by role and free-text search. */
  async listUsers(filters: { search?: string; role?: string } = {}) {
    const search = filters.search?.trim();
    const role = filters.role?.trim();

    const where: any = {};
    if (role && isAppRole(role)) {
      where.userRole = role;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.employee.findMany({
      where,
      select: USER_SELECT,
      orderBy: { name: 'asc' },
      take: 200,
    });
  }

  /**
   * Change an employee's role. Guards against demoting the final Super Admin
   * (which would otherwise lock everyone out of system administration), writes
   * an audit-log entry, and notifies the affected user.
   */
  async updateUserRole(targetId: string, newRole: string, actor: ActorContext) {
    if (!isAppRole(newRole)) {
      throw new BadRequestException(
        `Invalid role. Expected one of: ${APP_ROLES.join(', ')}.`,
      );
    }

    const target = await this.prisma.employee.findUnique({
      where: { id: targetId },
      select: { id: true, name: true, email: true, userRole: true },
    });
    if (!target) {
      throw new NotFoundException('Employee not found');
    }

    if (target.userRole === newRole) {
      return this.prisma.employee.findUnique({ where: { id: targetId }, select: USER_SELECT });
    }

    if (target.userRole === 'super_admin' && newRole !== 'super_admin') {
      const superAdminCount = await this.prisma.employee.count({
        where: { userRole: 'super_admin' },
      });
      if (superAdminCount <= 1) {
        throw new BadRequestException(
          'Cannot change the role of the last Super Admin. Promote another Super Admin first.',
        );
      }
    }

    const previousRole = target.userRole as AppRole;
    const updated = await this.prisma.employee.update({
      where: { id: targetId },
      data: { userRole: newRole },
      select: USER_SELECT,
    });

    const actorName = actor.name || 'A Super Admin';
    await this.prisma.auditLog.create({
      data: {
        employeeId: actor.id ?? null,
        action: 'ROLE_CHANGED',
        module: 'administration',
        details: `${actorName} changed ${target.name}'s role from ${ROLE_DEFINITIONS[previousRole].label} to ${ROLE_DEFINITIONS[newRole].label}.`,
      },
    });

    await this.notify.notifyUser({
      userId: targetId,
      title: 'Your access level changed',
      message: `Your role is now ${ROLE_DEFINITIONS[newRole].label}. Sign out and back in if some sections don't appear immediately.`,
      type: 'System',
    });

    return updated;
  }

  /** Most recent audit-log entries (newest first). */
  async getAuditLogs(take?: number) {
    const limit = Math.min(Math.max(take ?? 50, 1), 200);
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
