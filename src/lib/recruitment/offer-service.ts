import { db } from '@/lib/db';
import { AuthorizationError } from '@/lib/auth-session';
import {
  type RecruitmentUser,
  canUserAccessJob,
} from '@/lib/recruitment/rbac-service';
import {
  calculateESIC,
  calculateGratuityProvision,
  calculateProfessionalTax,
  calculateProvidentFund,
} from '@/lib/payroll/statutory-engine';
import { validateStageTransition } from '@/lib/recruitment/candidate-service';

/* ==========================================================================
   TYPES & INTERFACES
========================================================================== */

export type RecruitmentOfferStatusType =
  | 'Draft'
  | 'PendingApproval'
  | 'Approved'
  | 'Sent'
  | 'Viewed'
  | 'Accepted'
  | 'Declined'
  | 'Expired'
  | 'Withdrawn';

export const ACTIVE_OFFER_STATUSES: RecruitmentOfferStatusType[] = [
  'Draft',
  'PendingApproval',
  'Approved',
  'Sent',
  'Viewed',
];

export const TERMINAL_OFFER_STATUSES: RecruitmentOfferStatusType[] = [
  'Accepted',
  'Declined',
  'Expired',
  'Withdrawn',
];

export type OfferCompensationBreakdown = {
  annualCtc: number;
  monthlyGross: number;
  annualGross: number;
  currency: string;
  components: {
    basicMonthly: number;
    hraMonthly: number;
    specialAllowanceMonthly: number;
    conveyanceMonthly: number;
    medicalAllowanceMonthly: number;
    ltaMonthly: number;
    basicAnnual: number;
    hraAnnual: number;
    specialAllowanceAnnual: number;
    conveyanceAnnual: number;
    medicalAllowanceAnnual: number;
    ltaAnnual: number;
  };
  employerContributions: {
    pfMonthly: number;
    esicMonthly: number;
    gratuityMonthly: number;
    pfAnnual: number;
    esicAnnual: number;
    gratuityAnnual: number;
    totalEmployerContributionsMonthly: number;
    totalEmployerContributionsAnnual: number;
  };
  employeeDeductions: {
    pfMonthly: number;
    esicMonthly: number;
    ptMonthly: number;
    totalEmployeeDeductionsMonthly: number;
  };
  variablePayAnnual: number;
  joiningBonus: number;
  retentionBonus: number;
  estimatedNetTakeHomeMonthly: number;
  totalEmployerCostMonthly: number;
  totalEmployerCostAnnual: number;
  generatedAt: string;
};

export type CreateOfferInput = {
  candidateId: string;
  offeredTitle: string;
  offeredCtc: number;
  currency?: string;
  proposedJoinDate?: string | Date;
  expiresAt?: string | Date;
  templateId?: string | null;
  variablePayAnnual?: number;
  joiningBonus?: number;
  retentionBonus?: number;
};

export type UpdateOfferInput = {
  offeredTitle?: string;
  offeredCtc?: number;
  currency?: string;
  proposedJoinDate?: string | Date | null;
  expiresAt?: string | Date | null;
  templateId?: string | null;
  variablePayAnnual?: number;
  joiningBonus?: number;
  retentionBonus?: number;
};

export type OfferFilterParams = {
  candidateId?: string;
  status?: RecruitmentOfferStatusType;
  recruiterId?: string;
  dateFrom?: string | Date;
  dateTo?: string | Date;
};

/* ==========================================================================
   COMPENSATION CALCULATION ENGINE
========================================================================== */

/**
 * Calculates deterministic India compensation breakdown from Annual CTC
 * Reuses statutory PF, ESIC, Gratuity, and PT rules from Phase 2 payroll engine
 */
