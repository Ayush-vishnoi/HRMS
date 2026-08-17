import { db } from '@/lib/db';
import {
  type RecruitmentUser,
  canUserAccessJob,
  canUserManageCandidateInterview,
  canUserViewInterview,
  getInterviewFilterForUser,
} from './rbac-service';

export type InterviewStatus =
  | 'Scheduled'
  | 'Confirmed'
  | 'InProgress'
  | 'Completed'
  | 'Cancelled'
  | 'Rescheduled'
  | 'NoShow';

export const VALID_INTERVIEW_STATUS_TRANSITIONS: Record<InterviewStatus, InterviewStatus[]> = {
  Scheduled: ['Confirmed', 'InProgress', 'Rescheduled', 'Cancelled', 'NoShow'],
  Confirmed: ['InProgress', 'Rescheduled', 'Cancelled', 'NoShow'],
  InProgress: ['Completed', 'Cancelled'],
  Rescheduled: ['Scheduled', 'Confirmed', 'InProgress', 'Cancelled'],
  NoShow: ['Rescheduled', 'Cancelled'],
  Completed: [],
  Cancelled: [],
};

/**
 * Validates interview status state machine transitions
 */
export function validateInterviewStatusTransition(
  currentStatus: string,
  nextStatus: string
): boolean {
  if (currentStatus === nextStatus) return true;

  const validNext = VALID_INTERVIEW_STATUS_TRANSITIONS[currentStatus as InterviewStatus] || [];
  if (!validNext.includes(nextStatus as InterviewStatus)) {
    throw new Error(
      `Invalid interview status transition from "${currentStatus}" to "${nextStatus}". Allowed transitions are: ${
        validNext.length > 0 ? validNext.join(', ') : 'None (terminal state)'
      }.`
    );
  }
  return true;
}

export type CreateInterviewInput = {
  id?: string;
  candidateId: string;
  title: string;
  round?: number;
  startsAt: string | Date;
  endsAt: string | Date;
  location?: string | null;
  meetingUrl?: string | null;
  panelMembers: string[]; // employee IDs
  leadInterviewerId: string; // employee ID
  reminderAt?: string | Date | null;
};

export type UpdateInterviewInput = {
  title?: string;
  startsAt?: string | Date;
  endsAt?: string | Date;
  location?: string | null;
  meetingUrl?: string | null;
  panelMembers?: string[];
  leadInterviewerId?: string;
  reminderAt?: string | Date | null;
  status?: string;
};

export type InterviewFilters = {
  candidateId?: string;
  status?: string;
  round?: number;
  dateFrom?: string | Date;
  dateTo?: string | Date;
  interviewerId?: string;
};

export type ConflictCheckResult = {
  hasConflict: boolean;
  conflictType?: 'CANDIDATE' | 'INTERVIEWER' | 'CALENDAR_MEETING';
  conflictReason?: string;
  conflictingEventTitle?: string;
  conflictingEmployeeId?: string;
  conflictingEmployeeName?: string;
};

/**
 * Server-side Conflict Detection Engine:
 * 1. Checks overlapping active interviews for candidate
 * 2. Checks overlapping active interviews for panel members
 * 3. Checks overlapping calendar meetings for panel members
 */
