/**
 * Offer Document Generation & Management Service (Phase 4C-C3)
 * Handles template rendering, server-side PDF generation, secure storage, versioning, RBAC, audit, and notifications.
 */

import path from 'path';
import { db } from '@/lib/db';
import { type DocumentTemplateType } from '@prisma/client';
import { type RecruitmentUser } from '@/lib/recruitment/rbac-service';
import {
  canUserAccessOffer,
  canUserManageOffer,
  type OfferCompensationBreakdown,
} from '@/lib/recruitment/offer-service';
import {
  type DocumentContextData,
  formatLongDate,
} from './template-variables';
import {
  renderDocumentTemplate,
  DEFAULT_TEMPLATE_CONTENT_BY_TYPE,
  type RenderedDocumentResult,
} from './template-engine';
import { generateServerSidePdfBuffer } from './pdf-generator';
import { readDocumentBlobWithDiskFallback, saveDocumentBlob } from './db-storage';

const LEGACY_OFFER_DOCS_DIR = path.join(process.cwd(), 'uploads', 'documents', 'offers');

export interface GeneratedDocumentMetadata {
  id: string;
  offerId: string;
  candidateId: string;
  candidateName: string;
  documentType: DocumentTemplateType;
  templateId: string;
  templateName: string;
  templateVersion: number;
  offerVersion: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  generatedAt: string;
  generatedById: string;
  generatedByName: string;
}

export interface GenerateDocumentInput {
  documentType: DocumentTemplateType;
  templateId?: string;
}

/**
 * Ensures the secure offer documents directory exists (legacy — bytes now live
 * in PostgreSQL document_blobs; kept as no-op for call-site compatibility)
 */
async function ensureDocsDirectory(): Promise<void> {
  // No-op: offer documents are stored in PostgreSQL (document_blobs).
}
/**
 * Retrieves all available active DocumentTemplates for offer workflows
 */
export async function getAvailableDocumentTemplates(user: RecruitmentUser) {
  const templates = await db.documentTemplate.findMany({
    where: {
      isActive: true,
      type: {
        in: ['Offer_Letter', 'Appointment_Letter', 'NDA', 'Custom'],
      },
    },
    orderBy: [{ type: 'asc' }, { version: 'desc' }],
    include: {
      employees_document_templates_created_by_idToemployees: {
        select: { id: true, name: true },
      },
    },
  });

  return templates;
}

/**
 * Aggregates all context data from candidate, job, offer, and compensation breakdown
 */
