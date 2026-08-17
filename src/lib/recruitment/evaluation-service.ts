import { db } from '@/lib/db';
import {
  type RecruitmentUser,
  canUserAccessJob,
  canUserManageCandidateInterview,
} from './rbac-service';
import { transitionCandidateStage } from './candidate-service';

export type RecommendationType =
  | 'StrongHire'
  | 'Hire'
  | 'Maybe'
  | 'NoHire'
  | 'StrongNoHire';

export const VALID_RECOMMENDATIONS: RecommendationType[] = [
  'StrongHire',
  'Hire',
  'Maybe',
  'NoHire',
  'StrongNoHire',
];

export const RECOMMENDATION_SCORES: Record<RecommendationType, number> = {
  StrongHire: 5,
  Hire: 4,
  Maybe: 3,
  NoHire: 2,
  StrongNoHire: 1,
};

export type ScorecardCriterion = {
  name: string;
  score: number; // 1 to 5
  weight: number; // e.g. 40 (sum must equal 100)
  remarks?: string;
};

export type ScorecardData = {
  criteria: ScorecardCriterion[];
  weightedScore: number;
};

export const DEFAULT_SCORECARD_CRITERIA: Omit<ScorecardCriterion, 'score' | 'remarks'>[] = [
  { name: 'Technical Knowledge', weight: 40 },
  { name: 'Problem Solving', weight: 25 },
  { name: 'Communication', weight: 20 },
  { name: 'Role Fit', weight: 15 },
];

export type SubmitFeedbackInput = {
  id?: string;
  interviewId?: string;
  overallScore: number; // 1 to 5
  recommendation: RecommendationType;
  scorecard?: {
    criteria: ScorecardCriterion[];
  };
  comments?: string;
};

export type SelectionDecisionType =
  | 'SELECT'
  | 'REJECT'
  | 'HOLD'
  | 'NEXT_ROUND';

export type CandidateSelectionInput = {
  candidateId: string;
  decision: SelectionDecisionType;
  reason: string;
  interviewId?: string;
  overridePrerequisites?: boolean;
};

export type ConsolidatedEvaluation = {
  interviewId: string;
  candidateId: string;
  candidateName: string;
  jobTitle: string;
  round: number;
  panelCount: number;
  submittedCount: number;
  pendingCount: number;
  isComplete: boolean;
  averageScore: number;
  averageWeightedScore: number;
  recommendationDistribution: Record<RecommendationType, number>;
  consensus: RecommendationType | 'Mixed';
  consensusScore: number;
  highDisagreement: boolean;
  disagreementReason?: string;
  scoreVariance: number;
  feedbackEntries: {
    id: string;
    reviewerId: string;
    reviewerName: string;
    reviewerRole?: string;
    isLead: boolean;
    overallScore: number;
    recommendation: RecommendationType;
    scorecard: ScorecardData | null;
    comments: string | null;
    submittedAt: Date;
    isOwnFeedback?: boolean;
  }[];
};

/**
 * Calculates deterministic weighted score for scorecard criteria
 */