export function calculateOfferCompensation(
  annualCtc: number,
  options?: {
    currency?: string;
    isMetro?: boolean;
    variablePayAnnual?: number;
    joiningBonus?: number;
    retentionBonus?: number;
  }
): OfferCompensationBreakdown {
  if (typeof annualCtc !== 'number' || isNaN(annualCtc) || annualCtc <= 0) {
    throw new Error('Annual CTC must be a positive number greater than 0.');
  }

  const currency = options?.currency || 'INR';
  if (currency !== 'INR') {
    throw new Error(`Unsupported currency "${currency}". Currently only "INR" is supported.`);
  }

  const variablePayAnnual = Math.max(0, options?.variablePayAnnual || 0);
  const joiningBonus = Math.max(0, options?.joiningBonus || 0);
  const retentionBonus = Math.max(0, options?.retentionBonus || 0);

  // Base fixed annual CTC (excluding annual variable pay)
  const fixedAnnualCtc = Math.max(0, annualCtc - variablePayAnnual);
  const monthlyCtc = Math.round(fixedAnnualCtc / 12);

  // Standard India Structure: Basic = 50% of Monthly CTC
  const basicMonthly = Math.round(monthlyCtc * 0.5);

  // HRA: 50% of Basic for Metro, 40% for Non-Metro
  const isMetro = options?.isMetro !== false;
  const hraMonthly = Math.round(basicMonthly * (isMetro ? 0.5 : 0.4));

  // Fixed Monthly Allowances
  const conveyanceMonthly = 1600;
  const medicalAllowanceMonthly = 1250;
  const ltaMonthly = 0;

  // Statutory Calculations
  const pfResult = calculateProvidentFund(basicMonthly);
  const pfEmployerMonthly = pfResult.employerPF;
  const pfEmployeeMonthly = pfResult.employeePF;

  const gratuityMonthly = Math.round(calculateGratuityProvision(basicMonthly));

  // Preliminary Gross for ESIC check
  const preliminaryGross = basicMonthly + hraMonthly + conveyanceMonthly + medicalAllowanceMonthly;
  const esicResult = calculateESIC(preliminaryGross);
  const esicEmployerMonthly = esicResult.employerESIC;
  const esicEmployeeMonthly = esicResult.employeeESIC;

  // Balancing Special Allowance: Monthly CTC - (Basic + HRA + Conveyance + Medical + LTA + Employer PF + Employer ESIC + Gratuity)
  const subtotalBeforeSpecial =
    basicMonthly +
    hraMonthly +
    conveyanceMonthly +
    medicalAllowanceMonthly +
    ltaMonthly +
    pfEmployerMonthly +
    esicEmployerMonthly +
    gratuityMonthly;

  const specialAllowanceMonthly = Math.max(0, monthlyCtc - subtotalBeforeSpecial);

  // Normalized Monthly Gross Earnings
  const monthlyGross =
    basicMonthly +
    hraMonthly +
    conveyanceMonthly +
    medicalAllowanceMonthly +
    ltaMonthly +
    specialAllowanceMonthly;
  const annualGross = monthlyGross * 12;

  // Employer Contributions
  const totalEmployerContributionsMonthly =
    pfEmployerMonthly + esicEmployerMonthly + gratuityMonthly;
  const totalEmployerContributionsAnnual = totalEmployerContributionsMonthly * 12;

  // Professional Tax (Standard Karnataka Slab: 200/month above 25k)
  const ptMonthly = calculateProfessionalTax(monthlyGross, 'Karnataka');
  const totalEmployeeDeductionsMonthly =
    pfEmployeeMonthly + esicEmployeeMonthly + ptMonthly;

  // Net Take-Home (excluding income tax TDS which depends on candidate regime/declarations)
  const estimatedNetTakeHomeMonthly = Math.max(
    0,
    monthlyGross - totalEmployeeDeductionsMonthly
  );

  const totalEmployerCostMonthly = monthlyGross + totalEmployerContributionsMonthly;
  const totalEmployerCostAnnual = totalEmployerCostMonthly * 12 + variablePayAnnual;

  return {
    annualCtc,
    monthlyGross,
    annualGross,
    currency,
    components: {
      basicMonthly,
      hraMonthly,
      specialAllowanceMonthly,
      conveyanceMonthly,
      medicalAllowanceMonthly,
      ltaMonthly,
      basicAnnual: basicMonthly * 12,
      hraAnnual: hraMonthly * 12,
      specialAllowanceAnnual: specialAllowanceMonthly * 12,
      conveyanceAnnual: conveyanceMonthly * 12,
      medicalAllowanceAnnual: medicalAllowanceMonthly * 12,
      ltaAnnual: ltaMonthly * 12,
    },
    employerContributions: {
      pfMonthly: pfEmployerMonthly,
      esicMonthly: esicEmployerMonthly,
      gratuityMonthly,
      pfAnnual: pfEmployerMonthly * 12,
      esicAnnual: esicEmployerMonthly * 12,
      gratuityAnnual: gratuityMonthly * 12,
      totalEmployerContributionsMonthly,
      totalEmployerContributionsAnnual,
    },
    employeeDeductions: {
      pfMonthly: pfEmployeeMonthly,
      esicMonthly: esicEmployeeMonthly,
      ptMonthly,
      totalEmployeeDeductionsMonthly,
    },
    variablePayAnnual,
    joiningBonus,
    retentionBonus,
    estimatedNetTakeHomeMonthly,
    totalEmployerCostMonthly,
    totalEmployerCostAnnual,
    generatedAt: new Date().toISOString(),
  };
}

/* ==========================================================================
   VALIDATION HELPERS
========================================================================== */

/**
 * Validates payload for offer creation or update
 */
export function validateOfferPayload(
  input: CreateOfferInput | UpdateOfferInput,
  options?: { isUpdate?: boolean }
) {
  // Title validation
  if (!options?.isUpdate || input.offeredTitle !== undefined) {
    if (!input.offeredTitle || typeof input.offeredTitle !== 'string') {
      throw new Error('Offered role title is required.');
    }
    const cleanTitle = input.offeredTitle.trim();
    if (cleanTitle.length < 2 || cleanTitle.length > 120) {
      throw new Error('Offered title must be between 2 and 120 characters.');
    }
    if (/<[^>]*>/g.test(cleanTitle)) {
      throw new Error('Offered title cannot contain HTML or script tags.');
    }
  }

  // CTC validation
  if (!options?.isUpdate || input.offeredCtc !== undefined) {
    if (typeof input.offeredCtc !== 'number' || isNaN(input.offeredCtc) || input.offeredCtc <= 0) {
      throw new Error('Offered Annual CTC must be a positive number greater than 0.');
    }
  }

  // Currency validation
  if (input.currency !== undefined && input.currency !== null) {
    if (input.currency !== 'INR') {
      throw new Error(`Unsupported currency "${input.currency}". Currently only "INR" is supported.`);
    }
  }

  // Dates validation
  let parsedJoinDate: Date | null = null;
  let parsedExpiresAt: Date | null = null;

  if (input.proposedJoinDate) {
    parsedJoinDate = new Date(input.proposedJoinDate);
    if (isNaN(parsedJoinDate.getTime())) {
      throw new Error('Invalid proposed joining date format.');
    }
  }

  if (input.expiresAt) {
    parsedExpiresAt = new Date(input.expiresAt);
    if (isNaN(parsedExpiresAt.getTime())) {
      throw new Error('Invalid offer expiry date format.');
    }
  }

  if (parsedExpiresAt && parsedJoinDate) {
    if (parsedExpiresAt.getTime() > parsedJoinDate.getTime()) {
      throw new Error('Offer expiry date cannot be after the proposed joining date.');
    }
  }
}