export async function buildDocumentContextData(
  offerId: string,
  user: RecruitmentUser
): Promise<{ offer: any; contextData: DocumentContextData; compBreakdown: OfferCompensationBreakdown }> {
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
      document_templates: true,
    },
  });

  if (!offer) {
    throw new Error('Offer not found.');
  }

  if (!canUserAccessOffer(user, offer)) {
    throw new Error('You do not have permission to access this offer.');
  }

  const candidate = offer.recruitment_candidates;
  const job = candidate.job;

  // Parse candidate names
  const nameParts = candidate.name.trim().split(/\s+/);
  const firstName = nameParts[0] || 'Candidate';
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

  // Parse compensation snapshot
  let compBreakdown: OfferCompensationBreakdown;
  try {
    const rawParsed = offer.content_snapshot ? JSON.parse(offer.content_snapshot) : null;
    if (rawParsed && rawParsed.annualCtc && rawParsed.components) {
      compBreakdown = rawParsed;
    } else if (rawParsed && rawParsed.compensation) {
      compBreakdown = rawParsed.compensation;
    } else {
      throw new Error('No valid compensation breakdown found.');
    }
  } catch {
    throw new Error('Offer does not have a valid compensation snapshot. Please recalculate and save the offer.');
  }

  const contextData: DocumentContextData = {
    candidate: {
      id: candidate.id,
      firstName,
      lastName,
      fullName: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      location: candidate.location || job.location,
      currentRole: candidate.currentRole,
      experience: candidate.experience,
    },
    job: {
      id: job.id,
      title: job.title,
      department: job.department,
      location: job.location,
      jobCode: job.id,
      hiringManagerName: job.hiringManager?.name || 'Hiring Leadership',
      recruiterName: job.recruiter?.name || 'People Operations',
    },
    offer: {
      id: offer.id,
      version: offer.version,
      status: offer.status,
      offeredTitle: offer.offered_title,
      offeredCtc: Number(offer.offered_ctc || compBreakdown.annualCtc),
      currency: offer.currency,
      proposedJoinDate: offer.proposed_join_date ? offer.proposed_join_date.toISOString() : null,
      expiresAt: offer.expires_at ? offer.expires_at.toISOString() : null,
      contentSnapshot: compBreakdown as any,
    },
    compensation: {
      annualCtc: compBreakdown.annualCtc,
      monthlyGross: compBreakdown.monthlyGross,
      basicMonthly: compBreakdown.components.basicMonthly,
      hraMonthly: compBreakdown.components.hraMonthly,
      conveyanceMonthly: compBreakdown.components.conveyanceMonthly,
      specialAllowanceMonthly: compBreakdown.components.specialAllowanceMonthly,
      medicalAllowanceMonthly: compBreakdown.components.medicalAllowanceMonthly,
      basicAnnual: compBreakdown.components.basicAnnual,
      hraAnnual: compBreakdown.components.hraAnnual,
      specialAllowanceAnnual: compBreakdown.components.specialAllowanceAnnual,
      variablePayAnnual: compBreakdown.variablePayAnnual,
      joiningBonus: compBreakdown.joiningBonus,
      retentionBonus: compBreakdown.retentionBonus,
      pfEmployerMonthly: compBreakdown.employerContributions.pfMonthly,
      pfEmployeeMonthly: compBreakdown.employeeDeductions.pfMonthly,
      gratuityMonthly: compBreakdown.employerContributions.gratuityMonthly,
      estimatedNetTakeHomeMonthly: compBreakdown.estimatedNetTakeHomeMonthly,
      totalEmployerCostMonthly: compBreakdown.totalEmployerCostMonthly,
    },
    employment: {
      probationPeriod: '6 Months',
      noticePeriod: '60 Days',
      workingHours: '40 hours per week (Monday to Friday, 9:00 AM - 6:00 PM)',
      workMode: 'Hybrid (3 days office, 2 days remote)',
    },
    company: {
      name: 'MYLOTIC GROUP PRIVATE LIMITED',
      address: '100 Innovation Park, Whitefield, Bengaluru, Karnataka 560066',
      email: 'hr@mylotic.com',
      phone: '+91 80 4123 4567',
      website: 'https://www.mylotic.com',
      hrSignatoryName: 'Ayush Vishnoi',
      hrSignatoryTitle: 'Head of People & Talent Operations',
    },
    benefits: [
      'Comprehensive Medical Insurance (₹5,00,000 coverage for employee + family)',
      'Statutory Provident Fund & Gratuity',
      'Annual Learning & Professional Certification Allowance (₹50,000)',
      'Annual Wellness & Gym Reimbursement',
    ],
    generatedDate: formatLongDate(new Date()),
  };

  return { offer, contextData, compBreakdown };
}

/**
 * Resolves or creates a fallback DocumentTemplate record for the requested document type
 */
async function resolveDocumentTemplate(
  documentType: DocumentTemplateType,
  requestedTemplateId?: string
) {
  if (requestedTemplateId) {
    const customTpl = await db.documentTemplate.findUnique({
      where: { id: requestedTemplateId },
    });
    if (customTpl) {
      if (!customTpl.isActive) {
        throw new Error(`The selected template "${customTpl.name}" is deactivated.`);
      }
      if (customTpl.type !== documentType && customTpl.type !== 'Custom') {
        throw new Error(
          `Template type mismatch: Template is of type "${customTpl.type}", but requested document is "${documentType}".`
        );
      }
      return customTpl;
    }
  }

  // Find latest active template matching type
  const matchedTpl = await db.documentTemplate.findFirst({
    where: {
      type: documentType,
      isActive: true,
    },
    orderBy: { version: 'desc' },
  });

  if (matchedTpl) {
    return matchedTpl;
  }

  // If no DB template exists, look up default content for standard types
  const defaultMeta = DEFAULT_TEMPLATE_CONTENT_BY_TYPE[documentType] || DEFAULT_TEMPLATE_CONTENT_BY_TYPE.Custom;

  // Persist default template in DB
  const createdDefaultTpl = await db.documentTemplate.create({
    data: {
      id: `tpl-${documentType.toLowerCase().replace(/_/g, '-')}-v1`,
      organization_id: 'org-mylotic-group',
      type: documentType,
      name: defaultMeta.title,
      subject: `${defaultMeta.title} - {{candidate.fullName}}`,
      content: defaultMeta.content,
      version: 1,
      isActive: true,
      updated_at: new Date(),
    },
  });

  return createdDefaultTpl;
}

/**
 * Generates temporary rendered HTML preview for authorized HR/recruiter without persisting files
 */
