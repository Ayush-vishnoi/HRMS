/**
 * Exit & Offboarding Document Service
 * Generates official Relieving / Experience letters through the DocumentTemplate
 * system, renders letter-style PDFs server-side, and archives them as
 * EmployeeDocuments in the secure private storage directory served by
 * /api/documents/[id].
 */

import { createHash } from 'node:crypto';

import { DocumentStatus, type Prisma } from '@prisma/client';

import { db } from '@/lib/db';
import { saveDocumentBlob } from './db-storage';
import { DEFAULT_TEMPLATE_CONTENT_BY_TYPE, renderDocumentTemplate } from './template-engine';
import { formatLongDate, type DocumentContextData } from './template-variables';

const DEFAULT_ORGANIZATION_ID = 'org-mylotic-group';

export type ExitLetterType = 'Relieving_Letter' | 'Experience_Letter';

export const EXIT_LETTER_NAMES: Record<ExitLetterType, string> = {
  Relieving_Letter: 'Relieving Letter',
  Experience_Letter: 'Experience Letter',
};

const displayDate = (date = new Date()) =>
  new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);

export interface ExitLetterEmployee {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  phone?: string | null;
  roleTitle: string;
  department: string;
  location?: string | null;
  salary?: Prisma.Decimal | number | null;
  joinDate: string;
  organization_id?: string | null;
}

export interface ExitLetterRequest {
  id: string;
  employeeId: string;
  requestedRelievingDate: string;
  approvedRelievingDate?: string | null;
  noticePeriodDays: number;
}

export interface ExitLetterOrganization {
  legal_name?: string | null;
  name: string;
}

export interface GeneratedExitLetter {
  documentId: string;
  downloadUrl: string;
  name: string;
  created: boolean;
}

/**
 * Resolves the active template for an exit letter type, auto-provisioning a
 * default template from the standard registry when none exists yet.
 */
async function resolveExitDocumentTemplate(letterType: ExitLetterType, organizationId?: string | null) {
  const scopedOrgId = organizationId || DEFAULT_ORGANIZATION_ID;

  const existing = await db.documentTemplate.findFirst({
    where: { organization_id: scopedOrgId, type: letterType, isActive: true },
    orderBy: { version: 'desc' },
  });
  if (existing) return existing;

  const fallback = await db.documentTemplate.findFirst({
    where: { type: letterType, isActive: true },
    orderBy: { version: 'desc' },
  });
  if (fallback) return fallback;

  const preset = DEFAULT_TEMPLATE_CONTENT_BY_TYPE[letterType];
  return db.documentTemplate.create({
    data: {
      id: `tpl-${letterType.toLowerCase().replace(/_/g, '-')}-v1`,
      organization_id: DEFAULT_ORGANIZATION_ID,
      type: letterType,
      name: preset.title,
      content: preset.content,
      version: 1,
      isActive: true,
      updated_at: new Date(),
    },
  });
}

/**
 * Maps an Employee + ExitRequest into the standard DocumentContextData shape so
 * the shared template engine and its variable catalog work unchanged.
 */
export function buildExitDocumentContext(
  employee: ExitLetterEmployee,
  organization: ExitLetterOrganization | null,
  exitRequest: ExitLetterRequest,
): DocumentContextData {
  const fullName = employee.name || 'Employee';
  const parts = fullName.trim().split(/\s+/);
  const salary = Number(employee.salary ?? 0);
  const companyName = organization?.legal_name || organization?.name || 'Company';
  const relievingDate = exitRequest.approvedRelievingDate || exitRequest.requestedRelievingDate;

  return {
    candidate: {
      id: employee.id,
      firstName: parts[0] || fullName,
      lastName: parts.slice(1).join(' '),
      fullName,
      email: employee.email,
      phone: employee.phone ?? null,
      location: employee.location ?? null,
      currentRole: employee.roleTitle,
      experience: '',
    },
    job: {
      id: employee.employeeCode,
      title: employee.roleTitle,
      department: employee.department || 'General',
      location: employee.location || 'India',
      jobCode: employee.employeeCode,
    },
    offer: {
      id: `exit-${exitRequest.id}`,
      version: 1,
      status: 'Relieved',
      offeredTitle: employee.roleTitle,
      offeredCtc: salary,
      currency: 'INR',
      proposedJoinDate: employee.joinDate,
      expiresAt: relievingDate,
    },
    compensation: {
      annualCtc: salary,
      monthlyGross: salary / 12,
      basicMonthly: salary / 24,
      hraMonthly: salary / 48,
      conveyanceMonthly: 0,
      specialAllowanceMonthly: salary / 48,
      medicalAllowanceMonthly: 0,
      basicAnnual: salary / 2,
      hraAnnual: salary / 4,
      specialAllowanceAnnual: salary / 4,
      variablePayAnnual: 0,
      joiningBonus: 0,
      retentionBonus: 0,
      pfEmployerMonthly: 0,
      pfEmployeeMonthly: 0,
      gratuityMonthly: 0,
      estimatedNetTakeHomeMonthly: salary / 12,
      totalEmployerCostMonthly: salary / 12,
    },
    employment: {
      probationPeriod: 'As per company policy',
      noticePeriod: `${exitRequest.noticePeriodDays} days`,
      workingHours: 'As per company policy',
      workMode: 'As per company policy',
    },
    company: {
      name: companyName,
      address: '',
      email: '',
      phone: '',
      website: '',
      hrSignatoryName: 'Human Resources',
      hrSignatoryTitle: 'HR Department',
    },
    generatedDate: displayDate(),
    benefits: [`Relieving Date: ${relievingDate}`, `Notice Period: ${exitRequest.noticePeriodDays} days`],
  };
}

