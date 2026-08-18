import { WorkforceService } from './workforce.service';
export declare class WorkforceController {
    private workforceService;
    constructor(workforceService: WorkforceService);
    findAll(employeeId?: string): Promise<{
        timesheets: {
            id: string;
            status: import("@prisma/client").$Enums.TimesheetStatus;
            description: string | null;
            created_at: Date;
            updated_at: Date;
            employee_id: string;
            project_id: string | null;
            work_date: Date;
            expected_minutes: number;
            logged_minutes: number;
            billable_minutes: number;
            reviewer_id: string | null;
            reviewed_at: Date | null;
        }[];
        attendance: {
            id: string;
            status: import("@prisma/client").$Enums.AttendanceStatus;
            location: string;
            createdAt: Date;
            employeeId: string;
            date: string;
            checkIn: string;
            checkOut: string;
            hoursWorked: string;
        }[];
        projects: {
            id: string;
            name: string;
            organization_id: string;
            is_active: boolean;
            created_at: Date;
            code: string;
            client_name: string | null;
            is_billable: boolean;
        }[];
    }>;
    handleAction(body: any): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.TimesheetStatus;
        description: string | null;
        created_at: Date;
        updated_at: Date;
        employee_id: string;
        project_id: string | null;
        work_date: Date;
        expected_minutes: number;
        logged_minutes: number;
        billable_minutes: number;
        reviewer_id: string | null;
        reviewed_at: Date | null;
    }> | {
        success: boolean;
        error: string;
    };
}
