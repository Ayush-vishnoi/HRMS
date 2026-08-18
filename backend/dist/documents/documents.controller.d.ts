import { DocumentsService } from './documents.service';
export declare class DocumentsController {
    private documentsService;
    constructor(documentsService: DocumentsService);
    findAll(user: any, employeeId?: string): Promise<{
        documents: ({
            employee: {
                id: string;
                employeeCode: string;
                name: string;
                department: string;
            };
        } & {
            id: string;
            name: string;
            status: import("@prisma/client").$Enums.DocumentStatus;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            type: string;
            fileUrl: string | null;
            size: string;
            note: string | null;
            uploadedOn: string;
            category_id: string | null;
            template_id: string | null;
            storage_provider: string | null;
            storage_key: string | null;
            mime_type: string | null;
            size_bytes: number | null;
            checksum: string | null;
            issued_at: Date | null;
            expires_at: Date | null;
            expiry_reminder_at: Date | null;
            signature_status: import("@prisma/client").$Enums.DocumentSignatureStatus;
            signed_at: Date | null;
        })[];
        requests: ({
            employee: {
                id: string;
                employeeCode: string;
                name: string;
                department: string;
            };
        } & {
            id: string;
            status: import("@prisma/client").$Enums.DocumentRequestStatus;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            reason: string;
            documentType: string;
            requestedOn: string;
        })[];
    }>;
    handle(body: any, user: any): Promise<({
        employee: {
            id: string;
            employeeCode: string;
            name: string;
            department: string;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.DocumentRequestStatus;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        reason: string;
        documentType: string;
        requestedOn: string;
    }) | ({
        employee: {
            id: string;
            employeeCode: string;
            name: string;
            department: string;
        };
    } & {
        id: string;
        name: string;
        status: import("@prisma/client").$Enums.DocumentStatus;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        type: string;
        fileUrl: string | null;
        size: string;
        note: string | null;
        uploadedOn: string;
        category_id: string | null;
        template_id: string | null;
        storage_provider: string | null;
        storage_key: string | null;
        mime_type: string | null;
        size_bytes: number | null;
        checksum: string | null;
        issued_at: Date | null;
        expires_at: Date | null;
        expiry_reminder_at: Date | null;
        signature_status: import("@prisma/client").$Enums.DocumentSignatureStatus;
        signed_at: Date | null;
    })>;
}