/* ==========================================================================
   RBAC HELPERS
========================================================================== */

/**
 * Returns Prisma filter for offers accessible by the authenticated user
 */
export function getOfferFilterForUser(user: RecruitmentUser) {
  if (user.userRole === 'admin') {
    return {};
  }

  if (user.userRole === 'manager') {
    return {
      recruitment_candidates: {
        job: {
          OR: [
            { hiring_manager_id: user.id },
            { recruiter_id: user.id },
          ],
        },
      },
    };
  }

  // Normal employees have no recruitment offer access
  return { id: 'NO_ACCESS_PERMITTED' };
}

/**
 * Checks if a user has access to view an offer
 */
export function canUserAccessOffer(
  user: RecruitmentUser,
  target: {
    assigned_recruiter_id?: string | null;
    job?: { hiring_manager_id?: string | null; recruiter_id?: string | null } | null;
    recruitment_candidates?: {
      assigned_recruiter_id?: string | null;
      job?: { hiring_manager_id?: string | null; recruiter_id?: string | null } | null;
    } | null;
  }
): boolean {
  if (user.userRole === 'admin') return true;

  const cand = target.recruitment_candidates || target;
  const job = cand?.job;
  if (!job && !cand) return false;

  return (
    job?.hiring_manager_id === user.id ||
    job?.recruiter_id === user.id ||
    cand?.assigned_recruiter_id === user.id
  );
}

/**
 * Checks if user has permission to create or edit an offer
 */
export function canUserManageOffer(
  user: RecruitmentUser,
  target: {
    assigned_recruiter_id?: string | null;
    job?: { hiring_manager_id?: string | null; recruiter_id?: string | null } | null;
    recruitment_candidates?: {
      assigned_recruiter_id?: string | null;
      job?: { hiring_manager_id?: string | null; recruiter_id?: string | null } | null;
    } | null;
  }
): boolean {
  if (user.userRole === 'admin') return true;

  const candidate = target.recruitment_candidates || target;
  const job = candidate.job;
  if (!job && !candidate) return false;

  // Recruiter or Hiring Manager assigned to the job/candidate
  return (
    job?.recruiter_id === user.id ||
    candidate.assigned_recruiter_id === user.id ||
    job?.hiring_manager_id === user.id
  );
}

/* ==========================================================================
   OFFER CORE CRUD OPERATIONS
========================================================================== */

/**
 * Creates a new offer record for a Selected candidate
 * - Validates candidate eligibility (MUST be in 'Selected' stage)
 * - Checks active offer uniqueness (prevents duplicate active offers)
 * - Validates template if supplied (must be Offer_Letter)
 * - Calculates deterministic compensation snapshot
 * - Transitions candidate stage from 'Selected' to 'Offer'
 * - Records AuditLog and UserNotification
 */
