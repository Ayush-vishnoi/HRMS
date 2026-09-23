import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CeoPermission } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const CEO_PERMISSIONS: CeoPermission[] = [
  'ONBOARDING_APPROVAL',
  'IMMEDIATE_TERMINATION',
  'REQUISITION_APPROVAL',
  'PAYROLL_MANAGEMENT',
];

export const CEO_PERMISSION_LABELS: Record<CeoPermission, string> = {
  ONBOARDING_APPROVAL: 'Recruitment Approvals (offers & paid onboarding)',
  IMMEDIATE_TERMINATION: 'Immediate Termination',
  REQUISITION_APPROVAL: 'Requisition Budget Approval',
  PAYROLL_MANAGEMENT: 'Payroll Management (run & disburse cycles)',
};

export interface PermissionCheck {
  allowed: boolean;
  /** True when the permission is held via an active delegation rather than intrinsic CEO role. */
  viaDelegation: boolean;
  delegatorId?: string;
  delegatorName?: string;
}

/**
 * Owns CEO-only permissions and their time-bound delegation to HR Admins.
 *
 * Delegation is modeled as grant *records* (`DelegatedPermission`), never a
 * role change: the delegatee keeps their `admin` role and simply holds an
 * extra permission while an active grant exists. "Active" is evaluated at
 * check time — `revokedAt IS NULL AND (expiresAt IS NULL OR expiresAt > now)` —
 * so expiry needs no cron and revocation takes effect on the next check.
 */
