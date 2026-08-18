import { PrismaService } from '../prisma/prisma.service';
export declare class AttendanceService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(employeeId?: string, from?: string, to?: string): Promise<({
        employee: {
            id: string;
            employeeCode: string;
            name: string;
            avatarUrl: string | null;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.AttendanceStatus;
        location: string;
        createdAt: Date;
        employeeId: string;
        date: string;
        checkIn: string;
        checkOut: string;
        hoursWorked: string;
    })[]>;
    clockIn(employeeId: string, location: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.AttendanceStatus;
        location: string;
        createdAt: Date;
        employeeId: string;
        date: string;
        checkIn: string;
        checkOut: string;
        hoursWorked: string;
    }>;
    clockOut(employeeId: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.AttendanceStatus;
        location: string;
        createdAt: Date;
        employeeId: string;
        date: string;
        checkIn: string;
        checkOut: string;
        hoursWorked: string;
    } | null>;
    getLateRequests(status?: string): Promise<({
        requester: {
            id: string;
            employeeCode: string;
            name: string;
            avatarUrl: string | null;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.LateClockInStatus;
        createdAt: Date;
        requesterId: string;
        requestDate: string;
        reason: string;
        requestedAt: string;
        reviewedById: string | null;
        reviewedAt: string | null;
    })[]>;
    createLateRequest(requesterId: string, requestDate: string, reason: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.LateClockInStatus;
        createdAt: Date;
        requesterId: string;
        requestDate: string;
        reason: string;
        requestedAt: string;
        reviewedById: string | null;
        reviewedAt: string | null;
    }>;
    reviewLateRequest(id: string, status: 'approved' | 'rejected', reviewedById: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.LateClockInStatus;
        createdAt: Date;
        requesterId: string;
        requestDate: string;
        reason: string;
        requestedAt: string;
        reviewedById: string | null;
        reviewedAt: string | null;
    }>;
}
