import { db } from '@/lib/db';
import { computeMatchScore, MatchResult } from './match-engine';
import { RecruitmentUser } from '../rbac-service';

export interface RediscoveredCandidate {
  candidateId: string;
  name: string;
  email: string;
  phone: string;
  currentRole: string;
  location: string;
  experience: string;
  previousJobId: string;
  previousJobTitle: string;
  previousStage: string;
  appliedOn: string;
  tags: string[];
  matchScore: number;
  matchBreakdown: MatchResult;
}

/**
 * Searches the historical candidate database for rediscovery against a target job requisition
 */
export async function rediscoverCandidatesForJob(
  targetJobId: string,
  user: RecruitmentUser,
  options?: { minScore?: number; limit?: number }
): Promise<RediscoveredCandidate[]> {
  const targetJob = await db.recruitmentJob.findUnique({
    where: { id: targetJobId },
  });
  if (!targetJob) throw new Error('Target job requisition not found.');

  // Fetch candidates from other jobs or historical applications
  const candidates = await db.recruitmentCandidate.findMany({
    where: {
      jobId: { not: targetJobId },
      // Exclude candidates who have already joined the organization
      stage: { not: 'Joined' },
    },
    include: {
      job: true,
      matches: {
        where: { jobId: targetJobId },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const rediscovered: RediscoveredCandidate[] = [];
  const minScore = options?.minScore ?? 50;

  for (const cand of candidates) {
    // Check if match is already computed or calculate fresh
    const match = computeMatchScore(cand, targetJob);

    if (match.overallScore >= minScore) {
      rediscovered.push({
        candidateId: cand.id,
        name: cand.name,
        email: cand.email,
        phone: cand.phone,
        currentRole: cand.currentRole,
        location: cand.location,
        experience: cand.experience,
        previousJobId: cand.jobId,
        previousJobTitle: cand.job.title,
        previousStage: cand.stage,
        appliedOn: cand.appliedOn,
        tags: cand.tags,
        matchScore: match.overallScore,
        matchBreakdown: match,
      });
    }
  }

  // Sort descending by match score
  rediscovered.sort((a, b) => b.matchScore - a.matchScore);

  const limit = options?.limit ?? 20;
  return rediscovered.slice(0, limit);
}

/**
 * Adds a rediscovered candidate into a new job requisition without overwriting previous history
 */
export async function addCandidateToNewJob(
  candidateId: string,
  targetJobId: string,
  user: RecruitmentUser,
  notes?: string
) {
  const sourceCandidate = await db.recruitmentCandidate.findUnique({
    where: { id: candidateId },
    include: { job: true, resumeDocument: true },
  });
  if (!sourceCandidate) throw new Error('Source candidate profile not found.');

  const targetJob = await db.recruitmentJob.findUnique({
    where: { id: targetJobId },
  });
  if (!targetJob) throw new Error('Target job requisition not found.');

  // Check if candidate already has an application for target job
  const existingApp = await db.recruitmentCandidate.findFirst({
    where: {
      email: sourceCandidate.email,
      jobId: targetJobId,
    },
  });
  if (existingApp) {
    throw new Error(`Candidate already has an active application for "${targetJob.title}".`);
  }

  const count = await db.recruitmentCandidate.count();
  const newCandidateId = `CAN-RED-${String(count + 1).padStart(3, '0')}`;

  const match = computeMatchScore(sourceCandidate, targetJob);

  const result = await db.$transaction(
    async (tx) => {
      const newCandidate = await tx.recruitmentCandidate.create({
        data: {
          id: newCandidateId,
          jobId: targetJobId,
          name: sourceCandidate.name,
          email: sourceCandidate.email,
          phone: sourceCandidate.phone,
          avatarUrl: sourceCandidate.avatarUrl,
          appliedOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          stage: 'Applied',
          score: match.overallScore,
          ai_match_score: match.overallScore,
          experience: sourceCandidate.experience,
          currentRole: sourceCandidate.currentRole,
          location: sourceCandidate.location,
          matchedSkills: match.matchedSkills,
          missingSkills: match.missingSkills,
          summary: sourceCandidate.summary,
          recommendation: match.overallScore >= 80 ? 'StrongMatch' : match.overallScore >= 60 ? 'Review' : 'LowMatch',
          source: 'Other',
          tags: Array.from(new Set([...sourceCandidate.tags, 'Rediscovered'])),
          assigned_recruiter_id: targetJob.recruiter_id || null,
          parsed_resume: sourceCandidate.parsed_resume as any,
          resumeUrl: sourceCandidate.resumeUrl,
          duplicate_key: sourceCandidate.duplicate_key,
        },
      });

      // Increment applicants count
      await tx.recruitmentJob.update({
        where: { id: targetJobId },
        data: { applicants: { increment: 1 } },
      });

      // Copy resume document reference if exists
      if (sourceCandidate.resumeDocument) {
        await tx.candidateResumeDocument.create({
          data: {
            candidateId: newCandidate.id,
            fileName: sourceCandidate.resumeDocument.fileName,
            fileType: sourceCandidate.resumeDocument.fileType,
            fileSize: sourceCandidate.resumeDocument.fileSize,
            storagePath: sourceCandidate.resumeDocument.storagePath,
            fileHash: sourceCandidate.resumeDocument.fileHash,
            uploadedById: user.id,
            parsingStatus: 'COMPLETED',
            parserVersion: sourceCandidate.resumeDocument.parserVersion,
          },
        });
      }

      // Record stage history
      await tx.candidate_stage_history.create({
        data: {
          candidate_id: newCandidate.id,
          from_stage: null,
          to_stage: 'Applied',
          changed_by_id: user.id,
          note: `Rediscovered from previous job "${sourceCandidate.job.title}". ${notes || ''}`.trim(),
        },
      });

      // Record note
      await tx.candidate_notes.create({
        data: {
          candidate_id: newCandidate.id,
          author_id: user.id,
          note: `Candidate added via Candidate Rediscovery from "${sourceCandidate.job.title}" (${sourceCandidate.stage} stage). Initial match score: ${match.overallScore}%.`,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          id: `audit-can-red-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          action: 'CANDIDATE_ADDED_FROM_REDISCOVERY',
          module: 'Recruitment',
          employeeId: user.id,
          details: JSON.stringify({
            newCandidateId: newCandidate.id,
            originalCandidateId: sourceCandidate.id,
            candidateName: newCandidate.name,
            targetJobId,
            targetJobTitle: targetJob.title,
            matchScore: match.overallScore,
          }),
        },
      });

      // User notification to hiring manager
      if (targetJob.hiring_manager_id) {
        await tx.userNotification.create({
          data: {
            id: `notif-red-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            userId: targetJob.hiring_manager_id,
            title: 'Candidate Rediscovered for Requisition',
            message: `${newCandidate.name} (${match.overallScore}% match) was added to "${targetJob.title}" from historical candidate pipeline.`,
            type: 'Announcement',
            linkUrl: '/recruitment',
          },
        });
      }

      return newCandidate;
    },
    { timeout: 25000, maxWait: 15000 }
  );

  return result;
}

/**
 * Creates or retrieves a recruitment candidate talent pool
 */
export async function createRecruitmentTalentPool(
  name: string,
  description?: string,
  tags?: string[],
  user?: RecruitmentUser
) {
  const existing = await db.recruitmentTalentPool.findUnique({
    where: { name: name.trim() },
  });
  if (existing) return existing;

  const pool = await db.recruitmentTalentPool.create({
    data: {
      name: name.trim(),
      description: description || null,
      tags: tags || [],
      createdById: user?.id || null,
    },
  });

  if (user) {
    await db.auditLog.create({
      data: {
        id: `audit-pool-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        action: 'CANDIDATE_ADDED_TO_TALENT_POOL',
        module: 'Recruitment',
        employeeId: user.id,
        details: JSON.stringify({ poolId: pool.id, poolName: pool.name }),
      },
    });
  }

  return pool;
}

/**
 * Adds a candidate to a recruitment talent pool
 */
export async function addCandidateToTalentPool(
  poolId: string,
  candidateId: string,
  notes?: string,
  user?: RecruitmentUser
) {
  const membership = await db.recruitmentTalentPoolMember.upsert({
    where: {
      poolId_candidateId: { poolId, candidateId },
    },
    create: {
      poolId,
      candidateId,
      notes: notes || null,
      addedById: user?.id || null,
    },
    update: {
      notes: notes || null,
    },
  });

  await db.recruitmentCandidate.update({
    where: { id: candidateId },
    data: { talent_pool: true },
  });

  return membership;
}

/**
 * Lists all recruitment talent pools with member counts
 */
export async function listRecruitmentTalentPools() {
  return db.recruitmentTalentPool.findMany({
    include: {
      _count: {
        select: { members: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
