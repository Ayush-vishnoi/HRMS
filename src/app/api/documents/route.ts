import { createHash } from 'node:crypto';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { DocumentRequestStatus, DocumentStatus, Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { invalidateDashboardAnalytics } from '@/lib/redis';
import {
  AuthorizationError,
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
} from '@/lib/auth-session';
import { extractVariablesFromTemplate, renderDocumentTemplate } from '@/lib/documents/template-engine';
import { generateServerSidePdfBuffer } from '@/lib/documents/pdf-generator';
import { saveDocumentBlob } from '@/lib/documents/db-storage';
import type { DocumentContextData } from '@/lib/documents/template-variables';
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const displayDate = (date = new Date()) => new Intl.DateTimeFormat('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric',
}).format(date);

const mapPrismaDocStatusToDisplay = (status: DocumentStatus) => {
  if (status === DocumentStatus.Verified) return 'Verified';
  if (status === DocumentStatus.ActionRequired) return 'Action Required';
  return 'Under Review';
};

const mapPrismaReqStatusToDisplay = (status: DocumentRequestStatus) => {
  if (status === DocumentRequestStatus.InProgress) return 'In Progress';
  if (status === DocumentRequestStatus.Ready) return 'Ready';
  if (status === DocumentRequestStatus.Delivered) return 'Delivered';
  if (status === DocumentRequestStatus.Sent) return 'Sent';
  if (status === DocumentRequestStatus.Downloaded) return 'Downloaded';
  if (status === DocumentRequestStatus.Requested) return 'Requested';
  return 'Pending';
};

type DocumentWithRelations = Prisma.EmployeeDocumentGetPayload<{
  include: {
    employee: { select: { id: true; name: true; employeeCode: true; department: true } };
    document_categories: true;
  };
}>;

type RequestAttachmentInclude = {
  include: { document: { select: { id: true; name: true; storage_key: true } } };
  orderBy: { addedAt: 'asc' };
};

type RequestWithRelations = Prisma.DocumentRequestGetPayload<{
  include: {
    employee: { select: { id: true; name: true; employeeCode: true; department: true } };
    attachments: RequestAttachmentInclude;
  };
}>;

type AuthenticatedEmployee = Awaited<ReturnType<typeof requireEmployee>>;

type EmployeeContextEmployee = {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
  roleTitle: string;
  department: string | null;
  salary: Prisma.Decimal | number | null;
  joinDate: string | null;
};

type OrganizationContext = {
  legal_name: string | null;
  name: string | null;
} | null;

type DocumentRequestBody = Record<string, unknown> & {
  file?: FormDataEntryValue;
  values?: Record<string, string>;
};

const formatDocument = (doc: DocumentWithRelations, viewer: 'admin' | 'employee' = 'employee') => {
  const isLocked = Boolean(doc.locked_until && doc.locked_until.getTime() > Date.now());
  const isDownloaded = Boolean(doc.downloaded_at);
  const sharedByHr = Boolean(doc.shared_by_hr);
  return {
    id: doc.id,
    employeeId: doc.employeeId,
    employeeName: doc.employee?.name || '',
    name: doc.name,
    type: doc.type,
    uploadedOn: doc.uploadedOn,
    size: doc.size,
    status: mapPrismaDocStatusToDisplay(doc.status),
    note: doc.note || '',
    categoryId: doc.category_id || null,
    requiresExpiry: Boolean(doc.document_categories?.requires_expiry),
    expiresAt: doc.expires_at ? new Date(doc.expires_at).toISOString().slice(0, 10) : null,
    mimeType: doc.mime_type || null,
    lockedUntil: doc.locked_until ? doc.locked_until.toISOString().slice(0, 10) : null,
    isLocked,
    downloadedAt: doc.downloaded_at ? doc.downloaded_at.toISOString().slice(0, 10) : null,
    sharedByHr,
    sharedAt: doc.shared_at ? doc.shared_at.toISOString().slice(0, 10) : null,
    // Employees may only download documents HR has explicitly shared with them;
    // admins can always fetch files they can see.
    downloadable: Boolean(doc.storage_key) && !isLocked && !isDownloaded && (viewer === 'admin' || sharedByHr),
    downloadUrl: doc.storage_key ? `/api/documents/${encodeURIComponent(doc.id)}` : null,
  };
};

