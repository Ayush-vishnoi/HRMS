import { PrismaService } from '../prisma/prisma.service';
export declare class DisciplinaryService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(user: any, employeeId?: string): Promise<{
        id: string;
        type: string;
        createdAt: Date;
        status: string;
        updatedAt: Date;
        employeeId: string;
        reason: string;
        acknowledgedAt: Date | null;
        severity: string;
        incidentDate: string;
        issuedById: string;
        issuedByName: string;
        actionRequired: string;
        isEmployeeVisible: boolean;
        attachmentUrl: string | null;
    }[]>;
    create(user: any, body: any): Promise<{
        id: string;
        type: string;
        createdAt: Date;
        status: string;
        updatedAt: Date;
        employeeId: string;
        reason: string;
        acknowledgedAt: Date | null;
        severity: string;
        incidentDate: string;
        issuedById: string;
        issuedByName: string;
        actionRequired: string;
        isEmployeeVisible: boolean;
        attachmentUrl: string | null;
    }>;
}
