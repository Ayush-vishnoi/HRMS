import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { db } from '@/lib/db';
import {
  sendOfferAcceptedInternalEmail,
  sendOfferRejectedInternalEmail,
} from '@/lib/notifications/email-service';
import { generateServerSidePdfBuffer } from '@/lib/documents/pdf-generator';
import { buildDocumentContextData } from '@/lib/documents/offer-document-service';

/* ==========================================================================
   CANDIDATE PORTAL SERVICE
   Phase 4C-C4: Candidate-Facing Offer Experience
========================================================================== */

export interface CandidateOfferDetail {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobId: string;
  jobTitle: string;
  department: string;
  location: string;
  offeredTitle: string;
  offeredCtc: number;
  currency: string;
  proposedJoinDate: string | null;
  expiresAt: string | null;
  isExpired: boolean;
  status: string;
  version: number;
  viewedAt: string | null;
  respondedAt: string | null;
  compensation: any;
  documents: Array<{
    id: string;
    documentType: string;
    templateName: string;
    fileName: string;
    generatedAt: string;
    fileSizeBytes: number;
  }>;
  signatureStatus: 'Pending' | 'Signed' | 'Not_Required';
}

/**
 * Returns candidate dashboard summary
 */
export async function getCandidatePortalSummary(candidateId: string) {
  const candidate = await db.recruitmentCandidate.findUnique({
    where: { id: candidateId },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          department: true,
          location: true,
          employmentType: true,
        },
      },
      recruitment_offers: {
        where: {
          status: { in: ['Approved', 'Sent', 'Viewed', 'Accepted', 'Declined'] },
        },
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  });

  if (!candidate) {
    throw new Error('Candidate profile not found.');
  }

  const latestOffer = candidate.recruitment_offers[0] || null;

  return {
    candidate: {
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      stage: candidate.stage,
      currentRole: candidate.currentRole,
      experience: candidate.experience,
    },
    job: candidate.job,
    activeOffer: latestOffer
      ? {
          id: latestOffer.id,
          status: latestOffer.status,
          offeredTitle: latestOffer.offered_title,
          offeredCtc: Number(latestOffer.offered_ctc || 0),
          currency: latestOffer.currency,
          proposedJoinDate: latestOffer.proposed_join_date ? latestOffer.proposed_join_date.toISOString() : null,
          expiresAt: latestOffer.expires_at ? latestOffer.expires_at.toISOString() : null,
          isExpired: latestOffer.expires_at ? new Date(latestOffer.expires_at).getTime() < Date.now() : false,
          version: latestOffer.version,
        }
      : null,
  };
}

/**
 * Retrieves candidate's approved offer details
 * Validates candidate ownership and enforces Approved Offer Gate
 */