const formatRequest = (request: RequestWithRelations, viewer: 'admin' | 'employee' = 'employee') => {
  // Employees only see attachments once HR has actually sent them.
  const showAttachments = viewer === 'admin' || request.status === DocumentRequestStatus.Sent || request.status === DocumentRequestStatus.Downloaded;
  return {
    id: request.id,
    employeeId: request.employeeId,
    // HRR- ids mark requests HR initiated toward the employee; REQ- ids are
    // employee-initiated requests to HR.
    initiatedByHr: request.id.startsWith('HRR-'),
    requestedBy: request.employee?.name || '',
    documentType: request.documentType,
    reason: request.reason,
    requestedOn: request.requestedOn,
    status: mapPrismaReqStatusToDisplay(request.status),
    sentAt: request.sentAt ? request.sentAt.toISOString().slice(0, 10) : null,
    downloadedAt: request.downloadedAt ? request.downloadedAt.toISOString().slice(0, 10) : null,
    attachments: showAttachments
      ? request.attachments.map((attachment) => ({
          id: attachment.id,
          documentId: attachment.documentId,
          name: attachment.document.name,
          source: attachment.source,
          downloadUrl: attachment.document.storage_key ? `/api/documents/${encodeURIComponent(attachment.documentId)}` : null,
        }))
      : [],
  };
};

const adminOnly = (employee: Pick<AuthenticatedEmployee, 'userRole'>) => {
  if (employee.userRole !== 'admin') throw new AuthorizationError();
};

async function notifyEmployee(userId: string, title: string, message: string) {
  await db.userNotification.create({
    data: { userId, title, message, type: 'Documents', linkUrl: '/documents' },
  });
}

function employeeContext(
  employee: EmployeeContextEmployee,
  organization: OrganizationContext,
  values: Record<string, string>,
): DocumentContextData {
  const fullName = employee.name || 'Employee';
  const parts = fullName.trim().split(/\s+/);
  const salary = Number(employee.salary || 0);
  const companyName = organization?.legal_name || organization?.name || 'Company';
  return {
    candidate: {
      id: employee.id, firstName: parts[0] || fullName, lastName: parts.slice(1).join(' '),
      fullName, email: employee.email, phone: employee.phone, location: employee.location,
      currentRole: employee.roleTitle, experience: '',
    },
    job: { id: employee.employeeCode, title: employee.roleTitle, department: employee.department || '', location: employee.location || '' },
    offer: {
      id: `employee-${employee.id}`, version: 1, status: 'Approved', offeredTitle: employee.roleTitle,
      offeredCtc: salary, currency: 'INR', proposedJoinDate: employee.joinDate,
    },
    compensation: {
      annualCtc: salary, monthlyGross: salary / 12, basicMonthly: salary / 24, hraMonthly: salary / 48,
      conveyanceMonthly: 0, specialAllowanceMonthly: salary / 48, medicalAllowanceMonthly: 0,
      basicAnnual: salary / 2, hraAnnual: salary / 4, specialAllowanceAnnual: salary / 4,
      variablePayAnnual: 0, joiningBonus: 0, retentionBonus: 0, pfEmployerMonthly: 0,
      pfEmployeeMonthly: 0, gratuityMonthly: 0, estimatedNetTakeHomeMonthly: salary / 12,
      totalEmployerCostMonthly: salary / 12,
    },
    employment: { probationPeriod: 'As per company policy', noticePeriod: 'As per company policy', workingHours: 'As per company policy', workMode: 'As per company policy' },
    company: {
      name: companyName, address: '', email: '', phone: '', website: '',
      hrSignatoryName: 'Human Resources', hrSignatoryTitle: 'HR Department',
    },
    generatedDate: displayDate(),
    benefits: Object.entries(values).map(([key, value]) => `${key}: ${value}`),
  };
}