export async function detectInterviewConflicts({
  candidateId,
  startsAt,
  endsAt,
  panelMemberIds,
  excludeInterviewId,
}: {
  candidateId: string;
  startsAt: Date;
  endsAt: Date;
  panelMemberIds: string[];
  excludeInterviewId?: string;
}): Promise<ConflictCheckResult> {
  const activeStatuses = ['Scheduled', 'Confirmed', 'InProgress', 'Rescheduled'];

  // 1. Check Candidate Overlapping Interviews
  const candidateConflict = await db.recruitment_interviews.findFirst({
    where: {
      candidate_id: candidateId,
      id: excludeInterviewId ? { not: excludeInterviewId } : undefined,
      status: { in: activeStatuses },
      starts_at: { lt: endsAt },
      ends_at: { gt: startsAt },
    },
  });

  if (candidateConflict) {
    const startStr = candidateConflict.starts_at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endStr = candidateConflict.ends_at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      hasConflict: true,
      conflictType: 'CANDIDATE',
      conflictReason: `Candidate already has an active interview ("${candidateConflict.title}") scheduled from ${startStr} to ${endStr}.`,
      conflictingEventTitle: candidateConflict.title,
    };
  }

  // 2. Check Interviewer Overlapping Interviews
  if (panelMemberIds.length > 0) {
    const interviewerConflict = await db.interview_panel_members.findFirst({
      where: {
        employee_id: { in: panelMemberIds },
        interview_id: excludeInterviewId ? { not: excludeInterviewId } : undefined,
        recruitment_interviews: {
          status: { in: activeStatuses },
          starts_at: { lt: endsAt },
          ends_at: { gt: startsAt },
        },
      },
      include: {
        employees: { select: { id: true, name: true } },
        recruitment_interviews: { select: { id: true, title: true, starts_at: true, ends_at: true } },
      },
    });

    if (interviewerConflict) {
      const startStr = interviewerConflict.recruitment_interviews.starts_at.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const endStr = interviewerConflict.recruitment_interviews.ends_at.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      return {
        hasConflict: true,
        conflictType: 'INTERVIEWER',
        conflictReason: `Panel member ${interviewerConflict.employees.name} (${interviewerConflict.employee_id}) has a conflicting interview ("${interviewerConflict.recruitment_interviews.title}") scheduled from ${startStr} to ${endStr}.`,
        conflictingEventTitle: interviewerConflict.recruitment_interviews.title,
        conflictingEmployeeId: interviewerConflict.employee_id,
        conflictingEmployeeName: interviewerConflict.employees.name,
      };
    }

    // 3. Check Calendar Meetings for Interviewers
    const meetingConflict = await db.meetingAttendee.findFirst({
      where: {
        employeeId: { in: panelMemberIds },
        meeting: {
          status: { not: 'CANCELLED' },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
      },
      include: {
        employee: { select: { id: true, name: true } },
        meeting: { select: { id: true, title: true, startsAt: true, endsAt: true } },
      },
    });

    if (meetingConflict) {
      const startStr = meetingConflict.meeting.startsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const endStr = meetingConflict.meeting.endsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        hasConflict: true,
        conflictType: 'CALENDAR_MEETING',
        conflictReason: `Panel member ${meetingConflict.employee.name} has a conflicting calendar meeting ("${meetingConflict.meeting.title}") from ${startStr} to ${endStr}.`,
        conflictingEventTitle: meetingConflict.meeting.title,
        conflictingEmployeeId: meetingConflict.employeeId,
        conflictingEmployeeName: meetingConflict.employee.name,
      };
    }
  }

  return { hasConflict: false };
}

/**
 * Creates and schedules an interview with atomic stage transition, panel assignments, conflict detection, audit logging & notifications
 */
