import { PrismaService } from '../prisma/prisma.service';
export declare class LeavesService {
    private prisma;
    constructor(prisma: PrismaService);
    getBalances(employeeId: string): Promise<{
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
        reason: string;
        leaveType: import("@prisma/client").$Enums.LeaveType;
        startDate: string;
        endDate: string;
        appliedOn: string;
        reviewerId: string | null;
    })[]>;
    createRequest(data: {
        employeeId: string;
        leaveType: any;
        startDate: string;
        endDate: string;
        days: number;
        reason: string;
    }): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.LeaveRequestStatus;
        createdAt: Date;
        updatedAt: Date;
        days: number;
        employeeId: string;
        reason: string;
        leaveType: import("@prisma/client").$Enums.LeaveType;
        startDate: string;
        endDate: string;
        appliedOn: string;
        reviewerId: string | null;
    }>;
    reviewRequest(id: string, status: 'Approved' | 'Rejected', reviewerId: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.LeaveRequestStatus;
        createdAt: Date;
        updatedAt: Date;
        days: number;
        employeeId: string;
        reason: string;
        leaveType: import("@prisma/client").$Enums.LeaveType;
        startDate: string;
        endDate: string;
        appliedOn: string;
        reviewerId: string | null;
    }>;
}
