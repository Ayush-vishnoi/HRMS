import { AttendanceService } from './attendance.service';
export declare class AttendanceController {
    private attendanceService;
    constructor(attendanceService: AttendanceService);
    findAll(user: any, employeeId?: string, from?: string, to?: string, scope?: string): Promise<({
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
    create(userId: string, body: any): Promise<{
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
    update(body: {
        id: string;
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
        reviewedById: string | null;
        reviewedAt: string | null;
        requesterId: string;
        requestDate: string;
        requestedAt: string;
    })[]>;
    createLateRequest(userId: string, body: {
        requestDate: string;
        reason: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.LateClockInStatus;
        reason: string;
        reviewedById: string | null;
        reviewedAt: string | null;
        requesterId: string;
        requestDate: string;
        requestedAt: string;
    }>;
    reviewLateRequest(id: string, body: {
        status: 'approved' | 'rejected';
    }, userId: string): Promise<{
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.LateClockInStatus;
        reason: string;
        reviewedById: string | null;
        reviewedAt: string | null;
        requesterId: string;
        requestDate: string;
        requestedAt: string;
    }>;
}
