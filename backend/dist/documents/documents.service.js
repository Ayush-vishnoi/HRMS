"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notify_service_1 = require("../common/notifications/notify.service");
const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDay(date = new Date()) {
    return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
function formatSize(bytes) {
    if (bytes >= 1024 * 1024)
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024)
        return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${bytes} B`;
}
function makeId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
const DOC_STATUS_LABELS = {
    Verified: 'Verified',
    UnderReview: 'Under Review',
    ActionRequired: 'Action Required',
};
const REQUEST_STATUS_LABELS = {
    InProgress: 'In Progress',
};
const HR_INITIATED_STATUSES = new Set(['Requested', 'Submitted', 'Rejected', 'Verified']);
let DocumentsService = class DocumentsService {
    prisma;
    notify;
    constructor(prisma, notify) {
        this.prisma = prisma;
        this.notify = notify;
    }
    async findAll(userId, userRole) {
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
            staff: [...staff].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) ||
                a.employeeCode.localeCompare(b.employeeCode, undefined, { sensitivity: 'base' })),
        };
    }
    async upload(userId, body, file) {
        if (!file)
            throw new common_1.BadRequestException('A document file is required.');
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            throw new common_1.BadRequestException('Only PDF, JPG, PNG, WEBP, DOC, and DOCX files are supported.');
        }
        if (file.size > MAX_UPLOAD_BYTES) {
            throw new common_1.BadRequestException('Document must be 10 MB or smaller.');
        }
        const employee = await this.prisma.employee.findUnique({
            where: { id: userId },
            select: { name: true },
        });
        if (!employee)
            throw new common_1.NotFoundException('Employee not found.');
        let request = body.requestId
            ? await this.prisma.documentRequest.findUnique({ where: { id: body.requestId } })
            : null;
        if (body.requestId && !request) {
            throw new common_1.NotFoundException('Document request not found.');
        }
        if (request && request.employeeId !== userId) {
            throw new common_1.ForbiddenException('You can only respond to your own document requests.');
        }
        const displayName = ((body.name ?? '').trim() || file.originalname).slice(0, 150);
        const storageKey = makeId('empdoc');
        await this.prisma.documentBlob.create({
            data: {
                id: storageKey,
                category: 'employee',
                mime_type: file.mimetype,
                size_bytes: file.size,
                data: file.buffer,
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
        }
        else {
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
    async createRequest(userId, body) {
        const documentType = (body.documentType ?? '').trim();
        if (!documentType)
            throw new common_1.BadRequestException('A document type is required.');
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
    async hrCreateRequest(user, body) {
        this.assertAdmin(user);
        const employeeId = (body.employeeId ?? '').trim();
        const documentType = (body.documentType ?? '').trim();
        if (!employeeId)
            throw new common_1.BadRequestException('An employee is required.');
        if (!documentType)
            throw new common_1.BadRequestException('A document type is required.');
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            select: { id: true, name: true },
        });
        if (!employee)
            throw new common_1.NotFoundException('Employee not found.');
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
    async review(user, body) {
        this.assertAdmin(user);
        const documentId = (body.documentId ?? '').trim();
        const decision = body.decision === 'verify' || body.decision === 'reject' ? body.decision : null;
        if (!documentId)
            throw new common_1.BadRequestException('A document id is required.');
        if (!decision)
            throw new common_1.BadRequestException('decision must be "verify" or "reject".');
        const reason = (body.reason ?? '').trim();
        if (decision === 'reject' && !reason) {
            throw new common_1.BadRequestException('A rejection reason is required.');
        }
        const doc = await this.prisma.employeeDocument.findUnique({
            where: { id: documentId },
        });
        if (!doc)
            throw new common_1.NotFoundException('Document not found.');
        const updated = await this.prisma.employeeDocument.update({
            where: { id: documentId },
            data: {
                status: decision === 'verify' ? 'Verified' : 'ActionRequired',
                note: decision === 'verify' ? 'Verified by HR.' : reason,
            },
            include: { employee: { select: { name: true } } },
        });
        const linkedRequest = await this.prisma.documentRequest.findFirst({
            where: { submittedDocumentId: documentId },
            include: {
                employee: { select: { name: true } },
                attachments: { include: { document: { select: { name: true } } } },
            },
        });
        const mappedRequest = linkedRequest
            ? this.mapRequest(await this.prisma.documentRequest.update({
                where: { id: linkedRequest.id },
                data: { status: decision === 'verify' ? 'Verified' : 'Rejected' },
                include: {
                    employee: { select: { name: true } },
                    attachments: { include: { document: { select: { name: true } } } },
                },
            }))
            : null;
        void this.notify.notifyUser({
            userId: doc.employeeId,
            title: decision === 'verify' ? 'Document Verified' : 'Document Needs Attention',
            message: decision === 'verify'
                ? `Your document "${doc.name}" was verified by HR and saved to your record.`
                : `Your document "${doc.name}" was returned with action required. Reason: ${reason}`,
            type: 'Documents',
            linkUrl: '/documents',
        });
        return { document: this.mapDocument(updated, true), request: mappedRequest };
    }
    async fulfil(user, body, files = []) {
        this.assertAdmin(user);
        const requestId = (body.requestId ?? '').trim();
        if (!requestId)
            throw new common_1.BadRequestException('A request id is required.');
        const request = await this.prisma.documentRequest.findUnique({
            where: { id: requestId },
            include: {
                employee: { select: { id: true, name: true } },
                attachments: { include: { document: { select: { name: true } } } },
            },
        });
        if (!request)
            throw new common_1.NotFoundException('Document request not found.');
        for (const file of files) {
            if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
                throw new common_1.BadRequestException(`Unsupported file type: ${file.originalname}`);
            }
            if (file.size > MAX_UPLOAD_BYTES) {
                throw new common_1.BadRequestException(`"${file.originalname}" must be 10 MB or smaller.`);
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
                    data: file.buffer,
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
    async share(user, body) {
        this.assertAdmin(user);
        const documentId = (body.documentId ?? '').trim();
        if (!documentId)
            throw new common_1.BadRequestException('A document id is required.');
        const doc = await this.prisma.employeeDocument.findUnique({ where: { id: documentId } });
        if (!doc)
            throw new common_1.NotFoundException('Document not found.');
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
    async getDocument(user, documentId) {
        const doc = await this.prisma.employeeDocument.findUnique({ where: { id: documentId } });
        if (!doc)
            throw new common_1.NotFoundException('Document not found.');
        const isAdmin = user.userRole === 'admin';
        const isOwner = doc.employeeId === user.id;
        const isShareable = doc.status === 'Verified' || doc.shared_by_hr;
        if (!isAdmin && !(isOwner && isShareable)) {
            throw new common_1.ForbiddenException('You do not have access to this document.');
        }
        if (!doc.storage_key) {
            throw new common_1.NotFoundException('This document has no stored file.');
        }
        const blob = await this.prisma.documentBlob.findUnique({ where: { id: doc.storage_key } });
        if (!blob)
            throw new common_1.NotFoundException('Document file not found.');
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
            buffer: Buffer.from(blob.data),
            mimeType: doc.mime_type || blob.mime_type || 'application/octet-stream',
            filename: doc.name.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_'),
        };
    }
    assertAdmin(user) {
        if (user.userRole !== 'admin') {
            throw new common_1.ForbiddenException('Admin access required.');
        }
    }
    parseTemplateVariables(content) {
        const matches = content.match(/\{\{\s*([\w.]+)\s*\}\}/g) ?? [];
        return [...new Set(matches.map((m) => m.replace(/[{}]/g, '').trim()))];
    }
    mapDocument(doc, viewerIsAdmin) {
        const hasFile = !!doc.storage_key;
        const downloadable = hasFile && (doc.status === 'Verified' || doc.shared_by_hr || viewerIsAdmin);
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
    mapRequest(req) {
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
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notify_service_1.NotifyService])
], DocumentsService);
//# sourceMappingURL=documents.service.js.map