export function calculateWeightedScore(criteria: ScorecardCriterion[]): number {
  if (!criteria || criteria.length === 0) return 0;

  let totalWeight = 0;
  let weightedSum = 0;

  for (const c of criteria) {
    if (typeof c.score !== 'number' || c.score < 1 || c.score > 5) {
      throw new Error(`Score for criterion "${c.name}" must be an integer between 1 and 5.`);
    }
    if (typeof c.weight !== 'number' || c.weight <= 0) {
      throw new Error(`Weight for criterion "${c.name}" must be greater than 0.`);
    }
    totalWeight += c.weight;
    weightedSum += c.score * c.weight;
  }

  if (Math.round(totalWeight) !== 100) {
    throw new Error(`Total scorecard weight must equal 100 (got ${totalWeight}).`);
  }

  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

/**
 * Validates scorecard structure, individual criteria scores and weights
 */
export function validateScorecard(scorecard: { criteria: ScorecardCriterion[] }): ScorecardData {
  if (!scorecard || !Array.isArray(scorecard.criteria) || scorecard.criteria.length === 0) {
    throw new Error('Scorecard criteria must be provided as a non-empty list.');
  }

  const seenNames = new Set<string>();
  for (const c of scorecard.criteria) {
    if (!c.name || c.name.trim().length === 0) {
      throw new Error('All scorecard criteria must have a valid name.');
    }
    const cleanName = c.name.trim();
    if (seenNames.has(cleanName.toLowerCase())) {
      throw new Error(`Duplicate scorecard criterion: "${cleanName}".`);
    }
    seenNames.add(cleanName.toLowerCase());

    if (typeof c.score !== 'number' || c.score < 1 || c.score > 5) {
      throw new Error(`Score for criterion "${cleanName}" must be between 1 and 5.`);
    }

    if (typeof c.weight !== 'number' || c.weight <= 0) {
      throw new Error(`Weight for criterion "${cleanName}" must be greater than 0.`);
    }

    if (c.remarks && c.remarks.length > 1000) {
      throw new Error(`Remarks for criterion "${cleanName}" exceeds the 1000 character limit.`);
    }
  }

  const weightedScore = calculateWeightedScore(scorecard.criteria);
  return {
    criteria: scorecard.criteria.map((c) => ({
      name: c.name.trim(),
      score: Math.round(c.score),
      weight: c.weight,
      remarks: c.remarks?.trim() || undefined,
    })),
    weightedScore,
  };
}

/**
 * Submits feedback for an interview round by an assigned panel member
 */
export async function submitInterviewFeedback(
  interviewId: string,
  input: SubmitFeedbackInput,
  user: RecruitmentUser
) {
  // 1. Fetch interview with candidate, job, and panel members
  const interview = await db.recruitment_interviews.findUnique({
    where: { id: interviewId },
    include: {
      recruitment_candidates: { include: { job: true } },
      interview_panel_members: { include: { employees: true } },
      interview_feedback: true,
    },
  });

  if (!interview) throw new Error('Interview not found.');

  // 2. Validate interview status (Completed)
  if (interview.status !== 'Completed') {
    throw new Error(
      `Feedback can only be submitted for Completed interviews (current status: "${interview.status}").`
    );
  }

  // 3. Validate panel assignment / authorization
  const isAssignedPanel = interview.interview_panel_members.some(
    (pm) => pm.employee_id === user.id
  );
  const isAdmin = user.userRole === 'admin';

  if (!isAssignedPanel && !isAdmin) {
    throw new Error('Not authorized: Only assigned panel members can submit interview feedback.');
  }

  // 4. Validate overall score and recommendation
  const score = Math.round(input.overallScore);
  if (isNaN(score) || score < 1 || score > 5) {
    throw new Error('Overall interview score must be an integer between 1 and 5.');
  }

  if (!VALID_RECOMMENDATIONS.includes(input.recommendation)) {
    throw new Error(
      `Invalid recommendation "${input.recommendation}". Allowed values: ${VALID_RECOMMENDATIONS.join(', ')}.`
    );
  }

  // 5. Validate scorecard criteria
  let validatedScorecard: ScorecardData | null = null;
  if (input.scorecard && Array.isArray(input.scorecard.criteria)) {
    validatedScorecard = validateScorecard(input.scorecard);
  }

  // 6. Check unique feedback constraint (one per reviewer per interview)
  const existingFeedback = await db.interview_feedback.findUnique({
    where: {
      interview_id_reviewer_id: {
        interview_id: interviewId,
        reviewer_id: user.id,
      },
    },
  });

  if (existingFeedback) {
    throw new Error(
      'Feedback has already been submitted for this interview by this reviewer and is permanently locked.'
    );
  }

  // 7. Atomic Transaction: Persist feedback, audit log, notifications
  const newFeedbackId =
    input.id || `FB-${Date.now()}-${user.id.replace(/[^a-zA-Z0-9]/g, '')}-${Math.random().toString(36).substring(2, 5)}`;

  const result = await db.$transaction(
    async (tx) => {
      const createdFeedback = await tx.interview_feedback.create({
        data: {
          id: newFeedbackId,
          interview_id: interviewId,
          reviewer_id: user.id,
          overall_score: score,
          recommendation: input.recommendation,
          scorecard: (validatedScorecard || undefined) as any,
          comments: input.comments?.trim() || null,
          submitted_at: new Date(),
        },
        include: {
          employees: {
            select: { id: true, name: true, email: true, roleTitle: true, department: true },
          },
        },
      });

      // Record AuditLog
      await tx.auditLog.create({
        data: {
          id: `audit-fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          action: 'INTERVIEW_FEEDBACK_SUBMITTED',
          module: 'Recruitment',
          employeeId: user.id,
          details: JSON.stringify({
            feedbackId: newFeedbackId,
            interviewId,
            candidateId: interview.candidate_id,
            candidateName: interview.recruitment_candidates.name,
            round: interview.round,
            overallScore: score,
            recommendation: input.recommendation,
            weightedScore: validatedScorecard?.weightedScore ?? score,
            reviewerId: user.id,
            reviewerName: user.name,
          }),
        },
      });

      // Record Feedback Locking AuditLog
      await tx.auditLog.create({
        data: {
          id: `audit-fblock-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          action: 'INTERVIEW_FEEDBACK_LOCKED',
          module: 'Recruitment',
          employeeId: user.id,
          details: JSON.stringify({
            feedbackId: newFeedbackId,
            interviewId,
            candidateId: interview.candidate_id,
            candidateName: interview.recruitment_candidates.name,
            reviewerId: user.id,
            lockedAt: new Date().toISOString(),
          }),
        },
      });

      // Notify Hiring Manager
      const hiringManagerId = interview.recruitment_candidates.job.hiring_manager_id;
      if (hiringManagerId && hiringManagerId !== user.id) {
        await tx.userNotification.create({
          data: {
            id: `notif-fb-${Date.now()}-${hiringManagerId}-${Math.random().toString(36).substring(2, 5)}`,
            userId: hiringManagerId,
            title: 'Interview Feedback Submitted',
            message: `${user.name} submitted Round ${interview.round} feedback for ${interview.recruitment_candidates.name} (${input.recommendation}).`,
            type: 'System',
            linkUrl: '/recruitment',
          },
        });
      }

      // Check if all required panel members have submitted
      const panelCount = interview.interview_panel_members.length;
      const submittedCount = interview.interview_feedback.length + 1; // including current

      if (submittedCount >= panelCount && panelCount > 0) {
        // Record EVALUATION_READY audit
        await tx.auditLog.create({
          data: {
            id: `audit-eval-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            action: 'INTERVIEW_EVALUATION_GENERATED',
            module: 'Recruitment',
            employeeId: user.id,
            details: JSON.stringify({
              interviewId,
              candidateId: interview.candidate_id,
              round: interview.round,
              panelCount,
              submittedCount,
              status: 'Complete',
            }),
          },
        });

        // Notify Recruiter & Hiring Manager that evaluation is complete
        if (hiringManagerId) {
          await tx.userNotification.create({
            data: {
              id: `notif-eval-${Date.now()}-${hiringManagerId}`,
              userId: hiringManagerId,
              title: 'Interview Evaluation Ready',
              message: `All panel feedback is submitted for ${interview.recruitment_candidates.name} (Round ${interview.round}). Evaluation ready for review.`,
              type: 'System',
              linkUrl: '/recruitment',
            },
          });
        }
      }

      return createdFeedback;
    },
    { timeout: 25000, maxWait: 15000 }
  );

  return result;
}

/**
 * Retrieves feedback for an interview round with strict server-side blind feedback enforcement
 */
export async function getInterviewFeedback(interviewId: string, user: RecruitmentUser) {
  const interview = await db.recruitment_interviews.findUnique({
    where: { id: interviewId },
    include: {
      recruitment_candidates: { include: { job: true } },
      interview_panel_members: { include: { employees: true } },
      interview_feedback: {
        include: {
          employees: {
            select: { id: true, name: true, email: true, roleTitle: true, department: true },
          },
        },
      },
    },
  });

  if (!interview) throw new Error('Interview not found.');

  const isAdmin = user.userRole === 'admin';
  const isHiringManager =
    user.userRole === 'manager' && canUserAccessJob(user, interview.recruitment_candidates.job);
  const isPanelMember = interview.interview_panel_members.some(
    (pm) => pm.employee_id === user.id
  );

  if (!isAdmin && !isHiringManager && !isPanelMember) {
    throw new Error('Not authorized to view feedback for this interview.');
  }

  // Panel members: Blind feedback logic
  if (isPanelMember && !isAdmin && !isHiringManager) {
    const userFeedback = interview.interview_feedback.find((fb) => fb.reviewer_id === user.id);
    const hasSubmitted = Boolean(userFeedback);
    const allSubmitted =
      interview.interview_feedback.length >= interview.interview_panel_members.length &&
      interview.interview_panel_members.length > 0;

    // If caller has NOT submitted feedback: peer feedback is completely hidden
    if (!hasSubmitted) {
      return {
        interviewId,
        hasSubmitted: false,
        panelCount: interview.interview_panel_members.length,
        submittedCount: interview.interview_feedback.length,
        feedback: [], // Peer feedback hidden
      };
    }

    // Caller has submitted feedback: return caller's own feedback. Peer feedback hidden until all submissions complete
    if (!allSubmitted) {
      return {
        interviewId,
        hasSubmitted: true,
        panelCount: interview.interview_panel_members.length,
        submittedCount: interview.interview_feedback.length,
        feedback: userFeedback ? [userFeedback] : [],
      };
    }
  }

  // Admin or authorized Hiring Manager or all submitted: Return full feedback
  return {
    interviewId,
    hasSubmitted: interview.interview_feedback.some((fb) => fb.reviewer_id === user.id),
    panelCount: interview.interview_panel_members.length,
    submittedCount: interview.interview_feedback.length,
    feedback: interview.interview_feedback,
  };
}

/**
 * Calculates consolidated evaluation, average scores, recommendation distribution, consensus, and disagreement
 */
export async function calculateConsolidatedEvaluation(
  interviewId: string,
  user: RecruitmentUser
): Promise<ConsolidatedEvaluation> {
  const interview = await db.recruitment_interviews.findUnique({
    where: { id: interviewId },
    include: {
      recruitment_candidates: { include: { job: true } },
      interview_panel_members: {
        include: {
          employees: {
            select: { id: true, name: true, email: true, roleTitle: true, department: true },
          },
        },
      },
      interview_feedback: {
        include: {
          employees: {
            select: { id: true, name: true, email: true, roleTitle: true, department: true },
          },
        },
      },
    },
  });

  if (!interview) throw new Error('Interview not found.');

  const isAdmin = user.userRole === 'admin';
  const isHiringManager =
    user.userRole === 'manager' && canUserAccessJob(user, interview.recruitment_candidates.job);
  const isPanelMember = interview.interview_panel_members.some(
    (pm) => pm.employee_id === user.id
  );

  if (!isAdmin && !isHiringManager && !isPanelMember) {
    throw new Error('Not authorized to view evaluation for this interview.');
  }

  const panelCount = interview.interview_panel_members.length;
  const submittedCount = interview.interview_feedback.length;
  const pendingCount = Math.max(0, panelCount - submittedCount);
  const isComplete = submittedCount >= panelCount && panelCount > 0;

  // Calculate scores
  let totalScore = 0;
  let totalWeightedScore = 0;
  const scores: number[] = [];

  const recommendationDistribution: Record<RecommendationType, number> = {
    StrongHire: 0,
    Hire: 0,
    Maybe: 0,
    NoHire: 0,
    StrongNoHire: 0,
  };

  for (const fb of interview.interview_feedback) {
    totalScore += fb.overall_score;
    scores.push(fb.overall_score);

    const sc = fb.scorecard as ScorecardData | null;
    const weighted = sc?.weightedScore ?? fb.overall_score;
    totalWeightedScore += weighted;

    const rec = fb.recommendation as RecommendationType;
    if (recommendationDistribution[rec] !== undefined) {
      recommendationDistribution[rec]++;
    }
  }

  const averageScore = submittedCount > 0 ? Math.round((totalScore / submittedCount) * 100) / 100 : 0;
  const averageWeightedScore =
    submittedCount > 0 ? Math.round((totalWeightedScore / submittedCount) * 100) / 100 : 0;

  // Calculate score variance
  let scoreVariance = 0;
  if (scores.length > 1) {
    const mean = totalScore / scores.length;
    const squaredDiffs = scores.map((s) => Math.pow(s - mean, 2));
    scoreVariance = Math.round((squaredDiffs.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
  }

  // Consensus & Disagreement Engine
  let consensus: RecommendationType | 'Mixed' = 'Mixed';
  let consensusScore = 0;
  let highDisagreement = false;
  let disagreementReason: string | undefined = undefined;

  const positiveVotes = recommendationDistribution.StrongHire + recommendationDistribution.Hire;
  const negativeVotes = recommendationDistribution.NoHire + recommendationDistribution.StrongNoHire;
  const maybeVotes = recommendationDistribution.Maybe;

  // Detect conflicting recommendations
  if (positiveVotes > 0 && negativeVotes > 0) {
    highDisagreement = true;
    disagreementReason = 'Panel contains contrasting Hire and No-Hire recommendations.';
  } else if (scoreVariance >= 2.0) {
    highDisagreement = true;
    disagreementReason = 'High score variance across panel evaluations.';
  }

  if (submittedCount > 0) {
    let maxCount = 0;
    let majorityRec: RecommendationType | null = null;
    let isTie = false;

    for (const rec of VALID_RECOMMENDATIONS) {
      const count = recommendationDistribution[rec];
      if (count > maxCount) {
        maxCount = count;
        majorityRec = rec;
        isTie = false;
      } else if (count === maxCount && count > 0) {
        isTie = true;
      }
    }

    if (majorityRec && !isTie && !highDisagreement) {
      consensus = majorityRec;
      consensusScore = RECOMMENDATION_SCORES[majorityRec];
    } else {
      consensus = 'Mixed';
      consensusScore = averageScore;
    }
  }

  // Format feedback entries (with blind feedback check for panel members)
  const callerFeedback = interview.interview_feedback.find((fb) => fb.reviewer_id === user.id);
  const callerHasSubmitted = Boolean(callerFeedback);

  let feedbackEntries: ConsolidatedEvaluation['feedbackEntries'] = [];

  if (isAdmin || isHiringManager || (isPanelMember && callerHasSubmitted && isComplete)) {
    feedbackEntries = interview.interview_feedback.map((fb) => {
      const isLead =
        interview.interview_panel_members.find((pm) => pm.employee_id === fb.reviewer_id)?.is_lead ||
        false;

      return {
        id: fb.id,
        reviewerId: fb.reviewer_id,
        reviewerName: fb.employees.name,
        reviewerRole: fb.employees.roleTitle || fb.employees.department || undefined,
        isLead,
        overallScore: fb.overall_score,
        recommendation: fb.recommendation as RecommendationType,
        scorecard: fb.scorecard as ScorecardData | null,
        comments: fb.comments,
        submittedAt: fb.submitted_at,
        isOwnFeedback: fb.reviewer_id === user.id,
      };
    });
  } else if (isPanelMember && callerFeedback) {
    // Only caller's own feedback
    const isLead =
      interview.interview_panel_members.find((pm) => pm.employee_id === callerFeedback.reviewer_id)
        ?.is_lead || false;

    feedbackEntries = [
      {
        id: callerFeedback.id,
        reviewerId: callerFeedback.reviewer_id,
        reviewerName: callerFeedback.employees.name,
        reviewerRole: callerFeedback.employees.roleTitle || callerFeedback.employees.department || undefined,
        isLead,
        overallScore: callerFeedback.overall_score,
        recommendation: callerFeedback.recommendation as RecommendationType,
        scorecard: callerFeedback.scorecard as ScorecardData | null,
        comments: callerFeedback.comments,
        submittedAt: callerFeedback.submitted_at,
        isOwnFeedback: true,
      },
    ];
  }

  return {
    interviewId,
    candidateId: interview.candidate_id,
    candidateName: interview.recruitment_candidates.name,
    jobTitle: interview.recruitment_candidates.job.title,
    round: interview.round,
    panelCount,
    submittedCount,
    pendingCount,
    isComplete,
    averageScore,
    averageWeightedScore,
    recommendationDistribution,
    consensus,
    consensusScore,
    highDisagreement,
    disagreementReason,
    scoreVariance,
    feedbackEntries,
  };
}

/**
 * Executes a candidate selection decision (SELECT, REJECT, HOLD, NEXT_ROUND)
 */
export async function processCandidateSelectionDecision(
  input: CandidateSelectionInput,
  user: RecruitmentUser
) {
  if (!input.candidateId) throw new Error('Candidate ID is required.');
  if (!input.decision) throw new Error('Selection decision is required.');
  if (!input.reason || input.reason.trim().length === 0) {
    throw new Error('A reason or evaluation justification is required for the selection decision.');
  }

  const allowedDecisions: SelectionDecisionType[] = ['SELECT', 'REJECT', 'HOLD', 'NEXT_ROUND'];
  if (!allowedDecisions.includes(input.decision)) {
    throw new Error(`Invalid decision "${input.decision}". Allowed: ${allowedDecisions.join(', ')}.`);
  }

  // 1. Fetch Candidate
  const candidate = await db.recruitmentCandidate.findUnique({
    where: { id: input.candidateId },
    include: {
      job: true,
      recruitment_interviews: {
        include: {
          interview_panel_members: true,
          interview_feedback: true,
        },
        orderBy: { round: 'desc' },
      },
    },
  });

  if (!candidate) throw new Error('Candidate not found.');

  // 2. Authorization Check
  if (!canUserManageCandidateInterview(user, candidate.job)) {
    throw new Error('Not authorized to make selection decisions for this candidate.');
  }

  // 3. Stage Validation
  if (candidate.stage !== 'Interview') {
    throw new Error(
      `Cannot process selection decision: Candidate is in "${candidate.stage}" stage. Candidate must be in "Interview" stage.`
    );
  }

  // 4. Precondition validation for SELECT
  if (input.decision === 'SELECT') {
    const latestInterview = candidate.recruitment_interviews[0];
    if (!latestInterview && !input.overridePrerequisites) {
      throw new Error('Cannot select candidate: No interview records exist for this candidate.');
    }

    if (latestInterview) {
      if (latestInterview.status !== 'Completed' && !input.overridePrerequisites) {
        throw new Error(
          `Cannot select candidate: Latest interview (Round ${latestInterview.round}) is not Completed (status: "${latestInterview.status}").`
        );
      }

      const panelCount = latestInterview.interview_panel_members.length;
      const submittedCount = latestInterview.interview_feedback.length;

      if (submittedCount < panelCount && !input.overridePrerequisites) {
        throw new Error(
          `Cannot select candidate: Interview feedback incomplete (${submittedCount}/${panelCount} submitted). Required feedback must be submitted before final selection.`
        );
      }
    }
  }

  // 5. Execute Decision
  let result;
  if (input.decision === 'SELECT') {
    result = await transitionCandidateStage(input.candidateId, 'Selected', user, input.reason.trim());
  } else if (input.decision === 'REJECT') {
    result = await transitionCandidateStage(input.candidateId, 'Rejected', user, input.reason.trim());
  } else if (input.decision === 'HOLD') {
    // Retain in Interview stage with Audit & Note
    result = await db.$transaction(async (tx) => {
      await tx.candidate_notes.create({
        data: {
          candidate_id: input.candidateId,
          author_id: user.id,
          note: `[CANDIDATE ON HOLD] ${input.reason.trim()}`,
        },
      });

      await tx.auditLog.create({
        data: {
          id: `audit-hold-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          action: 'CANDIDATE_HELD',
          module: 'Recruitment',
          employeeId: user.id,
          details: JSON.stringify({
            candidateId: input.candidateId,
            candidateName: candidate.name,
            reason: input.reason.trim(),
            interviewId: input.interviewId || candidate.recruitment_interviews[0]?.id,
          }),
        },
      });

      if (candidate.job.hiring_manager_id && candidate.job.hiring_manager_id !== user.id) {
        await tx.userNotification.create({
          data: {
            id: `notif-hold-${Date.now()}-${candidate.job.hiring_manager_id}`,
            userId: candidate.job.hiring_manager_id,
            title: 'Candidate Placed on Hold',
            message: `${candidate.name} (${candidate.job.title}) was placed on hold. Reason: ${input.reason.trim()}`,
            type: 'System',
            linkUrl: '/recruitment',
          },
        });
      }

      return candidate;
    });
  } else if (input.decision === 'NEXT_ROUND') {
    // Retain in Interview stage, create Audit & Note, enable next round scheduling
    result = await db.$transaction(async (tx) => {
      await tx.candidate_notes.create({
        data: {
          candidate_id: input.candidateId,
          author_id: user.id,
          note: `[ADVANCED TO NEXT ROUND] ${input.reason.trim()}`,
        },
      });

      await tx.auditLog.create({
        data: {
          id: `audit-nextround-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          action: 'CANDIDATE_MOVED_TO_NEXT_ROUND',
          module: 'Recruitment',
          employeeId: user.id,
          details: JSON.stringify({
            candidateId: input.candidateId,
            candidateName: candidate.name,
            reason: input.reason.trim(),
            previousInterviewId: input.interviewId || candidate.recruitment_interviews[0]?.id,
          }),
        },
      });

      if (candidate.job.hiring_manager_id && candidate.job.hiring_manager_id !== user.id) {
        await tx.userNotification.create({
          data: {
            id: `notif-nextround-${Date.now()}-${candidate.job.hiring_manager_id}`,
            userId: candidate.job.hiring_manager_id,
            title: 'Candidate Advanced to Next Round',
            message: `${candidate.name} (${candidate.job.title}) was advanced to next interview round.`,
            type: 'System',
            linkUrl: '/recruitment',
          },
        });
      }

      return candidate;
    });
  }

  return result;
}
