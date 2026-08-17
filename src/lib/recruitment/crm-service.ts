import { db } from '@/lib/db';
import { canUserAccessJob, type RecruitmentUser } from './rbac-service';

export type TimelineEvent = {
  id: string;
  type:
    | 'STAGE_CHANGE'
    | 'NOTE'
    | 'SYSTEM'
    | 'ONBOARDING'
    | 'INTERVIEW'
    | 'INTERVIEW_FEEDBACK'
    | 'EVALUATION_READY'
    | 'CANDIDATE_SELECTED'
    | 'CANDIDATE_HELD'
    | 'NEXT_ROUND'
    | 'OFFER_CREATED'
    | 'OFFER_UPDATED'
    | 'OFFER_APPROVED'
    | 'OFFER_REJECTED'
    | 'OFFER_VIEWED'
    | 'OFFER_ACCEPTED'
    | 'OFFER_SIGNATURE_STARTED'
    | 'OFFER_SIGNED'
    | 'OFFER_DOCUMENT_GENERATED'
    | 'FEEDBACK_SUBMITTED';
  title: string;
  description?: string;
  timestamp: Date;
  authorName?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Add recruiter or manager note to candidate CRM
 */
export async function addCandidateNote(candidateId: string, noteText: string, user: RecruitmentUser) {
  if (!noteText || noteText.trim().length === 0) {
    throw new Error('Note text cannot be empty.');
  }

  const candidate = await db.recruitmentCandidate.findUnique({
    where: { id: candidateId },
    include: { job: true },
  });

  if (!candidate) throw new Error('Candidate not found.');
  if (!canUserAccessJob(user, candidate.job)) {
    throw new Error('Not authorized to add notes for this candidate.');
  }

  const createdNote = await db.$transaction(async (tx) => {
    const note = await tx.candidate_notes.create({
      data: {
        candidate_id: candidateId,
        author_id: user.id,
        note: noteText.trim(),
      },
      include: {
        employees: {
          select: { id: true, name: true, roleTitle: true, avatarUrl: true, department: true },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        id: `audit-note-${Date.now()}`,
        action: 'CANDIDATE_NOTE_ADDED',
        module: 'Recruitment',
        employeeId: user.id,
        details: JSON.stringify({
          candidateId,
          candidateName: candidate.name,
          noteLength: noteText.length,
        }),
      },
    });

    return note;
  });

  return createdNote;
}

/**
 * Get all notes for candidate
 */
export async function getCandidateNotes(candidateId: string, user: RecruitmentUser) {
  const candidate = await db.recruitmentCandidate.findUnique({
    where: { id: candidateId },
    include: { job: true },
  });

  if (!candidate) throw new Error('Candidate not found.');
  if (!canUserAccessJob(user, candidate.job)) {
    throw new Error('Not authorized to view notes for this candidate.');
  }

  const notes = await db.candidate_notes.findMany({
    where: { candidate_id: candidateId },
    include: {
      employees: {
        select: { id: true, name: true, roleTitle: true, avatarUrl: true, department: true },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  return notes;
}

/**
 * Construct unified activity timeline for candidate
 */
export async function getCandidateTimeline(candidateId: string, user: RecruitmentUser): Promise<TimelineEvent[]> {
  const candidate = await db.recruitmentCandidate.findUnique({
    where: { id: candidateId },
    include: {
      job: true,
      onboarding: {
        include: { employee: true },
      },
      candidate_stage_history: {
        include: {
          changedBy: { select: { id: true, name: true, roleTitle: true } },
        },
        orderBy: { changed_at: 'desc' },
      },
      candidate_notes: {
        include: {
          employees: { select: { id: true, name: true, roleTitle: true, department: true } },
        },
        orderBy: { created_at: 'desc' },
      },
      recruitment_interviews: {
        include: {
          interview_panel_members: {
            include: {
              employees: { select: { id: true, name: true } },
            },
          },
          interview_feedback: {
            include: {
              employees: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { starts_at: 'desc' },
      },
      recruitment_offers: {
        include: {
          recruitment_offer_approvals: {
            include: { employees: { select: { name: true } } },
            orderBy: { sequence: 'asc' },
          },
          document_signatures: true,
        },
        orderBy: { created_at: 'desc' },
      },
    },
  });

  if (!candidate) throw new Error('Candidate not found.');
  if (!canUserAccessJob(user, candidate.job)) {
    throw new Error('Not authorized to view timeline for this candidate.');
  }

  const events: TimelineEvent[] = [];

  // Stage changes
  for (const sh of candidate.candidate_stage_history || []) {
    events.push({
      id: `sh-${sh.id}`,
      type: 'STAGE_CHANGE',
      title: `Stage Changed: ${sh.from_stage ? `${sh.from_stage} → ` : ''}${sh.to_stage}`,
      description: sh.note || undefined,
      timestamp: sh.changed_at,
      authorName: sh.changedBy?.name || 'Recruitment System',
      metadata: { fromStage: sh.from_stage, toStage: sh.to_stage },
    });
  }

  // Notes
  for (const n of candidate.candidate_notes || []) {
    events.push({
      id: `note-${n.id}`,
      type: 'NOTE',
      title: 'Recruiter Note',
      description: n.note,
      timestamp: n.created_at,
      authorName: n.employees.name,
      metadata: { authorRole: n.employees.roleTitle, department: n.employees.department },
    });
  }

  // Interviews & Panel Feedback
  for (const intv of candidate.recruitment_interviews || []) {
    events.push({
      id: `intv-${intv.id}`,
      type: 'INTERVIEW',
      title: `Round ${intv.round}: ${intv.title}`,
      description: `Status: ${intv.status}${intv.meeting_url ? ` · ${intv.meeting_url}` : intv.location ? ` · ${intv.location}` : ''}`,
      timestamp: intv.starts_at,
      authorName: 'Scheduling Coordinator',
      metadata: { interviewId: intv.id, round: intv.round, status: intv.status },
    });

    if (intv.interview_feedback.length > 0) {
      const lastFeedbackDate = intv.interview_feedback[0].submitted_at;
      events.push({
        id: `fb-${intv.id}`,
        type: 'FEEDBACK_SUBMITTED',
        title: `Feedback Completed for Round ${intv.round}`,
        description: `All ${intv.interview_feedback.length} panel feedback evaluations submitted.`,
        timestamp: lastFeedbackDate,
        authorName: 'Evaluation Engine',
        metadata: { interviewId: intv.id, round: intv.round },
      });
    }
  }

  // Offers & Approvals & Candidate Portal Lifecycle
  for (const off of candidate.recruitment_offers || []) {
    events.push({
      id: `off-${off.id}`,
      type: 'OFFER_CREATED',
      title: `Offer Draft Created (v${off.version})`,
      description: `Offered Title: "${off.offered_title}" · Annual CTC: ₹${Number(off.offered_ctc || 0).toLocaleString('en-IN')} (${off.status})`,
      timestamp: off.created_at,
      authorName: 'Recruiter / HR',
      metadata: { offerId: off.id, version: off.version, status: off.status, offeredCtc: Number(off.offered_ctc) },
    });

    for (const app of off.recruitment_offer_approvals || []) {
      if (app.status === 'Approved' || app.status === 'Rejected') {
        events.push({
          id: `app-${app.id}`,
          type: app.status === 'Approved' ? 'OFFER_APPROVED' : 'OFFER_REJECTED',
          title: `Offer Approval Level ${app.sequence}: ${app.status}`,
          description: `Approver: ${app.employees?.name || app.approver_id}${app.note ? ` · Note: "${app.note}"` : ''}`,
          timestamp: app.acted_at || app.created_at,
          authorName: app.employees?.name || 'Approver',
          metadata: { offerId: off.id, level: app.sequence, status: app.status },
        });
      }
    }

    // Candidate Offer Viewed
    if (off.viewed_at) {
      events.push({
        id: `view-${off.id}`,
        type: 'OFFER_VIEWED',
        title: 'Offer Viewed by Candidate',
        description: `Candidate viewed offer details and compensation breakdown via the candidate portal.`,
        timestamp: off.viewed_at,
        authorName: candidate.name,
        metadata: { offerId: off.id, version: off.version },
      });
    }

    // Candidate Offer Responded (Accepted or Declined)
    if (off.status === 'Accepted') {
      events.push({
        id: `acc-${off.id}`,
        type: 'OFFER_ACCEPTED',
        title: 'Offer Accepted by Candidate',
        description: `Candidate confirmed acceptance of the employment offer for "${off.offered_title}".`,
        timestamp: off.responded_at || off.updated_at,
        authorName: candidate.name,
        metadata: { offerId: off.id, version: off.version, status: 'Accepted' },
      });
    } else if (off.status === 'Declined') {
      let reasonText = '';
      try {
        const snap = off.content_snapshot ? JSON.parse(off.content_snapshot) : null;
        if (snap?.declineReason) reasonText = ` · Reason: "${snap.declineReason}"`;
      } catch {}
      events.push({
        id: `dec-${off.id}`,
        type: 'OFFER_REJECTED',
        title: 'Offer Declined by Candidate',
        description: `Candidate declined the employment offer${reasonText}`,
        timestamp: off.responded_at || off.updated_at,
        authorName: candidate.name,
        metadata: { offerId: off.id, version: off.version, status: 'Declined' },
      });
    }

    // Electronic Signatures
    for (const sig of off.document_signatures || []) {
      if (sig.status === 'Signed' && sig.signed_at) {
        events.push({
          id: `sig-${sig.id}`,
          type: 'OFFER_SIGNED',
          title: 'Offer Documents Electronically Signed',
          description: `Signed by ${sig.signer_name} (${sig.signer_email}) · Provider: ${sig.provider}`,
          timestamp: sig.signed_at,
          authorName: sig.signer_name,
          metadata: { signatureId: sig.id, offerId: off.id },
        });
      }
    }

    // Generated Documents
    if (off.content_snapshot) {
      try {
        const snap = JSON.parse(off.content_snapshot);
        if (Array.isArray(snap.documents)) {
          for (const doc of snap.documents) {
            events.push({
              id: `doc-${doc.id}`,
              type: 'OFFER_DOCUMENT_GENERATED',
              title: `${doc.templateName || doc.documentType} Generated (v${doc.offerVersion})`,
              description: `Generated by ${doc.generatedByName || 'HR Operations'} · File: ${doc.fileName}`,
              timestamp: new Date(doc.generatedAt),
              authorName: doc.generatedByName || 'People Operations',
              metadata: { documentId: doc.id, documentType: doc.documentType, offerId: off.id },
            });
          }
        }
      } catch {
        // Ignore JSON parse error
      }
    }
  }

  // Onboarding status if exists
  if (candidate.onboarding) {
    events.push({
      id: `onb-${candidate.onboarding.id}`,
      type: 'ONBOARDING',
      title: `Onboarding Initiated (${candidate.onboarding.stage})`,
      description: `Employee record created with status: ${candidate.onboarding.status}`,
      timestamp: candidate.onboarding.updated_at,
      authorName: 'HR Operations',
      metadata: { onboardingStage: candidate.onboarding.stage, status: candidate.onboarding.status },
    });
  }

  // Sort descending by timestamp
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