/**
 * Escapes characters for PDF literal strings (e.g. \(, \), \\)
 */
function escapePdfText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\r\n]+/g, ' ');
}

/**
 * Wraps long text into lines of maximum character length
 */
function wrapTextLines(text: string, maxCharsPerLine: number = 88): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (!word) continue;
    if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Builds a standard compliant PDF-1.4 binary buffer for exit letters
 * (Relieving Letter / Experience Certificate).
 */
export function generateExitLetterPdfBuffer(options: {
  letterType: ExitLetterType;
  context: DocumentContextData;
  referenceId: string;
}): Buffer {
  const { letterType, context, referenceId } = options;
  const company = context.company;
  const candidate = context.candidate;
  const job = context.job;
  const offer = context.offer;

  const joinDateText = formatLongDate(offer.proposedJoinDate);
  const relievingDateText = formatLongDate(offer.expiresAt);

  const streamOps: string[] = [];

  // 1. Corporate Header Band (Top)
  streamOps.push('0.09 0.19 0.29 rg'); // Corporate Navy #17324A
  streamOps.push('45 790 505 3 re f'); // Top accent bar

  // Company Name
  streamOps.push('BT');
  streamOps.push('/F2 16 Tf');
  streamOps.push('0.09 0.19 0.29 rg');
  streamOps.push(`45 765 Td (${escapePdfText(company.name)}) Tj`);
  streamOps.push('ET');

  // Document Badge / Date / Reference (Top Right)
  streamOps.push('BT');
  streamOps.push('/F2 9 Tf');
  streamOps.push('0.09 0.19 0.29 rg');
  streamOps.push('400 765 Td (OFFICIAL HR DOCUMENT) Tj');
  streamOps.push('/F1 8.5 Tf');
  streamOps.push('0.39 0.45 0.55 rg');
  streamOps.push(`0 -13 Td (Date: ${escapePdfText(context.generatedDate || '')}) Tj`);
  streamOps.push(`0 -11 Td (Ref: ${escapePdfText(referenceId)}) Tj`);
  streamOps.push('ET');

  // Separator Line
  streamOps.push('0.85 0.89 0.93 RG');
  streamOps.push('1 w');
  streamOps.push('45 725 m 550 725 l S');

  // Document Title
  const title = letterType === 'Relieving_Letter' ? 'RELIEVING LETTER' : 'EXPERIENCE CERTIFICATE';
  streamOps.push('BT');
  streamOps.push('/F2 13 Tf');
  streamOps.push('0.06 0.09 0.16 rg');
  streamOps.push(`45 700 Td (${title}) Tj`);
  streamOps.push('ET');

  // Salutation
  streamOps.push('BT');
  streamOps.push('/F1 9.5 Tf');
  streamOps.push('0.12 0.16 0.23 rg');
  streamOps.push('45 675 Td (To Whomsoever It May Concern,) Tj');
  streamOps.push('ET');

  // 2. Body Paragraphs
  const paragraphs: string[] =
    letterType === 'Relieving_Letter'
      ? [
          `This is to certify that ${candidate.fullName} (Employee Code: ${job.jobCode || job.id}) was employed with ${company.name} as ${offer.offeredTitle} in the ${job.department} department from ${joinDateText} to ${relievingDateText}.`,
          `${candidate.fullName} has resigned from the services of the organisation and has duly served the notice period of ${context.employment.noticePeriod}. All dues and settlements stand cleared as per the Full & Final settlement processed by the Finance department.`,
          `Consequent to the resignation, ${candidate.fullName} is hereby relieved from all duties and responsibilities associated with the position of ${offer.offeredTitle}, with effect from the closing hours of ${relievingDateText}.`,
          `We wish ${candidate.firstName} the very best in all future endeavours.`,
        ]
      : [
          `This is to certify that ${candidate.fullName} (Employee Code: ${job.jobCode || job.id}) has rendered service with ${company.name} in the capacity of ${offer.offeredTitle} in the ${job.department} department from ${joinDateText} to ${relievingDateText}.`,
          `During the tenure of service, we found ${candidate.fullName} to be sincere, dedicated and professional in conduct. The contributions made to the ${job.department} department and the organisation at large are sincerely appreciated.`,
          `This certificate is issued at the request of ${candidate.fullName} for their personal records and future reference.`,
          `We wish ${candidate.firstName} continued success in all future endeavours.`,
        ];

  let currentY = 650;
  for (const para of paragraphs) {
    const lines = wrapTextLines(para, 88);
    streamOps.push('BT');
    streamOps.push('/F1 9 Tf');
    streamOps.push('0.20 0.25 0.33 rg');
    streamOps.push(`45 ${currentY} Td`);
    lines.forEach((line, idx) => {
      if (idx > 0) streamOps.push('0 -13 Td');
      streamOps.push(`(${escapePdfText(line)}) Tj`);
    });
    streamOps.push('ET');
    currentY -= lines.length * 13 + 14;
  }

  // 3. Key Facts Grid (2 columns x 3 rows)
  const gridTop = currentY - 6;
  const gridHeight = 96;
  streamOps.push('0.97 0.98 0.99 rg');
  streamOps.push(`45 ${gridTop - gridHeight} 505 ${gridHeight} re f`);
  streamOps.push('0.85 0.89 0.93 RG');
  streamOps.push(`45 ${gridTop - gridHeight} 505 ${gridHeight} re S`);

  const facts: Array<[string, string]> = [
    ['Employee Name', candidate.fullName],
    ['Employee Code', job.jobCode || job.id],
    ['Designation', offer.offeredTitle],
    ['Department', job.department],
    ['Date of Joining', joinDateText],
    ['Last Working Day', relievingDateText],
  ];

  let rowY = gridTop - 18;
  for (let i = 0; i < facts.length; i += 2) {
    const left = facts[i];
    const right = facts[i + 1];
    streamOps.push('BT');
    streamOps.push('/F1 7.5 Tf');
    streamOps.push('0.39 0.45 0.55 rg');
    streamOps.push(`58 ${rowY} Td (${escapePdfText(left[0].toUpperCase())}) Tj`);
    if (right) streamOps.push(`260 0 Td (${escapePdfText(right[0].toUpperCase())}) Tj`);
    streamOps.push('ET');
    streamOps.push('BT');
    streamOps.push('/F2 8.5 Tf');
    streamOps.push('0.09 0.19 0.29 rg');
    streamOps.push(`58 ${rowY - 12} Td (${escapePdfText(left[1])}) Tj`);
    if (right) streamOps.push(`260 0 Td (${escapePdfText(right[1])}) Tj`);
    streamOps.push('ET');
    rowY -= 30;
  }
  currentY = gridTop - gridHeight - 24;

  // 4. Signature Section
  const sigY = Math.max(currentY - 10, 120);
  streamOps.push('0.60 0.65 0.72 RG');
  streamOps.push('1 w');
  streamOps.push(`45 ${sigY} m 240 ${sigY} l S`);
  streamOps.push(`355 ${sigY} m 550 ${sigY} l S`);

  streamOps.push('BT');
  streamOps.push('/F2 8 Tf');
  streamOps.push('0.09 0.19 0.29 rg');
  streamOps.push(`45 ${sigY - 12} Td (${escapePdfText(company.hrSignatoryName)}) Tj`);
  streamOps.push('ET');
  streamOps.push('BT');
  streamOps.push('/F1 7.5 Tf');
  streamOps.push('0.39 0.45 0.55 rg');
  streamOps.push(`45 ${sigY - 22} Td (${escapePdfText(company.hrSignatoryTitle)}) Tj`);
  streamOps.push(`0 -10 Td (${escapePdfText(company.name)}) Tj`);
  streamOps.push('ET');

  streamOps.push('BT');
  streamOps.push('/F2 8 Tf');
  streamOps.push('0.09 0.19 0.29 rg');
  streamOps.push(`355 ${sigY - 12} Td (Employee Acknowledgement) Tj`);
  streamOps.push('ET');
  streamOps.push('BT');
  streamOps.push('/F1 7.5 Tf');
  streamOps.push('0.39 0.45 0.55 rg');
  streamOps.push(`355 ${sigY - 22} Td (Name: ${escapePdfText(candidate.fullName)}) Tj`);
  streamOps.push('0 -10 Td (Date: ______________) Tj');
  streamOps.push('ET');

  // 5. Confidentiality Footer
  streamOps.push('BT');
  streamOps.push('/F1 7 Tf');
  streamOps.push('0.60 0.65 0.72 rg');
  streamOps.push(`160 30 Td (Confidential - ${escapePdfText(company.name)} Enterprise Human Resources Management System) Tj`);
  streamOps.push('ET');

  // 6. PDF Object Assembly (PDF-1.4, 6 objects)
  const contentStream = streamOps.join('\n');
  const streamLength = Buffer.byteLength(contentStream, 'utf-8');
  const objects: string[] = [];
  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`);
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`);
  objects.push(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj`);
  objects.push(`4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`);
  objects.push(`5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj`);
  objects.push(`6 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream\nendobj`);

  let pdfOutput = `%PDF-1.4\n%âãÏÓ\n`;
  const offsets: number[] = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdfOutput, 'utf-8'));
    pdfOutput += `${objects[i]}\n`;
  }
  const startXref = Buffer.byteLength(pdfOutput, 'utf-8');
  pdfOutput += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    const offStr = String(offsets[i]).padStart(10, '0');
    pdfOutput += `${offStr} 00000 n \n`;
  }
  pdfOutput += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  return Buffer.from(pdfOutput, 'utf-8');
}

/**
 * Finds the most recently generated exit letter of a given type for an employee.
 */
export async function findExistingExitLetter(employeeId: string, letterType: ExitLetterType) {
  const name = EXIT_LETTER_NAMES[letterType];
  return db.employeeDocument.findFirst({
    where: { employeeId, name, storage_key: { not: null } },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Generates an official exit letter: resolves the DocumentTemplate, renders it
 * through the standard template engine, builds the letter PDF, stores it in the
 * secure documents directory, and archives it as a verified EmployeeDocument.
 */
export async function generateExitLetter(params: {
  employee: ExitLetterEmployee;
  organization: ExitLetterOrganization | null;
  exitRequest: ExitLetterRequest;
  letterType: ExitLetterType;
}): Promise<GeneratedExitLetter> {
  const { employee, organization, exitRequest, letterType } = params;

  const template = await resolveExitDocumentTemplate(letterType, employee.organization_id);
  const context = buildExitDocumentContext(employee, organization, exitRequest);

  // Validate the template and resolve all mandatory variables through the
  // standard engine (throws when required variables are missing).
  renderDocumentTemplate(template, context);

  const pdf = generateExitLetterPdfBuffer({
    letterType,
    context,
    referenceId: `EXIT-${exitRequest.id.slice(-8).toUpperCase()}`,
  });

  const letterName = EXIT_LETTER_NAMES[letterType];
  const id = `DOC-${Date.now()}-${letterType === 'Relieving_Letter' ? 'RL' : 'EL'}`;
  const storageKey = `${id}-${letterName.replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf`;

  // Store the PDF bytes inside PostgreSQL (document_blobs) instead of local disk.
  await saveDocumentBlob({ key: storageKey, category: 'employee', data: pdf, mimeType: 'application/pdf' });

  // Lock the letter until the notice period ends: the download stays blocked
  // until the start of the relieving date (the day the notice period ends),
  // then unlocks automatically on that day.
  const relievingDateStr = exitRequest.approvedRelievingDate || exitRequest.requestedRelievingDate;
  const lockedUntil = new Date(`${relievingDateStr.slice(0, 10)}T00:00:00.000Z`);

  const document = await db.employeeDocument.create({
    data: {
      id,
      employeeId: employee.id,
      name: letterName,
      type: letterName,
      size: `${(pdf.length / 1024 / 1024).toFixed(1)} MB`,
      status: DocumentStatus.Verified,
      note: `Generated from exit request ${exitRequest.id}.`,
      uploadedOn: displayDate(),
      template_id: template.id,
      storage_provider: 'db',
      storage_key: storageKey,
      mime_type: 'application/pdf',
      size_bytes: pdf.length,
      checksum: createHash('sha256').update(pdf).digest('hex'),
      locked_until: Number.isNaN(lockedUntil.getTime()) ? null : lockedUntil,
    },
  });

  return {
    documentId: document.id,
    downloadUrl: `/api/documents/${encodeURIComponent(document.id)}`,
    name: letterName,
    created: true,
  };
}
