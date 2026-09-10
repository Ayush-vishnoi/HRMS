import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotifyService } from '../common/notifications/notify.service';

/** MIME types accepted for document uploads (mirrors the frontend accept list). */
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDay(date = new Date()): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${bytes} B`;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Prisma enum value → label shown in the UI (most already match). */
const DOC_STATUS_LABELS: Record<string, string> = {
  Verified: 'Verified',
  UnderReview: 'Under Review',
  ActionRequired: 'Action Required',
};
const REQUEST_STATUS_LABELS: Record<string, string> = {
  InProgress: 'In Progress',
};

/** Request statuses that only occur on HR-initiated requests. */
const HR_INITIATED_STATUSES = new Set(['Requested', 'Submitted', 'Rejected', 'Verified']);

/** Minimal stand-in for Express.Multer.File (@types/multer is not installed). */
export interface UploadedDocumentFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/**
 * Documents & Requests center (src/app/documents/page.tsx).
 *
 * Every mutating action fires the matching NotifyService notification so
 * employees and HR see document updates in the header bell in real time
 * (within the 60-second poll).
 */
@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private notify: NotifyService,
  ) {}

  // ---------------------------------------------------------------- queries

  /** GET /api/documents — role-scoped payload for the documents page. */
  async findAll(userId: string, userRole: string) {
    const isAdmin = userRole === 'admin';

    const [documents, requests, templates, staff] = await Promise.all([
      this.prisma.employeeDocument.findMany({
        where: isAdmin ? {} : { employeeId: userId },
        include: { employee: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.documentRequest.findMany({
        where: isAdmin ? {} : { employeeId: userId },
        include: {
          employee: { select: { name: true } },
          attachments: { include: { document: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.documentTemplate.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        take: 50,
      }),
      isAdmin
        ? this.prisma.employee.findMany({
            where: { status: 'Active' },
            select: { id: true, name: true, email: true, employeeCode: true, department: true, roleTitle: true },
            orderBy: { name: 'asc' },
            take: 200,
          })
        : Promise.resolve([]),
    ]);

    return {
      documents: documents.map((doc) => this.mapDocument(doc, isAdmin)),
      requests: requests.map((req) => this.mapRequest(req)),
      templates: templates.map((tpl) => ({
        id: tpl.id,
        name: tpl.name,
        variables: this.parseTemplateVariables(tpl.content),
      })),
      // Case-insensitive ordering with employeeCode tiebreaker: the DB's
      // `name: 'asc'` collation puts all-uppercase names (e.g. "AYUSH VISHNOI")
      // before mixed-case ones, which made near-duplicate employees sort to
      // the top of HR's picker. Email is included so HR can tell rows apart.
      staff: [...staff].sort(
        (a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) ||
          a.employeeCode.localeCompare(b.employeeCode, undefined, { sensitivity: 'base' }),
      ),
    };
  }

  // --------------------------------------------------------------- actions

  /** POST /api/documents/upload — employee uploads (optionally responding to a request). */
  async upload(
    userId: string,
    body: { name?: string; type?: string; requestId?: string },
    file?: UploadedDocumentFile,
  ) {
    if (!file) throw new BadRequestException('A document file is required.');
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Only PDF, JPG, PNG, WEBP, DOC, and DOCX files are supported.');
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('Document must be 10 MB or smaller.');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    if (!employee) throw new NotFoundException('Employee not found.');

    let request = body.requestId
      ? await this.prisma.documentRequest.findUnique({ where: { id: body.requestId } })
      : null;
    if (body.requestId && !request) {
      throw new NotFoundException('Document request not found.');
    }
    if (request && request.employeeId !== userId) {
      throw new ForbiddenException('You can only respond to your own document requests.');
    }

    const displayName = ((body.name ?? '').trim() || file.originalname).slice(0, 150);
    const storageKey = makeId('empdoc');
    await this.prisma.documentBlob.create({
      data: {
        id: storageKey,
        category: 'employee',
        mime_type: file.mimetype,
        size_bytes: file.size,
        data: file.buffer as unknown as Uint8Array<ArrayBuffer>,
      },
    });

    const created = await this.prisma.employeeDocument.create({
      data: {
        id: makeId('doc'),
        employeeId: userId,
        name: displayName,
        type: ((request ? request.documentType : body.type) || 'Other').slice(0, 80),
        size: formatSize(file.size),
        status: 'UnderReview',
        note: 'Uploaded document queued for HR verification.',
        uploadedOn: formatDay(),
        storage_key: storageKey,
        mime_type: file.mimetype,
        size_bytes: file.size,
        uploaded_by_employee: true,
      },
      include: { employee: { select: { name: true } } },
    });

    if (request) {
      request = await this.prisma.documentRequest.update({
        where: { id: request.id },
        data: { status: 'Submitted', submittedDocumentId: created.id },
        include: {
          employee: { select: { name: true } },
          attachments: { include: { document: { select: { name: true } } } },
        },
      });

      void this.notify.notifyAdmins({
        title: 'Document Submitted for HR Request',
        message: `${employee.name} submitted "${created.name}" for request ${request.id} (${request.documentType}).`,
        type: 'Documents',
        linkUrl: '/documents',
      });
    } else {
      void this.notify.notifyAdmins({
        title: 'Document Submitted for Verification',
        message: `${employee.name} uploaded "${created.name}" (${created.type}). Review it in the document center.`,
        type: 'Documents',
        linkUrl: '/documents',
      });
    }

    return {
      document: this.mapDocument(created, false),
      request: request ? this.mapRequest(request) : null,
    };
  }

  /** POST /api/documents/request — employee asks HR for a document. */
  async createRequest(userId: string, body: { documentType?: string; reason?: string }) {
    const documentType = (body.documentType ?? '').trim();
    if (!documentType) throw new BadRequestException('A document type is required.');
    const reason = (body.reason ?? '').trim() || 'Official company document request.';

    const employee = await this.prisma.employee.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const created = await this.prisma.documentRequest.create({
      data: {
        id: makeId('dreq'),
        employeeId: userId,
        documentType: documentType.slice(0, 100),
        reason,
        status: 'Pending',
        requestedOn: formatDay(),
      },
      include: {
        employee: { select: { name: true } },
        attachments: { include: { document: { select: { name: true } } } },
      },
    });

    void this.notify.notifyAdmins({
      title: 'New Document Request',
      message: `${employee?.name ?? 'An employee'} requested "${documentType}". ${reason}`,
      type: 'Documents',
      linkUrl: '/documents',
    });

    return { request: this.mapRequest(created) };
  }

  /** POST /api/documents/hr-request — admin asks an employee for a document. */
  async hrCreateRequest(
    user: { id: string; userRole: string },
    body: { employeeId?: string; documentType?: string; reason?: string },
  ) {
    this.assertAdmin(user);
    const employeeId = (body.employeeId ?? '').trim();
    const documentType = (body.documentType ?? '').trim();
    if (!employeeId) throw new BadRequestException('An employee is required.');
    if (!documentType) throw new BadRequestException('A document type is required.');

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true },
    });
    if (!employee) throw new NotFoundException('Employee not found.');

    const reason = (body.reason ?? '').trim() || 'HR Document Submission Request';

    const created = await this.prisma.documentRequest.create({
      data: {
        id: makeId('dreq'),
        employeeId,
        documentType: documentType.slice(0, 100),
        reason,
        status: 'Requested',
        requestedOn: formatDay(),
      },
      include: {
        employee: { select: { name: true } },
        attachments: { include: { document: { select: { name: true } } } },
      },
    });

    void this.notify.notifyUser({
      userId: employeeId,
      title: 'HR Requested a Document',
      message: `HR requested "${documentType}" from you. ${reason} Upload it from the Documents page.`,
      type: 'Documents',
      linkUrl: '/documents',
    });

    return { request: this.mapRequest(created) };
  }

  /** POST /api/documents/review — admin verifies or rejects an uploaded document. */
  async review(
    user: { id: string; userRole: string },
    body: { documentId?: string; decision?: string; reason?: string },
  ) {
    this.assertAdmin(user);
    const documentId = (body.documentId ?? '').trim();
    const decision = body.decision === 'verify' || body.decision === 'reject' ? body.decision : null;
    if (!documentId) throw new BadRequestException('A document id is required.');
    if (!decision) throw new BadRequestException('decision must be "verify" or "reject".');
    const reason = (body.reason ?? '').trim();
    if (decision === 'reject' && !reason) {
      throw new BadRequestException('A rejection reason is required.');
    }

    const doc = await this.prisma.employeeDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc) throw new NotFoundException('Document not found.');

    const updated = await this.prisma.employeeDocument.update({
      where: { id: documentId },
      data: {
        status: decision === 'verify' ? 'Verified' : 'ActionRequired',
        note: decision === 'verify' ? 'Verified by HR.' : reason,
      },
      include: { employee: { select: { name: true } } },
    });

    // If the document was submitted against an HR-initiated request, move the
    // request along too (Verified / Rejected → employee may re-upload).
    const linkedRequest = await this.prisma.documentRequest.findFirst({
      where: { submittedDocumentId: documentId },
      include: {
        employee: { select: { name: true } },
        attachments: { include: { document: { select: { name: true } } } },
      },
    });
    const mappedRequest = linkedRequest
      ? this.mapRequest(
          await this.prisma.documentRequest.update({
            where: { id: linkedRequest.id },
            data: { status: decision === 'verify' ? 'Verified' : 'Rejected' },
            include: {
              employee: { select: { name: true } },
              attachments: { include: { document: { select: { name: true } } } },
            },
          }),
        )
      : null;

    void this.notify.notifyUser({
      userId: doc.employeeId,
      title: decision === 'verify' ? 'Document Verified' : 'Document Needs Attention',
      message:
        decision === 'verify'
          ? `Your document "${doc.name}" was verified by HR and saved to your record.`
          : `Your document "${doc.name}" was returned with action required. Reason: ${reason}`,
      type: 'Documents',
      linkUrl: '/documents',
    });

    return { document: this.mapDocument(updated, true), request: mappedRequest };
  }

  /** POST /api/documents/fulfil — admin responds to an employee request with files. */
  async fulfil(
    user: { id: string; userRole: string },
    body: { requestId?: string },
    files: UploadedDocumentFile[] = [],
  ) {
    this.assertAdmin(user);
    const requestId = (body.requestId ?? '').trim();
    if (!requestId) throw new BadRequestException('A request id is required.');

    const request = await this.prisma.documentRequest.findUnique({
      where: { id: requestId },
      include: {
        employee: { select: { id: true, name: true } },
        attachments: { include: { document: { select: { name: true } } } },
      },
    });
    if (!request) throw new NotFoundException('Document request not found.');

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        throw new BadRequestException(`Unsupported file type: ${file.originalname}`);
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new BadRequestException(`"${file.originalname}" must be 10 MB or smaller.`);
      }
    }

    for (const file of files) {
      const storageKey = makeId('empdoc');
      await this.prisma.documentBlob.create({
        data: {
          id: storageKey,
          category: 'employee',
          mime_type: file.mimetype,
          size_bytes: file.size,
          data: file.buffer as unknown as Uint8Array<ArrayBuffer>,
        },
      });

      const doc = await this.prisma.employeeDocument.create({
        data: {
          id: makeId('doc'),
          employeeId: request.employeeId,
          name: file.originalname.slice(0, 150),
          type: request.documentType.slice(0, 80),
          size: formatSize(file.size),
          status: 'Verified',
          note: `Official response to request ${request.id}.`,
          uploadedOn: formatDay(),
          storage_key: storageKey,
          mime_type: file.mimetype,
          size_bytes: file.size,
          shared_by_hr: true,
          shared_at: new Date(),
        },
      });

      await this.prisma.documentRequestAttachment.create({
        data: {
          id: makeId('att'),
          requestId: request.id,
          documentId: doc.id,
          source: 'upload',
          addedById: user.id,
        },
      });
    }

    const updated = await this.prisma.documentRequest.update({
      where: { id: request.id },
      data: { status: 'Sent', sentAt: new Date() },
      include: {
        employee: { select: { name: true } },
        attachments: { include: { document: { select: { name: true } } } },
      },
    });

    void this.notify.notifyUser({
      userId: request.employeeId,
      title: 'Document Request Fulfilled',
      message: `HR responded to your "${request.documentType}" request. The files are ready to download.`,
      type: 'Documents',
      linkUrl: '/documents',
    });

    return { request: this.mapRequest(updated) };
  }

  /** POST /api/documents/share — admin shares a document with its employee. */
  async share(user: { id: string; userRole: string }, body: { documentId?: string }) {
    this.assertAdmin(user);
    const documentId = (body.documentId ?? '').trim();
    if (!documentId) throw new BadRequestException('A document id is required.');

    const doc = await this.prisma.employeeDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found.');

    const updated = await this.prisma.employeeDocument.update({
      where: { id: documentId },
      data: { shared_by_hr: true, shared_at: new Date() },
      include: { employee: { select: { name: true } } },
    });

    void this.notify.notifyUser({
      userId: doc.employeeId,
      title: 'Document Shared',
      message: `HR shared "${doc.name}" with you. You can now download it from the Documents page.`,
      type: 'Documents',
      linkUrl: '/documents',
    });

    return { document: this.mapDocument(updated, true) };
  }

  // -------------------------------------------------------------- download

  /** Loads a stored document file for download, enforcing access rules. */
  async getDocument(user: { id: string; userRole: string }, documentId: string) {
    const doc = await this.prisma.employeeDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found.');

    const isAdmin = user.userRole === 'admin';
    const isOwner = doc.employeeId === user.id;
    const isShareable = doc.status === 'Verified' || doc.shared_by_hr;
    if (!isAdmin && !(isOwner && isShareable)) {
      throw new ForbiddenException('You do not have access to this document.');
    }
    if (!doc.storage_key) {
      throw new NotFoundException('This document has no stored file.');
    }

    const blob = await this.prisma.documentBlob.findUnique({ where: { id: doc.storage_key } });
    if (!blob) throw new NotFoundException('Document file not found.');

    // Record the download and move any "Sent" request carrying this file to "Downloaded".
    await this.prisma.employeeDocument.update({
      where: { id: doc.id },
      data: { downloaded_at: new Date() },
    });
    const attachmentRequests = await this.prisma.documentRequestAttachment.findMany({
      where: { documentId: doc.id },
      select: { requestId: true },
    });
    if (attachmentRequests.length > 0) {
      await this.prisma.documentRequest.updateMany({
        where: {
          id: { in: attachmentRequests.map((a) => a.requestId) },
          status: 'Sent',
        },
        data: { status: 'Downloaded', downloadedAt: new Date() },
      });
    }

    return {
      buffer: Buffer.from(blob.data as unknown as ArrayBuffer),
      mimeType: doc.mime_type || blob.mime_type || 'application/octet-stream',
      filename: doc.name.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_'),
    };
  }

  // --------------------------------------------------------------- helpers

  private assertAdmin(user: { userRole: string }) {
    if (user.userRole !== 'admin') {
      throw new ForbiddenException('Admin access required.');
    }
  }

  private parseTemplateVariables(content: string): string[] {
    const matches = content.match(/\{\{\s*([\w.]+)\s*\}\}/g) ?? [];
    return [...new Set(matches.map((m) => m.replace(/[{}]/g, '').trim()))];
  }

  /** DB row → frontend EmployeeDocument shape. */
  private mapDocument(
    doc: {
      id: string;
      employeeId: string;
      employee?: { name: string } | null;
      name: string;
      type: string;
      size: string;
      status: string;
      note: string | null;
      uploadedOn: string;
      storage_key: string | null;
      fileUrl: string | null;
      expires_at: Date | null;
      locked_until: Date | null;
      downloaded_at: Date | null;
      shared_by_hr: boolean;
      shared_at: Date | null;
      uploaded_by_employee: boolean;
    },
    viewerIsAdmin: boolean,
  ) {
    const hasFile = !!doc.storage_key;
    const downloadable =
      hasFile && (doc.status === 'Verified' || doc.shared_by_hr || viewerIsAdmin);
    return {
      id: doc.id,
      employeeId: doc.employeeId,
      employeeName: doc.employee?.name ?? 'Employee',
      name: doc.name,
      type: doc.type,
      uploadedOn: doc.uploadedOn,
      size: doc.size,
      status: DOC_STATUS_LABELS[doc.status] ?? doc.status,
      note: doc.note ?? '',
      downloadUrl: hasFile ? `/api/documents/${doc.id}/download` : null,
      downloadable,
      expiresAt: doc.expires_at ? formatDay(doc.expires_at) : null,
      lockedUntil: doc.locked_until ? doc.locked_until.toISOString() : null,
      isLocked: !!doc.locked_until && doc.locked_until.getTime() > Date.now(),
      downloadedAt: doc.downloaded_at ? formatDay(doc.downloaded_at) : null,
      sharedByHr: doc.shared_by_hr,
      sharedAt: doc.shared_at ? formatDay(doc.shared_at) : null,
      uploadedByEmployee: doc.uploaded_by_employee,
    };
  }

  /** DB row → frontend DocumentRequest shape. */
  private mapRequest(req: {
    id: string;
    employeeId: string;
    employee?: { name: string } | null;
    documentType: string;
    reason: string;
    status: string;
    requestedOn: string;
    sentAt: Date | null;
    downloadedAt: Date | null;
    attachments?: { id: string; documentId: string; source: string; document?: { name: string } | null }[];
  }) {
    return {
      id: req.id,
      employeeId: req.employeeId,
      requestedBy: req.employee?.name ?? 'Employee',
      initiatedByHr: HR_INITIATED_STATUSES.has(req.status),
      documentType: req.documentType,
      reason: req.reason,
      requestedOn: req.requestedOn,
      status: REQUEST_STATUS_LABELS[req.status] ?? req.status,
      sentAt: req.sentAt ? formatDay(req.sentAt) : null,
      downloadedAt: req.downloadedAt ? formatDay(req.downloadedAt) : null,
      attachments: (req.attachments ?? []).map((a) => ({
        id: a.id,
        documentId: a.documentId,
        name: a.document?.name ?? 'Document',
        source: a.source,
        downloadUrl: `/api/documents/${a.documentId}/download`,
      })),
    };
  }
}
