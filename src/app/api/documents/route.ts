import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
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
import type { DocumentContextData } from '@/lib/documents/template-variables';

const SECURE_DOCS_DIR = path.join(process.cwd(), 'uploads', 'documents', 'employee');
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

const mapReqStatusToPrisma = (status?: string): DocumentRequestStatus => {
  const value = (status || '').toLowerCase().replace(/[^a-z]/g, '');
  if (value === 'inprogress' || value === 'review') return DocumentRequestStatus.InProgress;
  if (value === 'ready') return DocumentRequestStatus.Ready;
  if (value === 'delivered' || value === 'completed') return DocumentRequestStatus.Delivered;
  return DocumentRequestStatus.Pending;
};

const mapPrismaReqStatusToDisplay = (status: DocumentRequestStatus) => {
  if (status === DocumentRequestStatus.InProgress) return 'In Progress';
  if (status === DocumentRequestStatus.Ready) return 'Ready';
  if (status === DocumentRequestStatus.Delivered) return 'Delivered';
  return 'Pending';
};

type DocumentWithRelations = Prisma.EmployeeDocumentGetPayload<{
  include: {
    employee: { select: { id: true; name: true; employeeCode: true; department: true } };
    document_categories: true;
  };
}>;

type RequestWithEmployee = Prisma.DocumentRequestGetPayload<{
  include: {
    employee: { select: { id: true; name: true; employeeCode: true; department: true } };
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

const formatDocument = (doc: DocumentWithRelations) => ({
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
  downloadable: Boolean(doc.storage_key),
  downloadUrl: doc.storage_key ? `/api/documents/${encodeURIComponent(doc.id)}` : null,
});

const formatRequest = (request: RequestWithEmployee) => ({
  id: request.id,
  employeeId: request.employeeId,
  requestedBy: request.employee?.name || '',
  documentType: request.documentType,
  reason: request.reason,
  requestedOn: request.requestedOn,
  status: mapPrismaReqStatusToDisplay(request.status),
});

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
    const [documents, requests, templates, categories] = await Promise.all([
      db.employeeDocument.findMany({ where, orderBy: { createdAt: 'desc' }, include: { employee: { select: { id: true, name: true, employeeCode: true, department: true } }, document_categories: true } }),
      db.documentRequest.findMany({ where, orderBy: { createdAt: 'desc' }, include: { employee: { select: { id: true, name: true, employeeCode: true, department: true } } } }),
      db.documentTemplate.findMany({ where: { organization_id: employee.organization_id || '', isActive: true }, orderBy: [{ name: 'asc' }, { version: 'desc' }] }),
      db.document_categories.findMany({ where: { organization_id: employee.organization_id || '', is_active: true }, orderBy: { name: 'asc' } }),
    ]);
    return NextResponse.json({ success: true, data: {
      documents: documents.map(formatDocument), requests: requests.map(formatRequest),
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
    const body: DocumentRequestBody = isMultipart
      ? Object.fromEntries(await (await request.formData()).entries())
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
        await mkdir(SECURE_DOCS_DIR, { recursive: true });
        await writeFile(path.join(SECURE_DOCS_DIR, storageKey), bytes);
        checksum = createHash('sha256').update(bytes).digest('hex');
      }
      const category = body.categoryId ? await db.document_categories.findFirst({ where: { id: String(body.categoryId), organization_id: employee.organization_id || '', is_active: true } }) : null;
      const doc = await db.employeeDocument.create({ data: {
        id, employeeId: employee.id, name: String(body.name || (file?.name || 'Uploaded document')), type: String(body.type || category?.name || 'Other'),
        size: file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : String(body.size || '1.0 MB'), status: DocumentStatus.UnderReview,
        note: String(body.note || 'Uploaded by employee and queued for HR verification.'), uploadedOn: String(body.uploadedOn || displayDate()),
        category_id: category?.id, storage_provider: file ? 'local-private' : null, storage_key: storageKey, mime_type: file?.type || null, size_bytes: file?.size || null, checksum,
      }, include: { employee: { select: { id: true, name: true, employeeCode: true, department: true } }, document_categories: true } });
      await invalidateDashboardAnalytics();
      return NextResponse.json({ success: true, data: formatDocument(doc), type: 'document' });
    }

    if (action === 'request') {
      const documentType = String(body.documentType || '').trim();
      const reason = String(body.reason || '').trim();
      if (!documentType || !reason) return NextResponse.json({ success: false, error: 'Document type and reason are required.' }, { status: 400 });
      const id = `REQ-${Date.now()}`;
      const req = await db.documentRequest.create({ data: { id, employeeId: employee.id, documentType, reason, status: DocumentRequestStatus.Pending, requestedOn: String(body.requestedOn || displayDate()) }, include: { employee: { select: { id: true, name: true, employeeCode: true, department: true } } } });
      await invalidateDashboardAnalytics();
      return NextResponse.json({ success: true, data: formatRequest(req), type: 'request' });
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
        return NextResponse.json({ success: true, data: formatDocument(updated) });
      }
      if (document.document_categories?.requires_expiry && !body.expiresAt) return NextResponse.json({ success: false, error: 'An expiry date is required for this document category.' }, { status: 400 });
      const updated = await db.employeeDocument.update({ where: { id: documentId }, data: { status: DocumentStatus.Verified, expires_at: body.expiresAt ? new Date(String(body.expiresAt)) : null, note: String(body.note || 'Verified by HR.') }, include: { employee: { select: { id: true, name: true, employeeCode: true, department: true } }, document_categories: true } });
      await notifyEmployee(document.employeeId, 'Document verified', `${document.name} has been verified by HR.`);
      await invalidateDashboardAnalytics();
      return NextResponse.json({ success: true, data: formatDocument(updated) });
    }

    if (action === 'update-request') {
      const requestId = String(body.requestId || '');
      const status = mapReqStatusToPrisma(String(body.status));
      const existing = await db.documentRequest.findUnique({ where: { id: requestId }, include: { employee: true } });
      if (!existing) return NextResponse.json({ success: false, error: 'Request not found.' }, { status: 404 });
      const updated = await db.documentRequest.update({ where: { id: requestId }, data: { status }, include: { employee: { select: { id: true, name: true, employeeCode: true, department: true } } } });
      await invalidateDashboardAnalytics();
      return NextResponse.json({ success: true, data: formatRequest(updated) });
    }

    if (action === 'generate') {
      const requestId = String(body.requestId || '');
      const existing = await db.documentRequest.findUnique({ where: { id: requestId }, include: { employee: { include: { organizations: true } } } });
      if (!existing) return NextResponse.json({ success: false, error: 'Request not found.' }, { status: 404 });
      const template = await db.documentTemplate.findFirst({ where: { organization_id: existing.employee.organization_id || employee.organization_id || '', isActive: true, name: existing.documentType }, orderBy: { version: 'desc' } }) || await db.documentTemplate.findFirst({ where: { organization_id: existing.employee.organization_id || employee.organization_id || '', isActive: true }, orderBy: { version: 'desc' } });
      if (!template) return NextResponse.json({ success: false, error: 'No active template is available for this request.' }, { status: 400 });
      const values = typeof body.values === 'object' && body.values ? body.values : {};
      const context = employeeContext(existing.employee, existing.employee.organizations, values);
      const rendered = renderDocumentTemplate(template, context);
      const pdf = generateServerSidePdfBuffer({ title: template.name, documentType: String(template.type), context, renderedHtml: rendered.html });
      const id = `DOC-${Date.now()}`;
      const storageKey = `${id}-${template.name.replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf`;
      await mkdir(SECURE_DOCS_DIR, { recursive: true });
      await writeFile(path.join(SECURE_DOCS_DIR, storageKey), pdf);
      const generated = await db.$transaction(async (tx) => {
        const doc = await tx.employeeDocument.create({ data: { id, employeeId: existing.employeeId, name: template.name, type: template.name, size: `${(pdf.length / 1024 / 1024).toFixed(1)} MB`, status: DocumentStatus.Verified, note: `Generated from request ${existing.id}.`, uploadedOn: displayDate(), template_id: template.id, storage_provider: 'local-private', storage_key: storageKey, mime_type: 'application/pdf', size_bytes: pdf.length, checksum: createHash('sha256').update(pdf).digest('hex') }, include: { employee: { select: { id: true, name: true, employeeCode: true, department: true } }, document_categories: true } });
        await tx.documentRequest.update({ where: { id: existing.id }, data: { status: DocumentRequestStatus.Ready } });
        return doc;
      });
      await notifyEmployee(existing.employeeId, 'Document ready', `${template.name} is ready to download from your Documents page.`);
      await invalidateDashboardAnalytics();
      return NextResponse.json({ success: true, data: formatDocument(generated), requestId: existing.id });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error processing document action:', error);
    return NextResponse.json({ success: false, error: 'Failed to process document action' }, { status: 500 });
  }
}