export async function createOffer(input: CreateOfferInput, user: RecruitmentUser) {
  // 1. Validate payload
  validateOfferPayload(input);

  // 2. Lookup Candidate and verify RBAC
  const candidate = await db.recruitmentCandidate.findUnique({
    where: { id: input.candidateId },
    include: {
      job: true,
      recruitment_offers: {
        orderBy: { version: 'desc' },
      },
    },
  });

  if (!candidate) {
    throw new Error('Candidate not found.');
  }

  if (!canUserManageOffer(user, candidate)) {
    throw new Error('Not authorized to create an offer for this candidate.');
  }

  // 3. Validate Candidate Stage Eligibility (Must be Selected)
  if (candidate.stage !== 'Selected') {
    throw new Error(
      `Candidate is not eligible for an offer (must be in "Selected" stage). Current stage: "${candidate.stage}".`
    );
  }

  // 4. Check Active Offer Uniqueness (Only one active offer permitted)
  const existingActiveOffer = candidate.recruitment_offers.find((o) =>
    ACTIVE_OFFER_STATUSES.includes(o.status as RecruitmentOfferStatusType)
  );

  if (existingActiveOffer) {
    throw new Error(
      `Candidate already has an active offer ("${existingActiveOffer.id}" in "${existingActiveOffer.status}" status). Please edit or resolve the existing offer before creating a new one.`
    );
  }

  // 5. Validate Template if supplied
  if (input.templateId) {
    const template = await db.documentTemplate.findUnique({
      where: { id: input.templateId },
    });
    if (!template) {
      throw new Error(`Document template "${input.templateId}" not found.`);
    }
    if (template.type !== 'Offer_Letter') {
      throw new Error(
        `Invalid template type "${template.type}". Only "Offer_Letter" templates can be selected for offers.`
      );
    }
  }

  // 6. Compute Next Version
  const currentMaxVersion = candidate.recruitment_offers.reduce(
    (max, o) => Math.max(max, o.version),
    0
  );
  const nextVersion = currentMaxVersion + 1;

  // 7. Calculate Deterministic Compensation Snapshot
  const compensationSnapshot = calculateOfferCompensation(input.offeredCtc, {
    currency: input.currency || 'INR',
    variablePayAnnual: input.variablePayAnnual,
    joiningBonus: input.joiningBonus,
    retentionBonus: input.retentionBonus,
  });

  const offerId = `OFF-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  // 8. Execute Atomic Transaction
  const result = await db.$transaction(
    async (tx) => {
      // Create Offer Record
      const newOffer = await tx.recruitment_offers.create({
        data: {
          id: offerId,
          candidate_id: candidate.id,
          template_id: input.templateId || null,
          status: 'Draft',
          version: nextVersion,
          offered_title: input.offeredTitle.trim(),
          offered_ctc: input.offeredCtc,
          currency: input.currency || 'INR',
          proposed_join_date: input.proposedJoinDate ? new Date(input.proposedJoinDate) : null,
          expires_at: input.expiresAt ? new Date(input.expiresAt) : null,
          content_snapshot: JSON.stringify(compensationSnapshot),
          created_at: new Date(),
          updated_at: new Date(),
        },
        include: {
          recruitment_candidates: {
            include: { job: true },
          },
          document_templates: true,
        },
      });

      // Transition candidate stage: Selected -> Offer
      validateStageTransition(candidate.stage, 'Offer');

      await tx.recruitmentCandidate.update({
        where: { id: candidate.id },
        data: { stage: 'Offer', updatedAt: new Date() },
      });

      await tx.candidate_stage_history.create({
        data: {
          candidate_id: candidate.id,
          from_stage: 'Selected',
          to_stage: 'Offer',
          changed_by_id: user.id,
          note: `Offer Draft (v${nextVersion}) created for "${input.offeredTitle}" with CTC ₹${input.offeredCtc.toLocaleString('en-IN')}.`,
        },
      });

      // Create AuditLog
      await tx.auditLog.create({
        data: {
          id: `audit-off-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          action: 'OFFER_CREATED',
          module: 'Recruitment',
          employeeId: user.id,
          details: JSON.stringify({
            offerId: newOffer.id,
            candidateId: candidate.id,
            candidateName: candidate.name,
            jobId: candidate.jobId,
            jobTitle: candidate.job.title,
            version: nextVersion,
            offeredTitle: newOffer.offered_title,
            offeredCtc: Number(newOffer.offered_ctc),
            currency: newOffer.currency,
            proposedJoinDate: newOffer.proposed_join_date,
            expiresAt: newOffer.expires_at,
          }),
        },
      });

      // Notify Hiring Manager / Recruiter / HR Stakeholders
      const targetNotificationUsers = new Set<string>();
      if (candidate.job.hiring_manager_id) {
        targetNotificationUsers.add(candidate.job.hiring_manager_id);
      }
      if (candidate.job.recruiter_id) {
        targetNotificationUsers.add(candidate.job.recruiter_id);
      }
      if (candidate.assigned_recruiter_id) {
        targetNotificationUsers.add(candidate.assigned_recruiter_id);
      }
      if (targetNotificationUsers.size === 0) {
        targetNotificationUsers.add(user.id);
      }

      for (const notifyUserId of targetNotificationUsers) {
        await tx.userNotification.create({
          data: {
            id: `notif-off-${Date.now()}-${notifyUserId}-${Math.random().toString(36).substring(2, 5)}`,
            userId: notifyUserId,
            title: 'Offer Draft Created',
            message: `${user.name} created an offer draft (v${nextVersion}) for ${candidate.name} as "${input.offeredTitle}".`,
            type: 'TaskAssignment',
            linkUrl: '/recruitment',
          },
        });
      }

      return newOffer;
    },
    { timeout: 25000, maxWait: 15000 }
  );

  return result;
}

/**
 * Updates a Draft offer record
 * - Enforces immutability for non-Draft offers
 * - Recalculates compensation snapshot if CTC or components change
 * - Records AuditLog
 */
