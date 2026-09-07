import { PrismaService } from '../prisma/prisma.service';
export declare class PoliciesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(employeeId: string, isAdmin: boolean): Promise<({
        acknowledgements: {
            id: string;
            createdAt: Date;
            employeeId: string;
            policyId: string;
            acknowledgedOn: string;
        }[];
    } & {
        id: string;
        title: string;
        createdAt: Date;
        updatedAt: Date;
        category: import("@prisma/client").$Enums.PolicyCategory;
        effectiveDate: string;
        summary: string;
        version: string;
        updatedOn: string;
        uploadedById: string;
        mandatory: boolean;
        acknowledgementRequired: boolean;
        fileName: string;
        fileSize: string;
    })[]>;
    acknowledge(policyId: string, employeeId: string): Promise<{
        id: string;
        createdAt: Date;
        employeeId: string;
        policyId: string;
        acknowledgedOn: string;
    }>;
    create(data: any, uploadedById: string): Promise<{
        id: string;
        title: string;
        createdAt: Date;
        updatedAt: Date;
        category: import("@prisma/client").$Enums.PolicyCategory;
        effectiveDate: string;
        summary: string;
        version: string;
        updatedOn: string;
        uploadedById: string;
        mandatory: boolean;
        acknowledgementRequired: boolean;
        fileName: string;
        fileSize: string;
    }>;
}
