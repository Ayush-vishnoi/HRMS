import { db } from '@/lib/db';
import { canUserAccessJob, type RecruitmentUser } from './rbac-service';
import { Prisma, type JobEmploymentType, type JobStatus } from '@prisma/client';

export type CreateJobInput = {
  id?: string;
  title: string;
  department: string;
  location: string;
  employmentType?: 'FullTime' | 'Contract' | 'Full-time';
  openings?: number;
  description?: string;
  requirements?: string[] | string;
  responsibilities?: string[] | string;
  experienceMin?: number;
  experienceMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  hiringManagerId?: string;
  recruiterId?: string;
  priority?: string;
  targetCloseDate?: string | Date;
  status?: JobStatus;
};

export function validateJobPayload(input: CreateJobInput) {
  if (!input.title || input.title.trim().length === 0) {
    throw new Error('Job title is required.');
  }
  if (!input.department || input.department.trim().length === 0) {
    throw new Error('Department is required.');
  }
  if (!input.location || input.location.trim().length === 0) {
    throw new Error('Location is required.');
  }
  if (input.openings !== undefined && Number(input.openings) < 1) {
    throw new Error('Number of openings must be at least 1.');
  }
  if (
    input.experienceMin !== undefined &&
    input.experienceMax !== undefined &&
    Number(input.experienceMin) > Number(input.experienceMax)
  ) {
    throw new Error('Minimum experience cannot exceed maximum experience.');
  }
  if (
    input.salaryMin !== undefined &&
    input.salaryMax !== undefined &&
    Number(input.salaryMin) > Number(input.salaryMax)
  ) {
    throw new Error('Minimum salary cannot exceed maximum salary.');
  }
}

const mapEmploymentType = (type?: string): JobEmploymentType => {
  if (!type) return 'FullTime';
  const clean = type.toLowerCase().replace(/[^a-z]/g, '');
  if (clean.includes('contract')) return 'Contract';
  return 'FullTime';
};

/**
 * Creates a new job requisition with full enterprise ATS attributes
 */
export async function createJob(input: CreateJobInput, user: RecruitmentUser) {
  validateJobPayload(input);

  const count = await db.recruitmentJob.count();
  const newId = input.id || `JOB-${String(count + 1).padStart(3, '0')}`;

  const reqArray = Array.isArray(input.requirements)
    ? input.requirements
    : (input.requirements || '').split(',').map((s) => s.trim()).filter(Boolean);

  const respArray = Array.isArray(input.responsibilities)
    ? input.responsibilities
    : (input.responsibilities || '').split('\n').map((s) => s.trim()).filter(Boolean);

  const initialStatus: JobStatus = input.status || (user.userRole === 'admin' ? 'Open' : 'Draft');

  const newJob = await db.$transaction(async (tx) => {
    const job = await tx.recruitmentJob.create({
      data: {
        id: newId,
        title: input.title.trim(),
        department: input.department.trim(),
        location: input.location.trim(),
        employmentType: mapEmploymentType(input.employmentType),
        openings: Number(input.openings) || 1,
        status: initialStatus,
        postedOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        description: input.description?.trim() || '',
        requirements: reqArray,
        responsibilities: respArray,
        experience_min: input.experienceMin !== undefined && input.experienceMin !== null ? Number(input.experienceMin) : 0,
        experience_max: input.experienceMax !== undefined && input.experienceMax !== null ? Number(input.experienceMax) : null,
        salary_min: input.salaryMin !== undefined && input.salaryMin !== null ? new Prisma.Decimal(input.salaryMin) : null,
        salary_max: input.salaryMax !== undefined && input.salaryMax !== null ? new Prisma.Decimal(input.salaryMax) : null,
        currency: input.currency || 'INR',
        hiring_manager_id: input.hiringManagerId || null,
        recruiter_id: input.recruiterId || user.id,
        priority: input.priority || 'Medium',
        target_close_date: input.targetCloseDate ? new Date(input.targetCloseDate) : null,
      },
      include: {
        hiringManager: { select: { id: true, name: true, email: true, employeeCode: true } },
        recruiter: { select: { id: true, name: true, email: true, employeeCode: true } },
      },
    });

    await tx.auditLog.create({
      data: {
        id: `audit-job-${Date.now()}`,
        action: 'JOB_CREATED',
        module: 'Recruitment',
        employeeId: user.id,
        details: JSON.stringify({
          jobId: job.id,
          title: job.title,
          department: job.department,
          status: job.status,
          openings: job.openings,
        }),
      },
    });

    return job;
  });

  return newJob;
}

/**
 * Submit job for approval
 */
