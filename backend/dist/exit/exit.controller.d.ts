import { ExitService } from './exit.service';
export declare class ExitController {
    private exitService;
    constructor(exitService: ExitService);
    findAll(user: any, employeeId?: string): Promise<{
        exitRequests: ({
            clearances: {
                id: string;
                department: string;
                status: string;
                employeeId: string;
                exitRequestId: string;
                clearedById: string | null;
                clearedAt: Date | null;
                assetReturnedCount: number;
                duesPendingAmount: number;
                remarks: string | null;
            }[];
            interview: {
                id: string;
                employeeId: string;
                exitRequestId: string;
                feedbackText: string;
                primaryReason: string;
                ratingCompany: number;
                ratingManager: number;
                ratingCulture: number;
                wouldRecommend: boolean;
                conductedAt: Date;
            } | null;
            settlement: {
                id: string;
                status: string;
                createdAt: Date;
                employeeId: string;
                taxDeduction: number;
                exitRequestId: string;
                totalPayableDays: number;
                basicPay: number;
                leaveEncashmentAmount: number;
                gratuityAmount: number;
                bonusPayable: number;
                pendingDuesDeduction: number;
                netSettlementAmount: number;
                disbursementDate: string | null;
            } | null;
            ktTasks: {
                id: string;
                status: string;
                createdAt: Date;
                updatedAt: Date;
                title: string;
                description: string;
                notes: string | null;
                verifiedAt: Date | null;
                dueDate: string;
                exitRequestId: string;
                recipientEmployeeId: string;
                recipientName: string;
                completedAt: Date | null;
                verifiedById: string | null;
                attachmentUrl: string | null;
            }[];
        } & {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            resignationDate: string;
            requestedRelievingDate: string;
            approvedRelievingDate: string | null;
            reasonCategory: string;
            reasonDetails: string;
            managerApproval: string;
            hrApproval: string;
            noticePeriodDays: number;
        })[];
        alumniRecords: {
            id: string;
            employeeCode: string;
            name: string;
            department: string;
            phone: string | null;
            joinDate: string;
            createdAt: Date;
            employeeId: string;
            personalEmail: string;
            lastDesignation: string;
            exitDate: string;
            relievingLetterUrl: string | null;
            experienceLetterUrl: string | null;
            linkedinUrl: string | null;
        }[];
        assignedAssets: {
            id: string;
            name: string;
            status: import("@prisma/client").$Enums.AssetStatus;
            category: import("@prisma/client").$Enums.AssetCategory;
            assetTag: string;
            serialNumber: string;
        }[];
    }>;
    handleAction(user: any, body: any): Promise<{
        id: string;
        department: string;
        status: string;
        employeeId: string;
        exitRequestId: string;
        clearedById: string | null;
        clearedAt: Date | null;
        assetReturnedCount: number;
        duesPendingAmount: number;
        remarks: string | null;
    } | {
        id: string;
        status: string;
        createdAt: Date;
        employeeId: string;
        taxDeduction: number;
        exitRequestId: string;
        totalPayableDays: number;
        basicPay: number;
        leaveEncashmentAmount: number;
        gratuityAmount: number;
        bonusPayable: number;
        pendingDuesDeduction: number;
        netSettlementAmount: number;
        disbursementDate: string | null;
    } | ({
        clearances: {
            id: string;
            department: string;
            status: string;
            employeeId: string;
            exitRequestId: string;
            clearedById: string | null;
            clearedAt: Date | null;
            assetReturnedCount: number;
            duesPendingAmount: number;
            remarks: string | null;
        }[];
        ktTasks: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            description: string;
            notes: string | null;
            verifiedAt: Date | null;
            dueDate: string;
            exitRequestId: string;
            recipientEmployeeId: string;
            recipientName: string;
            completedAt: Date | null;
            verifiedById: string | null;
            attachmentUrl: string | null;
        }[];
    } & {
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        resignationDate: string;
        requestedRelievingDate: string;
        approvedRelievingDate: string | null;
        reasonCategory: string;
        reasonDetails: string;
        managerApproval: string;
        hrApproval: string;
        noticePeriodDays: number;
    })>;
}
