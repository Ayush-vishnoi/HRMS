import { LeavesService } from './leaves.service';
export declare class LeavesController {
    private leavesService;
    constructor(leavesService: LeavesService);
    getBalances(employeeId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        year: number;
        employeeId: string;
        leaveType: import("@prisma/client").$Enums.LeaveType;
        total: number;
        used: number;
        remaining: number;
    }[]>;
    getRequests(employeeId?: string, status?: string): Promise<({
        employee: {
            id: string;
            employeeCode: string;
            name: string;
            department: string;
            avatarUrl: string | null;
        };
        reviewer: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        status: import("@prisma/client").$Enums.LeaveRequestStatus;
        createdAt: Date;
        updatedAt: Date;
        days: number;
        employeeId: string;
        leaveType: import("@prisma/client").$Enums.LeaveType;
        reason: string;
        startDate: string;
        endDate: string;
        appliedOn: string;
        reviewerId: string | null;
    })[]>;
    createRequest(userId: string, body: any): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.LeaveRequestStatus;
        createdAt: Date;
        updatedAt: Date;
        days: number;
        employeeId: string;
        leaveType: import("@prisma/client").$Enums.LeaveType;
        reason: string;
        startDate: string;
        endDate: string;
        appliedOn: string;
        reviewerId: string | null;
    }>;
    reviewRequest(id: string, body: {
        status: 'Approved' | 'Rejected';
    }, userId: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.LeaveRequestStatus;
        createdAt: Date;
        updatedAt: Date;
        days: number;
        employeeId: string;
        leaveType: import("@prisma/client").$Enums.LeaveType;
        reason: string;
        startDate: string;
        endDate: string;
        appliedOn: string;
        reviewerId: string | null;
    }>;
}
