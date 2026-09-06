import { PrismaService } from '../prisma/prisma.service';
export declare class DisciplinaryService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(user: any, employeeId?: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        acknowledgedAt: Date | null;
        employeeId: string;
        reason: string;
        type: string;
        incidentDate: string;
        attachmentUrl: string | null;
        severity: string;
        issuedById: string;
        issuedByName: string;
        actionRequired: string;
        isEmployeeVisible: boolean;
    }[]>;
    create(user: any, body: any): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        acknowledgedAt: Date | null;
        employeeId: string;
        reason: string;
        type: string;
        incidentDate: string;
        attachmentUrl: string | null;
        severity: string;
        issuedById: string;
        issuedByName: string;
        actionRequired: string;
        isEmployeeVisible: boolean;
    }>;
}