export async function getCandidateOffer(
  candidateId: string,
  offerId: string
): Promise<CandidateOfferDetail> {
  const offer = await db.recruitment_offers.findUnique({
    where: { id: offerId },
    include: {
      recruitment_candidates: {
        include: {
          job: true,
        },
      },
      document_signatures: true,
    },
  });

  if (!offer) {
    throw new Error('Offer not found.');
  }

  // IDOR & Authorization Protection: Derives from session candidateId
  if (offer.candidate_id !== candidateId) {
    throw new Error('You do not have authorization to view this offer.');
  }

  // Approved Offer Gate: Only allow Approved, Sent, Viewed, Accepted, Declined
  if (!['Approved', 'Sent', 'Viewed', 'Accepted', 'Declined'].includes(offer.status)) {
    throw new Error('Offer is not currently available for viewing.');
  }

  // Check Expiration
  const isExpired = offer.expires_at ? new Date(offer.expires_at).getTime() < Date.now() : false;

  // Auto-record first view if in Approved or Sent status
  let currentStatus = offer.status;
  let viewedAt = offer.viewed_at;

  if (!viewedAt && ['Approved', 'Sent'].includes(offer.status)) {
    const now = new Date();
    viewedAt = now;
    currentStatus = 'Viewed';

    await db.$transaction(async (tx) => {
      await tx.recruitment_offers.update({
        where: { id: offerId },
        data: {
          viewed_at: now,
          status: 'Viewed',
        },
      });

      await tx.auditLog.create({
        data: {
          id: `audit-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
          action: 'CANDIDATE_OFFER_VIEWED',
          module: 'Recruitment',
          employeeId: offer.recruitment_candidates.job?.recruiter_id || 'SYSTEM',
          details: JSON.stringify({
            offerId,
            candidateId,
            candidateName: offer.recruitment_candidates.name,
            viewedAt: now.toISOString(),
          }),
        },
      });
    });
  }

  // Extract parsed immutable compensation and documents from snapshot
  let compensation: any = null;
  let documents: any[] = [];

  try {
    const parsed = offer.content_snapshot ? JSON.parse(offer.content_snapshot) : null;
    if (parsed) {
      compensation = parsed.compensation || parsed;
      documents = (parsed.documents || []).map((doc: any) => ({
        id: doc.id,
        documentType: doc.documentType,
        templateName: doc.templateName,
        fileName: doc.fileName,
        generatedAt: doc.generatedAt,
        fileSizeBytes: doc.fileSizeBytes || 0,
      }));
    }
  } catch {
    // Non-fatal fallback
  }

  // Determine signature status
  const sigs = offer.document_signatures || [];
  const signatureStatus = sigs.length > 0 && sigs.every((s) => s.status === 'Signed') ? 'Signed' : 'Pending';

  return {
    id: offer.id,
    candidateId: offer.candidate_id,
    candidateName: offer.recruitment_candidates.name,
    candidateEmail: offer.recruitment_candidates.email,
    jobId: offer.recruitment_candidates.job.id,
    jobTitle: offer.recruitment_candidates.job.title,
    department: offer.recruitment_candidates.job.department,
    location: offer.recruitment_candidates.job.location,
    offeredTitle: offer.offered_title,
    offeredCtc: Number(offer.offered_ctc || 0),
    currency: offer.currency,
    proposedJoinDate: offer.proposed_join_date ? offer.proposed_join_date.toISOString() : null,
    expiresAt: offer.expires_at ? offer.expires_at.toISOString() : null,
    isExpired,
    status: currentStatus,
    version: offer.version,
    viewedAt: viewedAt ? viewedAt.toISOString() : null,
    respondedAt: offer.responded_at ? offer.responded_at.toISOString() : null,
    compensation,
    documents,
    signatureStatus,
  };
}

/**
 * Accepts an offer on behalf of the authenticated candidate
 */
export async function acceptCandidateOffer(
  candidateId: string,
  offerId: string,
  input?: { remarks?: string }
): Promise<{ success: boolean; message: string; offer: CandidateOfferDetail }> {
  const offer = await db.recruitment_offers.findUnique({
    where: { id: offerId },
    include: {
      recruitment_candidates: {
        include: {
          job: {
            include: {
              recruiter: true,
              hiringManager: true,
            },
          },
        },
      },
    },
  });

  if (!offer) {
    throw new Error('Offer not found.');
  }

  // IDOR & Authorization Protection
  if (offer.candidate_id !== candidateId) {
    throw new Error('You do not have authorization to accept this offer.');
  }

  // Idempotency: If already accepted, return controlled success
  if (offer.status === 'Accepted') {
    const detail = await getCandidateOffer(candidateId, offerId);
    return {
      success: true,
      message: 'Offer has already been accepted.',
      offer: detail,
    };
  }

  // Mutual Exclusivity: Declined offers cannot be accepted
  if (offer.status === 'Declined') {
    throw new Error('Declined offer cannot be accepted.');
  }

  // Validate state eligibility
  if (!['Approved', 'Sent', 'Viewed'].includes(offer.status)) {
    throw new Error(`Cannot accept offer in "${offer.status}" state.`);
  }

  // Expiration Check
  if (offer.expires_at && new Date(offer.expires_at).getTime() < Date.now()) {
    throw new Error('This offer has expired and can no longer be accepted.');
  }

  const respondedAt = new Date();

  await db.$transaction(async (tx) => {
    // 1. Update recruitment_offers status
    await tx.recruitment_offers.update({
      where: { id: offerId },
      data: {
        status: 'Accepted',
        responded_at: respondedAt,
      },
    });

    // 2. Create AuditLog
    await tx.auditLog.create({
      data: {
        id: `audit-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        action: 'CANDIDATE_OFFER_ACCEPTED',
        module: 'Recruitment',
        employeeId: offer.recruitment_candidates.job?.recruiter_id || 'SYSTEM',
        details: JSON.stringify({
          offerId,
          candidateId,
          candidateName: offer.recruitment_candidates.name,
          offeredTitle: offer.offered_title,
          offeredCtc: Number(offer.offered_ctc || 0),
          respondedAt: respondedAt.toISOString(),
          remarks: input?.remarks || null,
        }),
      },
    });

    // 3. Create UserNotifications for Recruiter and Hiring Manager
    const recruiterId = offer.recruitment_candidates.job?.recruiter_id;
    const hiringManagerId = offer.recruitment_candidates.job?.hiring_manager_id;
    const notifyUserIds = Array.from(new Set([recruiterId, hiringManagerId].filter(Boolean) as string[]));

    for (const userId of notifyUserIds) {
      await tx.userNotification.create({
        data: {
          id: `notif-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
          userId,
          title: 'Offer Accepted by Candidate',
          message: `Candidate ${offer.recruitment_candidates.name} has accepted the offer for ${offer.offered_title}.`,
          type: 'TaskAssignment',
          isRead: false,
          linkUrl: `/recruitment?candidateId=${candidateId}`,
          createdAt: new Date(),
        },
      });
    }
  }, { maxWait: 15000, timeout: 30000 });

  // 4. Dispatch Email Notifications
  const candidate = offer.recruitment_candidates;
  const recruiterEmail = candidate.job?.recruiter?.email || 'hr@mylotic.com';

  await sendOfferAcceptedInternalEmail({
    recruiterEmail,
    candidateName: candidate.name,
    jobTitle: offer.offered_title,
    respondedAt: respondedAt.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    portalUrl: `http://localhost:3000/recruitment?candidateId=${candidateId}`,
  }).catch(() => null);

  const updatedDetail = await getCandidateOffer(candidateId, offerId);

  return {
    success: true,
    message: 'Offer accepted successfully. Please proceed to review and sign your documents.',
    offer: updatedDetail,
  };
}

/**
 * Rejects an offer on behalf of the authenticated candidate with required reason
 */
export async function rejectCandidateOffer(
  candidateId: string,
  offerId: string,
  input: { reason: string }
): Promise<{ success: boolean; message: string; offer: CandidateOfferDetail }> {
  if (!input || !input.reason || typeof input.reason !== 'string' || input.reason.trim().length < 5) {
    throw new Error('Please provide a reason for declining the offer (at least 5 characters).');
  }

  const cleanReason = input.reason.trim();
  if (cleanReason.length > 1000) {
    throw new Error('Decline reason cannot exceed 1000 characters.');
  }

  const offer = await db.recruitment_offers.findUnique({
    where: { id: offerId },
    include: {
      recruitment_candidates: {
        include: {
          job: {
            include: {
              recruiter: true,
              hiringManager: true,
            },
          },
        },
      },
    },
  });

  if (!offer) {
    throw new Error('Offer not found.');
  }

  // IDOR & Authorization Protection
  if (offer.candidate_id !== candidateId) {
    throw new Error('You do not have authorization to decline this offer.');
  }

  // Idempotency: If already declined, return controlled success
  if (offer.status === 'Declined') {
    const detail = await getCandidateOffer(candidateId, offerId);
    return {
      success: true,
      message: 'Offer has already been declined.',
      offer: detail,
    };
  }

  // Mutual Exclusivity: Accepted offers cannot be declined
  if (offer.status === 'Accepted') {
    throw new Error('Accepted offer cannot be declined.');
  }

  // Validate state eligibility
  if (!['Approved', 'Sent', 'Viewed'].includes(offer.status)) {
    throw new Error(`Cannot decline offer in "${offer.status}" state.`);
  }

  const respondedAt = new Date();

  // Save decline reason into snapshot
  let updatedSnapshot: any = {};
  try {
    updatedSnapshot = offer.content_snapshot ? JSON.parse(offer.content_snapshot) : {};
  } catch {
    updatedSnapshot = {};
  }
  updatedSnapshot.declineReason = cleanReason;
  updatedSnapshot.declinedAt = respondedAt.toISOString();

  await db.$transaction(async (tx) => {
    // 1. Update recruitment_offers status
    await tx.recruitment_offers.update({
      where: { id: offerId },
      data: {
        status: 'Declined',
        responded_at: respondedAt,
        content_snapshot: JSON.stringify(updatedSnapshot),
      },
    });

    // 2. Create AuditLog
    await tx.auditLog.create({
      data: {
        id: `audit-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        action: 'CANDIDATE_OFFER_REJECTED',
        module: 'Recruitment',
        employeeId: offer.recruitment_candidates.job?.recruiter_id || 'SYSTEM',
        details: JSON.stringify({
          offerId,
          candidateId,
          candidateName: offer.recruitment_candidates.name,
          reason: cleanReason,
          respondedAt: respondedAt.toISOString(),
        }),
      },
    });

    // 3. Create UserNotifications for Recruiter and Hiring Manager
    const recruiterId = offer.recruitment_candidates.job?.recruiter_id;
    const hiringManagerId = offer.recruitment_candidates.job?.hiring_manager_id;
    const notifyUserIds = Array.from(new Set([recruiterId, hiringManagerId].filter(Boolean) as string[]));

    for (const userId of notifyUserIds) {
      await tx.userNotification.create({
        data: {
          id: `notif-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
          userId,
          title: 'Offer Declined by Candidate',
          message: `Candidate ${offer.recruitment_candidates.name} has declined the offer for ${offer.offered_title}. Reason: "${cleanReason}"`,
          type: 'TaskAssignment',
          isRead: false,
          linkUrl: `/recruitment?candidateId=${candidateId}`,
          createdAt: new Date(),
        },
      });
    }
  }, { maxWait: 15000, timeout: 30000 });

  // 4. Dispatch Email Notifications
  const candidate = offer.recruitment_candidates;
  const recruiterEmail = candidate.job?.recruiter?.email || 'hr@mylotic.com';

  await sendOfferRejectedInternalEmail({
    recruiterEmail,
    candidateName: candidate.name,
    jobTitle: offer.offered_title,
    reason: cleanReason,
    respondedAt: respondedAt.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    portalUrl: `http://localhost:3000/recruitment?candidateId=${candidateId}`,
  }).catch(() => null);

  const updatedDetail = await getCandidateOffer(candidateId, offerId);

  return {
    success: true,
    message: 'Offer declined.',
    offer: updatedDetail,
  };
}

/**
 * Securely retrieves an offer document buffer for candidate streaming download
 */
export async function getCandidateDocumentFile(
  candidateId: string,
  offerId: string,
  documentId: string
): Promise<{ fileBuffer: Buffer; fileName: string; contentType: string }> {
  const offer = await db.recruitment_offers.findUnique({
    where: { id: offerId },
    include: {
      recruitment_candidates: {
        include: {
          job: {
            include: {
              hiringManager: { select: { id: true, name: true, email: true } },
              recruiter: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
    },
  });

  if (!offer) {
    throw new Error('Offer not found.');
  }

  // IDOR Protection: Candidate must own the offer
  if (offer.candidate_id !== candidateId) {
    throw new Error('You do not have authorization to download documents from this offer.');
  }

  // Approved Offer Gate
  if (!['Approved', 'Sent', 'Viewed', 'Accepted', 'Declined'].includes(offer.status)) {
    throw new Error('Documents are not available for unapproved offers.');
  }

  let docs: any[] = [];
  try {
    const raw = offer.content_snapshot ? JSON.parse(offer.content_snapshot) : null;
    docs = raw?.documents || [];
  } catch {
    docs = [];
  }

  const docMeta = docs.find((d: any) => d.id === documentId);
  if (!docMeta) {
    throw new Error('Document not found in offer records.');
  }

  const safeFileName = path.basename(docMeta.storagePath);
  const fullPath = path.join(process.cwd(), 'uploads', 'documents', 'offers', safeFileName);

  let fileBuffer: Buffer;
  try {
    fileBuffer = await fs.readFile(fullPath);
  } catch {
    // Regenerate deterministic PDF buffer if local file was cleared
    const { contextData } = await buildDocumentContextData(offerId, {
      id: candidateId,
      name: offer.recruitment_candidates.name,
      email: offer.recruitment_candidates.email,
      department: offer.recruitment_candidates.job.department,
      userRole: 'employee',
    });
    fileBuffer = generateServerSidePdfBuffer({
      title: docMeta.templateName,
      documentType: docMeta.documentType,
      context: contextData,
    });
  }

  return {
    fileBuffer,
    fileName: docMeta.fileName || `${safeFileName}.pdf`,
    contentType: 'application/pdf',
  };
}