@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  /** Resolve the employee's DB (raw) role — `req.user.userRole` is normalized to admin for CEOs. */
  private async getRawRole(userId: string): Promise<string | null> {
    const emp = await this.prisma.employee.findUnique({
      where: { id: userId },
      select: { userRole: true },
    });
    return emp?.userRole ?? null;
  }

  private activeDelegationWhere(delegateeId: string, permission: CeoPermission) {
    return {
      delegateeId,
      permission,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    };
  }

  /**
   * Whether `userId` may exercise `permission`: true if they are the CEO (raw
   * role), or an admin holding an active delegation for it. Returns delegation
   * context so callers can render "Acting on behalf of [CEO]" and audit correctly.
   */
  async hasCeoPermission(userId: string, permission: CeoPermission): Promise<PermissionCheck> {
    const rawRole = await this.getRawRole(userId);
    if (rawRole === 'ceo') {
      return { allowed: true, viaDelegation: false };
    }

    if (rawRole === 'admin') {
      const grant = await this.prisma.delegatedPermission.findFirst({
        where: this.activeDelegationWhere(userId, permission),
        orderBy: { grantedAt: 'desc' },
        include: { delegator: { select: { id: true, name: true } } },
      });
      if (grant) {
        return {
          allowed: true,
          viaDelegation: true,
          delegatorId: grant.delegator.id,
          delegatorName: grant.delegator.name,
        };
      }
    }

    return { allowed: false, viaDelegation: false };
  }

  /** Throw unless the permission is held; returns the check for audit context. */
  async assertCeoPermission(userId: string, permission: CeoPermission): Promise<PermissionCheck> {
    const check = await this.hasCeoPermission(userId, permission);
    if (!check.allowed) {
      throw new ForbiddenException(
        `This action requires the ${CEO_PERMISSION_LABELS[permission]} permission.`,
      );
    }
    return check;
  }

  /**
   * Ids of the CEOs who currently delegate `permission` to `delegateeId`.
   * Used to let a delegate stand in for the CEO on that CEO's own pending
   * approval steps (e.g. an offer-chain step assigned to the CEO).
   */
  async getActiveDelegatorIds(delegateeId: string, permission: CeoPermission): Promise<string[]> {
    const grants = await this.prisma.delegatedPermission.findMany({
      where: this.activeDelegationWhere(delegateeId, permission),
      select: { delegatorId: true },
    });
    return [...new Set(grants.map((g) => g.delegatorId))];
  }

  /** The active permissions this admin currently holds via delegation (drives the UI banner). */
  async getMyActiveDelegations(userId: string) {
    const grants = await this.prisma.delegatedPermission.findMany({
      where: {
        delegateeId: userId,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: { delegator: { select: { id: true, name: true, roleTitle: true } } },
      orderBy: { grantedAt: 'desc' },
    });
    return grants.map((g) => ({
      id: g.id,
      permission: g.permission,
      label: CEO_PERMISSION_LABELS[g.permission],
      delegatorId: g.delegator.id,
      delegatorName: g.delegator.name,
      expiresAt: g.expiresAt,
      grantedAt: g.grantedAt,
    }));
  }

  /** CEO-only: all grants this CEO has issued (active + historical). */
  async listDelegations(ceoId: string) {
    await this.assertIsCeo(ceoId);
    const now = new Date();
    const grants = await this.prisma.delegatedPermission.findMany({
      where: { delegatorId: ceoId },
      include: { delegatee: { select: { id: true, name: true, roleTitle: true, email: true } } },
      orderBy: { grantedAt: 'desc' },
    });
    return grants.map((g) => ({
      id: g.id,
      permission: g.permission,
      label: CEO_PERMISSION_LABELS[g.permission],
      delegateeId: g.delegatee.id,
      delegateeName: g.delegatee.name,
      delegateeRoleTitle: g.delegatee.roleTitle,
      note: g.note,
      grantedAt: g.grantedAt,
      expiresAt: g.expiresAt,
      revokedAt: g.revokedAt,
      active: !g.revokedAt && (!g.expiresAt || g.expiresAt > now),
    }));
  }

  private async assertIsCeo(userId: string) {
    const rawRole = await this.getRawRole(userId);
    if (rawRole !== 'ceo') {
      throw new ForbiddenException('Only the CEO can manage delegations.');
    }
  }

  /** CEO-only: grant one permission to one admin, optionally with an expiry. */
  async createDelegation(
    ceoId: string,
    dto: { permission: CeoPermission; delegateeId: string; expiresAt?: string | null; note?: string | null },
  ) {
    await this.assertIsCeo(ceoId);

    if (!CEO_PERMISSIONS.includes(dto.permission)) {
      throw new BadRequestException('Unknown permission.');
    }

    const delegatee = await this.prisma.employee.findUnique({
      where: { id: dto.delegateeId },
      select: { id: true, userRole: true, name: true, status: true },
    });
    if (!delegatee) throw new NotFoundException('Delegatee not found.');
    if (delegatee.userRole !== 'admin') {
      throw new BadRequestException('Permissions can only be delegated to an HR Admin.');
    }
    if (delegatee.id === ceoId) {
      throw new BadRequestException('Cannot delegate to yourself.');
    }

    let expiresAt: Date | null = null;
    if (dto.expiresAt) {
      const parsed = new Date(dto.expiresAt);
      if (Number.isNaN(parsed.getTime())) throw new BadRequestException('Invalid expiry date.');
      if (parsed <= new Date()) throw new BadRequestException('Expiry must be in the future.');
      expiresAt = parsed;
    }

    // Revoke any existing active grant of the same permission to the same admin,
    // so a re-grant with a new expiry cleanly supersedes the old one.
    await this.prisma.delegatedPermission.updateMany({
      where: this.activeDelegationWhere(dto.delegateeId, dto.permission),
      data: { revokedAt: new Date(), revokedById: ceoId },
    });

    return this.prisma.delegatedPermission.create({
      data: {
        permission: dto.permission,
        delegatorId: ceoId,
        delegateeId: dto.delegateeId,
        expiresAt,
        note: dto.note ?? null,
      },
    });
  }

  /** CEO-only: manually revoke a grant they issued. Idempotent. */
  async revokeDelegation(ceoId: string, id: string) {
    await this.assertIsCeo(ceoId);
    const grant = await this.prisma.delegatedPermission.findUnique({ where: { id } });
    if (!grant || grant.delegatorId !== ceoId) {
      throw new NotFoundException('Delegation not found.');
    }
    if (grant.revokedAt) return grant;
    return this.prisma.delegatedPermission.update({
      where: { id },
      data: { revokedAt: new Date(), revokedById: ceoId },
    });
  }
}
