import { LeavesService } from './leaves.service';
export declare class LeavesController {
    private leavesService;
    constructor(leavesService: LeavesService);
    getAll(userId: string, employeeId?: string, status?: string): Promise<{
        requests: ({
            employee: {
                id: string;
                name: string;
                employeeCode: string;
                department: string;
                avatarUrl: string | null;
            };
            reviewer: {
                id: string;
                name: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.LeaveRequestStatus;
            updatedAt: Date;
            days: number;
            employeeId: string;
            leaveType: import("@prisma/client").$Enums.LeaveType;
            startDate: string;
            endDate: string;
            reason: string;
            appliedOn: string;
            reviewerId: string | null;
        })[];
        balances: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            year: number;
            employeeId: string;
            leaveType: import("@prisma/client").$Enums.LeaveType;
            total: number;
            used: number;
            remaining: number;
        }[];
    }>;
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
            name: string;
            employeeCode: string;
            department: string;
            avatarUrl: string | null;
        };
        reviewer: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.LeaveRequestStatus;
        updatedAt: Date;
        days: number;
        employeeId: string;
        leaveType: import("@prisma/client").$Enums.LeaveType;
        startDate: string;
        endDate: string;
        reason: string;
        appliedOn: string;
        reviewerId: string | null;
    })[]>;
    createRequest(userId: string, body: any): Promise<{
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.LeaveRequestStatus;
        updatedAt: Date;
        days: number;
        employeeId: string;
        leaveType: import("@prisma/client").$Enums.LeaveType;
        startDate: string;
        endDate: string;
        reason: string;
        appliedOn: string;
        reviewerId: string | null;
    }>;
    reviewRequest(body: {
        id: string;
        status: 'Approved' | 'Rejected';
        reviewerId?: string;
    }, userId: string): Promise<{
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.LeaveRequestStatus;
        updatedAt: Date;
        days: number;
        employeeId: string;
        leaveType: import("@prisma/client").$Enums.LeaveType;
        startDate: string;
        endDate: string;
        reason: string;
        appliedOn: string;
        reviewerId: string | null;
    }>;
}
