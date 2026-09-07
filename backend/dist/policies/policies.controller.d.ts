import { PoliciesService } from './policies.service';
export declare class PoliciesController {
    private policiesService;
    constructor(policiesService: PoliciesService);
    findAll(user: any): Promise<({
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
    handle(body: any, user: any): Promise<{
        id: string;
        createdAt: Date;
        employeeId: string;
        policyId: string;
        acknowledgedOn: string;
    } | {
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