export async function createInterview(input: CreateInterviewInput, user: RecruitmentUser) {
  // 1. Basic Field Validation
  if (!input.candidateId) throw new Error('Candidate ID is required.');
  if (!input.title || input.title.trim().length === 0) throw new Error('Interview title is required.');

  const roundNumber = Number(input.round) || 1;
  if (roundNumber < 1) throw new Error('Interview round must be 1 or greater.');

  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);

  if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
    throw new Error('Invalid interview start or end date format.');
  }

  if (startsAt >= endsAt) {
    throw new Error('Interview start time must be before end time.');
  }

  const durationMinutes = (endsAt.getTime() - startsAt.getTime()) / (1000 * 60);
  if (durationMinutes <= 0 || durationMinutes > 1440) {
    throw new Error('Interview duration must be between 1 minute and 24 hours.');
  }

  // 2. Panel Member & Lead Validation
  if (!Array.isArray(input.panelMembers) || input.panelMembers.length === 0) {
    throw new Error('At least one panel member must be assigned to the interview.');
  }

  const uniquePanelIds = Array.from(new Set(input.panelMembers));
  if (uniquePanelIds.length !== input.panelMembers.length) {
    throw new Error('Duplicate panel members are not allowed.');
  }

  if (!input.leadInterviewerId) {
    throw new Error('A lead interviewer must be designated.');
  }

  if (!uniquePanelIds.includes(input.leadInterviewerId)) {
    throw new Error('The designated lead interviewer must be included in the interview panel.');
  }

  // Validate employee records exist for all panel members
  const existingEmployees = await db.employee.findMany({
    where: { id: { in: uniquePanelIds } },
    select: { id: true, name: true, email: true },
  });

  if (existingEmployees.length !== uniquePanelIds.length) {
    const foundIds = new Set(existingEmployees.map((e) => e.id));
    const missingIds = uniquePanelIds.filter((id) => !foundIds.has(id));
    throw new Error(`The following panel member employee IDs do not exist: ${missingIds.join(', ')}.`);
  }

  // 3. Candidate & Job Authorization
  const candidate = await db.recruitmentCandidate.findUnique({
    where: { id: input.candidateId },
    include: { job: true },
  });

  if (!candidate) throw new Error('Candidate not found.');

  if (!canUserManageCandidateInterview(user, candidate.job)) {
    throw new Error('Not authorized to schedule interviews for this candidate.');
  }

  // 4. Candidate Stage Validation
  // Candidate must be in Shortlisted or Interview stage
  if (candidate.stage !== 'Shortlisted' && candidate.stage !== 'Interview') {
    throw new Error(
      `Cannot schedule interview: Candidate is currently in "${candidate.stage}" stage. Candidate must be in "Shortlisted" or "Interview" stage.`
    );
  }

  // 5. Round Sequence & Duplicate Round Validation
  const existingInterviews = await db.recruitment_interviews.findMany({
    where: { candidate_id: input.candidateId },
    orderBy: { round: 'asc' },
  });

  // Prevent duplicate active interview for the same candidate + round
  const activeDuplicateRound = existingInterviews.find(
    (i) => i.round === roundNumber && i.status !== 'Cancelled'
  );
  if (activeDuplicateRound) {
    throw new Error(
      `An active interview for Round ${roundNumber} is already scheduled with status "${activeDuplicateRound.status}".`
    );
  }

  // Round ordering: if round > 1, ensure round 1 (or round - 1) exists
  if (roundNumber > 1) {
    const hasPreviousRound = existingInterviews.some((i) => i.round === roundNumber - 1);
    if (!hasPreviousRound) {
      throw new Error(
        `Cannot schedule Round ${roundNumber} before Round ${roundNumber - 1} has been created.`
      );
    }
  }

  // 6. Conflict Detection
  const conflict = await detectInterviewConflicts({
    candidateId: input.candidateId,
    startsAt,
    endsAt,
    panelMemberIds: uniquePanelIds,
  });

  if (conflict.hasConflict) {
    throw new Error(`Schedule Conflict: ${conflict.conflictReason}`);
  }

  // 7. Atomic Execution in Transaction
  const newInterviewId = input.id || `INTV-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const reminderAt = input.reminderAt ? new Date(input.reminderAt) : null;

  const result = await db.$transaction(
    async (tx) => {
      // Create Interview record
      const createdInterview = await tx.recruitment_interviews.create({
        data: {
          id: newInterviewId,
          candidate_id: input.candidateId,
          title: input.title.trim(),
          round: roundNumber,
          starts_at: startsAt,
          ends_at: endsAt,
          location: input.location?.trim() || null,
          meeting_url: input.meetingUrl?.trim() || null,
          status: 'Scheduled',
          reminder_at: reminderAt,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Create Panel Members
      for (const empId of uniquePanelIds) {
        await tx.interview_panel_members.create({
          data: {
            id: `PM-${Date.now()}-${empId.replace(/[^a-zA-Z0-9]/g, '')}-${Math.random().toString(36).substring(2, 5)}`,
            interview_id: newInterviewId,
            employee_id: empId,
            is_lead: empId === input.leadInterviewerId,
          },
        });
      }

      // If candidate was in Shortlisted stage, transition to Interview stage
      if (candidate.stage === 'Shortlisted') {
        await tx.recruitmentCandidate.update({
          where: { id: input.candidateId },
          data: { stage: 'Interview', updatedAt: new Date() },
        });

        await tx.candidate_stage_history.create({
          data: {
            candidate_id: input.candidateId,
            from_stage: 'Shortlisted',
            to_stage: 'Interview',
            changed_by_id: user.id,
            note: `Candidate stage moved to Interview upon scheduling Round ${roundNumber} (${input.title.trim()}).`,
          },
        });
      }

      // Record AuditLog
      await tx.auditLog.create({
        data: {
          id: `audit-intv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          action: 'INTERVIEW_SCHEDULED',
          module: 'Recruitment',
          employeeId: user.id,
          details: JSON.stringify({
            interviewId: newInterviewId,
            candidateId: input.candidateId,
            candidateName: candidate.name,
            jobTitle: candidate.job.title,
            round: roundNumber,
            title: input.title.trim(),
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            panelMembers: uniquePanelIds,
            leadInterviewerId: input.leadInterviewerId,
            status: 'Scheduled',
          }),
        },
      });

      // Send UserNotifications to Panel Members
      for (const emp of existingEmployees) {
        if (emp.id !== user.id) {
          const isLead = emp.id === input.leadInterviewerId;
          await tx.userNotification.create({
            data: {
              id: `notif-intv-${Date.now()}-${emp.id}-${Math.random().toString(36).substring(2, 5)}`,
              userId: emp.id,
              title: isLead ? 'Assigned as Lead Interviewer' : 'Interview Panel Assignment',
              message: `You are assigned to Round ${roundNumber} interview for ${candidate.name} (${candidate.job.title}) on ${startsAt.toLocaleDateString()}.`,
              type: 'System',
              linkUrl: '/recruitment',
            },
          });
        }
      }

      // Send Notification to Hiring Manager if not actor or already notified
      if (
        candidate.job.hiring_manager_id &&
        candidate.job.hiring_manager_id !== user.id &&
        !uniquePanelIds.includes(candidate.job.hiring_manager_id)
      ) {
        await tx.userNotification.create({
          data: {
            id: `notif-hm-intv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            userId: candidate.job.hiring_manager_id,
            title: 'Interview Scheduled',
            message: `Round ${roundNumber} interview scheduled for candidate ${candidate.name} (${candidate.job.title}).`,
            type: 'System',
            linkUrl: '/recruitment',
          },
        });
      }

      return createdInterview;
    },
    { timeout: 25000, maxWait: 15000 }
  );

  return getInterviewById(newInterviewId, user);
}

/**
 * Updates an interview (reschedule, cancel, update panel, status transition)
 */
export async function updateInterview(
  interviewId: string,
  input: UpdateInterviewInput,
  user: RecruitmentUser
) {
  const existing = await db.recruitment_interviews.findUnique({
    where: { id: interviewId },
    include: {
      recruitment_candidates: { include: { job: true } },
      interview_panel_members: { include: { employees: true } },
    },
  });

  if (!existing) throw new Error('Interview not found.');

  // Check authorization
  if (!canUserManageCandidateInterview(user, existing.recruitment_candidates.job)) {
    throw new Error('Not authorized to modify this interview.');
  }

  // Prevent modifying terminal states inappropriately
  if (existing.status === 'Completed' && input.status && input.status !== 'Completed') {
    throw new Error('Completed interviews cannot be modified or re-opened.');
  }
  if (existing.status === 'Cancelled' && input.status && input.status !== 'Cancelled') {
    throw new Error('Cancelled interviews cannot be re-activated.');
  }

  // Validate status transition if status is being updated
  const newStatus = input.status || existing.status;
  if (input.status && input.status !== existing.status) {
    validateInterviewStatusTransition(existing.status, input.status);
  }

  // Time & date changes
  const newStartsAt = input.startsAt ? new Date(input.startsAt) : existing.starts_at;
  const newEndsAt = input.endsAt ? new Date(input.endsAt) : existing.ends_at;

  if (isNaN(newStartsAt.getTime()) || isNaN(newEndsAt.getTime())) {
    throw new Error('Invalid interview start or end date format.');
  }

  if (newStartsAt >= newEndsAt) {
    throw new Error('Interview start time must be before end time.');
  }

  const isScheduleChanged =
    newStartsAt.getTime() !== existing.starts_at.getTime() ||
    newEndsAt.getTime() !== existing.ends_at.getTime();

  // Panel member changes
  let uniquePanelIds = existing.interview_panel_members.map((pm) => pm.employee_id);
  let newLeadId =
    existing.interview_panel_members.find((pm) => pm.is_lead)?.employee_id || uniquePanelIds[0];

  if (input.panelMembers && Array.isArray(input.panelMembers)) {
    if (input.panelMembers.length === 0) {
      throw new Error('Interview must have at least one panel member.');
    }
    uniquePanelIds = Array.from(new Set(input.panelMembers));
    if (uniquePanelIds.length !== input.panelMembers.length) {
      throw new Error('Duplicate panel members are not allowed.');
    }
    newLeadId = input.leadInterviewerId || uniquePanelIds[0];
  }

  if (input.leadInterviewerId) {
    newLeadId = input.leadInterviewerId;
  }

  if (!uniquePanelIds.includes(newLeadId)) {
    throw new Error('Lead interviewer must belong to the assigned interview panel.');
  }

  // Verify employee records exist for panel members
  const existingEmployees = await db.employee.findMany({
    where: { id: { in: uniquePanelIds } },
    select: { id: true, name: true, email: true },
  });

  if (existingEmployees.length !== uniquePanelIds.length) {
    const foundIds = new Set(existingEmployees.map((e) => e.id));
    const missingIds = uniquePanelIds.filter((id) => !foundIds.has(id));
    throw new Error(`The following panel member employee IDs do not exist: ${missingIds.join(', ')}.`);
  }

  // If rescheduling or updating panel and interview is active: detect conflicts
  if (
    (isScheduleChanged || input.panelMembers) &&
    newStatus !== 'Cancelled' &&
    newStatus !== 'Completed'
  ) {
    const conflict = await detectInterviewConflicts({
      candidateId: existing.candidate_id,
      startsAt: newStartsAt,
      endsAt: newEndsAt,
      panelMemberIds: uniquePanelIds,
      excludeInterviewId: interviewId,
    });

    if (conflict.hasConflict) {
      throw new Error(`Schedule Conflict: ${conflict.conflictReason}`);
    }
  }

  // Determine audit action
  let auditAction = 'INTERVIEW_UPDATED';
  if (newStatus === 'Cancelled' && existing.status !== 'Cancelled') {
    auditAction = 'INTERVIEW_CANCELLED';
  } else if (isScheduleChanged) {
    auditAction = 'INTERVIEW_RESCHEDULED';
  } else if (newStatus !== existing.status) {
    auditAction = 'INTERVIEW_STATUS_CHANGED';
  } else if (input.panelMembers) {
    auditAction = 'INTERVIEW_PANEL_ASSIGNED';
  }

  const reminderAt =
    input.reminderAt !== undefined
      ? input.reminderAt
        ? new Date(input.reminderAt)
        : null
      : existing.reminder_at;

  const result = await db.$transaction(
    async (tx) => {
      const updatedInterview = await tx.recruitment_interviews.update({
        where: { id: interviewId },
        data: {
          title: input.title !== undefined ? input.title.trim() : existing.title,
          starts_at: newStartsAt,
          ends_at: newEndsAt,
          location: input.location !== undefined ? input.location?.trim() || null : existing.location,
          meeting_url: input.meetingUrl !== undefined ? input.meetingUrl?.trim() || null : existing.meeting_url,
          status: isScheduleChanged && !input.status && existing.status === 'Scheduled' ? 'Rescheduled' : newStatus,
          reminder_at: reminderAt,
          updated_at: new Date(),
        },
      });

      // Atomically replace panel members if provided
      if (input.panelMembers || input.leadInterviewerId) {
        await tx.interview_panel_members.deleteMany({
          where: { interview_id: interviewId },
        });

        for (const empId of uniquePanelIds) {
          await tx.interview_panel_members.create({
            data: {
              id: `PM-${Date.now()}-${empId.replace(/[^a-zA-Z0-9]/g, '')}-${Math.random().toString(36).substring(2, 5)}`,
              interview_id: interviewId,
              employee_id: empId,
              is_lead: empId === newLeadId,
            },
          });
        }
      }

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          id: `audit-intv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          action: auditAction,
          module: 'Recruitment',
          employeeId: user.id,
          details: JSON.stringify({
            interviewId,
            candidateId: existing.candidate_id,
            candidateName: existing.recruitment_candidates.name,
            round: existing.round,
            previousStatus: existing.status,
            newStatus: updatedInterview.status,
            previousSchedule: {
              startsAt: existing.starts_at.toISOString(),
              endsAt: existing.ends_at.toISOString(),
            },
            newSchedule: {
              startsAt: newStartsAt.toISOString(),
              endsAt: newEndsAt.toISOString(),
            },
            panelMembers: uniquePanelIds,
            leadInterviewerId: newLeadId,
          }),
        },
      });

      // Send UserNotifications on reschedule / cancel / status change
      for (const emp of existingEmployees) {
        if (emp.id !== user.id) {
          let notifTitle = 'Interview Updated';
          let notifMsg = `Interview for ${existing.recruitment_candidates.name} has been updated.`;

          if (auditAction === 'INTERVIEW_RESCHEDULED') {
            notifTitle = 'Interview Rescheduled';
            notifMsg = `Round ${existing.round} interview for ${existing.recruitment_candidates.name} rescheduled to ${newStartsAt.toLocaleString()}.`;
          } else if (auditAction === 'INTERVIEW_CANCELLED') {
            notifTitle = 'Interview Cancelled';
            notifMsg = `Round ${existing.round} interview for ${existing.recruitment_candidates.name} has been cancelled.`;
          } else if (auditAction === 'INTERVIEW_STATUS_CHANGED') {
            notifTitle = `Interview ${updatedInterview.status}`;
            notifMsg = `Round ${existing.round} interview for ${existing.recruitment_candidates.name} is now marked as ${updatedInterview.status}.`;
          }

          await tx.userNotification.create({
            data: {
              id: `notif-intv-upd-${Date.now()}-${emp.id}-${Math.random().toString(36).substring(2, 5)}`,
              userId: emp.id,
              title: notifTitle,
              message: notifMsg,
              type: auditAction === 'INTERVIEW_CANCELLED' ? 'Warning' : 'System',
              linkUrl: '/recruitment',
            },
          });
        }
      }

      return updatedInterview;
    },
    { timeout: 25000, maxWait: 15000 }
  );

  return getInterviewById(interviewId, user);
}

