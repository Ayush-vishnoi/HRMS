import { db } from '@/lib/db';
import { canUserAccessJob, type RecruitmentUser } from './rbac-service';
import type { CandidateRecommendation, CandidateSource, CandidateStage } from '@prisma/client';

export const VALID_STAGE_TRANSITIONS: Record<CandidateStage, CandidateStage[]> = {
  New: ['Applied', 'Screening', 'Rejected', 'Withdrawn'],
  Applied: ['Screening', 'Rejected', 'Withdrawn'],
  Screening: ['Shortlisted', 'Interview', 'Rejected', 'Withdrawn'],
  Shortlisted: ['Interview', 'Selected', 'Rejected', 'Withdrawn'],
  Interview: ['Selected', 'Shortlisted', 'Rejected', 'Withdrawn'],
  Selected: ['Offer', 'Shortlisted', 'Rejected', 'Withdrawn'],
  Offer: ['Joined', 'Rejected', 'Withdrawn'],
  Joined: ['Archived'],
  Rejected: ['Screening', 'Archived'],
  Withdrawn: ['Archived'],
  Archived: [],
};

export function validateStageTransition(fromStage: CandidateStage, toStage: CandidateStage) {
  if (fromStage === toStage) return true;
  const allowed = VALID_STAGE_TRANSITIONS[fromStage] || [];
  if (!allowed.includes(toStage)) {
    throw new Error(
      `Invalid stage transition from "${fromStage}" to "${toStage}". Valid target stages are: ${allowed.join(', ') || 'None (terminal state)'}.`
    );
  }
  return true;
}

export type CreateCandidateInput = {
  id?: string;
  jobId: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  experience?: string;
  currentRole?: string;
  location?: string;
  summary?: string;
  source?: CandidateSource;
  tags?: string[];
  matchedSkills?: string[];
  missingSkills?: string[];
  recommendation?: CandidateRecommendation;
  score?: number;
  assignedRecruiterId?: string;
};

/**
 * Creates a new candidate application
 */
export async function createCandidate(input: CreateCandidateInput, user: RecruitmentUser) {
  if (!input.name || input.name.trim().length === 0) {
    throw new Error('Candidate name is required.');
  }
  if (!input.email || input.email.trim().length === 0) {
    throw new Error('Candidate email is required.');
  }
  if (!input.jobId) {
    throw new Error('Job ID is required for candidate application.');
  }

  const job = await db.recruitmentJob.findUnique({ where: { id: input.jobId } });
  if (!job) throw new Error('Job requisition not found.');

  const count = await db.recruitmentCandidate.count();
  const newId = input.id || `CAN-${String(count + 1).padStart(3, '0')}`;

  const result = await db.$transaction(
    async (tx) => {
      const candidate = await tx.recruitmentCandidate.create({
        data: {
          id: newId,
          jobId: input.jobId,
          name: input.name.trim(),
          email: input.email.toLowerCase().trim(),
          phone: input.phone || '+91 90000 00000',
          avatarUrl: input.avatarUrl || null,
          appliedOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          stage: 'Applied',
          score: input.score !== undefined ? Math.min(100, Math.max(0, input.score)) : 75,
          experience: input.experience || '3 years',
          currentRole: input.currentRole || 'Software Professional',
          location: input.location || 'Bengaluru, India',
          matchedSkills: input.matchedSkills || [],
          missingSkills: input.missingSkills || [],
          summary: input.summary || 'Candidate application submitted for review.',
          recommendation: input.recommendation || 'Review',
          source: input.source || 'Manual',
          tags: input.tags || ['New Applicant'],
          assigned_recruiter_id: input.assignedRecruiterId || job.recruiter_id || user.id,
        },
      });

      await tx.recruitmentJob.update({
        where: { id: input.jobId },
        data: { applicants: { increment: 1 } },
      });

      await tx.candidate_stage_history.create({
        data: {
          candidate_id: candidate.id,
          from_stage: null,
          to_stage: 'Applied',
          changed_by_id: user.id,
          note: 'Candidate profile initialized via application ingestion.',
        },
      });

      await tx.auditLog.create({
        data: {
          id: `audit-can-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          action: 'CANDIDATE_CREATED',
          module: 'Recruitment',
          employeeId: user.id,
          details: JSON.stringify({
            candidateId: candidate.id,
            name: candidate.name,
            jobId: candidate.jobId,
            source: candidate.source,
          }),
        },
      });

      if (job.hiring_manager_id) {
        await tx.userNotification.create({
          data: {
            id: `notif-can-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            userId: job.hiring_manager_id,
            title: 'New Candidate Application',
            message: `${candidate.name} applied for "${job.title}".`,
            type: 'Announcement',
            linkUrl: '/recruitment',
          },
        });
      }

      return candidate;
    },
    { timeout: 25000, maxWait: 15000 }
  );

  return result;
}

