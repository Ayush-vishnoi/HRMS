import { AttendanceService } from './attendance.service';
export declare class AttendanceController {
    private attendanceService;
    constructor(attendanceService: AttendanceService);
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
    clockIn(userId: string, location: string): Promise<{
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
    clockOut(userId: string): Promise<{
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
    createLateRequest(userId: string, body: {
        requestDate: string;
        reason: string;
    }): Promise<{
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
    reviewLateRequest(id: string, body: {
        status: 'approved' | 'rejected';
    }, userId: string): Promise<{
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