export async function updateOffer(
  offerId: string,
  input: UpdateOfferInput,
  user: RecruitmentUser
) {
  // 1. Validate payload
  validateOfferPayload(input, { isUpdate: true });

  // 2. Lookup Offer & verify authorization
  const offer = await db.recruitment_offers.findUnique({
    where: { id: offerId },
    include: {
      recruitment_candidates: {
        include: { job: true },
      },
      document_templates: true,
    },
  });

  if (!offer) {
    throw new Error('Offer not found.');
  }

  if (!canUserManageOffer(user, offer.recruitment_candidates)) {
    throw new Error('Not authorized to update this offer.');
  }

  // 3. Immutability Check: Only Draft offers can be updated
  if (offer.status !== 'Draft') {
    throw new Error(
      `Cannot modify offer in "${offer.status}" status. Only "Draft" offers are editable.`
    );
  }

  // 4. Validate Template if changed
  if (input.templateId) {
    const template = await db.documentTemplate.findUnique({
      where: { id: input.templateId },
    });
    if (!template) {
      throw new Error(`Document template "${input.templateId}" not found.`);
    }
    if (template.type !== 'Offer_Letter') {
      throw new Error(
        `Invalid template type "${template.type}". Only "Offer_Letter" templates can be selected.`
      );
    }
  }

  // 5. Recalculate compensation snapshot if CTC changed
  let updatedSnapshot = offer.content_snapshot;
  const newCtc = input.offeredCtc !== undefined ? input.offeredCtc : Number(offer.offered_ctc);

  if (
    input.offeredCtc !== undefined ||
    input.currency !== undefined ||
    input.variablePayAnnual !== undefined ||
    input.joiningBonus !== undefined ||
    input.retentionBonus !== undefined
  ) {
    const newSnapshotObj = calculateOfferCompensation(newCtc, {
      currency: input.currency || offer.currency,
      variablePayAnnual: input.variablePayAnnual,
      joiningBonus: input.joiningBonus,
      retentionBonus: input.retentionBonus,
    });
    updatedSnapshot = JSON.stringify(newSnapshotObj);
  }

  // 6. Execute atomic update
  const result = await db.$transaction(
    async (tx) => {
      const updated = await tx.recruitment_offers.update({
        where: { id: offerId },
        data: {
          offered_title: input.offeredTitle ? input.offeredTitle.trim() : undefined,
          offered_ctc: input.offeredCtc !== undefined ? input.offeredCtc : undefined,
          currency: input.currency || undefined,
          proposed_join_date:
            input.proposedJoinDate !== undefined
              ? input.proposedJoinDate
                ? new Date(input.proposedJoinDate)
                : null
              : undefined,
          expires_at:
            input.expiresAt !== undefined
              ? input.expiresAt
                ? new Date(input.expiresAt)
                : null
              : undefined,
          template_id: input.templateId !== undefined ? input.templateId : undefined,
          content_snapshot: updatedSnapshot,
          updated_at: new Date(),
        },
        include: {
          recruitment_candidates: {
            include: { job: true },
          },
          document_templates: true,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          id: `audit-off-upd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          action: 'OFFER_UPDATED',
          module: 'Recruitment',
          employeeId: user.id,
          details: JSON.stringify({
            offerId: updated.id,
            candidateId: offer.candidate_id,
            candidateName: offer.recruitment_candidates.name,
            version: updated.version,
            offeredTitle: updated.offered_title,
            offeredCtc: Number(updated.offered_ctc),
            currency: updated.currency,
            proposedJoinDate: updated.proposed_join_date,
            expiresAt: updated.expires_at,
          }),
        },
      });

      return updated;
    },
    { timeout: 20000, maxWait: 10000 }
  );

  return result;
}

/**
 * Returns list of offers with RBAC filtering and optional search criteria
 */
export async function getOffers(filters: OfferFilterParams, user: RecruitmentUser) {
  const rbacFilter = getOfferFilterForUser(user);

  const where: any = {
    ...rbacFilter,
  };

  if (filters.candidateId) {
    where.candidate_id = filters.candidateId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.recruiterId) {
    where.recruitment_candidates = {
      ...where.recruitment_candidates,
      assigned_recruiter_id: filters.recruiterId,
    };
  }

  if (filters.dateFrom || filters.dateTo) {
    where.created_at = {};
    if (filters.dateFrom) where.created_at.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.created_at.lte = new Date(filters.dateTo);
  }

  const rawOffers = await db.recruitment_offers.findMany({
    where,
    include: {
      recruitment_candidates: {
        include: {
          job: {
            select: {
              id: true,
              title: true,
              department: true,
              location: true,
              hiring_manager_id: true,
              recruiter_id: true,
            },
          },
        },
      },
      document_templates: {
        select: {
          id: true,
          name: true,
          type: true,
          version: true,
        },
      },
      recruitment_offer_approvals: {
        orderBy: { sequence: 'asc' },
      },
    },
    orderBy: [{ created_at: 'desc' }, { version: 'desc' }],
  });

  return rawOffers.map((o) => {
    let parsedSnapshot: OfferCompensationBreakdown | null = null;
    try {
      if (o.content_snapshot) {
        parsedSnapshot = JSON.parse(o.content_snapshot);
      }
    } catch (e) {}

    const approvals = o.recruitment_offer_approvals || [];
    const activeApproval = approvals.find((a) => a.status === 'Pending');
    const completedCount = approvals.filter((a) => a.status === 'Approved').length;

    return {
      ...o,
      compensationSnapshot: parsedSnapshot,
      approvalSummary: {
        currentLevel: activeApproval ? activeApproval.sequence : null,
        totalLevels: approvals.length,
        completedLevels: completedCount,
      },
    };
  });
}

/**
 * Fetches single offer by ID with parsed compensation snapshot, approval summary, and RBAC checks
 */
export async function getOfferById(offerId: string, user: RecruitmentUser) {
  const offer = await db.recruitment_offers.findUnique({
    where: { id: offerId },
    include: {
      recruitment_candidates: {
        include: {
          job: true,
        },
      },
      document_templates: true,
      recruitment_offer_approvals: {
        include: {
          employees: {
            select: {
              id: true,
              name: true,
              email: true,
              roleTitle: true,
              userRole: true,
            },
          },
        },
        orderBy: { sequence: 'asc' },
      },
      document_signatures: true,
      employee_onboardings: true,
    },
  });

  if (!offer) {
    throw new Error('Offer not found.');
  }

  if (!canUserAccessOffer(user, offer)) {
    throw new AuthorizationError();
  }

  let parsedSnapshot: OfferCompensationBreakdown | null = null;
  try {
    if (offer.content_snapshot) {
      parsedSnapshot = JSON.parse(offer.content_snapshot);
    }
  } catch (e) {}

  const approvals = offer.recruitment_offer_approvals || [];
  const activeApproval = approvals.find((a) => a.status === 'Pending');
  const completedCount = approvals.filter((a) => a.status === 'Approved').length;
  const canCurrentUserApprove =
    offer.status === 'PendingApproval' &&
    activeApproval !== undefined &&
    (activeApproval.approver_id === user.id || user.userRole === 'admin');

  return {
    ...offer,
    compensationSnapshot: parsedSnapshot,
    approvalSummary: {
      currentLevel: activeApproval ? activeApproval.sequence : null,
      totalLevels: approvals.length,
      completedLevels: completedCount,
      pendingApprover: activeApproval ? activeApproval.employees : null,
      canCurrentUserApprove,
    },
  };
}

/* ==========================================================================
   MULTI-LEVEL APPROVAL WORKFLOW SERVICE
========================================================================== */

export const VALID_OFFER_STATUS_TRANSITIONS: Record<
  RecruitmentOfferStatusType,
  RecruitmentOfferStatusType[]
> = {
  Draft: ['PendingApproval', 'Withdrawn'],
  PendingApproval: ['Approved', 'Declined', 'Draft', 'Withdrawn'],
  Approved: ['Sent', 'Withdrawn'],
  Sent: ['Viewed', 'Accepted', 'Declined', 'Expired', 'Withdrawn'],
  Viewed: ['Accepted', 'Declined', 'Expired', 'Withdrawn'],
  Accepted: [],
  Declined: [],
  Expired: [],
  Withdrawn: [],
};

/**
 * Validates offer state machine transition
 */
export function validateOfferStatusTransition(
  currentStatus: string,
  nextStatus: string
): boolean {
  if (currentStatus === nextStatus) return true;

  const validNext =
    VALID_OFFER_STATUS_TRANSITIONS[currentStatus as RecruitmentOfferStatusType] || [];
  if (!validNext.includes(nextStatus as RecruitmentOfferStatusType)) {
    throw new Error(
      `Invalid offer status transition from "${currentStatus}" to "${nextStatus}". Allowed transitions are: ${
        validNext.length > 0 ? validNext.join(', ') : 'None (terminal state)'
      }.`
    );
  }
  return true;
}

/**
 * Submits a draft offer for sequential multi-level approval
 */
export async function submitOfferForApproval(
  offerId: string,
  user: RecruitmentUser,
  options?: {
    approverIds?: string[];
    note?: string;
  }
) {
  const offer = await db.recruitment_offers.findUnique({
    where: { id: offerId },
    include: {
      recruitment_candidates: {
        include: { job: true },
      },
      recruitment_offer_approvals: {
        orderBy: { sequence: 'asc' },
      },
    },
  });

  if (!offer) {
    throw new Error('Offer not found.');
  }

  if (!canUserManageOffer(user, offer)) {
    throw new AuthorizationError();
  }

  if (offer.status !== 'Draft') {
    throw new Error(
      `Only Draft offers can be submitted for approval. Current status is "${offer.status}".`
    );
  }

  if (!offer.content_snapshot) {
    throw new Error(
      'Offer does not have a compensation snapshot. Please update the offer first.'
    );
  }
  if (!offer.offered_title || offer.offered_title.trim().length === 0) {
    throw new Error('Offer title is required before submission.');
  }
  if (!offer.offered_ctc || Number(offer.offered_ctc) <= 0) {
    throw new Error('Offered CTC must be greater than 0 before submission.');
  }
  if (offer.recruitment_candidates.stage !== 'Offer') {
    throw new Error(
      `Candidate must be in Offer stage. Current stage is "${offer.recruitment_candidates.stage}".`
    );
  }

  const candidate = offer.recruitment_candidates;
  const job = candidate.job;

  const level1Approver = options?.approverIds?.[0] || job?.hiring_manager_id || 'EMP-006';
  let level2Approver = options?.approverIds?.[1] || job?.recruiter_id || 'EMP-001';
  if (level2Approver === level1Approver) {
    level2Approver = 'EMP-001';
  }

  const chain = [
    { sequence: 1, approverId: level1Approver },
    { sequence: 2, approverId: level2Approver },
  ];

  const result = await db.$transaction(async (tx) => {
    // Delete existing approval records from previous cycles if any
    await tx.recruitment_offer_approvals.deleteMany({
      where: { offer_id: offerId },
    });

    const approvals = [];
    for (const step of chain) {
      const isFirst = step.sequence === 1;
      const appRecord = await tx.recruitment_offer_approvals.create({
        data: {
          id: `app-off-${offerId}-${step.sequence}-${Date.now()}`,
          offer_id: offerId,
          sequence: step.sequence,
          approver_id: step.approverId,
          status: isFirst ? 'Pending' : 'Draft',
          note: isFirst ? (options?.note || 'Submitted for Level 1 review.') : null,
        },
      });
      approvals.push(appRecord);
    }

    const updatedOffer = await tx.recruitment_offers.update({
      where: { id: offerId },
      data: {
        status: 'PendingApproval',
        updated_at: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        id: `audit-off-sub-${Date.now()}`,
        action: 'OFFER_SUBMITTED_FOR_APPROVAL',
        module: 'Recruitment',
        employeeId: user.id,
        details: JSON.stringify({
          offerId,
          candidateId: candidate.id,
          candidateName: candidate.name,
          version: offer.version,
          chain: chain.map((c) => ({ sequence: c.sequence, approverId: c.approverId })),
          submittedBy: user.id,
          note: options?.note,
        }),
      },
    });

    await tx.userNotification.create({
      data: {
        id: `notif-off-app-${Date.now()}`,
        userId: level1Approver,
        title: 'Offer Approval Required',
        message: `Formal offer (v${offer.version}) for ${candidate.name} (${offer.offered_title}) requires your Level 1 approval.`,
        type: 'TaskAssignment',
        linkUrl: '/recruitment',
      },
    });

    return {
      offer: updatedOffer,
      approvals,
    };
  }, { maxWait: 10000, timeout: 20000 });

  return result;
}

export type ProcessOfferApprovalInput = {
  action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';
  comment?: string;
};

/**
 * Processes an approval action (Approve, Reject, Request Changes) on an offer
 */
export async function processOfferApprovalAction(
  offerId: string,
  input: ProcessOfferApprovalInput,
  user: RecruitmentUser
) {
  const { action, comment } = input;

  if (!action || !['APPROVE', 'REJECT', 'REQUEST_CHANGES'].includes(action)) {
    throw new Error('Valid action (APPROVE, REJECT, REQUEST_CHANGES) is required.');
  }

  if (
    (action === 'REJECT' || action === 'REQUEST_CHANGES') &&
    (!comment || comment.trim().length === 0)
  ) {
    throw new Error(`A reason/comment is required when performing ${action}.`);
  }

  const offer = await db.recruitment_offers.findUnique({
    where: { id: offerId },
    include: {
      recruitment_candidates: {
        include: { job: true },
      },
      recruitment_offer_approvals: {
        include: {
          employees: {
            select: { id: true, name: true, email: true, roleTitle: true },
          },
        },
        orderBy: { sequence: 'asc' },
      },
    },
  });

  if (!offer) {
    throw new Error('Offer not found.');
  }

  if (offer.status !== 'PendingApproval') {
    throw new Error(`Offer is not pending approval. Current status is "${offer.status}".`);
  }

  const approvals = offer.recruitment_offer_approvals;
  if (!approvals || approvals.length === 0) {
    throw new Error('No approval records found for this offer.');
  }

  const activeApproval = approvals.find((a) => a.status === 'Pending');
  if (!activeApproval) {
    throw new Error('No active pending approval level found.');
  }

  const isAssignedApprover = activeApproval.approver_id === user.id;
  const isAdmin = user.userRole === 'admin';

  if (!isAssignedApprover && !isAdmin) {
    throw new AuthorizationError();
  }

  const candidate = offer.recruitment_candidates;
  const job = candidate.job;
  const candidateName = candidate.name;
  const candidateId = candidate.id;
  const recruiterId = job?.recruiter_id || candidate.assigned_recruiter_id;
  const hiringManagerId = job?.hiring_manager_id;

  const result = await db.$transaction(async (tx) => {
    // Concurrency / idempotency verification inside transaction
    const lockedActive = await tx.recruitment_offer_approvals.findUnique({
      where: { id: activeApproval.id },
    });

    if (!lockedActive || lockedActive.status !== 'Pending') {
      throw new Error(
        'This approval level has already been processed or is no longer pending.'
      );
    }

    if (action === 'APPROVE') {
      await tx.recruitment_offer_approvals.update({
        where: { id: activeApproval.id },
        data: {
          status: 'Approved',
          acted_at: new Date(),
          note: comment?.trim() || 'Approved.',
        },
      });

      const nextLevel = approvals.find(
        (a) => a.sequence > activeApproval.sequence && a.status === 'Draft'
      );

      if (nextLevel) {
        await tx.recruitment_offer_approvals.update({
          where: { id: nextLevel.id },
          data: {
            status: 'Pending',
          },
        });

        await tx.auditLog.create({
          data: {
            id: `audit-off-app-${Date.now()}`,
            action: 'OFFER_APPROVED',
            module: 'Recruitment',
            employeeId: user.id,
            details: JSON.stringify({
              offerId,
              candidateId,
              sequence: activeApproval.sequence,
              approverId: user.id,
              isOverride: !isAssignedApprover && isAdmin,
              nextSequence: nextLevel.sequence,
              nextApproverId: nextLevel.approver_id,
              comment,
            }),
          },
        });

        await tx.userNotification.create({
          data: {
            id: `notif-off-next-${Date.now()}`,
            userId: nextLevel.approver_id,
            title: `Offer Approval Required (Level ${nextLevel.sequence})`,
            message: `Offer for ${candidateName} was approved at Level ${activeApproval.sequence} and now requires your approval.`,
            type: 'TaskAssignment',
            linkUrl: '/recruitment',
          },
        });

        return {
          offerStatus: 'PendingApproval',
          levelApproved: activeApproval.sequence,
          nextLevel: nextLevel.sequence,
          isFullyApproved: false,
        };
      } else {
        const fullyApprovedOffer = await tx.recruitment_offers.update({
          where: { id: offerId },
          data: {
            status: 'Approved',
            updated_at: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            id: `audit-off-full-${Date.now()}`,
            action: 'OFFER_FULLY_APPROVED',
            module: 'Recruitment',
            employeeId: user.id,
            details: JSON.stringify({
              offerId,
              candidateId,
              version: offer.version,
              finalLevel: activeApproval.sequence,
              approverId: user.id,
              isOverride: !isAssignedApprover && isAdmin,
              comment,
            }),
          },
        });

        const notifyIds = new Set<string>();
        if (recruiterId) notifyIds.add(recruiterId);
        if (hiringManagerId) notifyIds.add(hiringManagerId);

        for (const notifUserId of notifyIds) {
          await tx.userNotification.create({
            data: {
              id: `notif-off-full-${Date.now()}-${notifUserId}`,
              userId: notifUserId,
              title: 'Offer Fully Approved',
              message: `Formal offer (v${offer.version}) for ${candidateName} has been fully approved by all levels.`,
              type: 'Success',
              linkUrl: '/recruitment',
            },
          });
        }

        return {
          offer: fullyApprovedOffer,
          offerStatus: 'Approved',
          levelApproved: activeApproval.sequence,
          isFullyApproved: true,
        };
      }
    } else if (action === 'REJECT') {
      await tx.recruitment_offer_approvals.update({
        where: { id: activeApproval.id },
        data: {
          status: 'Rejected',
          acted_at: new Date(),
          note: comment!.trim(),
        },
      });

      await tx.recruitment_offer_approvals.updateMany({
        where: {
          offer_id: offerId,
          sequence: { gt: activeApproval.sequence },
        },
        data: {
          status: 'Cancelled',
        },
      });

      const rejectedOffer = await tx.recruitment_offers.update({
        where: { id: offerId },
        data: {
          status: 'Declined',
          updated_at: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          id: `audit-off-rej-${Date.now()}`,
          action: 'OFFER_REJECTED',
          module: 'Recruitment',
          employeeId: user.id,
          details: JSON.stringify({
            offerId,
            candidateId,
            level: activeApproval.sequence,
            rejectedBy: user.id,
            reason: comment,
          }),
        },
      });

      const notifyIds = new Set<string>();
      if (recruiterId) notifyIds.add(recruiterId);
      if (hiringManagerId) notifyIds.add(hiringManagerId);

      for (const notifUserId of notifyIds) {
        await tx.userNotification.create({
          data: {
            id: `notif-off-rej-${Date.now()}-${notifUserId}`,
            userId: notifUserId,
            title: 'Offer Rejected',
            message: `Offer for ${candidateName} was rejected at Level ${activeApproval.sequence}: ${comment}`,
            type: 'Warning',
            linkUrl: '/recruitment',
          },
        });
      }

      return {
        offer: rejectedOffer,
        offerStatus: 'Declined',
        rejectedLevel: activeApproval.sequence,
        reason: comment,
      };
    } else if (action === 'REQUEST_CHANGES') {
      await tx.recruitment_offer_approvals.update({
        where: { id: activeApproval.id },
        data: {
          status: 'Rejected',
          acted_at: new Date(),
          note: `Changes Requested: ${comment!.trim()}`,
        },
      });

      await tx.recruitment_offer_approvals.updateMany({
        where: {
          offer_id: offerId,
          sequence: { gt: activeApproval.sequence },
        },
        data: {
          status: 'Cancelled',
        },
      });

      const draftOffer = await tx.recruitment_offers.update({
        where: { id: offerId },
        data: {
          status: 'Draft',
          updated_at: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          id: `audit-off-chg-${Date.now()}`,
          action: 'OFFER_CHANGES_REQUESTED',
          module: 'Recruitment',
          employeeId: user.id,
          details: JSON.stringify({
            offerId,
            candidateId,
            level: activeApproval.sequence,
            requestedBy: user.id,
            comment,
          }),
        },
      });

      if (recruiterId) {
        await tx.userNotification.create({
          data: {
            id: `notif-off-chg-${Date.now()}`,
            userId: recruiterId,
            title: 'Offer Changes Requested',
            message: `Changes requested on offer for ${candidateName} (Level ${activeApproval.sequence}): ${comment}`,
            type: 'Alert',
            linkUrl: '/recruitment',
          },
        });
      }

      return {
        offer: draftOffer,
        offerStatus: 'Draft',
        level: activeApproval.sequence,
        comment,
      };
    }
  }, { maxWait: 10000, timeout: 20000 });

  return result;
}

/**
 * Retrieves the approval chain and status for an offer
 */
export async function getOfferApprovals(offerId: string, user: RecruitmentUser) {
  const offer = await db.recruitment_offers.findUnique({
    where: { id: offerId },
    include: {
      recruitment_candidates: {
        include: { job: true },
      },
      recruitment_offer_approvals: {
        include: {
          employees: {
            select: {
              id: true,
              name: true,
              email: true,
              roleTitle: true,
              userRole: true,
            },
          },
        },
        orderBy: { sequence: 'asc' },
      },
    },
  });

  if (!offer) {
    throw new Error('Offer not found.');
  }

  if (!canUserAccessOffer(user, offer)) {
    throw new AuthorizationError();
  }

  const approvals = offer.recruitment_offer_approvals;
  const activeApproval = approvals.find((a) => a.status === 'Pending');
  const completedCount = approvals.filter((a) => a.status === 'Approved').length;
  const canCurrentUserApprove =
    offer.status === 'PendingApproval' &&
    activeApproval !== undefined &&
    (activeApproval.approver_id === user.id || user.userRole === 'admin');

  return {
    offerId: offer.id,
    offerStatus: offer.status,
    candidateId: offer.candidate_id,
    candidateName: offer.recruitment_candidates.name,
    version: offer.version,
    currentLevel: activeApproval ? activeApproval.sequence : null,
    totalLevels: approvals.length,
    completedLevels: completedCount,
    pendingApprover: activeApproval ? activeApproval.employees : null,
    canCurrentUserApprove,
    approvalChain: approvals.map((a) => ({
      id: a.id,
      sequence: a.sequence,
      approverId: a.approver_id,
      approver: a.employees,
      status: a.status,
      note: a.note,
      actedAt: a.acted_at,
      createdAt: a.created_at,
    })),
  };
}
