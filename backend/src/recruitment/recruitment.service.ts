import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotifyService } from '../common/notifications/notify.service';
import { PermissionsService } from '../permissions/permissions.service';
import { AuditService } from '../common/audit/audit.service';
import {
  calculateOfferCompensation,
  formatIndianCurrency,
  renderTemplate,
  BUILTIN_TEMPLATES,
  DOC_TYPES,
  buildOfferLetterPdf,
  compensationTableRows,
  type OfferCompensation,
  type DocType,
} from './offer-documents';
import { computeMatchScore, PARSER_VERSION } from './resume-parser';
import { parseResumeFile } from './python-resume-parser';
import { createHash } from 'node:crypto';
import { readFile, unlink } from 'node:fs/promises';

const STAGES = [
  'New',
  'Applied',
  'Screening',
  'Interview',
  'Shortlisted',
  'Selected',
  'Offer',
  'Joined',
  'Rejected',
  'Withdrawn',
  'Archived',
] as const;

const ACTIVE_OFFER_STATUSES = ['Draft', 'PendingApproval', 'Approved', 'Sent', 'Viewed'];

/**
 * Safe projection for employee relations. Explicitly omits credential fields
 * (passwordHash) so recruitment API responses never leak them.
 */
const EMPLOYEE_SUMMARY_SELECT = {
  id: true,
  employeeCode: true,
  name: true,
  email: true,
  roleTitle: true,
  userRole: true,
  department: true,
  avatarUrl: true,
  status: true,
};

interface UploadedResumeFile {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  filename: string;
  path: string;
}

@Injectable()
export class RecruitmentService {
  constructor(
    private prisma: PrismaService,
    private notify: NotifyService,
    private permissions: PermissionsService,
    private audit: AuditService,
  ) {}

  /* ============================================================
     DASHBOARD / JOBS
     ============================================================ */

