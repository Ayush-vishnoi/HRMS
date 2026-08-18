import { PrismaService } from '../prisma/prisma.service';
export declare class DocumentsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(employeeId: string, isAdmin: boolean, requestedEmployeeId?: string): Promise<{
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
    uploadDocument(employeeId: string, data: any): Promise<{
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
    }>;
    createRequest(employeeId: string, data: any): Promise<{
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
    }>;
}
