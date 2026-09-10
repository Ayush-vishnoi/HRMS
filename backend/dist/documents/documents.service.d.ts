import { PrismaService } from '../prisma/prisma.service';
import { NotifyService } from '../common/notifications/notify.service';
export interface UploadedDocumentFile {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}
export declare class DocumentsService {
    private prisma;
    private notify;
    constructor(prisma: PrismaService, notify: NotifyService);
    findAll(userId: string, userRole: string): Promise<{
        documents: {
            id: string;
            employeeId: string;
            employeeName: string;
            name: string;
            type: string;
            uploadedOn: string;
            size: string;
            status: string;
            note: string;
            downloadUrl: string | null;
            downloadable: boolean;
            expiresAt: string | null;
            lockedUntil: string | null;
            isLocked: boolean;
            downloadedAt: string | null;
            sharedByHr: boolean;
            sharedAt: string | null;
            uploadedByEmployee: boolean;
        }[];
        requests: {
            id: string;
            employeeId: string;
            requestedBy: string;
            initiatedByHr: boolean;
            documentType: string;
            reason: string;
            requestedOn: string;
            status: string;
            sentAt: string | null;
            downloadedAt: string | null;
            attachments: {
                id: string;
                documentId: string;
                name: string;
                source: string;
                downloadUrl: string;
            }[];
        }[];
        templates: {
            id: string;
            name: string;
            variables: string[];
        }[];
        staff: {
            id: string;
            name: string;
            employeeCode: string;
            email: string;
            roleTitle: string;
            department: string;
        }[];
    }>;
    upload(userId: string, body: {
        name?: string;
        type?: string;
        requestId?: string;
    }, file?: UploadedDocumentFile): Promise<{
        document: {
            id: string;
            employeeId: string;
            employeeName: string;
            name: string;
            type: string;
            uploadedOn: string;
            size: string;
            status: string;
            note: string;
            downloadUrl: string | null;
            downloadable: boolean;
            expiresAt: string | null;
            lockedUntil: string | null;
            isLocked: boolean;
            downloadedAt: string | null;
            sharedByHr: boolean;
            sharedAt: string | null;
            uploadedByEmployee: boolean;
        };
        request: {
            id: string;
            employeeId: string;
            requestedBy: string;
            initiatedByHr: boolean;
            documentType: string;
            reason: string;
            requestedOn: string;
            status: string;
            sentAt: string | null;
            downloadedAt: string | null;
            attachments: {
                id: string;
                documentId: string;
                name: string;
                source: string;
                downloadUrl: string;
            }[];
        } | null;
    }>;
    createRequest(userId: string, body: {
        documentType?: string;
        reason?: string;
    }): Promise<{
        request: {
            id: string;
            employeeId: string;
            requestedBy: string;
            initiatedByHr: boolean;
            documentType: string;
            reason: string;
            requestedOn: string;
            status: string;
            sentAt: string | null;
            downloadedAt: string | null;
            attachments: {
                id: string;
                documentId: string;
                name: string;
                source: string;
                downloadUrl: string;
            }[];
        };
    }>;
    hrCreateRequest(user: {
        id: string;
        userRole: string;
    }, body: {
        employeeId?: string;
        documentType?: string;
        reason?: string;
    }): Promise<{
        request: {
            id: string;
            employeeId: string;
            requestedBy: string;
            initiatedByHr: boolean;
            documentType: string;
            reason: string;
            requestedOn: string;
            status: string;
            sentAt: string | null;
            downloadedAt: string | null;
            attachments: {
                id: string;
                documentId: string;
                name: string;
                source: string;
                downloadUrl: string;
            }[];
        };
    }>;
    review(user: {
        id: string;
        userRole: string;
    }, body: {
        documentId?: string;
        decision?: string;
        reason?: string;
    }): Promise<{
        document: {
            id: string;
            employeeId: string;
            employeeName: string;
            name: string;
            type: string;
            uploadedOn: string;
            size: string;
            status: string;
            note: string;
            downloadUrl: string | null;
            downloadable: boolean;
            expiresAt: string | null;
            lockedUntil: string | null;
            isLocked: boolean;
            downloadedAt: string | null;
            sharedByHr: boolean;
            sharedAt: string | null;
            uploadedByEmployee: boolean;
        };
        request: {
            id: string;
            employeeId: string;
            requestedBy: string;
            initiatedByHr: boolean;
            documentType: string;
            reason: string;
            requestedOn: string;
            status: string;
            sentAt: string | null;
            downloadedAt: string | null;
            attachments: {
                id: string;
                documentId: string;
                name: string;
                source: string;
                downloadUrl: string;
            }[];
        } | null;
    }>;
    fulfil(user: {
        id: string;
        userRole: string;
    }, body: {
        requestId?: string;
    }, files?: UploadedDocumentFile[]): Promise<{
        request: {
            id: string;
            employeeId: string;
            requestedBy: string;
            initiatedByHr: boolean;
            documentType: string;
            reason: string;
            requestedOn: string;
            status: string;
            sentAt: string | null;
            downloadedAt: string | null;
            attachments: {
                id: string;
                documentId: string;
                name: string;
                source: string;
                downloadUrl: string;
            }[];
        };
    }>;
    share(user: {
        id: string;
        userRole: string;
    }, body: {
        documentId?: string;
    }): Promise<{
        document: {
            id: string;
            employeeId: string;
            employeeName: string;
            name: string;
            type: string;
            uploadedOn: string;
            size: string;
            status: string;
            note: string;
            downloadUrl: string | null;
            downloadable: boolean;
            expiresAt: string | null;
            lockedUntil: string | null;
            isLocked: boolean;
            downloadedAt: string | null;
            sharedByHr: boolean;
            sharedAt: string | null;
            uploadedByEmployee: boolean;
        };
    }>;
    getDocument(user: {
        id: string;
        userRole: string;
    }, documentId: string): Promise<{
        buffer: Buffer<ArrayBuffer>;
        mimeType: string;
        filename: string;
    }>;
    private assertAdmin;
    private parseTemplateVariables;
    private mapDocument;
    private mapRequest;
}
