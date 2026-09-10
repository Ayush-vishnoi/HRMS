import type { Response } from 'express';
import { DocumentsService } from './documents.service';
import type { UploadedDocumentFile } from './documents.service';
export declare class DocumentsController {
    private documentsService;
    constructor(documentsService: DocumentsService);
    findAll(user: any): Promise<{
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
    upload(userId: string, body: any, file?: UploadedDocumentFile): Promise<{
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
    createRequest(userId: string, body: any): Promise<{
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
    hrCreateRequest(user: any, body: any): Promise<{
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
    review(user: any, body: any): Promise<{
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
    fulfil(user: any, body: any, files?: UploadedDocumentFile[]): Promise<{
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
    share(user: any, body: any): Promise<{
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
    download(user: any, id: string, res: Response): Promise<Response<any, Record<string, any>>>;
}