  async findAll() {
    const [jobs, candidates] = await Promise.all([
      this.prisma.recruitmentJob.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          recruitment_job_approvals: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
          requisitionApproval: true,
          hiringManager: { select: EMPLOYEE_SUMMARY_SELECT },
          recruiter: { select: EMPLOYEE_SUMMARY_SELECT },
          candidates: { select: { id: true, stage: true } },
        },
      }),
      this.prisma.recruitmentCandidate.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          job: true,
          onboarding: { include: { employee: { select: EMPLOYEE_SUMMARY_SELECT } } },
          resumeDocument: true,
          matches: true,
          assignedRecruiter: { select: EMPLOYEE_SUMMARY_SELECT },
        },
      }),
    ]);
    return { jobs, candidates };
  }

  async createJob(data: Record<string, any>, actor?: { id?: string; rawRole?: string }) {
    if (!data.title || !data.department || !data.location || !data.description) {
      throw new BadRequestException('title, department, location and description are required.');
    }

    const openings = Number(data.openings) > 0 ? Math.round(Number(data.openings)) : 1;
    const salaryMin = data.salaryMin != null && data.salaryMin !== '' ? Number(data.salaryMin) : null;
    const salaryMax = data.salaryMax != null && data.salaryMax !== '' ? Number(data.salaryMax) : null;

    // A CEO creating a requisition self-approves the budget; anyone else routes
    // the new role to the CEO for budget + headcount sign-off before it can move
    // through the normal manager/admin approval and publish flow.
    const needsBudgetApproval = actor?.rawRole !== 'ceo';

    const job = await this.prisma.recruitmentJob.create({
      data: {
        id: crypto.randomUUID(),
        title: String(data.title),
        department: String(data.department),
        location: String(data.location),
        employmentType: data.employmentType === 'Contract' ? 'Contract' : 'FullTime',
        openings,
        status: needsBudgetApproval ? 'PendingBudgetApproval' : data.status === 'Draft' ? 'Draft' : 'Open',
        postedOn: new Date().toISOString().slice(0, 10),
        description: String(data.description),
        requirements: Array.isArray(data.requirements) ? data.requirements.map(String) : [],
        responsibilities: Array.isArray(data.responsibilities) ? data.responsibilities.map(String) : [],
        experience_min: data.experienceMin != null && data.experienceMin !== '' ? Number(data.experienceMin) : 0,
        experience_max:
          data.experienceMax != null && data.experienceMax !== '' ? Number(data.experienceMax) : null,
        salary_min: salaryMin,
        salary_max: salaryMax,
        currency: data.currency || 'INR',
        hiring_manager_id: data.hiringManagerId || null,
        recruiter_id: data.recruiterId || null,
        priority: data.priority || 'Medium',
        target_close_date: data.targetCloseDate ? new Date(data.targetCloseDate) : null,
      },
    });

    if (needsBudgetApproval) {
      await this.prisma.requisitionApproval.create({
        data: {
          jobId: job.id,
          status: 'Pending',
          requestedById: actor?.id ?? 'system',
          requestedOpenings: openings,
          requestedSalaryMin: salaryMin,
          requestedSalaryMax: salaryMax,
          currency: data.currency || 'INR',
        },
      });
      await this.notifyRequisitionApprovers({
        title: 'New requisition needs budget approval',
        message: `"${job.title}" (${job.department}) — ${openings} opening(s) — is awaiting your budget approval.`,
        type: 'Recruitment',
        linkUrl: '/',
      });
    }

    return job;
  }

  /** Notify CEOs + admins holding an active REQUISITION_APPROVAL delegation. */
  private async notifyRequisitionApprovers(payload: {
    title: string;
    message: string;
    type: string;
    linkUrl: string;
  }) {
    const ceos = await this.prisma.employee.findMany({
      where: { userRole: 'ceo' as any, status: 'Active' },
      select: { id: true },
    });
    const delegates = await this.prisma.delegatedPermission.findMany({
      where: {
        permission: 'REQUISITION_APPROVAL',
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { delegateeId: true },
    });
    const ids = [...new Set([...ceos.map((c) => c.id), ...delegates.map((d) => d.delegateeId)])];
    if (ids.length) await this.notify.notifyUsers(ids, payload);
  }

  /** CEO queue: new requisitions awaiting budget + headcount approval. */
  async getRequisitionApprovalQueue() {
    const rows = await this.prisma.requisitionApproval.findMany({
      where: { status: 'Pending' },
      orderBy: { createdAt: 'desc' },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            department: true,
            location: true,
            employmentType: true,
            currency: true,
            experience_min: true,
            experience_max: true,
            requirements: true,
            priority: true,
            hiringManager: { select: EMPLOYEE_SUMMARY_SELECT },
          },
        },
      },
    });

    const requesterIds = [...new Set(rows.map((r) => r.requestedById).filter((x) => x && x !== 'system'))];
    const requesters = requesterIds.length
      ? await this.prisma.employee.findMany({
          where: { id: { in: requesterIds } },
          select: { id: true, name: true, roleTitle: true },
        })
      : [];
    const byId = new Map(requesters.map((r) => [r.id, r]));

    return rows.map((r) => ({
      id: r.id,
      jobId: r.jobId,
      title: r.job?.title,
      department: r.job?.department,
      location: r.job?.location,
      employmentType: r.job?.employmentType,
      priority: r.job?.priority,
      requirements: r.job?.requirements ?? [],
      experienceMin: r.job?.experience_min ?? null,
      experienceMax: r.job?.experience_max ?? null,
      hiringManager: r.job?.hiringManager ?? null,
      requestedBy: byId.get(r.requestedById)?.name ?? 'HR',
      requestedOpenings: r.requestedOpenings,
      requestedSalaryMin: r.requestedSalaryMin != null ? Number(r.requestedSalaryMin) : null,
      requestedSalaryMax: r.requestedSalaryMax != null ? Number(r.requestedSalaryMax) : null,
      currency: r.currency,
      createdAt: r.createdAt,
    }));
  }

  /**
   * CEO (or a REQUISITION_APPROVAL delegate) approves/rejects a new requisition's
   * budget + headcount. On approval the (optionally adjusted) openings/salary
   * band are written back to the job and it moves to Draft so HR can proceed
   * with the normal approval + publish flow. On rejection it returns to Draft
   * with the reason recorded, ready for HR to revise and resubmit.
   */
  async decideRequisitionApproval(
    actorId: string,
    jobId: string,
    body: {
      decision: 'Approved' | 'Rejected';
      note?: string;
      approvedOpenings?: number;
      approvedSalaryMin?: number | null;
      approvedSalaryMax?: number | null;
    },
  ) {
    const check = await this.permissions.assertCeoPermission(actorId, 'REQUISITION_APPROVAL');

    const decision = body?.decision;
    if (decision !== 'Approved' && decision !== 'Rejected') {
      throw new BadRequestException('decision must be Approved or Rejected.');
    }

    const approval = await this.prisma.requisitionApproval.findUnique({
      where: { jobId },
      include: { job: true },
    });
    if (!approval) throw new NotFoundException('No budget-approval request found for this requisition.');
    if (approval.status !== 'Pending') {
      throw new BadRequestException('This requisition has already been decided.');
    }

    const onBehalfOfId = check.viaDelegation ? check.delegatorId ?? null : null;

    if (decision === 'Approved') {
      const approvedOpenings =
        body.approvedOpenings != null && Number(body.approvedOpenings) > 0
          ? Math.round(Number(body.approvedOpenings))
          : approval.requestedOpenings;
      const approvedSalaryMin =
        body.approvedSalaryMin != null && body.approvedSalaryMin !== ('' as any)
          ? Number(body.approvedSalaryMin)
          : approval.requestedSalaryMin != null
            ? Number(approval.requestedSalaryMin)
            : null;
      const approvedSalaryMax =
        body.approvedSalaryMax != null && body.approvedSalaryMax !== ('' as any)
          ? Number(body.approvedSalaryMax)
          : approval.requestedSalaryMax != null
            ? Number(approval.requestedSalaryMax)
            : null;

      await this.prisma.$transaction([
        this.prisma.recruitmentJob.update({
          where: { id: jobId },
          data: {
            openings: approvedOpenings,
            salary_min: approvedSalaryMin,
            salary_max: approvedSalaryMax,
            // CEO budget approval is the only gate — once approved the role is
            // live immediately, no further manager/admin approval chain.
            status: 'Published',
          },
        }),
        this.prisma.requisitionApproval.update({
          where: { jobId },
          data: {
            status: 'Approved',
            approvedOpenings,
            approvedSalaryMin,
            approvedSalaryMax,
            decidedById: actorId,
            onBehalfOfId,
            note: body?.note ?? null,
            decidedAt: new Date(),
          },
        }),
      ]);

      await this.audit.record({
        action: 'CEO_REQUISITION_APPROVED',
        module: 'Recruitment',
        actorId,
        onBehalfOfId,
        severity: 'info',
        details: {
          jobTitle: approval.job?.title,
          requestedOpenings: approval.requestedOpenings,
          approvedOpenings,
          approvedSalaryMin,
          approvedSalaryMax,
          viaDelegation: check.viaDelegation,
          note: body?.note ?? null,
        },
      });

      if (approval.requestedById && approval.requestedById !== 'system') {
        await this.notify
          .notifyUser({
            userId: approval.requestedById,
            title: 'Requisition approved & live',
            message: `"${approval.job?.title}" approved for ${approvedOpenings} opening(s) and is now live for hiring.`,
            type: 'Recruitment',
            linkUrl: '/recruitment',
          })
          .catch(() => undefined);
      }
      return { jobId, status: 'Approved', approvedOpenings, approvedSalaryMin, approvedSalaryMax };
    }

    // Rejected → back to Draft with the reason recorded.
    await this.prisma.$transaction([
      this.prisma.recruitmentJob.update({ where: { id: jobId }, data: { status: 'Draft' } }),
      this.prisma.requisitionApproval.update({
        where: { jobId },
        data: {
          status: 'Rejected',
          decidedById: actorId,
          onBehalfOfId,
          note: body?.note ?? null,
          decidedAt: new Date(),
        },
      }),
    ]);

    await this.audit.record({
      action: 'CEO_REQUISITION_REJECTED',
      module: 'Recruitment',
      actorId,
      onBehalfOfId,
      severity: 'info',
      details: { jobTitle: approval.job?.title, viaDelegation: check.viaDelegation, note: body?.note ?? null },
    });

    if (approval.requestedById && approval.requestedById !== 'system') {
      await this.notify
        .notifyUser({
          userId: approval.requestedById,
          title: 'Requisition budget rejected',
          message: `"${approval.job?.title}" was not approved.${body?.note ? ` Reason: ${body.note}` : ''} Revise and resubmit for budget approval.`,
          type: 'Recruitment',
          linkUrl: '/recruitment',
        })
        .catch(() => undefined);
    }
    return { jobId, status: 'Rejected' };
  }

  async updateJob(jobId: string, body: Record<string, any>) {
    const job = await this.prisma.recruitmentJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found.');

    if (body.action) {
      return this.handleJobAction(job, body);
    }

    const data: Record<string, any> = {};
    if (body.title != null) data.title = String(body.title);
    if (body.department != null) data.department = String(body.department);
    if (body.location != null) data.location = String(body.location);
    if (body.employmentType != null)
      data.employmentType = body.employmentType === 'Contract' ? 'Contract' : 'FullTime';
    if (body.description != null) data.description = String(body.description);
    if (body.requirements != null) data.requirements = body.requirements.map(String);
    if (body.responsibilities != null) data.responsibilities = body.responsibilities.map(String);
    if (body.priority != null) data.priority = String(body.priority);
    if (body.openings != null) data.openings = Math.max(1, Math.round(Number(body.openings) || 1));
    if (body.experienceMin != null && body.experienceMin !== '')
      data.experience_min = Number(body.experienceMin);
    if (body.experienceMax !== undefined)
      data.experience_max = body.experienceMax === '' || body.experienceMax == null ? null : Number(body.experienceMax);
    if (body.salaryMin !== undefined)
      data.salary_min = body.salaryMin === '' || body.salaryMin == null ? null : Number(body.salaryMin);
    if (body.salaryMax !== undefined)
      data.salary_max = body.salaryMax === '' || body.salaryMax == null ? null : Number(body.salaryMax);
    if (body.currency != null) data.currency = String(body.currency);
    if (body.targetCloseDate !== undefined)
      data.target_close_date = body.targetCloseDate ? new Date(body.targetCloseDate) : null;
    if (body.hiringManagerId !== undefined) data.hiring_manager_id = body.hiringManagerId || null;
    if (body.recruiterId !== undefined) data.recruiter_id = body.recruiterId || null;
    if (Object.keys(data).length === 0) return job;
    return this.prisma.recruitmentJob.update({ where: { id: jobId }, data });
  }

  /**
   * Delete a job requisition. Blocked when candidates exist in the pipeline —
   * the candidate→job relation cascades, so allowing it would silently destroy
   * every candidate (and their interviews, notes, offers) tied to the job.
   * Approvals and match records cascade away with the job on delete.
   */
  async deleteJob(jobId: string) {
    const job = await this.prisma.recruitmentJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found.');

    const candidates = await this.prisma.recruitmentCandidate.findMany({
      where: { jobId },
      select: { id: true, stage: true },
    });

    // `Joined` candidates have already converted to employees, so the frontend
    // pipeline hides them (the card shows 0). Only candidates still IN the
    // pipeline should block a delete — that's what the recruiter actually sees.
    const activePipeline = candidates.filter((c) => c.stage !== 'Joined');
    if (activePipeline.length > 0) {
      throw new BadRequestException(
        `Cannot delete this requisition — it has ${activePipeline.length} candidate(s) in the pipeline. Move or remove them first.`,
      );
    }

    // For the hired/onboarded candidates, deleting the job cascades away their
    // recruitment records — but the offer + onboarding rows have Restrict FKs,
    // so clear those first (keeping the Employee itself, whose FK is only
    // Restrict-on-employee-delete). Onboarding tasks/checklists/stage-history
    // and offer approvals/documents cascade with their parent.
    const joinedIds = candidates.filter((c) => c.stage === 'Joined').map((c) => c.id);

    await this.prisma.$transaction(async (tx) => {
      if (joinedIds.length > 0) {
        await tx.employeeOnboarding.deleteMany({ where: { candidateId: { in: joinedIds } } });
        await tx.recruitment_offers.deleteMany({ where: { candidate_id: { in: joinedIds } } });
      }
      await tx.recruitmentJob.delete({ where: { id: jobId } });
    });

    return { id: jobId };
  }

  /**
   * Resolve a fallback approver id when a job has no hiring manager:
   * prefer any active manager, else any admin.
   */
  private async resolveFallbackApproverId(): Promise<string | null> {
    const manager = await this.prisma.employee.findFirst({
      where: { userRole: 'manager', status: 'Active' },
      select: { id: true },
    });
    if (manager) return manager.id;
    const admin = await this.prisma.employee.findFirst({
      where: { userRole: 'admin' },
      select: { id: true },
    });
    return admin?.id ?? null;
  }

  private async handleJobAction(job: any, body: Record<string, any>) {
    const action = String(body.action);
    if (action === 'submit_approval') {
      if (job.status !== 'Draft' && job.status !== 'Open') {
        throw new BadRequestException(`Cannot submit job in "${job.status}" status for approval.`);
      }
      const hiringManagerId = job.hiring_manager_id || (await this.resolveFallbackApproverId());
      if (!hiringManagerId) {
        throw new BadRequestException('Job must have a hiring manager before submitting for approval.');
      }
      const admin = await this.prisma.employee.findFirst({
        where: { userRole: 'admin', id: { not: hiringManagerId } },
        select: { id: true },
      });
      if (!admin) {
        throw new BadRequestException(
          'No distinct admin approver available for L2. Assign a hiring manager and configure an admin first.',
        );
      }
      const adminId = admin.id;
      const updated = await this.prisma.$transaction(async (tx: any) => {
        await tx.recruitment_job_approvals.deleteMany({ where: { job_id: job.id } });
        await tx.recruitment_job_approvals.create({
          data: { job_id: job.id, sequence: 1, approver_id: hiringManagerId, status: 'Pending', note: body.note || null },
        });
        await tx.recruitment_job_approvals.create({
          data: { job_id: job.id, sequence: 2, approver_id: adminId, status: 'Pending' },
        });
        return tx.recruitmentJob.update({
          where: { id: job.id },
          data: { status: 'PendingApproval' },
          include: { recruitment_job_approvals: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } } },
        });
      });
      this.notify
        .notifyUser({
          userId: hiringManagerId,
          title: 'Job approval requested',
          message: `Job "${job.title}" is awaiting your L1 approval.`,
          type: 'Recruitment',
          linkUrl: '/recruitment',
        })
        .catch(() => undefined);
      return updated;
    }

    if (action === 'publish') {
      if (job.status !== 'Approved') {
        throw new BadRequestException('Job must be Approved before publishing.');
      }
      return this.prisma.recruitmentJob.update({
        where: { id: job.id },
        data: { status: 'Published' },
      });
    }

    if (action === 'hold' || action === 'close') {
      const nextStatus = action === 'hold' ? 'OnHold' : 'Closed';
      return this.prisma.recruitmentJob.update({
        where: { id: job.id },
        data: { status: nextStatus },
      });
    }

    if (action === 'resubmit_budget') {
      // HR revises a rejected requisition and re-sends it to the CEO for
      // budget approval, refreshing the requested openings/salary from the job.
      const approval = await this.prisma.requisitionApproval.findUnique({ where: { jobId: job.id } });
      if (!approval) {
        throw new BadRequestException('This requisition has no budget-approval request to resubmit.');
      }
      const updated = await this.prisma.$transaction(async (tx: any) => {
        await tx.requisitionApproval.update({
          where: { jobId: job.id },
          data: {
            status: 'Pending',
            requestedOpenings: job.openings,
            requestedSalaryMin: job.salary_min,
            requestedSalaryMax: job.salary_max,
            approvedOpenings: null,
            approvedSalaryMin: null,
            approvedSalaryMax: null,
            decidedById: null,
            onBehalfOfId: null,
            note: null,
            decidedAt: null,
          },
        });
        return tx.recruitmentJob.update({
          where: { id: job.id },
          data: { status: 'PendingBudgetApproval' },
        });
      });
      await this.notifyRequisitionApprovers({
        title: 'Requisition resubmitted for budget approval',
        message: `"${job.title}" (${job.department}) — ${job.openings} opening(s) — is awaiting your budget approval.`,
        type: 'Recruitment',
        linkUrl: '/',
      });
      return updated;
    }

    throw new BadRequestException(`Unknown job action "${action}".`);
  }

  async jobApprovalAction(jobId: string, body: Record<string, any>, actorId: string) {
    const job = await this.prisma.recruitmentJob.findUnique({
      where: { id: jobId },
      include: { recruitment_job_approvals: { orderBy: { sequence: 'asc' } } },
    });
    if (!job) throw new NotFoundException('Job not found.');
    if (job.status !== 'PendingApproval') {
      throw new BadRequestException('Job is not pending approval.');
    }

    const action = String(body.action);
    const myStep = job.recruitment_job_approvals.find((a: any) => a.approver_id === actorId);
    if (!myStep) throw new ForbiddenException('You are not an approver for this job.');
    // Idempotent APPROVE: an already-approved senior re-submitting APPROVE is
    // allowed so the supersede logic below can finalize any still-pending
    // junior steps (heals chains stuck by the pre-supersede behavior).
    if (myStep.status !== 'Pending' && !(action === 'APPROVE' && myStep.status === 'Approved')) {
      throw new BadRequestException(
        'You have already acted on this approval. The requisition is still awaiting other approvers.',
      );
    }

    if (action === 'APPROVE') {
      const updated = await this.prisma.$transaction(async (tx: any) => {
        if (myStep.status === 'Pending') {
          await tx.recruitment_job_approvals.update({
            where: { id: myStep.id },
            data: { status: 'Approved', note: body.note || null, acted_at: new Date() },
          });
        }
        // Senior-approval supersede: when a higher-sequence approver (e.g. the
        // L2 admin) approves, auto-approve any still-pending lower-sequence
        // steps. Without this the requisition stays stuck in PendingApproval
        // forever when a junior step (often an auto-assigned fallback manager)
        // never acts, even though the senior approver has final authority.
        const supersededSteps = await tx.recruitment_job_approvals.findMany({
          where: { job_id: job.id, status: 'Pending', sequence: { lt: myStep.sequence } },
        });
        for (const step of supersededSteps) {
          await tx.recruitment_job_approvals.update({
            where: { id: step.id },
            data: {
              status: 'Approved',
              note: `Auto-approved: superseded by L${myStep.sequence} approval.`,
              acted_at: new Date(),
            },
          });
        }
        const steps = await tx.recruitment_job_approvals.findMany({
          where: { job_id: job.id },
          orderBy: { sequence: 'asc' },
        });
        const allApproved = steps.every((s: any) => s.status === 'Approved');
        if (allApproved) {
          return tx.recruitmentJob.update({
            where: { id: job.id },
            data: { status: 'Approved' },
            include: { recruitment_job_approvals: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } } },
          });
        }
        return tx.recruitmentJob.findUnique({
          where: { id: job.id },
          include: { recruitment_job_approvals: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } } },
        });
      });

      const stepsAfter = updated?.recruitment_job_approvals ?? [];
      const allStepsApproved = stepsAfter.every((s: any) => s.status === 'Approved');
      const nextPendingStep = stepsAfter.find((s: any) => s.status === 'Pending');
      if (allStepsApproved) {
        if (job.hiring_manager_id && job.hiring_manager_id !== actorId) {
          await this.notify.notifyUser({
            userId: job.hiring_manager_id,
            title: 'Job approved',
            message: `Job "${job.title}" has been fully approved and is ready to publish.`,
            type: 'Recruitment',
            linkUrl: '/recruitment',
          });
        }
      } else if (nextPendingStep && nextPendingStep.approver_id !== actorId) {
        await this.notify.notifyUser({
          userId: nextPendingStep.approver_id,
          title: 'Job approval requested',
          message: `Job "${job.title}" is awaiting your L${nextPendingStep.sequence} approval.`,
          type: 'Recruitment',
          linkUrl: '/recruitment',
        });
      }
      return updated;
    }

    if (action === 'REJECT' || action === 'REQUEST_CHANGES') {
      const status = action === 'REJECT' ? 'Rejected' : 'Cancelled';
      const updated = await this.prisma.$transaction(async (tx: any) => {
        await tx.recruitment_job_approvals.update({
          where: { id: myStep.id },
          data: { status, note: body.note || null, acted_at: new Date() },
        });
        return tx.recruitmentJob.update({
          where: { id: job.id },
          data: { status: action === 'REJECT' ? 'Draft' : 'Draft' },
          include: { recruitment_job_approvals: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } } },
        });
      });

      if (job.hiring_manager_id && job.hiring_manager_id !== actorId) {
        await this.notify.notifyUser({
          userId: job.hiring_manager_id,
          title: action === 'REJECT' ? 'Job rejected' : 'Job sent back for changes',
          message: `Job "${job.title}" was ${action === 'REJECT' ? 'rejected' : 'sent back for changes'} and moved to Draft.${body.note ? ` Note: ${body.note}` : ''}`,
          type: 'Recruitment',
          linkUrl: '/recruitment',
        });
      }
      return updated;
    }

    throw new BadRequestException(`Unknown approval action "${action}".`);
  }

  /* ============================================================
     CANDIDATES
     ============================================================ */

  async getCandidates(jobId?: string, stage?: string) {
    return this.prisma.recruitmentCandidate.findMany({
      where: {
        ...(jobId ? { jobId } : {}),
        ...(stage ? { stage: stage as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        job: true,
        onboarding: { include: { employee: { select: EMPLOYEE_SUMMARY_SELECT } } },
        resumeDocument: true,
        matches: true,
        assignedRecruiter: { select: EMPLOYEE_SUMMARY_SELECT },
      },
    });
  }

  async getCandidate(id: string) {
    const candidate = await this.prisma.recruitmentCandidate.findUnique({
      where: { id },
      include: {
        job: true,
        onboarding: { include: { employee: { select: EMPLOYEE_SUMMARY_SELECT } } },
        resumeDocument: true,
        matches: true,
        assignedRecruiter: { select: EMPLOYEE_SUMMARY_SELECT },
      },
    });
    if (!candidate) throw new NotFoundException('Candidate not found.');
    return candidate;
  }

  async createCandidate(data: Record<string, any>) {
    if (!data.name || !data.email || !data.jobId) {
      throw new BadRequestException('name, email and jobId are required.');
    }
    const job = await this.prisma.recruitmentJob.findUnique({ where: { id: data.jobId } });
    if (!job) throw new NotFoundException('Job not found.');

    const existing = await this.prisma.recruitmentCandidate.findFirst({
      where: { email: String(data.email).toLowerCase(), jobId: data.jobId },
    });
    if (existing) {
      throw new BadRequestException('A candidate with this email already exists for this job.');
    }

    const experience = data.experience != null && data.experience !== '' ? String(data.experience) : '0';

    // Skills the recruiter declared for this manual candidate — the primary
    // driver of the match score (50% weight). Accept an array or a
    // comma/newline-separated string.
    const declaredSkills: string[] = Array.isArray(data.skills)
      ? data.skills.map((s: any) => String(s).trim()).filter(Boolean)
      : typeof data.skills === 'string'
        ? data.skills.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)
        : [];

    // Candidate experience in years — explicit field wins, else parse the
    // leading number out of the free-text experience ("6 years" → 6).
    const experienceYears =
      data.experienceYears != null && data.experienceYears !== ''
        ? Number(data.experienceYears)
        : Number.parseFloat(experience) || 0;

    // Real, explainable match against the requisition instead of a flat 75.
    const match = computeMatchScore({
      candidateSkills: declaredSkills,
      candidateExperienceYears: experienceYears,
      candidateLocation: data.location ? String(data.location) : '',
      jobRequirements: job.requirements,
      jobExperienceMin: job.experience_min ?? 0,
      jobExperienceMax: job.experience_max ?? undefined,
      jobLocation: job.location,
    });

    const candidate = await this.prisma.recruitmentCandidate.create({
      data: {
        id: crypto.randomUUID(),
        jobId: data.jobId,
        name: String(data.name),
        email: String(data.email).toLowerCase(),
        phone: data.phone ? String(data.phone) : '',
        appliedOn: new Date().toISOString().slice(0, 10),
        stage: 'Applied',
        score: match.overallScore,
        ai_match_score: match.overallScore,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        experience,
        currentRole: data.currentRole ? String(data.currentRole) : '',
        location: data.location ? String(data.location) : '',
        summary: data.summary ? String(data.summary) : '',
        recommendation: 'Review',
        tags: Array.isArray(data.tags) && data.tags.length > 0 ? data.tags.map(String) : ['New Applicant'],
        source: (data.source as any) || 'Manual',
        duplicate_key: `${String(data.email).toLowerCase()}::${data.jobId}`,
      },
      include: { job: true },
    });

    // Persist the score breakdown so the "Explainable Fit Score" card renders
    // the same way it does for resume-parsed candidates.
    await this.prisma.recruitmentCandidateMatch.upsert({
      where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } },
      create: {
        id: crypto.randomUUID(),
        candidateId: candidate.id,
        jobId: job.id,
        overallScore: match.overallScore,
        skillScore: match.skillScore,
        experienceScore: match.experienceScore,
        educationScore: match.educationScore,
        locationScore: match.locationScore,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        experienceGap: match.experienceGap != null ? String(match.experienceGap) : null,
        explanation: match.explanation,
        engineVersion: match.engineVersion,
      },
      update: {
        overallScore: match.overallScore,
        skillScore: match.skillScore,
        experienceScore: match.experienceScore,
        educationScore: match.educationScore,
        locationScore: match.locationScore,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        experienceGap: match.experienceGap != null ? String(match.experienceGap) : null,
        explanation: match.explanation,
        calculatedAt: new Date(),
      },
    });

    await this.prisma.recruitmentJob.update({
      where: { id: data.jobId },
      data: { applicants: { increment: 1 } },
    });
    return candidate;
  }

  async updateCandidate(id: string, body: Record<string, any>) {
    const candidate = await this.prisma.recruitmentCandidate.findUnique({ where: { id } });
    if (!candidate) throw new NotFoundException('Candidate not found.');
    const data: Record<string, any> = {};
    if (body.tags != null && Array.isArray(body.tags)) data.tags = body.tags.map(String);
    if (body.name != null) data.name = String(body.name);
    if (body.phone != null) data.phone = String(body.phone);
    if (body.currentRole != null) data.currentRole = String(body.currentRole);
    if (body.location != null) data.location = String(body.location);
    if (body.summary != null) data.summary = String(body.summary);
    if (Object.keys(data).length === 0) return candidate;
    return this.prisma.recruitmentCandidate.update({ where: { id }, data });
  }

  /**
   * Permanently delete a candidate and all their recruitment data. Used when an
   * applicant is rejected — the org's policy is to purge rejected applicants
   * rather than keep them archived. Offer + onboarding rows carry Restrict FKs,
   * so those are cleared before the candidate cascade removes the rest
   * (interviews, notes, stage history, matches, resume doc, approvals).
   */
  private async purgeCandidateData(candidateId: string) {
    const candidate = await this.prisma.recruitmentCandidate.findUnique({
      where: { id: candidateId },
      include: { resumeDocument: true },
    });
    if (!candidate) return;
    const resumePath = candidate.resumeDocument?.storagePath;

    await this.prisma.$transaction(async (tx: any) => {
      await tx.employeeOnboarding.deleteMany({ where: { candidateId } });
      await tx.recruitment_offers.deleteMany({ where: { candidate_id: candidateId } });
      await tx.recruitmentCandidate.delete({ where: { id: candidateId } });
      await tx.recruitmentJob.update({
        where: { id: candidate.jobId },
        data: { applicants: { decrement: 1 } },
      });
    });

    // Best-effort removal of the stored resume file from disk.
    if (resumePath) {
      await unlink(resumePath).catch(() => undefined);
    }
  }

  async updateCandidateStage(id: string, stage: string, changedById: string, note?: string) {
    const candidate = await this.prisma.recruitmentCandidate.findUnique({ where: { id } });
    if (!candidate) throw new NotFoundException('Candidate not found.');
    if (!STAGES.includes(stage as any)) {
      throw new BadRequestException(`Invalid stage "${stage}".`);
    }
    // Rejected applicants are purged, not archived.
    if (stage === 'Rejected') {
      await this.purgeCandidateData(id);
      return { deleted: true, id, name: candidate.name };
    }
    const updated = await this.prisma.$transaction(async (tx: any) => {
      await tx.candidate_stage_history.create({
        data: {
          id: crypto.randomUUID(),
          candidate_id: id,
          from_stage: candidate.stage,
          to_stage: stage as any,
          changed_by_id: changedById,
          note: note || null,
        },
      });
      return tx.recruitmentCandidate.update({
        where: { id },
        data: { stage: stage as any },
      });
    });
    return updated;
  }

  /* ============================================================
     RESUME PARSING (stateless draft — no persistence)
     ============================================================ */

  async parseDraft(file: UploadedResumeFile) {
    const { parsed } = await parseResumeFile(file.path, file.mimetype);
    return { parsedData: parsed };
  }

  async createFromResume(file: UploadedResumeFile, fieldsJson: string, uploadedById: string) {
    let fields: Record<string, any>;
    try {
      fields = JSON.parse(fieldsJson || '{}');
    } catch {
      throw new BadRequestException('fields must be a JSON string.');
    }
    if (!fields.name || !fields.email || !fields.jobId) {
      throw new BadRequestException('name, email and jobId are required.');
    }
    const job = await this.prisma.recruitmentJob.findUnique({ where: { id: fields.jobId } });
    if (!job) throw new NotFoundException('Job not found.');

    const buffer = await readFile(file.path);
    const { parsed, rawText } = await parseResumeFile(file.path, file.mimetype);

    const existing = await this.prisma.recruitmentCandidate.findFirst({
      where: { email: String(fields.email).toLowerCase(), jobId: fields.jobId },
    });
    if (existing) {
      throw new BadRequestException('A candidate with this email already exists for this job.');
    }

    const experience =
      fields.experience != null && fields.experience !== ''
        ? String(fields.experience)
        : parsed.totalExperienceYears > 0
          ? `${parsed.totalExperienceYears} yr${parsed.totalExperienceYears === 1 ? '' : 's'}`
          : '0';
    const currentRole = fields.currentRole || parsed.currentRole || '';
    const location = fields.location || parsed.location || '';
    const summary = fields.summary || parsed.summary || '';

    const candidate = await this.prisma.recruitmentCandidate.create({
      data: {
        id: crypto.randomUUID(),
        jobId: fields.jobId,
        name: String(fields.name),
        email: String(fields.email).toLowerCase(),
        phone: fields.phone ? String(fields.phone) : parsed.phone || '',
        appliedOn: new Date().toISOString().slice(0, 10),
        stage: 'Applied',
        score: 75,
        experience,
        currentRole,
        location,
        matchedSkills: parsed.topSkills,
        missingSkills: [],
        summary,
        recommendation: 'Review',
        tags: Array.isArray(fields.tags) && fields.tags.length > 0 ? fields.tags.map(String) : ['New Applicant'],
        source: (fields.source as any) || 'CareerPage',
        duplicate_key: `${String(fields.email).toLowerCase()}::${fields.jobId}`,
        parsed_resume: parsed as any,
        resumeUrl: `/api/recruitment/candidates/${'PENDING'}/resume`,
      },
    });

    const fileHash = createHash('sha256').update(buffer).digest('hex');
    await this.prisma.candidateResumeDocument.create({
      data: {
        id: crypto.randomUUID(),
        candidateId: candidate.id,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: buffer.length,
        storagePath: file.path,
        fileHash,
        uploadedById,
        parsingStatus: 'COMPLETED',
        parserVersion: PARSER_VERSION,
        rawTextSample: rawText.slice(0, 2000),
      },
    });
    await this.prisma.recruitmentCandidate.update({
      where: { id: candidate.id },
      data: { resumeUrl: `/api/recruitment/candidates/${candidate.id}/resume` },
    });
    await this.prisma.recruitmentJob.update({
      where: { id: fields.jobId },
      data: { applicants: { increment: 1 } },
    });

    // Compute + persist match score against the job requirements.
    const match = computeMatchScore({
      candidateSkills: parsed.skills.map((s) => s.name),
      candidateExperienceYears: parsed.totalExperienceYears,
      candidateLocation: location,
      jobRequirements: job.requirements,
      jobExperienceMin: job.experience_min ?? 0,
      jobExperienceMax: job.experience_max ?? undefined,
      jobLocation: job.location,
    });
    await this.prisma.recruitmentCandidateMatch.upsert({
      where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } },
      create: {
        id: crypto.randomUUID(),
        candidateId: candidate.id,
        jobId: job.id,
        overallScore: match.overallScore,
        skillScore: match.skillScore,
        experienceScore: match.experienceScore,
        educationScore: match.educationScore,
        locationScore: match.locationScore,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        experienceGap: match.experienceGap != null ? String(match.experienceGap) : null,
        explanation: match.explanation,
        engineVersion: match.engineVersion,
      },
      update: {
        overallScore: match.overallScore,
        skillScore: match.skillScore,
        experienceScore: match.experienceScore,
        educationScore: match.educationScore,
        locationScore: match.locationScore,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        experienceGap: match.experienceGap != null ? String(match.experienceGap) : null,
        explanation: match.explanation,
        calculatedAt: new Date(),
      },
    });
    await this.prisma.recruitmentCandidate.update({
      where: { id: candidate.id },
      data: {
        score: match.overallScore,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        ai_match_score: match.overallScore,
      },
    });

    return { candidate, match };
  }

  async uploadResume(candidateId: string, file: UploadedResumeFile, uploadedById: string) {
    const candidate = await this.prisma.recruitmentCandidate.findUnique({
      where: { id: candidateId },
      include: { job: true },
    });
    if (!candidate) throw new NotFoundException('Candidate not found.');

    const buffer = await readFile(file.path);
    const { parsed, rawText } = await parseResumeFile(file.path, file.mimetype);
    const fileHash = createHash('sha256').update(buffer).digest('hex');

    await this.prisma.candidateResumeDocument.upsert({
      where: { candidateId },
      create: {
        id: crypto.randomUUID(),
        candidateId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: buffer.length,
        storagePath: file.path,
        fileHash,
        uploadedById,
        parsingStatus: 'COMPLETED',
        parserVersion: PARSER_VERSION,
        rawTextSample: rawText.slice(0, 2000),
      },
      update: {
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: buffer.length,
        storagePath: file.path,
        fileHash,
        uploadedById,
        parsingStatus: 'COMPLETED',
        parserVersion: PARSER_VERSION,
        rawTextSample: rawText.slice(0, 2000),
        uploadedAt: new Date(),
      },
    });

    const match = await this.recomputeMatch(candidate, parsed.skills.map((s) => s.name), parsed.totalExperienceYears, parsed.location ?? "", []);

    await this.prisma.recruitmentCandidate.update({
      where: { id: candidateId },
      data: {
        parsed_resume: parsed as any,
        resumeUrl: `/api/recruitment/candidates/${candidateId}/resume`,
      },
    });

    return {
      candidateId,
      fileName: file.originalname,
      matchResult: match,
    };
  }

  async reparseResume(candidateId: string) {
    const candidate = await this.prisma.recruitmentCandidate.findUnique({
      where: { id: candidateId },
      include: { job: true, resumeDocument: true },
    });
    if (!candidate) throw new NotFoundException('Candidate not found.');
    if (!candidate.resumeDocument) {
      throw new BadRequestException('No resume uploaded for this candidate yet.');
    }
    try {
      await readFile(candidate.resumeDocument.storagePath);
    } catch {
      throw new BadRequestException('Stored resume file is no longer available on disk.');
    }
    const { parsed, rawText } = await parseResumeFile(
      candidate.resumeDocument.storagePath,
      candidate.resumeDocument.fileType,
    );

    await this.prisma.candidateResumeDocument.update({
      where: { candidateId },
      data: {
        parsingStatus: 'COMPLETED',
        parserVersion: PARSER_VERSION,
        rawTextSample: rawText.slice(0, 2000),
        parsingError: null,
      },
    });

    const match = await this.recomputeMatch(candidate, parsed.skills.map((s) => s.name), parsed.totalExperienceYears, parsed.location ?? "", []);

    await this.prisma.recruitmentCandidate.update({
      where: { id: candidateId },
      data: { parsed_resume: parsed as any },
    });

    return { candidateId, match };
  }

  /**
   * Reads the stored resume file for a candidate so the controller can stream
   * it back on GET /api/recruitment/candidates/:id/resume (opened by the
   * frontend as a plain anchor, so that route is intentionally unguarded).
   */
  async getResumeFile(candidateId: string) {
    const candidate = await this.prisma.recruitmentCandidate.findUnique({
      where: { id: candidateId },
      include: { resumeDocument: true },
    });
    if (!candidate) throw new NotFoundException('Candidate not found.');
    if (!candidate.resumeDocument) {
      throw new NotFoundException('No resume uploaded for this candidate yet.');
    }

    let buffer: Buffer;
    try {
      buffer = await readFile(candidate.resumeDocument.storagePath);
    } catch {
      throw new NotFoundException('Stored resume file is no longer available on disk.');
    }

    const fileName = candidate.resumeDocument.fileName || `resume-${candidateId}`;
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const EXT_MIME: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      txt: 'text/plain',
      rtf: 'application/rtf',
    };
    const storedType = candidate.resumeDocument.fileType || '';
    const mimeType = storedType.includes('/')
      ? storedType
      : EXT_MIME[ext] || EXT_MIME[storedType.toLowerCase()] || 'application/octet-stream';

    return { buffer, fileName, mimeType };
  }

  private async recomputeMatch(
    candidate: any,
    skills: string[],
    experienceYears: number,
    location: string,
    _education: string[],
  ) {
    const job = candidate.job ?? (await this.prisma.recruitmentJob.findUnique({ where: { id: candidate.jobId } }));
    if (!job) throw new NotFoundException('Job not found.');
    const match = computeMatchScore({
      candidateSkills: skills,
      candidateExperienceYears: experienceYears,
      candidateLocation: location || candidate.location,
      jobRequirements: job.requirements,
      jobExperienceMin: job.experience_min ?? 0,
      jobExperienceMax: job.experience_max ?? undefined,
      jobLocation: job.location,
    });
    await this.prisma.recruitmentCandidateMatch.upsert({
      where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } },
      create: {
        id: crypto.randomUUID(),
        candidateId: candidate.id,
        jobId: job.id,
        overallScore: match.overallScore,
        skillScore: match.skillScore,
        experienceScore: match.experienceScore,
        educationScore: match.educationScore,
        locationScore: match.locationScore,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        experienceGap: match.experienceGap != null ? String(match.experienceGap) : null,
        explanation: match.explanation,
        engineVersion: match.engineVersion,
      },
      update: {
        overallScore: match.overallScore,
        skillScore: match.skillScore,
        experienceScore: match.experienceScore,
        educationScore: match.educationScore,
        locationScore: match.locationScore,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        experienceGap: match.experienceGap != null ? String(match.experienceGap) : null,
        explanation: match.explanation,
        calculatedAt: new Date(),
      },
    });
    await this.prisma.recruitmentCandidate.update({
      where: { id: candidate.id },
      data: {
        score: match.overallScore,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        ai_match_score: match.overallScore,
      },
    });
    return match;
  }

  /* ============================================================
     REDISCOVERY (past candidates re-scored for a job)
     ============================================================ */

  async rediscover(jobId: string, minScore = 40) {
    const job = await this.prisma.recruitmentJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found.');

    const pastCandidates = await this.prisma.recruitmentCandidate.findMany({
      where: {
        jobId: { not: jobId },
        stage: { in: ['Rejected', 'Withdrawn', 'Archived'] },
      },
      include: { job: true },
      take: 200,
    });

    const results: any[] = [];
    for (const cand of pastCandidates) {
      const skills = cand.matchedSkills || [];
      const expYears = parseFloat(cand.experience) || 0;
      const match = computeMatchScore({
        candidateSkills: skills,
        candidateExperienceYears: expYears,
        candidateLocation: cand.location,
        jobRequirements: job.requirements,
        jobExperienceMin: job.experience_min ?? 0,
        jobExperienceMax: job.experience_max ?? undefined,
        jobLocation: job.location,
      });
      if (match.overallScore >= minScore) {
        results.push({
          candidateId: cand.id,
          name: cand.name,
          matchScore: match.overallScore,
          previousJobTitle: cand.job?.title || '',
          previousStage: cand.stage,
          currentRole: cand.currentRole || '',
          experience: cand.experience,
          location: cand.location,
          matchBreakdown: {
            skillScore: match.skillScore,
            experienceScore: match.experienceScore,
            educationScore: match.educationScore,
            locationScore: match.locationScore,
            matchedSkills: match.matchedSkills,
            missingSkills: match.missingSkills,
            explanation: match.explanation,
          },
          tags: cand.tags || [],
        });
      }
    }
    results.sort((a, b) => b.matchScore - a.matchScore);
    return { rediscoveredCandidates: results };
  }

  async addToJob(candidateId: string, targetJobId: string) {
    const candidate = await this.prisma.recruitmentCandidate.findUnique({ where: { id: candidateId } });
    if (!candidate) throw new NotFoundException('Candidate not found.');
    const job = await this.prisma.recruitmentJob.findUnique({ where: { id: targetJobId } });
    if (!job) throw new NotFoundException('Target job not found.');

    const existing = await this.prisma.recruitmentCandidate.findFirst({
      where: { email: candidate.email, jobId: targetJobId },
    });
    if (existing) {
      throw new BadRequestException('Candidate already exists on the target job.');
    }

    const created = await this.prisma.recruitmentCandidate.create({
      data: {
        id: crypto.randomUUID(),
        jobId: targetJobId,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        appliedOn: new Date().toISOString().slice(0, 10),
        stage: 'Applied',
        score: candidate.score,
        experience: candidate.experience,
        currentRole: candidate.currentRole,
        location: candidate.location,
        matchedSkills: candidate.matchedSkills,
        missingSkills: candidate.missingSkills,
        summary: candidate.summary,
        recommendation: candidate.recommendation,
        tags: [...(candidate.tags || []), 'Rediscovered'],
        source: 'Manual',
        duplicate_key: `${candidate.email}::${targetJobId}`,
        parsed_resume: (candidate as any).parsed_resume,
      },
      include: { job: true },
    });
    await this.prisma.recruitmentJob.update({
      where: { id: targetJobId },
      data: { applicants: { increment: 1 } },
    });
    return created;
  }

  /* ============================================================
     INTERVIEWS
     ============================================================ */

  async getInterviews(candidateId: string) {
    return this.prisma.recruitment_interviews.findMany({
      where: { candidate_id: candidateId },
      orderBy: [{ round: 'asc' }, { starts_at: 'asc' }],
      include: {
        interview_panel_members: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
        interview_feedback: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
      },
    });
  }

  /* ============================================================
     MY APPROVALS (Meetings panel)
     ============================================================ */

  /** GET my-approvals — pending job/offer approval steps the approver can act on right now. */
  async getMyApprovals(actorId: string) {
    // Offer steps assigned to a CEO who delegated recruitment-approval authority
    // to this admin are actionable by the admin too (acting on the CEO's behalf).
    const offerDelegatorIds = await this.permissions.getActiveDelegatorIds(
      actorId,
      'ONBOARDING_APPROVAL',
    );
    const offerApproverIds = [actorId, ...offerDelegatorIds];
    const [jobSteps, offerSteps] = await Promise.all([
      this.prisma.recruitment_job_approvals.findMany({
        where: { approver_id: actorId, status: 'Pending', recruitment_jobs: { status: 'PendingApproval' } },
        include: {
          recruitment_jobs: {
            select: {
              id: true,
              title: true,
              department: true,
              recruitment_job_approvals: { select: { sequence: true, status: true }, orderBy: { sequence: 'asc' } },
            },
          },
        },
        orderBy: { sequence: 'asc' },
      }),
      this.prisma.recruitment_offer_approvals.findMany({
        where: {
          approver_id: { in: offerApproverIds },
          status: 'Pending',
          recruitment_offers: { status: 'PendingApproval' },
        },
        include: {
          recruitment_offers: {
            select: {
              id: true,
              offered_title: true,
              recruitment_candidates: { select: { name: true, currentRole: true } },
              recruitment_offer_approvals: { select: { sequence: true, status: true }, orderBy: { sequence: 'asc' } },
            },
          },
        },
        orderBy: { sequence: 'asc' },
      }),
    ]);

    // Chain rule (same as the recruitment UI): a step is actionable only when
    // every earlier step has been approved.
    const isMyTurn = (siblings: any[], sequence: number) =>
      siblings.filter((step) => step.sequence < sequence).every((step) => step.status === 'Approved');

    return {
      jobs: jobSteps
        .filter((step: any) => isMyTurn(step.recruitment_jobs.recruitment_job_approvals, step.sequence))
        .map((step: any) => ({
          id: step.recruitment_jobs.id,
          level: step.sequence,
          title: step.recruitment_jobs.title,
          context: step.recruitment_jobs.department,
        })),
      offers: offerSteps
        .filter((step: any) => isMyTurn(step.recruitment_offers.recruitment_offer_approvals, step.sequence))
        .map((step: any) => ({
          id: step.recruitment_offers.id,
          level: step.sequence,
          title: step.recruitment_offers.offered_title,
          candidate: step.recruitment_offers.recruitment_candidates.name,
          context: step.recruitment_offers.recruitment_candidates.currentRole,
        })),
    };
  }

  /* ============================================================
     INTERVIEW ↔ MEETINGS SYNC
     Every interview is mirrored into Meetings & Calendar under a
     deterministic id — "i" + the first 31 hex chars of
     sha256(interviewId) — so panel members see it on their calendar.
     Recruitment ATS stays the source of truth; the meetings module
     blocks manual edits/cancels of these mirror rows.
     ============================================================ */

  private interviewMeetingId(interviewId: string): string {
    return `i${createHash('sha256').update(interviewId).digest('hex').slice(1, 32)}`;
  }

  private interviewMeetingStatus(status: string): 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED' {
    if (status === 'Cancelled') return 'CANCELLED';
    if (status === 'Completed' || status === 'NoShow' || status === 'No Show') return 'COMPLETED';
    if (status === 'InProgress') return 'ONGOING';
    return 'UPCOMING';
  }

  /** Create or refresh the Meetings & Calendar mirror of an interview. */
  private async syncInterviewMeeting(interviewId: string) {
    const interview = await this.prisma.recruitment_interviews.findUnique({
      where: { id: interviewId },
      include: {
        interview_panel_members: true,
        recruitment_candidates: { select: { name: true } },
      },
    });
    if (!interview) return;

    const lead =
      interview.interview_panel_members.find((member: any) => member.is_lead) ??
      interview.interview_panel_members[0];
    if (!lead) return;

    const meetingId = this.interviewMeetingId(interviewId);
    const panelIds = [...new Set(interview.interview_panel_members.map((member: any) => member.employee_id))];
    const attendeeIds = panelIds.filter((employeeId: string) => employeeId !== lead.employee_id);
    const title = `${interview.title} — ${interview.recruitment_candidates.name}`.slice(0, 150);

    await this.prisma.$transaction(async (tx: any) => {
      await tx.meeting.upsert({
        where: { id: meetingId },
        create: {
          id: meetingId,
          title,
          type: 'TEAM',
          description: `Interview for ${interview.recruitment_candidates.name} (Round ${interview.round}). Managed by Recruitment ATS.`,
          startsAt: interview.starts_at,
          endsAt: interview.ends_at,
          allDay: false,
          location: interview.location,
          videoLink: interview.meeting_url,
          organizerId: lead.employee_id,
          recurrence: 'NONE',
          reminderMinutes: 15,
          status: this.interviewMeetingStatus(interview.status),
          attendees: {
            create: [
              { employeeId: lead.employee_id, rsvp: 'ACCEPTED' },
              ...attendeeIds.map((employeeId: string) => ({ employeeId, rsvp: 'PENDING' })),
            ],
          },
        },
        update: {
          title,
          startsAt: interview.starts_at,
          endsAt: interview.ends_at,
          location: interview.location,
          videoLink: interview.meeting_url,
          organizerId: lead.employee_id,
          status: this.interviewMeetingStatus(interview.status),
        },
      });

      // Reconcile the attendee list with the current panel while preserving
      // RSVP responses of members who are still on the panel.
      const existingAttendees = await tx.meetingAttendee.findMany({
        where: { meetingId },
        select: { employeeId: true },
      });
      const currentIds = new Set<string>([lead.employee_id, ...attendeeIds]);
      await tx.meetingAttendee.deleteMany({
        where: { meetingId, employeeId: { notIn: [...currentIds] } },
      });
      for (const employeeId of currentIds) {
        if (!existingAttendees.some((attendee: any) => attendee.employeeId === employeeId)) {
          await tx.meetingAttendee.create({
            data: { meetingId, employeeId, rsvp: employeeId === lead.employee_id ? 'ACCEPTED' : 'PENDING' },
          });
        }
      }
    });
  }

  async createInterview(body: Record<string, any>) {
    const candidate = await this.prisma.recruitmentCandidate.findUnique({
      where: { id: body.candidateId },
    });
    if (!candidate) throw new NotFoundException('Candidate not found.');

    const panel: string[] = Array.isArray(body.panelMembers) ? body.panelMembers.map(String) : [];
    const leadId = body.leadInterviewerId ? String(body.leadInterviewerId) : '';
    if (panel.length === 0) throw new BadRequestException('At least one panel member is required.');
    if (!leadId) throw new BadRequestException('A lead interviewer is required.');
    if (!panel.includes(leadId)) {
      throw new BadRequestException('Lead interviewer must be part of the panel.');
    }
    if (!body.startsAt || !body.endsAt) throw new BadRequestException('start and end times are required.');
    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(body.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException('Invalid interview dates.');
    }
    if (endsAt <= startsAt) {
      throw new BadRequestException('End time must be after start time.');
    }

    const round = Number(body.round) > 0 ? Math.round(Number(body.round)) : 1;

    const interview = await this.prisma.$transaction(async (tx: any) => {
      const created = await tx.recruitment_interviews.create({
        data: {
          id: crypto.randomUUID(),
          candidate_id: body.candidateId,
          title: body.title ? String(body.title) : `Interview Round ${round}`,
          round,
          starts_at: startsAt,
          ends_at: endsAt,
          location: body.location ? String(body.location) : null,
          meeting_url: body.meetingUrl ? String(body.meetingUrl) : null,
          status: 'Scheduled',
          updated_at: new Date(),
        },
      });
      await tx.interview_panel_members.createMany({
        data: panel.map((employeeId) => ({
          id: crypto.randomUUID(),
          interview_id: created.id,
          employee_id: employeeId,
          is_lead: employeeId === leadId,
        })),
      });
      return created;
    });

    this.notify
      .notifyUsers(panel, {
        title: 'Interview scheduled',
        message: `You are on the interview panel for ${candidate.name} (Round ${round}).`,
        type: 'recruitment',
        linkUrl: '/recruitment',
      })
      .catch(() => undefined);

    // Mirror the interview into Meetings & Calendar for the panel.
    await this.syncInterviewMeeting(interview.id);

    return this.prisma.recruitment_interviews.findUnique({
      where: { id: interview.id },
      include: {
        interview_panel_members: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
        interview_feedback: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
      },
    });
  }

  async updateInterview(interviewId: string, body: Record<string, any>) {
    const interview = await this.prisma.recruitment_interviews.findUnique({
      where: { id: interviewId },
      include: { interview_panel_members: true },
    });
    if (!interview) throw new NotFoundException('Interview not found.');

    // Status-only update (quick status chips)
    if (body.status && !body.startsAt && !body.panelMembers) {
      const allowed = [
        'Scheduled',
        'Confirmed',
        'InProgress',
        'Completed',
        'Cancelled',
        'NoShow',
        'No Show',
        'Rescheduled',
      ];
      if (!allowed.includes(String(body.status))) {
        throw new BadRequestException(`Invalid interview status "${body.status}".`);
      }
      const statusUpdated = await this.prisma.recruitment_interviews.update({
        where: { id: interviewId },
        data: { status: String(body.status), updated_at: new Date() },
        include: {
          interview_panel_members: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
          interview_feedback: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
        },
      });
      // Keep the Meetings & Calendar mirror in sync with the new status.
      await this.syncInterviewMeeting(interviewId);
      return statusUpdated;
    }

    const data: Record<string, any> = { updated_at: new Date() };
    if (body.title != null) data.title = String(body.title);
    if (body.round != null) data.round = Math.max(1, Math.round(Number(body.round) || 1));
    if (body.startsAt != null) {
      const startsAt = new Date(body.startsAt);
      if (Number.isNaN(startsAt.getTime())) throw new BadRequestException('Invalid start time.');
      data.starts_at = startsAt;
    }
    if (body.endsAt != null) {
      const endsAt = new Date(body.endsAt);
      if (Number.isNaN(endsAt.getTime())) throw new BadRequestException('Invalid end time.');
      data.ends_at = endsAt;
    }
    if (body.location != null) data.location = String(body.location);
    if (body.meetingUrl != null) data.meeting_url = String(body.meetingUrl);
    if (body.status != null) data.status = String(body.status);

    const updated = await this.prisma.recruitment_interviews.update({
      where: { id: interviewId },
      data,
    });

    if (Array.isArray(body.panelMembers)) {
      const panel: string[] = body.panelMembers.map(String);
      const leadId = body.leadInterviewerId ? String(body.leadInterviewerId) : '';
      if (panel.length === 0) throw new BadRequestException('At least one panel member is required.');
      if (leadId && !panel.includes(leadId)) {
        throw new BadRequestException('Lead interviewer must be part of the panel.');
      }
      await this.prisma.interview_panel_members.deleteMany({ where: { interview_id: interviewId } });
      await this.prisma.interview_panel_members.createMany({
        data: panel.map((employeeId) => ({
          id: crypto.randomUUID(),
          interview_id: interviewId,
          employee_id: employeeId,
          is_lead: employeeId === leadId,
        })),
      });
    }

    // Mirror schedule/panel changes into Meetings & Calendar.
    await this.syncInterviewMeeting(interviewId);

    return this.prisma.recruitment_interviews.findUnique({
      where: { id: updated.id },
      include: {
        interview_panel_members: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
        interview_feedback: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
      },
    });
  }

  async submitFeedback(interviewId: string, body: Record<string, any>, reviewerId: string) {
    const interview = await this.prisma.recruitment_interviews.findUnique({
      where: { id: interviewId },
      include: { interview_panel_members: true },
    });
    if (!interview) throw new NotFoundException('Interview not found.');

    const isPanel = interview.interview_panel_members.some((p: any) => p.employee_id === reviewerId);
    if (!isPanel) throw new ForbiddenException('Only panel members can submit feedback.');

    const overallScore = Number(body.overallScore);
    if (!Number.isFinite(overallScore) || overallScore < 1 || overallScore > 5) {
      throw new BadRequestException('overallScore must be between 1 and 5.');
    }
    const recommendation = String(body.recommendation || '');
    // Mirrors the frontend dropdown values (src/app/recruitment/page.tsx).
    const ALLOWED_RECOMMENDATIONS = ['StrongHire', 'Hire', 'Maybe', 'NoHire', 'StrongNoHire'];
    if (!ALLOWED_RECOMMENDATIONS.includes(recommendation)) {
      throw new BadRequestException(
        `recommendation must be one of ${ALLOWED_RECOMMENDATIONS.join(', ')}.`,
      );
    }

    const scorecard = body.scorecard && Array.isArray(body.scorecard.criteria)
      ? {
          criteria: body.scorecard.criteria.map((c: any) => ({
            name: String(c.name || ''),
            score: Number(c.score) || 0,
            weight: Number(c.weight) || 1,
            remarks: c.remarks ? String(c.remarks) : undefined,
          })),
        }
      : null;

    const feedback = await this.prisma.interview_feedback.upsert({
      where: { interview_id_reviewer_id: { interview_id: interviewId, reviewer_id: reviewerId } },
      create: {
        id: crypto.randomUUID(),
        interview_id: interviewId,
        reviewer_id: reviewerId,
        overall_score: Math.round(overallScore),
        recommendation,
        scorecard: scorecard as any,
        comments: body.comments ? String(body.comments) : null,
      },
      update: {
        overall_score: Math.round(overallScore),
        recommendation,
        scorecard: scorecard as any,
        comments: body.comments ? String(body.comments) : null,
        submitted_at: new Date(),
      },
      include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } },
    });
    return feedback;
  }

  /* ============================================================
     INTERVIEWER DECISION (from the Meetings & Calendar view)
     A panel member opens their mirrored interview meeting and records a
     quick Select/Reject verdict + remark. This is stored as their
     interview_feedback row (Select → Hire, Reject → NoHire) so HR sees it
     alongside any full scorecard, and HR is notified to act (Next Round /
     Select Candidate). The meetings module only knows the hashed meeting id,
     so we reverse-map it to the interview by matching the deterministic hash
     against the interviews this viewer sits on the panel for.
     ============================================================ */

  /** Resolve a mirror meeting id back to the interview the viewer is on the panel for. */
  private async resolveInterviewByMeeting(meetingId: string, viewerId: string): Promise<string | null> {
    if (!meetingId || !viewerId) return null;
    const interviews = await this.prisma.recruitment_interviews.findMany({
      where: { interview_panel_members: { some: { employee_id: viewerId } } },
      select: { id: true },
    });
    const match = interviews.find((i: any) => this.interviewMeetingId(i.id) === meetingId);
    return match?.id ?? null;
  }

  /** GET the interview context for a mirror meeting: candidate, round, and the viewer's own decision (if any). */
  async getInterviewForMeeting(meetingId: string, viewerId: string) {
    const interviewId = await this.resolveInterviewByMeeting(meetingId, viewerId);
    if (!interviewId) return null;

    const interview = await this.prisma.recruitment_interviews.findUnique({
      where: { id: interviewId },
      include: {
        recruitment_candidates: { select: { id: true, name: true, stage: true } },
        interview_feedback: {
          where: { reviewer_id: viewerId },
          select: { recommendation: true, comments: true, submitted_at: true },
        },
      },
    });
    if (!interview) return null;

    const mine = interview.interview_feedback[0] ?? null;
    return {
      interviewId,
      round: interview.round,
      status: interview.status,
      candidateName: interview.recruitment_candidates.name,
      myDecision: mine
        ? {
            decision: mine.recommendation === 'NoHire' || mine.recommendation === 'StrongNoHire' ? 'REJECT' : 'SELECT',
            remark: mine.comments ?? '',
            submittedAt: mine.submitted_at,
          }
        : null,
    };
  }

  /** Record a panel member's Select/Reject verdict + remark from their meeting view; notify HR. */
  async submitInterviewerDecision(meetingId: string, body: Record<string, any>, reviewerId: string) {
    const interviewId = await this.resolveInterviewByMeeting(meetingId, reviewerId);
    if (!interviewId) throw new NotFoundException('No interview found for this meeting.');

    const decision = String(body.decision || '').toUpperCase();
    if (decision !== 'SELECT' && decision !== 'REJECT') {
      throw new BadRequestException('decision must be SELECT or REJECT.');
    }
    const remark = String(body.remark || '').trim();
    if (!remark) throw new BadRequestException('A remark is required.');
    if (remark.length > 1000) throw new BadRequestException('Remark must be 1000 characters or fewer.');

    const interview = await this.prisma.recruitment_interviews.findUnique({
      where: { id: interviewId },
      include: { recruitment_candidates: { select: { id: true, name: true } } },
    });
    if (!interview) throw new NotFoundException('Interview not found.');

    // Map the lightweight verdict onto the existing feedback recommendation
    // (Select → Hire, Reject → NoHire). A neutral score keeps the HR-side
    // average/consensus display coherent without demanding a full scorecard.
    const recommendation = decision === 'SELECT' ? 'Hire' : 'NoHire';
    const overallScore = decision === 'SELECT' ? 4 : 2;

    const feedback = await this.prisma.interview_feedback.upsert({
      where: { interview_id_reviewer_id: { interview_id: interviewId, reviewer_id: reviewerId } },
      create: {
        id: crypto.randomUUID(),
        interview_id: interviewId,
        reviewer_id: reviewerId,
        overall_score: overallScore,
        recommendation,
        comments: remark,
      },
      update: {
        overall_score: overallScore,
        recommendation,
        comments: remark,
        submitted_at: new Date(),
      },
      include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } },
    });

    const reviewerName = (feedback as any).employees?.name || 'An interviewer';
    const candidateName = interview.recruitment_candidates.name;
    const verdictLabel = decision === 'SELECT' ? 'selected' : 'rejected';

    // Notify HR / recruiters so they can move the candidate forward.
    this.notify
      .notifyAdmins({
        title: `Interview decision: ${candidateName} ${verdictLabel}`,
        message: `${reviewerName} ${verdictLabel} ${candidateName} (Round ${interview.round}). Remark: ${remark}`,
        type: 'recruitment',
        linkUrl: '/recruitment',
      })
      .catch(() => undefined);

    return { decision, recommendation, feedback };
  }

  /* ============================================================
     SELECTION DECISIONS
     ============================================================ */

  async selectionDecision(candidateId: string, body: Record<string, any>, actorId: string) {
    const candidate = await this.prisma.recruitmentCandidate.findUnique({ where: { id: candidateId } });
    if (!candidate) throw new NotFoundException('Candidate not found.');

    const decision = String(body.decision || '');
    const reason = String(body.reason || '').trim();
    if (!reason) throw new BadRequestException('A reason is required.');

    if (decision === 'SELECT') {
      const updated = await this.prisma.$transaction(async (tx: any) => {
        await tx.candidate_stage_history.create({
          data: {
            id: crypto.randomUUID(),
            candidate_id: candidateId,
            from_stage: candidate.stage,
            to_stage: 'Selected',
            changed_by_id: actorId,
            note: reason,
          },
        });
        return tx.recruitmentCandidate.update({
          where: { id: candidateId },
          data: { stage: 'Selected', recommendation: 'StrongMatch' },
        });
      });
      return updated;
    }

    if (decision === 'REJECT') {
      // Org policy: a rejected applicant's data is deleted, not archived.
      await this.purgeCandidateData(candidateId);
      return { deleted: true, id: candidateId, name: candidate.name };
    }

    if (decision === 'HOLD') {
      const updated = await this.prisma.$transaction(async (tx: any) => {
        await tx.candidate_stage_history.create({
          data: {
            id: crypto.randomUUID(),
            candidate_id: candidateId,
            from_stage: candidate.stage,
            to_stage: candidate.stage,
            changed_by_id: actorId,
            note: `HOLD: ${reason}`,
          },
        });
        return tx.recruitmentCandidate.update({ where: { id: candidateId }, data: {} });
      });
      return updated;
    }

    if (decision === 'NEXT_ROUND') {
      const maxRound = await this.prisma.recruitment_interviews.findFirst({
        where: { candidate_id: candidateId },
        orderBy: { round: 'desc' },
        select: { round: true },
      });
      const nextRound = (maxRound?.round ?? 0) + 1;
      const interview = await this.prisma.recruitment_interviews.create({
        data: {
          id: crypto.randomUUID(),
          candidate_id: candidateId,
          title: `Interview Round ${nextRound}`,
          round: nextRound,
          starts_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
          ends_at: new Date(Date.now() + 25 * 60 * 60 * 1000),
          status: 'Scheduled',
          updated_at: new Date(),
        },
      });
      const updated = await this.prisma.recruitmentCandidate.update({
        where: { id: candidateId },
        data: { stage: 'Interview' },
      });
      return { interview, candidate: updated };
    }

    throw new BadRequestException(`Unknown decision "${decision}".`);
  }

  /* ============================================================
     NOTES + TIMELINE
     ============================================================ */

  async getNotes(candidateId: string) {
    return this.prisma.candidate_notes.findMany({
      where: { candidate_id: candidateId },
      orderBy: { created_at: 'desc' },
      include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } },
    });
  }

  async addNote(candidateId: string, body: Record<string, any>, authorId: string) {
    const candidate = await this.prisma.recruitmentCandidate.findUnique({ where: { id: candidateId } });
    if (!candidate) throw new NotFoundException('Candidate not found.');
    const note = String(body.note || '').trim();
    if (!note) throw new BadRequestException('Note text is required.');
    return this.prisma.candidate_notes.create({
      data: {
        id: crypto.randomUUID(),
        candidate_id: candidateId,
        author_id: authorId,
        note,
      },
      include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } },
    });
  }

  async getTimeline(candidateId: string) {
    const candidate = await this.prisma.recruitmentCandidate.findUnique({ where: { id: candidateId } });
    if (!candidate) throw new NotFoundException('Candidate not found.');

    const [history, interviews, offers, notes] = await Promise.all([
      this.prisma.candidate_stage_history.findMany({
        where: { candidate_id: candidateId },
        orderBy: { changed_at: 'desc' },
        include: { changedBy: true },
      }),
      this.prisma.recruitment_interviews.findMany({
        where: { candidate_id: candidateId },
        orderBy: { starts_at: 'desc' },
      }),
      this.prisma.recruitment_offers.findMany({
        where: { candidate_id: candidateId },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.candidate_notes.findMany({
        where: { candidate_id: candidateId },
        orderBy: { created_at: 'desc' },
        include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } },
      }),
    ]);

    const items: any[] = [];

    for (const h of history) {
      items.push({
        id: h.id,
        title: `Stage moved to ${h.to_stage}`,
        timestamp: h.changed_at.toISOString(),
        description: h.note || undefined,
        authorName: h.changedBy ? h.changedBy.name : undefined,
      });
    }
    for (const intv of interviews) {
      items.push({
        id: intv.id,
        title: `${intv.title} (${intv.status})`,
        timestamp: intv.starts_at.toISOString(),
        description: intv.location || intv.meeting_url || undefined,
      });
    }
    for (const offer of offers) {
      items.push({
        id: offer.id,
        title: `Offer ${offer.status} — ${offer.offered_title}`,
        timestamp: offer.created_at.toISOString(),
        description: offer.offered_ctc ? formatIndianCurrency(Number(offer.offered_ctc), offer.currency) : undefined,
      });
    }
    for (const n of notes) {
      items.push({
        id: n.id,
        title: 'Note added',
        timestamp: n.created_at.toISOString(),
        description: n.note,
        authorName: n.employees?.name,
      });
    }

    items.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    return items;
  }

  /* ============================================================
     OFFERS
     ============================================================ */

  async getOffers(candidateId: string, actorId?: string) {
    const offers = await this.prisma.recruitment_offers.findMany({
      where: candidateId ? { candidate_id: candidateId } : {},
      orderBy: [{ version: 'desc' }, { created_at: 'desc' }],
      include: {
        recruitment_offer_approvals: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
        document_templates: true,
      },
    });
    // A delegate holding the CEO's recruitment-approval permission can act on the
    // CEO's own pending offer steps, so resolve those delegator ids once here.
    const delegatorIds = actorId
      ? await this.permissions.getActiveDelegatorIds(actorId, 'ONBOARDING_APPROVAL')
      : [];
    // Attach the interviewers' verdicts/remarks to offers under review so the
    // final approver (CEO) sees the full picture — interviewer + HR + hiring
    // manager remarks — alongside the approval chain. Cached per candidate to
    // avoid re-querying for multiple offer versions of the same candidate.
    const packetCache = new Map<string, any>();
    const result: any[] = [];
    for (const offer of offers) {
      let reviewPacket: any = null;
      if (offer.status === 'PendingApproval' || offer.status === 'Approved') {
        if (!packetCache.has(offer.candidate_id)) {
          packetCache.set(offer.candidate_id, await this.buildCandidateReviewPacket(offer.candidate_id));
        }
        reviewPacket = packetCache.get(offer.candidate_id);
      }
      result.push({
        ...offer,
        approvalSummary: this.buildOfferApprovalSummary(offer, actorId, delegatorIds),
        reviewPacket,
      });
    }
    return result;
  }

  /**
   * Per-viewer approval summary for the frontend offer card.
   * Mirrors the authorization rules of offerApprovalAction(): the current user
   * can act only when the offer is PendingApproval, they own an approval step,
   * and that step is still Pending.
   */
  private buildOfferApprovalSummary(offer: any, actorId?: string, delegatorIds: string[] = []) {
    const steps = offer.recruitment_offer_approvals || [];
    const completedLevels = steps.filter((s: any) => s.status === 'Approved').length;
    const canOwn = (approverId: string) =>
      approverId === actorId || delegatorIds.includes(approverId);
    // The actor may own more than one step (their own + one delegated from the
    // CEO), so act on the still-pending one rather than an already-approved step.
    const ownedSteps = actorId ? steps.filter((s: any) => canOwn(s.approver_id)) : [];
    const myStep = ownedSteps.find((s: any) => s.status === 'Pending') ?? ownedSteps[0];
    // Strict chain order: my step is actionable only once every earlier step
    // has been approved (mirrors offerApprovalAction + getMyApprovals).
    const myTurn =
      !!myStep &&
      myStep.status === 'Pending' &&
      steps
        .filter((s: any) => s.sequence < myStep.sequence)
        .every((s: any) => s.status === 'Approved');
    return {
      completedLevels,
      totalLevels: steps.length,
      canCurrentUserApprove: offer.status === 'PendingApproval' && myTurn,
    };
  }

  private buildSnapshot(offer: {
    offeredCtc: number;
    currency: string;
    variablePayAnnual: number;
    joiningBonus: number;
  }): { compensation: OfferCompensation } {
    const compensation = calculateOfferCompensation(
      offer.offeredCtc,
      offer.variablePayAnnual,
      offer.joiningBonus,
      offer.currency,
    );
    return { compensation };
  }

  private parseSnapshot(offer: any): Record<string, any> {
    if (!offer.content_snapshot) return {};
    try {
      return JSON.parse(offer.content_snapshot);
    } catch {
      return {};
    }
  }

  async createOffer(body: Record<string, any>) {
    const candidate = await this.prisma.recruitmentCandidate.findUnique({
      where: { id: body.candidateId },
    });
    if (!candidate) throw new NotFoundException('Candidate not found.');

    if (candidate.stage !== 'Selected') {
      throw new BadRequestException(
        `Candidate must be in "Selected" stage before an offer can be created (current: "${candidate.stage}").`,
      );
    }
    const activeOffer = await this.prisma.recruitment_offers.findFirst({
      where: { candidate_id: candidate.id, status: { in: ACTIVE_OFFER_STATUSES as any } },
    });
    if (activeOffer) {
      throw new BadRequestException('Candidate already has an active offer.');
    }

    const offeredCtc = Number(body.offeredCtc);
    if (!Number.isFinite(offeredCtc) || offeredCtc <= 0) {
      throw new BadRequestException('offeredCtc must be a positive number.');
    }
    const currency = body.currency || 'INR';
    const variablePayAnnual = Number(body.variablePayAnnual) > 0 ? Number(body.variablePayAnnual) : 0;
    const joiningBonus = Number(body.joiningBonus) > 0 ? Number(body.joiningBonus) : 0;

    const snapshot = this.buildSnapshot({ offeredCtc, currency, variablePayAnnual, joiningBonus });

    const offer = await this.prisma.recruitment_offers.create({
      data: {
        id: crypto.randomUUID(),
        candidate_id: candidate.id,
        status: 'Draft',
        version: 1,
        offered_title: String(body.offeredTitle || ''),
        offered_ctc: offeredCtc,
        currency,
        proposed_join_date: body.proposedJoinDate ? new Date(body.proposedJoinDate) : null,
        expires_at: body.expiresAt ? new Date(body.expiresAt) : null,
        content_snapshot: JSON.stringify(snapshot),
        updated_at: new Date(),
      },
      include: {
        recruitment_offer_approvals: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
        document_templates: true,
      },
    });
    return offer;
  }

  async updateOffer(offerId: string, body: Record<string, any>) {
    const offer = await this.prisma.recruitment_offers.findUnique({ where: { id: offerId } });
    if (!offer) throw new NotFoundException('Offer not found.');
    if (['Accepted', 'Declined', 'Expired', 'Withdrawn'].includes(offer.status)) {
      throw new BadRequestException(`Offer is already ${offer.status} and can no longer be edited.`);
    }

    const offeredCtc = body.offeredCtc != null ? Number(body.offeredCtc) : Number(offer.offered_ctc);
    const currency = body.currency || offer.currency;
    const prevSnapshot = this.parseSnapshot(offer);
    const variablePayAnnual =
      body.variablePayAnnual != null
        ? Number(body.variablePayAnnual) > 0
          ? Number(body.variablePayAnnual)
          : 0
        : Number(prevSnapshot?.compensation?.variablePayAnnual || 0);
    const joiningBonus =
      body.joiningBonus != null
        ? Number(body.joiningBonus) > 0
          ? Number(body.joiningBonus)
          : 0
        : Number(prevSnapshot?.compensation?.joiningBonus || 0);

    const snapshot = this.buildSnapshot({ offeredCtc, currency, variablePayAnnual, joiningBonus }) as any;
    // preserve declineReason across version bumps
    if (prevSnapshot.declineReason) snapshot.declineReason = prevSnapshot.declineReason;
    // preserve previously generated documents metadata
    if (Array.isArray(prevSnapshot.documents)) snapshot.documents = prevSnapshot.documents;

    const maxVersion = await this.prisma.recruitment_offers.findFirst({
      where: { candidate_id: offer.candidate_id },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = Math.max(offer.version, (maxVersion?.version ?? 0)) + (offer.version === (maxVersion?.version ?? 0) ? 1 : 0);

    const updated = await this.prisma.recruitment_offers.update({
      where: { id: offerId },
      data: {
        offered_title: body.offeredTitle != null ? String(body.offeredTitle) : offer.offered_title,
        offered_ctc: offeredCtc,
        currency,
        proposed_join_date:
          body.proposedJoinDate !== undefined
            ? body.proposedJoinDate
              ? new Date(body.proposedJoinDate)
              : null
            : offer.proposed_join_date,
        expires_at:
          body.expiresAt !== undefined
            ? body.expiresAt
              ? new Date(body.expiresAt)
              : null
            : offer.expires_at,
        content_snapshot: JSON.stringify(snapshot),
        version: nextVersion,
        updated_at: new Date(),
      },
      include: {
        recruitment_offer_approvals: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
        document_templates: true,
      },
    });
    return updated;
  }

  async submitOfferForApproval(offerId: string, body: Record<string, any>) {
    const offer = await this.prisma.recruitment_offers.findUnique({
      where: { id: offerId },
      include: { recruitment_candidates: { include: { job: true } } },
    });
    if (!offer) throw new NotFoundException('Offer not found.');
    if (offer.status !== 'Draft') {
      throw new BadRequestException(`Offer is already ${offer.status}.`);
    }

    const candidate = offer.recruitment_candidates;

    // Approval route: L1 HR/Admin → L2 Hiring Manager → L3 CEO (final).
    // The hiring manager comes from the candidate's job; if none is set the
    // chain falls back to HR/Admin → CEO. The CEO's DB role is `ceo` (only
    // normalized to admin at runtime), so it stays distinct from an HR Admin.
    // The final approver sees every earlier approver's remark plus the
    // interviewers' verdicts (attached to the offer in getOffers()).
    const ACTIVE = ['Active', 'OnLeave', 'Remote'] as const;
    const hrAdmin = await this.prisma.employee.findFirst({
      where: { userRole: 'admin', status: { in: [...ACTIVE] } },
    });
    if (!hrAdmin) {
      throw new BadRequestException('No HR/Admin approver available.');
    }
    const hiringManagerId = candidate?.job?.hiring_manager_id || null;
    const hiringManager = hiringManagerId
      ? await this.prisma.employee.findFirst({
          where: { id: hiringManagerId, status: { in: [...ACTIVE] } },
        })
      : null;
    const ceo = await this.prisma.employee.findFirst({
      where: { userRole: 'ceo', status: { in: [...ACTIVE] } },
    });

    // Ordered, de-duplicated chain — one person never approves twice even if
    // they hold two roles (e.g. an HR Admin who is also the hiring manager).
    const chain: string[] = [];
    for (const approver of [hrAdmin, hiringManager, ceo]) {
      if (approver && !chain.includes(approver.id)) chain.push(approver.id);
    }

    const updated = await this.prisma.$transaction(async (tx: any) => {
      await tx.recruitment_offer_approvals.deleteMany({ where: { offer_id: offerId } });
      for (let i = 0; i < chain.length; i++) {
        await tx.recruitment_offer_approvals.create({
          data: {
            id: crypto.randomUUID(),
            offer_id: offerId,
            sequence: i + 1,
            approver_id: chain[i],
            status: 'Pending',
            // The submitter's note seeds only the first (L1) step; each later
            // approver records their own remark when they act.
            note: i === 0 ? body.note || null : null,
          },
        });
      }
      return tx.recruitment_offers.update({
        where: { id: offerId },
        data: { status: 'PendingApproval', updated_at: new Date() },
        include: {
          recruitment_offer_approvals: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
          document_templates: true,
        },
      });
    });

    // Notify the first approver in the chain that it is their turn.
    this.notify
      .notifyUser({
        userId: chain[0],
        title: 'Offer approval requested',
        message: `Offer for ${candidate.name} is awaiting your L1 approval.`,
        type: 'recruitment',
        linkUrl: '/recruitment',
      })
      .catch(() => undefined);
    return updated;
  }

  async offerApprovalAction(offerId: string, body: Record<string, any>, actorId: string) {
    const offer = await this.prisma.recruitment_offers.findUnique({
      where: { id: offerId },
      include: {
        recruitment_offer_approvals: { orderBy: { sequence: 'asc' } },
        recruitment_candidates: true,
      },
    });
    if (!offer) throw new NotFoundException('Offer not found.');
    if (offer.status !== 'PendingApproval') {
      throw new BadRequestException('Offer is not pending approval.');
    }

    const action = String(body.action);
    // The named approver acts on their own step; a delegate holding the CEO's
    // recruitment-approval permission can act on a step assigned to that CEO.
    const delegatorIds = await this.permissions.getActiveDelegatorIds(actorId, 'ONBOARDING_APPROVAL');
    const ownedSteps = offer.recruitment_offer_approvals.filter(
      (a: any) => a.approver_id === actorId || delegatorIds.includes(a.approver_id),
    );
    if (ownedSteps.length === 0) throw new ForbiddenException('You are not an approver for this offer.');
    // The actor may own several steps (e.g. their own already-approved L1 plus a
    // pending L2 delegated from the CEO) — act on the still-pending one.
    const myStep = ownedSteps.find((a: any) => a.status === 'Pending') ?? ownedSteps[0];
    if (myStep.status !== 'Pending') {
      throw new BadRequestException('You have already acted on this approval.');
    }

    // Strict chain order (HR → Hiring Manager → CEO): a step is actionable only
    // once every earlier-sequence step has been approved. Prevents a later
    // approver (e.g. the CEO) acting before the ones below them.
    const earlierPending = offer.recruitment_offer_approvals.filter(
      (a: any) => a.sequence < myStep.sequence && a.status !== 'Approved',
    );
    if (action === 'APPROVE' && earlierPending.length > 0) {
      throw new BadRequestException('An earlier approver must act before you can approve.');
    }

    if (action === 'APPROVE') {
      const updated = await this.prisma.$transaction(async (tx: any) => {
        await tx.recruitment_offer_approvals.update({
          where: { id: myStep.id },
          data: { status: 'Approved', note: body.comment || null, acted_at: new Date() },
        });
        const steps = await tx.recruitment_offer_approvals.findMany({
          where: { offer_id: offerId },
        });
        const allApproved = steps.every((s: any) => s.status === 'Approved');
        return tx.recruitment_offers.update({
          where: { id: offerId },
          data: { status: allApproved ? 'Approved' : offer.status, updated_at: new Date() },
          include: {
            recruitment_offer_approvals: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
            document_templates: true,
          },
        });
      });
      // When an earlier level approves but the offer is not yet fully approved,
      // notify the next approver in the chain (e.g. the CEO for L2 authorization).
      if (updated.status === 'PendingApproval') {
        const nextPending = (updated.recruitment_offer_approvals || [])
          .filter((s: any) => s.status === 'Pending')
          .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))[0];
        if (nextPending) {
          this.notify
            .notifyUser({
              userId: nextPending.approver_id,
              title: 'Offer approval requested',
              message: `Offer for ${offer.recruitment_candidates.name} is awaiting your L${nextPending.sequence} approval.`,
              type: 'recruitment',
              linkUrl: '/recruitment',
            })
            .catch(() => undefined);
        }
      }
      return updated;
    }

    if (action === 'REJECT' || action === 'REQUEST_CHANGES') {
      const status = action === 'REJECT' ? 'Rejected' : 'Cancelled';
      const updated = await this.prisma.$transaction(async (tx: any) => {
        await tx.recruitment_offer_approvals.update({
          where: { id: myStep.id },
          data: { status, note: body.comment || null, acted_at: new Date() },
        });
        return tx.recruitment_offers.update({
          where: { id: offerId },
          data: { status: 'Draft', updated_at: new Date() },
          include: {
            recruitment_offer_approvals: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
            document_templates: true,
          },
        });
      });
      return updated;
    }

    throw new BadRequestException(`Unknown approval action "${action}".`);
  }

  /* ============================================================
     OFFER DOCUMENTS
     ============================================================ */

  private async resolveTemplate(documentType: string, templateId?: string) {
    if (templateId) {
      const dbTemplate = await this.prisma.documentTemplate.findUnique({ where: { id: templateId } });
      if (dbTemplate && dbTemplate.isActive) {
        return { id: dbTemplate.id, name: dbTemplate.name, type: dbTemplate.type as string, content: dbTemplate.content, source: 'db' as const };
      }
      const builtin = BUILTIN_TEMPLATES.find((t) => t.id === templateId);
      if (builtin) return { ...builtin, source: 'builtin' as const };
      throw new NotFoundException('Template not found.');
    }
    const dbTemplate = await this.prisma.documentTemplate.findFirst({
      where: { type: documentType as any, isActive: true },
      orderBy: { version: 'desc' },
    });
    if (dbTemplate) {
      return { id: dbTemplate.id, name: dbTemplate.name, type: dbTemplate.type as string, content: dbTemplate.content, source: 'db' as const };
    }
    const builtin = BUILTIN_TEMPLATES.find((t) => t.type === documentType);
    if (builtin) return { ...builtin, source: 'builtin' as const };
    throw new BadRequestException(`No template available for document type "${documentType}".`);
  }

  async listOfferDocuments(offerId: string) {
    const offer = await this.prisma.recruitment_offers.findUnique({
      where: { id: offerId },
      include: { recruitment_candidates: { include: { job: true } } },
    });
    if (!offer) throw new NotFoundException('Offer not found.');

    const dbTemplates = await this.prisma.documentTemplate.findMany({
      where: { isActive: true, type: { in: ['Offer_Letter', 'Appointment_Letter', 'NDA'] as any } },
      orderBy: { version: 'desc' },
    });
    const templates = [
      ...dbTemplates.map((t) => ({ id: t.id, name: t.name, type: t.type as string, source: 'db' })),
      ...BUILTIN_TEMPLATES.map((t) => ({ id: t.id, name: t.name, type: t.type, source: 'builtin' })),
    ];

    const snapshot = this.parseSnapshot(offer);
    const documents = Array.isArray(snapshot.documents) ? snapshot.documents : [];
    return { templates, documents };
  }

  private async renderOfferDocument(offer: any, candidate: any, job: any, documentType: string, templateId?: string) {
    const template = await this.resolveTemplate(documentType, templateId);
    const snapshot = this.parseSnapshot(offer);
    const comp: OfferCompensation =
      snapshot.compensation ||
      calculateOfferCompensation(Number(offer.offered_ctc) || 0, 0, 0, offer.currency);

    const tableRows = compensationTableRows(comp);
    const tableHtml = `<table>${tableRows.map((r) => `<tr><td>${r}</td></tr>`).join('')}</table>`;

    const variables = {
      'candidate.fullName': candidate.name,
      'candidate.email': candidate.email,
      'offer.offeredTitle': offer.offered_title,
      'offer.proposedJoinDate': offer.proposed_join_date
        ? new Date(offer.proposed_join_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'To be confirmed',
      'offer.expiresAt': offer.expires_at
        ? new Date(offer.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '30 days from issuance',
      'offer.offeredCtc': formatIndianCurrency(Number(offer.offered_ctc) || 0, offer.currency),
      'job.title': job?.title || '',
      'job.department': job?.department || '',
      'job.location': job?.location || '',
      'compensation.tableHtml': tableHtml,
    };

    const html = renderTemplate(template.content, variables);
    const documentTitle =
      template.name ||
      (documentType === 'Offer_Letter' ? 'Offer Letter' : documentType === 'Appointment_Letter' ? 'Appointment Letter' : 'Non-Disclosure Agreement');
    return { template, html, documentTitle, comp };
  }

  async previewOfferDocument(offerId: string, body: Record<string, any>) {
    const offer = await this.prisma.recruitment_offers.findUnique({
      where: { id: offerId },
      include: { recruitment_candidates: { include: { job: true } } },
    });
    if (!offer) throw new NotFoundException('Offer not found.');
    const documentType = String(body.documentType || '');
    if (!DOC_TYPES.includes(documentType as DocType)) {
      throw new BadRequestException(`documentType must be one of ${DOC_TYPES.join(', ')}.`);
    }
    const { html, documentTitle } = await this.renderOfferDocument(
      offer,
      offer.recruitment_candidates,
      offer.recruitment_candidates.job,
      documentType,
      body.templateId,
    );
    return { preview: { html, documentTitle } };
  }

  async generateOfferDocument(offerId: string, body: Record<string, any>, generatedBy: any) {
    const offer = await this.prisma.recruitment_offers.findUnique({
      where: { id: offerId },
      include: { recruitment_candidates: { include: { job: true } } },
    });
    if (!offer) throw new NotFoundException('Offer not found.');
    if (!['Approved', 'Sent'].includes(offer.status)) {
      throw new BadRequestException(
        `Documents can only be generated for Approved or Sent offers (current: "${offer.status}").`,
      );
    }

    const documentType = String(body.documentType || '');
    if (!DOC_TYPES.includes(documentType as DocType)) {
      throw new BadRequestException(`documentType must be one of ${DOC_TYPES.join(', ')}.`);
    }

    const snapshot = this.parseSnapshot(offer);
    const documents: any[] = Array.isArray(snapshot.documents) ? snapshot.documents : [];
    const existing = documents.find((d) => d.documentType === documentType);
    if (existing) {
      // Immutable: return the already-generated document.
      return {
        document: existing,
        autoSentToCandidate: false,
        portalUrl: null,
        portalUrlExpiresAt: null,
      };
    }

    const { template, html, documentTitle, comp } = await this.renderOfferDocument(
      offer,
      offer.recruitment_candidates,
      offer.recruitment_candidates.job,
      documentType,
      body.templateId,
    );

    const pdf = buildOfferLetterPdf(documentTitle, html, comp);
    const storageKey = `offer-${offer.id}-${documentType.toLowerCase()}-v${offer.version}-${Date.now().toString(36)}.pdf`;
    await this.prisma.documentBlob.create({
      data: {
        id: storageKey,
        category: 'offers',
        mime_type: 'application/pdf',
        size_bytes: pdf.length,
        data: pdf as unknown as Uint8Array<ArrayBuffer>,
      },
    });

    const docMeta = {
      id: storageKey,
      templateId: template.id,
      templateName: template.name,
      documentType,
      offerVersion: offer.version,
      generatedAt: new Date().toISOString(),
      generatedByName: generatedBy?.name || 'System',
      generatedById: generatedBy?.id || null,
      fileName: `${documentTitle.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${offer.id.slice(0, 8)}.pdf`,
      fileSize: pdf.length,
      fileSizeBytes: pdf.length,
      mimeType: 'application/pdf',
    };
    snapshot.documents = [...documents, docMeta];
    await this.prisma.recruitment_offers.update({
      where: { id: offerId },
      data: { content_snapshot: JSON.stringify(snapshot), updated_at: new Date() },
    });

    return {
      document: docMeta,
      autoSentToCandidate: false,
      portalUrl: null,
      portalUrlExpiresAt: null,
    };
  }

  async downloadOfferDocument(offerId: string, documentId: string) {
    const offer = await this.prisma.recruitment_offers.findUnique({ where: { id: offerId } });
    if (!offer) throw new NotFoundException('Offer not found.');
    const snapshot = this.parseSnapshot(offer);
    const documents: any[] = Array.isArray(snapshot.documents) ? snapshot.documents : [];
    const meta = documents.find((d) => d.id === documentId);
    if (!meta) throw new NotFoundException('Document not found for this offer.');

    const blob = await this.prisma.documentBlob.findUnique({ where: { id: documentId } });
    if (!blob) throw new NotFoundException('Document file not found.');

    return {
      buffer: Buffer.from(blob.data as unknown as ArrayBuffer),
      fileName: meta.fileName || `${documentId}.pdf`,
      mimeType: blob.mime_type || 'application/pdf',
    };
  }

  async sendOffer(offerId: string, candidatePortalUrl: (candidateId: string) => { url: string; expiresAt: Date }) {
    const offer = await this.prisma.recruitment_offers.findUnique({
      where: { id: offerId },
      include: { recruitment_candidates: true },
    });
    if (!offer) throw new NotFoundException('Offer not found.');
    if (!['Approved', 'Sent'].includes(offer.status)) {
      throw new BadRequestException(`Offer must be Approved before sending (current: "${offer.status}").`);
    }

    const { url, expiresAt } = candidatePortalUrl(offer.candidate_id);
    const updated = await this.prisma.recruitment_offers.update({
      where: { id: offerId },
      data: { status: 'Sent', sent_at: new Date(), updated_at: new Date() },
      include: {
        recruitment_offer_approvals: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
        document_templates: true,
      },
    });
    return {
      offer: updated,
      message: 'Offer sent to candidate portal.',
      portalUrl: url,
      portalUrlExpiresAt: expiresAt.toISOString(),
    };
  }

  /* ============================================================
     CEO ONBOARDING APPROVAL (paid positions only)
     ============================================================ */

  /** Paid = latest offer carries a positive CTC. Unpaid roles skip CEO approval. */
  private isPaidOffer(offer: { offered_ctc: unknown } | null | undefined): boolean {
    return Number(offer?.offered_ctc ?? 0) > 0;
  }

  /**
   * Aggregate interviewer feedback + HR recommendation for a candidate, so the
   * CEO can review the full picture before approving a paid onboarding.
   */
  private async buildCandidateReviewPacket(candidateId: string) {
    const [interviews, notes] = await Promise.all([
      this.prisma.recruitment_interviews.findMany({
        where: { candidate_id: candidateId },
        include: {
          interview_feedback: {
            include: { employees: { select: { id: true, name: true, roleTitle: true } } },
          },
        },
        orderBy: { starts_at: 'asc' },
      }),
      this.prisma.candidate_notes.findMany({
        where: { candidate_id: candidateId },
        include: { employees: { select: { id: true, name: true, roleTitle: true } } },
        orderBy: { created_at: 'desc' },
        take: 10,
      }),
    ]);

    const feedback = interviews.flatMap((iv: any) =>
      (iv.interview_feedback ?? []).map((f: any) => ({
        interviewId: iv.id,
        round: iv.round ?? null,
        interviewTitle: iv.title ?? null,
        reviewer: f.employees?.name ?? 'Interviewer',
        reviewerRole: f.employees?.roleTitle ?? null,
        overallScore: f.overall_score,
        recommendation: f.recommendation,
        comments: f.comments,
        submittedAt: f.submitted_at,
      })),
    );

    return {
      interviewFeedback: feedback,
      hrNotes: notes.map((n: any) => ({
        author: n.employees?.name ?? 'HR',
        note: n.note,
        createdAt: n.created_at,
      })),
    };
  }

  /**
   * The "Pending CEO Approval" queue: candidates with a paid, onboarding-eligible
   * offer that hasn't been CEO-approved yet, each with interviewer feedback and
   * the HR recommendation attached for review.
   */
  async getCeoApprovalQueue() {
    const candidates = await this.prisma.recruitmentCandidate.findMany({
      where: {
        onboarding: null,
        stage: { in: ['Shortlisted', 'Selected', 'Offer'] },
      },
      include: {
        job: { select: { id: true, title: true, department: true } },
        recruitment_offers: { orderBy: { version: 'desc' }, take: 1 },
        onboardingApproval: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const queue: any[] = [];
    for (const c of candidates) {
      const offer = c.recruitment_offers[0];
      if (!this.isPaidOffer(offer)) continue; // unpaid → no CEO gate
      if (c.onboardingApproval && c.onboardingApproval.status !== 'Pending') continue; // already decided
      const packet = await this.buildCandidateReviewPacket(c.id);
      queue.push({
        candidateId: c.id,
        name: c.name,
        currentRole: c.currentRole,
        jobTitle: offer?.offered_title || c.job?.title,
        department: c.job?.department,
        offeredCtc: offer ? Number(offer.offered_ctc) : null,
        currency: offer?.currency ?? 'INR',
        systemRecommendation: c.recommendation,
        approvalStatus: c.onboardingApproval?.status ?? 'Pending',
        ...packet,
      });
    }
    return queue;
  }

  /**
   * CEO (or a delegated admin) approves/rejects a paid candidate's onboarding.
   * Upserts the OnboardingApproval row and records who acted (and on whose
   * behalf, when via delegation) in the audit trail.
   */
  async decideCeoApproval(actorId: string, candidateId: string, body: { decision: 'Approved' | 'Rejected'; note?: string }) {
    const check = await this.permissions.assertCeoPermission(actorId, 'ONBOARDING_APPROVAL');

    const decision = body?.decision;
    if (decision !== 'Approved' && decision !== 'Rejected') {
      throw new BadRequestException('decision must be Approved or Rejected.');
    }

    const candidate = await this.prisma.recruitmentCandidate.findUnique({
      where: { id: candidateId },
      include: { recruitment_offers: { orderBy: { version: 'desc' }, take: 1 } },
    });
    if (!candidate) throw new NotFoundException('Candidate not found.');

    const offer = candidate.recruitment_offers[0];
    if (!this.isPaidOffer(offer)) {
      throw new BadRequestException('This is an unpaid position — no CEO approval is required.');
    }

    const onBehalfOfId = check.viaDelegation ? check.delegatorId ?? null : null;
    const approval = await this.prisma.onboardingApproval.upsert({
      where: { candidateId },
      create: {
        candidateId,
        offerId: offer?.id ?? null,
        status: decision,
        decidedById: actorId,
        onBehalfOfId,
        note: body?.note ?? null,
        decidedAt: new Date(),
      },
      update: {
        status: decision,
        decidedById: actorId,
        onBehalfOfId,
        note: body?.note ?? null,
        decidedAt: new Date(),
      },
    });

    await this.audit.record({
      action: decision === 'Approved' ? 'CEO_ONBOARDING_APPROVED' : 'CEO_ONBOARDING_REJECTED',
      module: 'Recruitment',
      employeeId: candidateId,
      actorId,
      onBehalfOfId,
      severity: 'info',
      details: {
        candidateName: candidate.name,
        offeredCtc: offer ? Number(offer.offered_ctc) : null,
        viaDelegation: check.viaDelegation,
        note: body?.note ?? null,
      },
    });

    // Notify HR admins so they can proceed (or not) with onboarding.
    await this.notify.notifyAdmins({
      title: `Onboarding ${decision.toLowerCase()} for ${candidate.name}`,
      message:
        decision === 'Approved'
          ? `CEO approval granted — ${candidate.name} can now be onboarded.`
          : `CEO rejected onboarding for ${candidate.name}.`,
      type: 'Recruitment',
      linkUrl: '/employee-lifecycle',
    });

    return approval;
  }
}
