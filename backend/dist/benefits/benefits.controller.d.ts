import { BenefitsService } from './benefits.service';
export declare class BenefitsController {
    private benefitsService;
    constructor(benefitsService: BenefitsService);
    findAll(employeeId?: string): Promise<{
        plans: {
            id: string;
            name: string;
            createdAt: Date;
            description: string;
            isActive: boolean;
            planType: string;
            provider: string;
            coverageAmount: number;
            annualPremium: number;
            companyContribution: number;
            employeeContribution: number;
        }[];
        enrollments: ({
            plan: {
                id: string;
                name: string;
                createdAt: Date;
                description: string;
                isActive: boolean;
                planType: string;
                provider: string;
                coverageAmount: number;
                annualPremium: number;
                companyContribution: number;
                employeeContribution: number;
            };
            dependents: {
                id: string;
                name: string;
                createdAt: Date;
                enrollmentId: string;
                relationship: string;
                dateOfBirth: string;
                gender: string;
            }[];
            claims: {
                id: string;
                status: string;
                createdAt: Date;
                employeeId: string;
                enrollmentId: string;
                claimType: string;
                claimAmount: number;
                hospital: string;
                incidentDate: string;
                settledAmount: number | null;
            }[];
        } & {
            id: string;
            status: string;
            createdAt: Date;
            employeeId: string;
            benefitPlanId: string;
            enrollmentDate: string;
            coverageStartDate: string;
            coverageEndDate: string;
        })[];
        claims: {
            id: string;
            status: string;
            createdAt: Date;
            employeeId: string;
            enrollmentId: string;
            claimType: string;
            claimAmount: number;
            hospital: string;
            incidentDate: string;
            settledAmount: number | null;
        }[];
    }>;
    handleAction(body: any): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        employeeId: string;
        enrollmentId: string;
        claimType: string;
        claimAmount: number;
        hospital: string;
        incidentDate: string;
        settledAmount: number | null;
    } | {
        id: string;
        name: string;
        createdAt: Date;
        enrollmentId: string;
        relationship: string;
        dateOfBirth: string;
        gender: string;
    } | ({
        plan: {
            id: string;
            name: string;
            createdAt: Date;
            description: string;
            isActive: boolean;
            planType: string;
            provider: string;
            coverageAmount: number;
            annualPremium: number;
            companyContribution: number;
            employeeContribution: number;
        };
    } & {
        id: string;
        status: string;
        createdAt: Date;
        employeeId: string;
        benefitPlanId: string;
        enrollmentDate: string;
        coverageStartDate: string;
        coverageEndDate: string;
    })>;
}