export async function GET(request: Request) {
  try {
    const employee = await requireEmployee();
    const params = new URL(request.url).searchParams;
    const requestedEmployeeId = params.get('employeeId');
    if (employee.userRole !== 'admin' && requestedEmployeeId && requestedEmployeeId !== employee.id) throw new AuthorizationError();
    const employeeId = requestedEmployeeId || (employee.userRole === 'admin' ? undefined : employee.id);
    const where = employeeId ? { employeeId } : undefined;
    const viewer = employee.userRole === 'admin' ? 'admin' : 'employee';
    const [documents, requests, templates, categories, staff] = await Promise.all([
      db.employeeDocument.findMany({ where, orderBy: { createdAt: 'desc' }, include: { employee: { select: { id: true, name: true, employeeCode: true, department: true } }, document_categories: true } }),
      db.documentRequest.findMany({ where, orderBy: { createdAt: 'desc' }, include: { employee: { select: { id: true, name: true, employeeCode: true, department: true } }, attachments: { include: { document: { select: { id: true, name: true, storage_key: true } } }, orderBy: { addedAt: 'asc' } } } }),
      db.documentTemplate.findMany({ where: { organization_id: employee.organization_id || '', isActive: true }, orderBy: [{ name: 'asc' }, { version: 'desc' }] }),
      db.document_categories.findMany({ where: { organization_id: employee.organization_id || '', is_active: true }, orderBy: { name: 'asc' } }),
      // HR gets a staff directory to pick a recipient when sharing documents.
      viewer === 'admin'
        ? db.employee.findMany({ where: { userRole: { not: 'admin' } }, select: { id: true, name: true, employeeCode: true, department: true, roleTitle: true }, orderBy: { name: 'asc' } })
        : Promise.resolve([]),
    ]);
    return NextResponse.json({ success: true, data: {
      documents: documents.map((doc) => formatDocument(doc, viewer)), requests: requests.map((request) => formatRequest(request, viewer)),
      staff,
      templates: templates.map((template) => ({ id: template.id, name: template.name, type: template.type, version: template.version, variables: extractVariablesFromTemplate(template.content) })),
      categories: categories.map((category) => ({ id: category.id, name: category.name, code: category.code, requiresExpiry: category.requires_expiry })),
    } });
    await invalidateDashboardAnalytics();
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching documents data:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const employee = await requireEmployee();
    const contentType = request.headers.get('content-type') || '';
    const isMultipart = contentType.includes('multipart/form-data');
    // Keep the FormData handle so multi-file actions can read repeated keys.
    const formData = isMultipart ? await request.formData() : null;
    const body: DocumentRequestBody = formData
      ? Object.fromEntries(formData.entries())
      : await request.json() as DocumentRequestBody;
    const action = String(body.action || 'upload');

    if (action === 'upload') {
      const file = isMultipart && body.file instanceof File ? body.file : null;
      if (file && (file.size > MAX_UPLOAD_BYTES || !ALLOWED_MIME_TYPES.has(file.type))) return NextResponse.json({ success: false, error: 'Unsupported file or file exceeds 10 MB.' }, { status: 400 });
      const id = `DOC-${Date.now()}`;
      let storageKey: string | null = null;
      let checksum: string | null = null;
      if (file) {
        const bytes = Buffer.from(await file.arrayBuffer());
        storageKey = `${id}-${path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        await saveDocumentBlob({ key: storageKey, category: 'employee', data: bytes, mimeType: file.type });
        checksum = createHash('sha256').update(bytes).digest('hex');
      }
      const category = body.categoryId ? await db.document_categories.findFirst({ where: { id: String(body.categoryId), organization_id: employee.organization_id || '', is_active: true } }) : null;
      const doc = await db.employeeDocument.create({ data: {
        id, employeeId: employee.id, name: String(body.name || (file?.name || 'Uploaded document')), type: String(body.type || category?.name || 'Other'),
        size: file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : String(body.size || '1.0 MB'), status: DocumentStatus.UnderReview,
        note: String(body.note || 'Uploaded by employee and queued for HR verification.'), uploadedOn: String(body.uploadedOn || displayDate()),
        category_id: category?.id, storage_provider: file ? 'db' : null, storage_key: storageKey, mime_type: file?.type || null, size_bytes: file?.size || null, checksum,
      }, include: { employee: { select: { id: true, name: true, employeeCode: true, department: true } }, document_categories: true } });
      await invalidateDashboardAnalytics();
      return NextResponse.json({ success: true, data: formatDocument(doc, employee.userRole === 'admin' ? 'admin' : 'employee'), type: 'document' });
    }

    if (action === 'request') {
      // Employee files a new document request. The note (reason) is optional.
      const documentType = String(body.documentType || '').trim();
      if (!documentType) return NextResponse.json({ success: false, error: 'Select the document type you need.' }, { status: 400 });
      const reason = String(body.reason || '').trim();
      const id = `REQ-${Date.now()}`;
      const req = await db.documentRequest.create({ data: { id, employeeId: employee.id, documentType, reason: reason || 'No additional details provided.', status: DocumentRequestStatus.Requested, requestedOn: String(body.requestedOn || displayDate()) }, include: { employee: { select: { id: true, name: true, employeeCode: true, department: true } }, attachments: { include: { document: { select: { id: true, name: true, storage_key: true } } }, orderBy: { addedAt: 'asc' } } } });
      await invalidateDashboardAnalytics();
      return NextResponse.json({ success: true, data: formatRequest(req, employee.userRole === 'admin' ? 'admin' : 'employee'), type: 'request' });
    }

    adminOnly(employee);
    if (action === 'approve' || action === 'reject') {
      const documentId = String(body.documentId || '');
      const document = await db.employeeDocument.findUnique({ where: { id: documentId }, include: { employee: true, document_categories: true } });
      if (!document) return NextResponse.json({ success: false, error: 'Document not found.' }, { status: 404 });
      if (action === 'reject') {
        const reason = String(body.reason || '').trim();
        if (!reason) return NextResponse.json({ success: false, error: 'A rejection reason is required.' }, { status: 400 });
        const updated = await db.employeeDocument.update({ where: { id: documentId }, data: { status: DocumentStatus.ActionRequired, note: reason }, include: { employee: { select: { id: true, name: true, employeeCode: true, department: true } }, document_categories: true } });
        await notifyEmployee(document.employeeId, 'Document action required', `${document.name} was rejected by HR. Reason: ${reason}`);
        await invalidateDashboardAnalytics();
        return NextResponse.json({ success: true, data: formatDocument(updated, 'admin') });
      }
      if (document.document_categories?.requires_expiry && !body.expiresAt) return NextResponse.json({ success: false, error: 'An expiry date is required for this document category.' }, { status: 400 });
      // Verifying saves the document to the employee's record as Verified. It is
      // NOT shared yet — HR shares it explicitly via the Send/share action when
      // the employee should be able to download it.
      const updated = await db.employeeDocument.update({ where: { id: documentId }, data: { status: DocumentStatus.Verified, expires_at: body.expiresAt ? new Date(String(body.expiresAt)) : null, note: String(body.note || 'Verified by HR.') }, include: { employee: { select: { id: true, name: true, employeeCode: true, department: true } }, document_categories: true } });
      await notifyEmployee(document.employeeId, 'Document verified', `${document.name} has been verified by HR and saved to your record.`);
      await invalidateDashboardAnalytics();
      return NextResponse.json({ success: true, data: formatDocument(updated, 'admin') });
    }

    if (action === 'hr-request') {
      // HR asks an employee to provide a document. Reuses DocumentRequest with
      // an HRR- id prefix so HR-initiated requests stay distinguishable from
      // employee REQ- ones without a schema migration.
      const targetEmployeeId = String(body.employeeId || '').trim();
      const target = targetEmployeeId ? await db.employee.findUnique({ where: { id: targetEmployeeId } }) : null;
      if (!target) return NextResponse.json({ success: false, error: 'Select the employee to request the document from.' }, { status: 400 });
      const documentType = String(body.documentType || '').trim();
      if (!documentType) return NextResponse.json({ success: false, error: 'Select the document type to request.' }, { status: 400 });
      const reason = String(body.reason || '').trim();
      const req = await db.documentRequest.create({ data: {
        id: `HRR-${Date.now()}`, employeeId: targetEmployeeId, documentType,
        reason: reason || 'HR has requested this document. Please upload it from your Documents page.',
        status: DocumentRequestStatus.Requested, requestedOn: displayDate(),
      }, include: { employee: { select: { id: true, name: true, employeeCode: true, department: true } }, attachments: { include: { document: { select: { id: true, name: true, storage_key: true } } }, orderBy: { addedAt: 'asc' } } } });
      await notifyEmployee(targetEmployeeId, 'Document requested by HR', `HR has requested "${documentType}" from you. Please upload it from your Documents page.`);
      await invalidateDashboardAnalytics();
      return NextResponse.json({ success: true, data: formatRequest(req, 'admin'), type: 'request' });
    }

    if (action === 'share') {
      // Share an existing document with its employee (unlocks their download).
      const documentId = String(body.documentId || '');
      const document = await db.employeeDocument.findUnique({ where: { id: documentId } });
      if (!document) return NextResponse.json({ success: false, error: 'Document not found.' }, { status: 404 });
      if (!document.storage_key) return NextResponse.json({ success: false, error: 'This document has no attached file to share.' }, { status: 400 });
      const updated = await db.employeeDocument.update({ where: { id: documentId }, data: { shared_by_hr: true, shared_at: new Date() }, include: { employee: { select: { id: true, name: true, employeeCode: true, department: true } }, document_categories: true } });
      await notifyEmployee(document.employeeId, 'Document shared by HR', `${document.name} has been shared with you and is ready to download from your Documents page.`);
      await invalidateDashboardAnalytics();
      return NextResponse.json({ success: true, data: formatDocument(updated, 'admin') });
    }

    if (action === 'request-send') {
      // HR fulfils a request: attaches uploaded files and/or a PDF generated
      // from a DocumentTemplate (reusing the template fill flow), marks the
      // request Sent and notifies the employee. Files are stored as regular
      // EmployeeDocument rows — no duplicated storage logic.
      const requestId = String(body.requestId || '');
      const existing = await db.documentRequest.findUnique({ where: { id: requestId }, include: { employee: { include: { organizations: true } } } });
      if (!existing) return NextResponse.json({ success: false, error: 'Request not found.' }, { status: 404 });
      const files = formData ? formData.getAll('files').filter((entry): entry is File => entry instanceof File && entry.size > 0) : [];
      const templateId = String(body.templateId || '').trim();
      if (files.length === 0 && !templateId) return NextResponse.json({ success: false, error: 'Attach at least one file or select a template to generate from.' }, { status: 400 });
      for (const file of files) {
        if (file.size > MAX_UPLOAD_BYTES || !ALLOWED_MIME_TYPES.has(file.type)) return NextResponse.json({ success: false, error: 'Unsupported file or file exceeds 10 MB.' }, { status: 400 });
      }
      let values: Record<string, string> = {};
      if (typeof body.values === 'string') {
        try { values = JSON.parse(body.values) as Record<string, string>; } catch { values = {}; }
      } else if (typeof body.values === 'object' && body.values) {
        values = body.values;
      }
      const attachments: { documentId: string; source: string }[] = [];
      let sequence = 0;
      for (const file of files) {
        sequence += 1;
        const id = `DOC-${Date.now()}-${sequence}`;
        const bytes = Buffer.from(await file.arrayBuffer());
        const storageKey = `${id}-${path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        await saveDocumentBlob({ key: storageKey, category: 'employee', data: bytes, mimeType: file.type });
        const doc = await db.employeeDocument.create({ data: {
          id, employeeId: existing.employeeId, name: String(body.name || file.name), type: existing.documentType,
          size: `${(file.size / 1024 / 1024).toFixed(1)} MB`, status: DocumentStatus.Verified,
          note: `HR response to request ${existing.id}.`, uploadedOn: displayDate(),
          storage_provider: 'db', storage_key: storageKey, mime_type: file.type, size_bytes: file.size,
          checksum: createHash('sha256').update(bytes).digest('hex'), shared_by_hr: true, shared_at: new Date(),
        } });
        attachments.push({ documentId: doc.id, source: 'upload' });
      }
      if (templateId) {
        const template = await db.documentTemplate.findFirst({ where: { id: templateId, organization_id: existing.employee.organization_id || employee.organization_id || '', isActive: true }, orderBy: { version: 'desc' } });
        if (!template) return NextResponse.json({ success: false, error: 'Template not found or inactive.' }, { status: 400 });
        const context = employeeContext(existing.employee, existing.employee.organizations, values);
        const rendered = renderDocumentTemplate(template, context);
        const pdf = generateServerSidePdfBuffer({ title: template.name, documentType: String(template.type), context, renderedHtml: rendered.html });
        sequence += 1;
        const id = `DOC-${Date.now()}-${sequence}`;
        const storageKey = `${id}-${template.name.replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf`;
        await saveDocumentBlob({ key: storageKey, category: 'employee', data: pdf, mimeType: 'application/pdf' });
        const doc = await db.employeeDocument.create({ data: {
          id, employeeId: existing.employeeId, name: template.name, type: template.name,
          size: `${(pdf.length / 1024 / 1024).toFixed(1)} MB`, status: DocumentStatus.Verified,
          note: `Generated for request ${existing.id}.`, uploadedOn: displayDate(), template_id: template.id,
          storage_provider: 'db', storage_key: storageKey, mime_type: 'application/pdf', size_bytes: pdf.length,
          checksum: createHash('sha256').update(pdf).digest('hex'), shared_by_hr: true, shared_at: new Date(),
        } });
        attachments.push({ documentId: doc.id, source: 'template' });
      }
      const updated = await db.$transaction(async (tx) => {
        await tx.documentRequestAttachment.createMany({ data: attachments.map((attachment, index) => ({
          id: `ATT-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
          requestId: existing.id, documentId: attachment.documentId, source: attachment.source, addedById: employee.id,
        })) });
        return tx.documentRequest.update({ where: { id: existing.id }, data: { status: DocumentRequestStatus.Sent, sentAt: new Date() }, include: { employee: { select: { id: true, name: true, employeeCode: true, department: true } }, attachments: { include: { document: { select: { id: true, name: true, storage_key: true } } }, orderBy: { addedAt: 'asc' } } } });
      });
      await notifyEmployee(existing.employeeId, 'Document request fulfilled', `HR has sent ${attachments.length} file${attachments.length === 1 ? '' : 's'} for your "${existing.documentType}" request. Open the Documents page to download ${attachments.length === 1 ? 'it' : 'them'}.`);
      await invalidateDashboardAnalytics();
      return NextResponse.json({ success: true, data: formatRequest(updated, 'admin'), type: 'request' });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error processing document action:', error);
    return NextResponse.json({ success: false, error: 'Failed to process document action' }, { status: 500 });
  }
}
