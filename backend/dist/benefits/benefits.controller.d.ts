import { BenefitsService } from './benefits.service';
export declare class BenefitsController {
    private benefitsService;
    constructor(benefitsService: BenefitsService);
    findAll(employeeId?: string): Promise<{
        plans: {
            id: string;
            createdAt: Date;
            name: string;
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
                createdAt: Date;
                name: string;
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
                createdAt: Date;
                name: string;
                enrollmentId: string;
                relationship: string;
                dateOfBirth: string;
                gender: string;
            }[];
            claims: {
                id: string;
                createdAt: Date;
                status: string;
                employeeId: string;
                incidentDate: string;
                enrollmentId: string;
                claimType: string;
                claimAmount: number;
                hospital: string;
                settledAmount: number | null;
            }[];
        } & {
            id: string;
            createdAt: Date;
            status: string;
            employeeId: string;
            benefitPlanId: string;
            enrollmentDate: string;
            coverageStartDate: string;
            coverageEndDate: string;
        })[];
        claims: {
            id: string;
            createdAt: Date;
            status: string;
            employeeId: string;
            incidentDate: string;
            enrollmentId: string;
            claimType: string;
            claimAmount: number;
            hospital: string;
            settledAmount: number | null;
        }[];
    }>;
    handleAction(body: any): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        employeeId: string;
        incidentDate: string;
        enrollmentId: string;
        claimType: string;
        claimAmount: number;
        hospital: string;
        settledAmount: number | null;
    } | {
        id: string;
        createdAt: Date;
        name: string;
        enrollmentId: string;
        relationship: string;
        dateOfBirth: string;
        gender: string;
    } | ({
        plan: {
            id: string;
            createdAt: Date;
            name: string;
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
        createdAt: Date;
        status: string;
        employeeId: string;
        benefitPlanId: string;
        enrollmentDate: string;
        coverageStartDate: string;
        coverageEndDate: string;
    })>;
}