export async function submitJobForApproval(
  jobId: string,
  user: RecruitmentUser,
  options?: { approverId?: string; note?: string }
) {
  const job = await db.recruitmentJob.findUnique({
    where: { id: jobId },
    include: { hiringManager: true, recruiter: true },
  });

  if (!job) throw new Error('Job not found.');
  if (!canUserAccessJob(user, job)) throw new Error('Not authorized to submit this job for approval.');

  const approverId = options?.approverId || job.hiring_manager_id || 'EMP-006';

  const updated = await db.$transaction(async (tx) => {
    const updatedJob = await tx.recruitmentJob.update({
      where: { id: jobId },
      data: { status: 'PendingApproval', updatedAt: new Date() },
    });

    const approval = await tx.recruitment_job_approvals.upsert({
      where: { job_id_sequence: { job_id: jobId, sequence: 1 } },
      update: {
        approver_id: approverId,
        status: 'Pending',
        note: options?.note || 'Submitted for leadership review.',
        acted_at: null,
      },
      create: {
        id: `APP-JOB-${Date.now()}`,
        job_id: jobId,
        sequence: 1,
        approver_id: approverId,
        status: 'Pending',
        note: options?.note || 'Submitted for leadership review.',
      },
    });

    await tx.auditLog.create({
      data: {
        id: `audit-app-${Date.now()}`,
        action: 'JOB_SUBMITTED_FOR_APPROVAL',
        module: 'Recruitment',
        employeeId: user.id,
        details: JSON.stringify({ jobId, approverId, note: options?.note }),
      },
    });

    await tx.userNotification.create({
      data: {
        id: `notif-app-${Date.now()}`,
        userId: approverId,
        title: 'Job Requisition Pending Approval',
        message: `Requisition "${job.title}" in ${job.department} requires your review.`,
        type: 'TaskAssignment',
        linkUrl: '/recruitment',
      },
    });

    return { job: updatedJob, approval };
  });

  return updated;
}

/**
 * Process job approval (Approve / Reject / Request Changes)
 */
export async function processJobApproval(
  jobId: string,
  user: RecruitmentUser,
  options: { action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES'; note?: string }
) {
  const job = await db.recruitmentJob.findUnique({
    where: { id: jobId },
    include: { recruitment_job_approvals: true },
  });

  if (!job) throw new Error('Job not found.');
  if (user.userRole !== 'admin' && job.hiring_manager_id !== user.id) {
    throw new Error('Only the designated approver or an HR Admin can act on this approval.');
  }

  const result = await db.$transaction(async (tx) => {
    let nextJobStatus: JobStatus;
    let approvalStatus: 'Approved' | 'Rejected' | 'Pending';

    if (options.action === 'APPROVE') {
      nextJobStatus = 'Approved';
      approvalStatus = 'Approved';
    } else {
      nextJobStatus = 'Draft';
      approvalStatus = 'Rejected';
    }

    const updatedJob = await tx.recruitmentJob.update({
      where: { id: jobId },
      data: { status: nextJobStatus, updatedAt: new Date() },
    });

    await tx.recruitment_job_approvals.updateMany({
      where: { job_id: jobId, sequence: 1 },
      data: {
        status: approvalStatus,
        note: options.note || (options.action === 'APPROVE' ? 'Approved by reviewer.' : 'Revisions requested.'),
        acted_at: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        id: `audit-app-${Date.now()}`,
        action: options.action === 'APPROVE' ? 'JOB_APPROVED' : 'JOB_REJECTED',
        module: 'Recruitment',
        employeeId: user.id,
        details: JSON.stringify({ jobId, action: options.action, note: options.note }),
      },
    });

    if (job.recruiter_id) {
      await tx.userNotification.create({
        data: {
          id: `notif-app-res-${Date.now()}`,
          userId: job.recruiter_id,
          title: options.action === 'APPROVE' ? 'Job Requisition Approved' : 'Job Requisition Revisions Requested',
          message: `Requisition "${job.title}" was ${options.action.toLowerCase()}d.`,
          type: options.action === 'APPROVE' ? 'Celebration' : 'Announcement',
          linkUrl: '/recruitment',
        },
      });
    }

    return updatedJob;
  });

  return result;
}

/**
 * Publish approved job
 */
export async function publishJob(jobId: string, user: RecruitmentUser) {
  const job = await db.recruitmentJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error('Job not found.');
  if (user.userRole !== 'admin' && job.recruiter_id !== user.id) {
    throw new Error('Not authorized to publish this requisition.');
  }

  const updated = await db.$transaction(async (tx) => {
    const published = await tx.recruitmentJob.update({
      where: { id: jobId },
      data: { status: 'Published', postedOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), updatedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        id: `audit-pub-${Date.now()}`,
        action: 'JOB_PUBLISHED',
        module: 'Recruitment',
        employeeId: user.id,
        details: JSON.stringify({ jobId, title: published.title }),
      },
    });

    return published;
  });

  return updated;
}

/**
 * Put job on hold or close job
 */
export async function updateJobLifecycleStatus(jobId: string, status: 'OnHold' | 'Closed', user: RecruitmentUser) {
  const job = await db.recruitmentJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error('Job not found.');
  if (!canUserAccessJob(user, job)) {
    throw new Error('Not authorized to update this job status.');
  }

  const updated = await db.$transaction(async (tx) => {
    const result = await tx.recruitmentJob.update({
      where: { id: jobId },
      data: { status, updatedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        id: `audit-st-${Date.now()}`,
        action: status === 'OnHold' ? 'JOB_ON_HOLD' : 'JOB_CLOSED',
        module: 'Recruitment',
        employeeId: user.id,
        details: JSON.stringify({ jobId, status }),
      },
    });

    return result;
  });

  return updated;
}
