import { PrismaService } from '../prisma/prisma.service';
export declare class AttendanceService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(employeeId?: string, from?: string, to?: string): Promise<({
        employee: {
            id: string;
            name: string;
            employeeCode: string;
            avatarUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.AttendanceStatus;
        location: string;
        employeeId: string;
        date: string;
        checkIn: string;
        checkOut: string;
        hoursWorked: string;
    })[]>;
    create(employeeId: string, data: {
        id?: string;
        date: string;
        checkIn: string;
        status?: string;
        location?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.AttendanceStatus;
        location: string;
        employeeId: string;
        date: string;
        checkIn: string;
        checkOut: string;
        hoursWorked: string;
    }>;
    update(id: string, data: {
        checkOut?: string;
        hoursWorked?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.AttendanceStatus;
        location: string;
        employeeId: string;
        date: string;
        checkIn: string;
        checkOut: string;
        hoursWorked: string;
    }>;
    getLateRequests(status?: string): Promise<({
        requester: {
            id: string;
            name: string;
            employeeCode: string;
            avatarUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.LateClockInStatus;
        reason: string;
        requesterId: string;
        requestDate: string;
        requestedAt: string;
        reviewedById: string | null;
        reviewedAt: string | null;
    })[]>;
    createLateRequest(requesterId: string, requestDate: string, reason: string): Promise<{
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.LateClockInStatus;
        reason: string;
        requesterId: string;
        requestDate: string;
        requestedAt: string;
        reviewedById: string | null;
        reviewedAt: string | null;
    }>;
    reviewLateRequest(id: string, status: 'approved' | 'rejected', reviewedById: string): Promise<{
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.LateClockInStatus;
        reason: string;
        requesterId: string;
        requestDate: string;
        requestedAt: string;
        reviewedById: string | null;
        reviewedAt: string | null;
    }>;
}
