import { PrismaService } from '../prisma/prisma.service';
export declare class PerformanceService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(userId: string, userRole: string, employeeId?: string): Promise<{
        kras: ({
            assignedTo: {
                id: string;
                name: string;
            };
            assignedBy: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            status: import("@prisma/client").$Enums.KraStatus;
            createdAt: Date;
            updatedAt: Date;
            category: string;
            assignedToId: string;
            title: string;
            description: string;
            priority: import("@prisma/client").$Enums.KraPriority;
            dueDate: string;
            progress: number;
            keyResult: string;
            assignedById: string;
            assignedOn: string;
            weightage: number;
            lastUpdate: string | null;
            deliverables: string[];
        })[];
        goals: {
            id: string;
            status: import("@prisma/client").$Enums.GoalStatus;
            createdAt: Date;
            updatedAt: Date;
            organization_id: string;
            department_id: string | null;
            title: string;
            type: import("@prisma/client").$Enums.GoalType;
            description: string | null;
            progress: number;
            created_by_id: string;
            weightage: number;
            team_id: string | null;
            owner_employee_id: string | null;
            parentGoalId: string | null;
            scope: import("@prisma/client").$Enums.GoalScope;
            metric: string | null;
            targetValue: import("@prisma/client/runtime/library").Decimal | null;
            currentValue: import("@prisma/client/runtime/library").Decimal | null;
            cycle_id: string | null;
            start_date: Date;
            due_date: Date;
        }[];
        cycles: {
            id: string;
            name: string;
            status: import("@prisma/client").$Enums.ReviewCycleStatus;
            organization_id: string;
            description: string | null;
            created_at: Date;
            updated_at: Date;
            created_by_id: string | null;
            start_date: Date;
            review_period: string;
            end_date: Date;
            goal_setting_deadline: Date | null;
            self_review_deadline: Date | null;
            manager_review_deadline: Date | null;
            calibration_date: Date | null;
            is_locked: boolean;
            scoring_weights: import("@prisma/client/runtime/library").JsonValue | null;
            settings: import("@prisma/client/runtime/library").JsonValue | null;
        }[];
        feedback: {
            id: string;
            content: string;
            created_at: Date;
            cycle_id: string | null;
            author_id: string;
            recipient_id: string;
            review_type: import("@prisma/client").$Enums.ReviewType;
            rating: import("@prisma/client/runtime/library").Decimal | null;
            categories: import("@prisma/client/runtime/library").JsonValue | null;
            private: boolean;
            is_anonymous: boolean;
        }[];
        pips: {
            id: string;
            status: import("@prisma/client").$Enums.PipStatus;
            reason: string;
            title: string;
            created_at: Date;
            updated_at: Date;
            employee_id: string;
            start_date: Date;
            end_date: Date | null;
            manager_id: string;
            expectations: string;
            review_date: Date;
            outcome: string | null;
        }[];
    }>;
    handleAction(userId: string, body: any): Promise<{
        id: string;
        content: string;
        created_at: Date;
        cycle_id: string | null;
        author_id: string;
        recipient_id: string;
        review_type: import("@prisma/client").$Enums.ReviewType;
        rating: import("@prisma/client/runtime/library").Decimal | null;
        categories: import("@prisma/client/runtime/library").JsonValue | null;
        private: boolean;
        is_anonymous: boolean;
    } | {
        id: string;
        status: import("@prisma/client").$Enums.KraStatus;
        createdAt: Date;
        updatedAt: Date;
        category: string;
        assignedToId: string;
        title: string;
        description: string;
        priority: import("@prisma/client").$Enums.KraPriority;
        dueDate: string;
        progress: number;
        keyResult: string;
        assignedById: string;
        assignedOn: string;
        weightage: number;
        lastUpdate: string | null;
        deliverables: string[];
    }>;
}