/**
 * Validated, transactional candidate stage transition with immutable stage history and audit logging
 */
export async function transitionCandidateStage(
  candidateId: string,
  newStage: CandidateStage,
  user: RecruitmentUser,
  note?: string
) {
  const candidate = await db.recruitmentCandidate.findUnique({
    where: { id: candidateId },
    include: { job: true },
  });

  if (!candidate) throw new Error('Candidate not found.');
  if (!canUserAccessJob(user, candidate.job)) {
    throw new Error('Not authorized to manage this candidate.');
  }

  // Validate state machine rule
  validateStageTransition(candidate.stage, newStage);

  const result = await db.$transaction(
    async (tx) => {
      const updated = await tx.recruitmentCandidate.update({
        where: { id: candidateId },
        data: { stage: newStage, updatedAt: new Date() },
      });

      await tx.candidate_stage_history.create({
        data: {
          candidate_id: candidateId,
          from_stage: candidate.stage,
          to_stage: newStage,
          changed_by_id: user.id,
          note: note || `Moved from ${candidate.stage} to ${newStage}`,
        },
      });

      let auditAction = 'CANDIDATE_STAGE_CHANGED';
      if (newStage === 'Shortlisted') auditAction = 'CANDIDATE_SHORTLISTED';
      else if (newStage === 'Selected') auditAction = 'CANDIDATE_SELECTED';
      else if (newStage === 'Rejected') auditAction = 'CANDIDATE_REJECTED';

      await tx.auditLog.create({
        data: {
          id: `audit-can-stg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          action: auditAction,
          module: 'Recruitment',
          employeeId: user.id,
          details: JSON.stringify({
            candidateId,
            candidateName: candidate.name,
            fromStage: candidate.stage,
            toStage: newStage,
            note,
          }),
        },
      });

      if (newStage === 'Shortlisted' || newStage === 'Selected') {
        if (candidate.job.hiring_manager_id) {
          await tx.userNotification.create({
            data: {
              id: `notif-stg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              userId: candidate.job.hiring_manager_id,
              title: `Candidate ${newStage}`,
              message: `${candidate.name} is now marked ${newStage} for "${candidate.job.title}".`,
              type: 'Celebration',
              linkUrl: '/recruitment',
            },
          });
        }
      }

      return updated;
    },
    { timeout: 25000, maxWait: 15000 }
  );

  return result;
}

/**
 * Updates candidate tags
 */
export async function updateCandidateTags(candidateId: string, tags: string[], user: RecruitmentUser) {
  const candidate = await db.recruitmentCandidate.findUnique({
    where: { id: candidateId },
    include: { job: true },
  });

  if (!candidate) throw new Error('Candidate not found.');
  if (!canUserAccessJob(user, candidate.job)) {
    throw new Error('Not authorized to update candidate tags.');
  }

  const updated = await db.recruitmentCandidate.update({
    where: { id: candidateId },
    data: { tags, updatedAt: new Date() },
  });

  return updated;
}
