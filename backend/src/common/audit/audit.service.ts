import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditInput {
  action: string;
  module: string;
  /** The subject the action is about (e.g. the terminated employee). */
  employeeId?: string | null;
  /** Who actually performed the action. */
  actorId?: string | null;
  /** The CEO on whose behalf a delegated admin acted, when applicable. */
  onBehalfOfId?: string | null;
  severity?: 'info' | 'high';
  details?: unknown;
  ipAddress?: string | null;
}

/**
 * Central audit-trail writer. Replaces the ad-hoc `prisma.auditLog.create`
 * calls sprinkled across services (which hand-generated ids and never set
 * severity/actor). New features should use this helper.
 *
 * Fire-and-forget safe: an audit failure is logged but never propagated, so
 * it can't fail the business operation it records — EXCEPT via `recordOrThrow`
 * for the rare case where the audit write must be part of a transaction.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger('AuditService');

  constructor(private prisma: PrismaService) {}

  private buildData(input: AuditInput) {
    return {
      action: input.action,
      module: input.module,
      employeeId: input.employeeId ?? null,
      actorId: input.actorId ?? null,
      onBehalfOfId: input.onBehalfOfId ?? null,
      severity: input.severity ?? 'info',
      ipAddress: input.ipAddress ?? null,
      details:
        typeof input.details === 'string'
          ? input.details
          : JSON.stringify(input.details ?? {}),
    };
  }

  /** Write an audit row. Never throws. */
  async record(input: AuditInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({ data: this.buildData(input) });
    } catch (error) {
      this.logger.error('Failed to write audit log', error as Error);
    }
  }

  /**
   * Write an audit row using a caller-supplied Prisma client (e.g. a `$transaction`
   * tx), so the audit entry commits atomically with the operation. Propagates
   * errors — use inside a transaction where the whole thing should roll back
   * together.
   */
  async recordWith(
    tx: { auditLog: { create: (args: { data: ReturnType<AuditService['buildData']> }) => Promise<unknown> } },
    input: AuditInput,
  ): Promise<void> {
    await tx.auditLog.create({ data: this.buildData(input) });
  }
}