export async function previewOfferDocument(
  offerId: string,
  input: GenerateDocumentInput,
  user: RecruitmentUser
): Promise<RenderedDocumentResult> {
  const { contextData } = await buildDocumentContextData(offerId, user);
  const template = await resolveDocumentTemplate(input.documentType, input.templateId);

  // Render template
  const rendered = renderDocumentTemplate(template, contextData);

  // Log preview audit event
  await db.auditLog.create({
    data: {
      id: `audit-prev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action: 'OFFER_DOCUMENT_PREVIEWED',
      module: 'Recruitment',
      employeeId: user.id,
      details: JSON.stringify({
        offerId,
        candidateId: contextData.candidate.id,
        documentType: input.documentType,
        templateId: template.id,
        templateVersion: template.version,
        offerVersion: contextData.offer.version,
      }),
    },
  });

  return rendered;
}

/**
 * Helper to parse existing document metadata list from offer snapshot
 */
function extractExistingDocuments(contentSnapshot: string | null): GeneratedDocumentMetadata[] {
  if (!contentSnapshot) return [];
  try {
    const parsed = JSON.parse(contentSnapshot);
    if (Array.isArray(parsed.documents)) {
      return parsed.documents;
    }
  } catch {
    // Ignore parse error
  }
  return [];
}

/**
 * Generates an official, finalized Offer Document (PDF + HTML Snapshot + Metadata)
 * STRICT RULE: Offer status MUST be 'Approved'.
 */
export async function generateOfferDocument(
  offerId: string,
  input: GenerateDocumentInput,
  user: RecruitmentUser
): Promise<GeneratedDocumentMetadata> {
  await ensureDocsDirectory();

  const { offer, contextData, compBreakdown } = await buildDocumentContextData(offerId, user);

  // 1. STAGE & STATUS ELIGIBILITY: Offer must be Approved
  if (offer.status !== 'Approved') {
    throw new Error(
      `Official documents can only be generated for "Approved" offers. Current offer status is "${offer.status}".`
    );
  }

  // 2. Resolve Template
  const template = await resolveDocumentTemplate(input.documentType, input.templateId);

  // 3. Concurrency / Duplicate generation guard:
  // Check if a finalized document already exists for this (offerId, offerVersion, documentType, templateVersion)
  const existingDocs = extractExistingDocuments(offer.content_snapshot);
  const duplicate = existingDocs.find(
    (d) =>
      d.documentType === input.documentType &&
      d.offerVersion === offer.version &&
      d.templateVersion === template.version
  );

  if (duplicate) {
    return duplicate;
  }

  // 4. Render Template
  const rendered = renderDocumentTemplate(template, contextData);

  // 5. Generate Server-Side PDF Buffer
  const pdfBuffer = generateServerSidePdfBuffer({
    title: rendered.documentTitle,
    documentType: input.documentType,
    context: contextData,
    renderedHtml: rendered.html,
  });

  // 6. Secure Storage — bytes go into PostgreSQL (document_blobs)
  const docId = `DOC-${offer.id}-v${offer.version}-${input.documentType.toUpperCase()}-${Date.now()}`;
  const secureFileName = `${docId}.pdf`;
  await saveDocumentBlob({ key: secureFileName, category: 'offers', data: pdfBuffer, mimeType: 'application/pdf' });
  const storageFilePath = path.join(LEGACY_OFFER_DOCS_DIR, secureFileName);

  const documentMeta: GeneratedDocumentMetadata = {
    id: docId,
    offerId: offer.id,
    candidateId: contextData.candidate.id,
    candidateName: contextData.candidate.fullName,
    documentType: input.documentType,
    templateId: template.id,
    templateName: template.name,
    templateVersion: template.version,
    offerVersion: offer.version,
    fileName: secureFileName,
    mimeType: 'application/pdf',
    fileSize: pdfBuffer.length,
    storagePath: path.relative(process.cwd(), storageFilePath).replace(/\\/g, '/'),
    generatedAt: new Date().toISOString(),
    generatedById: user.id,
    generatedByName: user.name,
  };

  // 7. Atomic DB Transaction: Save Document Metadata & Audit Log & UserNotification
  await db.$transaction(async (tx) => {
    // Update offer content_snapshot to include new document metadata
    const updatedDocsList = [...existingDocs, documentMeta];
    const newSnapshotObj = {
      compensation: compBreakdown,
      documents: updatedDocsList,
      lastGeneratedDocument: documentMeta,
    };

    await tx.recruitment_offers.update({
      where: { id: offer.id },
      data: {
        template_id: template.id,
        content_snapshot: JSON.stringify(newSnapshotObj),
      },
    });

    // Create document signature placeholder record for future C4 workflow
    await tx.document_signatures.create({
      data: {
        id: `sig-${docId}`,
        recruitment_offer_id: offer.id,
        status: 'Pending',
        signer_name: contextData.candidate.fullName,
        signer_email: contextData.candidate.email,
        requested_at: new Date(),
        audit_note: `Document "${template.name}" generated by ${user.name} (${user.id}).`,
        provider_metadata: {
          documentId: docId,
          documentType: input.documentType,
          templateVersion: template.version,
          offerVersion: offer.version,
        },
        updated_at: new Date(),
      },
    });

    // Audit Log
    await tx.auditLog.create({
      data: {
        id: `audit-doc-gen-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        action: 'OFFER_DOCUMENT_GENERATED',
        module: 'Recruitment',
        employeeId: user.id,
        details: JSON.stringify({
          offerId: offer.id,
          candidateId: contextData.candidate.id,
          documentId: docId,
          documentType: input.documentType,
          templateId: template.id,
          templateVersion: template.version,
          offerVersion: offer.version,
          actorId: user.id,
          fileSize: pdfBuffer.length,
        }),
      },
    });

    // Dispatch UserNotification to Recruiter / Hiring Manager
    const recruiterId = offer.recruitment_candidates.job.recruiter_id;
    const hiringManagerId = offer.recruitment_candidates.job.hiring_manager_id;
    const recipients = Array.from(new Set([recruiterId, hiringManagerId].filter(Boolean))) as string[];

    for (const recipientId of recipients) {
      await tx.userNotification.create({
        data: {
          id: `notif-doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          userId: recipientId,
          title: 'Offer Document Generated',
          message: `${template.name} (v${offer.version}) has been generated for ${contextData.candidate.fullName}.`,
          type: 'Recruitment',
          linkUrl: '/recruitment',
        },
      });
    }
  }, { maxWait: 10000, timeout: 20000 });

  return documentMeta;
}

/**
 * Retrieves all generated documents for an offer
 */
export async function getOfferDocuments(
  offerId: string,
  user: RecruitmentUser
): Promise<GeneratedDocumentMetadata[]> {
  const offer = await db.recruitment_offers.findUnique({
    where: { id: offerId },
    include: {
      recruitment_candidates: {
        include: {
          job: true,
        },
      },
    },
  });

  if (!offer) {
    throw new Error('Offer not found.');
  }

  if (!canUserAccessOffer(user, offer)) {
    throw new Error('You do not have permission to view documents for this offer.');
  }

  return extractExistingDocuments(offer.content_snapshot);
}

/**
 * Securely retrieves the document file buffer with RBAC authorization and download audit logging
 */
export async function getDocumentFile(
  offerId: string,
  documentId: string,
  user: RecruitmentUser
): Promise<{ fileBuffer: Buffer; fileName: string; mimeType: string; documentMeta: GeneratedDocumentMetadata }> {
  const offer = await db.recruitment_offers.findUnique({
    where: { id: offerId },
    include: {
      recruitment_candidates: {
        include: {
          job: true,
        },
      },
    },
  });

  if (!offer) {
    throw new Error('Offer not found.');
  }

  if (!canUserAccessOffer(user, offer)) {
    throw new Error('You do not have permission to download documents for this offer.');
  }

  const docs = extractExistingDocuments(offer.content_snapshot);
  const docMeta = docs.find((d) => d.id === documentId);

  if (!docMeta) {
    throw new Error('Document not found in offer records.');
  }

  const safeFileName = path.basename(docMeta.storagePath);
  let fileBuffer = await readDocumentBlobWithDiskFallback(safeFileName, LEGACY_OFFER_DOCS_DIR);
  if (!fileBuffer) {
    // If the stored bytes are unavailable, dynamically regenerate the PDF
    const { contextData } = await buildDocumentContextData(offerId, user);
    fileBuffer = generateServerSidePdfBuffer({
      title: docMeta.templateName,
      documentType: docMeta.documentType,
      context: contextData,
    });
    await saveDocumentBlob({ key: safeFileName, category: 'offers', data: fileBuffer, mimeType: 'application/pdf' });
  }

  // Audit Log download event
  await db.auditLog.create({
    data: {
      id: `audit-doc-dl-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action: 'OFFER_DOCUMENT_DOWNLOADED',
      module: 'Recruitment',
      employeeId: user.id,
      details: JSON.stringify({
        offerId,
        candidateId: offer.candidate_id,
        documentId,
        documentType: docMeta.documentType,
        templateId: docMeta.templateId,
        templateVersion: docMeta.templateVersion,
        offerVersion: docMeta.offerVersion,
        actorId: user.id,
      }),
    },
  });

  return {
    fileBuffer,
    fileName: docMeta.fileName,
    mimeType: docMeta.mimeType,
    documentMeta: docMeta,
  };
}