/**
 * Cancels an interview safely
 */
export async function cancelInterview(
  interviewId: string,
  user: RecruitmentUser,
  reason?: string
) {
  return updateInterview(interviewId, { status: 'Cancelled' }, user);
}

/**
 * Gets interviews filtered by query params and user RBAC permissions
 */
export async function getInterviews(filters: InterviewFilters, user: RecruitmentUser) {
  const rbacFilter = getInterviewFilterForUser(user);

  const whereConditions: any = {
    AND: [
      rbacFilter,
      filters.candidateId ? { candidate_id: filters.candidateId } : {},
      filters.status ? { status: filters.status } : {},
      filters.round ? { round: Number(filters.round) } : {},
      filters.interviewerId
        ? { interview_panel_members: { some: { employee_id: filters.interviewerId } } }
        : {},
      filters.dateFrom || filters.dateTo
        ? {
            starts_at: {
              gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
              lte: filters.dateTo ? new Date(filters.dateTo) : undefined,
            },
          }
        : {},
    ],
  };

  const interviews = await db.recruitment_interviews.findMany({
    where: whereConditions,
    include: {
      recruitment_candidates: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          stage: true,
          score: true,
          currentRole: true,
          avatarUrl: true,
          job: {
            select: {
              id: true,
              title: true,
              department: true,
              hiring_manager_id: true,
              recruiter_id: true,
            },
          },
        },
      },
      interview_panel_members: {
        include: {
          employees: {
            select: {
              id: true,
              name: true,
              email: true,
              roleTitle: true,
              department: true,
              avatarUrl: true,
            },
          },
        },
      },
      interview_feedback: {
        include: {
          employees: {
            select: {
              id: true,
              name: true,
              email: true,
              roleTitle: true,
              department: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
    orderBy: { starts_at: 'asc' },
  });

  return interviews;
}

/**
 * Gets single interview by ID with full relations and RBAC validation
 */
export async function getInterviewById(interviewId: string, user: RecruitmentUser) {
  const interview = await db.recruitment_interviews.findUnique({
    where: { id: interviewId },
    include: {
      recruitment_candidates: {
        include: {
          job: {
            select: {
              id: true,
              title: true,
              department: true,
              hiring_manager_id: true,
              recruiter_id: true,
            },
          },
        },
      },
      interview_panel_members: {
        include: {
          employees: {
            select: {
              id: true,
              name: true,
              email: true,
              roleTitle: true,
              department: true,
              avatarUrl: true,
            },
          },
        },
      },
      interview_feedback: {
        include: {
          employees: {
            select: {
              id: true,
              name: true,
              email: true,
              roleTitle: true,
              department: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  if (!interview) throw new Error('Interview not found.');

  if (!canUserViewInterview(user, interview)) {
    throw new Error('Not authorized to view this interview.');
  }

  return interview;
}
