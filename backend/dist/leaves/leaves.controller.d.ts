import { LeavesService } from './leaves.service';
export declare class LeavesController {
    private leavesService;
    constructor(leavesService: LeavesService);
    getAll(userId: string, userRole: string, employeeId?: string, status?: string): Promise<{
        requests: ({
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
            employeeId: string;
            leaveType: import("@prisma/client").$Enums.LeaveType;
            startDate: string;
            endDate: string;
            days: number;
            reason: string;
            status: import("@prisma/client").$Enums.LeaveRequestStatus;
            appliedOn: string;
            reviewerId: string | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
        balances: {
            id: string;
            employeeId: string;
            leaveType: import("@prisma/client").$Enums.LeaveType;
            createdAt: Date;
            updatedAt: Date;
            year: number;
            total: number;
            used: number;
            remaining: number;
        }[];
    }>;
    getBalances(employeeId: string, userId: string): Promise<{
        id: string;
        employeeId: string;
        leaveType: import("@prisma/client").$Enums.LeaveType;
        createdAt: Date;
        updatedAt: Date;
        year: number;
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
        employeeId: string;
        leaveType: import("@prisma/client").$Enums.LeaveType;
        startDate: string;
        endDate: string;
        days: number;
        reason: string;
        status: import("@prisma/client").$Enums.LeaveRequestStatus;
        appliedOn: string;
        reviewerId: string | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    createRequest(userId: string, body: any): Promise<{
        id: string;
        employeeId: string;
        leaveType: import("@prisma/client").$Enums.LeaveType;
        startDate: string;
        endDate: string;
        days: number;
        reason: string;
        status: import("@prisma/client").$Enums.LeaveRequestStatus;
        appliedOn: string;
        reviewerId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    reviewRequest(body: {
        id: string;
        status: 'Approved' | 'Rejected';
        reviewerId?: string;
    }, userId: string): Promise<{
        id: string;
        employeeId: string;
        leaveType: import("@prisma/client").$Enums.LeaveType;
        startDate: string;
        endDate: string;
        days: number;
        reason: string;
        status: import("@prisma/client").$Enums.LeaveRequestStatus;
        appliedOn: string;
        reviewerId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
