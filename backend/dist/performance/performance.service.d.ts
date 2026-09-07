import { PrismaService } from '../prisma/prisma.service';
import { NotifyService } from '../common/notifications/notify.service';
export declare class PerformanceService {
    private prisma;
    private notify;
    constructor(prisma: PrismaService, notify: NotifyService);
    private requireEmployeeAccess;
    private requireRole;
    private getOrgId;
    findAll(user: any): Promise<{
        id: any;
        title: any;
        description: any;
        keyResult: any;
        category: any;
        assignedToId: any;
        assignedTo: any;
        assignedBy: any;
        assignerRole: any;
        assignedOn: any;
        dueDate: any;
        priority: any;
        status: string;
        progress: any;
        weightage: any;
        lastUpdate: any;
        deliverables: any;
    }[]>;
    createKra(user: any, body: any): Promise<{
        id: any;
        title: any;
        description: any;
        keyResult: any;
        category: any;
        assignedToId: any;
        assignedTo: any;
        assignedBy: any;
        assignerRole: any;
        assignedOn: any;
        dueDate: any;
        priority: any;
        status: string;
        progress: any;
        weightage: any;
        lastUpdate: any;
        deliverables: any;
    }>;
    updateKra(user: any, body: any): Promise<{
        id: any;
        title: any;
        description: any;
        keyResult: any;
        category: any;
        assignedToId: any;
        assignedTo: any;
        assignedBy: any;
        assignerRole: any;
        assignedOn: any;
        dueDate: any;
        priority: any;
        status: string;
        progress: any;
        weightage: any;
        lastUpdate: any;
        deliverables: any;
    }>;
    getGoalsData(user: any, employeeId?: string, scope?: string, type?: string, cycleId?: string): Promise<{
        goals: ({
            employees_performance_goals_created_by_idToemployees: {
                id: string;
                name: string;
                employeeCode: string;
                roleTitle: string;
            };
            employees_performance_goals_owner_employee_idToemployees: {
                id: string;
                name: string;
                employeeCode: string;
                roleTitle: string;
                department: string;
                avatarUrl: string | null;
            } | null;
            other_performance_goals: ({
                key_results: {
                    id: string;
                    title: string;
                    status: string;
                    progress: number;
                    weightage: number;
                    created_at: Date;
                    updated_at: Date;
                    metric: string | null;
                    unit: string | null;
                    goal_id: string;
                    target_value: import("@prisma/client/runtime/library").Decimal | null;
                    current_value: import("@prisma/client/runtime/library").Decimal | null;
                }[];
            } & {
                id: string;
                title: string;
                type: import("@prisma/client").$Enums.GoalType;
                createdAt: Date;
                status: import("@prisma/client").$Enums.GoalStatus;
                updatedAt: Date;
                organization_id: string;
                department_id: string | null;
                description: string | null;
                progress: number;
                weightage: number;
                team_id: string | null;
                owner_employee_id: string | null;
                parentGoalId: string | null;
                created_by_id: string;
                scope: import("@prisma/client").$Enums.GoalScope;
                metric: string | null;
                targetValue: import("@prisma/client/runtime/library").Decimal | null;
                currentValue: import("@prisma/client/runtime/library").Decimal | null;
                cycle_id: string | null;
                start_date: Date;
                due_date: Date;
            })[];
            key_results: {
                id: string;
                title: string;
                status: string;
                progress: number;
                weightage: number;
                created_at: Date;
                updated_at: Date;
                metric: string | null;
                unit: string | null;
                goal_id: string;
                target_value: import("@prisma/client/runtime/library").Decimal | null;
                current_value: import("@prisma/client/runtime/library").Decimal | null;
            }[];
        } & {
            id: string;
            title: string;
            type: import("@prisma/client").$Enums.GoalType;
            createdAt: Date;
            status: import("@prisma/client").$Enums.GoalStatus;
            updatedAt: Date;
            organization_id: string;
            department_id: string | null;
            description: string | null;
            progress: number;
            weightage: number;
            team_id: string | null;
            owner_employee_id: string | null;
            parentGoalId: string | null;
            created_by_id: string;
            scope: import("@prisma/client").$Enums.GoalScope;
            metric: string | null;
            targetValue: import("@prisma/client/runtime/library").Decimal | null;
            currentValue: import("@prisma/client/runtime/library").Decimal | null;
            cycle_id: string | null;
            start_date: Date;
            due_date: Date;
        })[];
        kpis: ({
            employee: {
                id: string;
                name: string;
                employeeCode: string;
                roleTitle: string;
                department: string;
            };
        } & {
            id: string;
            name: string;
            organization_id: string;
            description: string | null;
            weightage: number;
            employee_id: string;
            created_at: Date;
            updated_at: Date;
            metric: string;
            cycle_id: string | null;
            target: import("@prisma/client/runtime/library").Decimal;
            actual: import("@prisma/client/runtime/library").Decimal;
            unit: string;
            frequency: string;
            source_module: string;
            is_system_calculated: boolean;
            calculation_metadata: import("@prisma/client/runtime/library").JsonValue | null;
            last_calculated_at: Date | null;
        })[];
        kras: ({
            assignedBy: {
                id: string;
                name: string;
                roleTitle: string;
                department: string;
            };
            assignedTo: {
                id: string;
                name: string;
                roleTitle: string;
                department: string;
            };
        } & {
            id: string;
            title: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.KraStatus;
            updatedAt: Date;
            description: string;
            keyResult: string;
            category: string;
            assignedToId: string;
            assignedById: string;
            assignedOn: string;
            dueDate: string;
            priority: import("@prisma/client").$Enums.KraPriority;
            progress: number;
            weightage: number;
            lastUpdate: string | null;
            deliverables: string[];
        })[];
    }>;
    handleGoalAction(user: any, body: any): Promise<{
        id: string;
        name: string;
        organization_id: string;
        description: string | null;
        weightage: number;
        employee_id: string;
        created_at: Date;
        updated_at: Date;
        metric: string;
        cycle_id: string | null;
        target: import("@prisma/client/runtime/library").Decimal;
        actual: import("@prisma/client/runtime/library").Decimal;
        unit: string;
        frequency: string;
        source_module: string;
        is_system_calculated: boolean;
        calculation_metadata: import("@prisma/client/runtime/library").JsonValue | null;
        last_calculated_at: Date | null;
    } | {
        id: string;
        name: string;
        organization_id: string;
        description: string | null;
        weightage: number;
        employee_id: string;
        created_at: Date;
        updated_at: Date;
        metric: string;
        cycle_id: string | null;
        target: import("@prisma/client/runtime/library").Decimal;
        actual: import("@prisma/client/runtime/library").Decimal;
        unit: string;
        frequency: string;
        source_module: string;
        is_system_calculated: boolean;
        calculation_metadata: import("@prisma/client/runtime/library").JsonValue | null;
        last_calculated_at: Date | null;
    }[] | {
        id: string;
        title: string;
        status: string;
        progress: number;
        weightage: number;
        created_at: Date;
        updated_at: Date;
        metric: string | null;
        unit: string | null;
        goal_id: string;
        target_value: import("@prisma/client/runtime/library").Decimal | null;
        current_value: import("@prisma/client/runtime/library").Decimal | null;
    } | ({
        key_results: {
            id: string;
            title: string;
            status: string;
            progress: number;
            weightage: number;
            created_at: Date;
            updated_at: Date;
            metric: string | null;
            unit: string | null;
            goal_id: string;
            target_value: import("@prisma/client/runtime/library").Decimal | null;
            current_value: import("@prisma/client/runtime/library").Decimal | null;
        }[];
    } & {
        id: string;
        title: string;
        type: import("@prisma/client").$Enums.GoalType;
        createdAt: Date;
        status: import("@prisma/client").$Enums.GoalStatus;
        updatedAt: Date;
        organization_id: string;
        department_id: string | null;
        description: string | null;
        progress: number;
        weightage: number;
        team_id: string | null;
        owner_employee_id: string | null;
        parentGoalId: string | null;
        created_by_id: string;
        scope: import("@prisma/client").$Enums.GoalScope;
        metric: string | null;
        targetValue: import("@prisma/client/runtime/library").Decimal | null;
        currentValue: import("@prisma/client/runtime/library").Decimal | null;
        cycle_id: string | null;
        start_date: Date;
        due_date: Date;
    }) | null>;
    updateGoalTarget(user: any, body: any): Promise<{
        id: string;
        title: string;
        type: import("@prisma/client").$Enums.GoalType;
        createdAt: Date;
        status: import("@prisma/client").$Enums.GoalStatus;
        updatedAt: Date;
        organization_id: string;
        department_id: string | null;
        description: string | null;
        progress: number;
        weightage: number;
        team_id: string | null;
        owner_employee_id: string | null;
        parentGoalId: string | null;
        created_by_id: string;
        scope: import("@prisma/client").$Enums.GoalScope;
        metric: string | null;
        targetValue: import("@prisma/client/runtime/library").Decimal | null;
        currentValue: import("@prisma/client/runtime/library").Decimal | null;
        cycle_id: string | null;
        start_date: Date;
        due_date: Date;
    } | {
        id: string;
        name: string;
        organization_id: string;
        description: string | null;
        weightage: number;
        employee_id: string;
        created_at: Date;
        updated_at: Date;
        metric: string;
        cycle_id: string | null;
        target: import("@prisma/client/runtime/library").Decimal;
        actual: import("@prisma/client/runtime/library").Decimal;
        unit: string;
        frequency: string;
        source_module: string;
        is_system_calculated: boolean;
        calculation_metadata: import("@prisma/client/runtime/library").JsonValue | null;
        last_calculated_at: Date | null;
    } | {
        id: string;
        title: string;
        status: string;
        progress: number;
        weightage: number;
        created_at: Date;
        updated_at: Date;
        metric: string | null;
        unit: string | null;
        goal_id: string;
        target_value: import("@prisma/client/runtime/library").Decimal | null;
        current_value: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    getCyclesData(user: any, employeeId?: string, cycleId?: string): Promise<{
        cycles: ({
            performance_calibration_sessions: {
                id: string;
                name: string;
                status: string;
                organization_id: string;
                department_id: string | null;
                created_at: Date;
                cycle_id: string;
                scheduled_at: Date;
            }[];
            performance_review_assignments: ({
                employees_performance_review_assignments_employee_idToemployees: {
                    id: string;
                    name: string;
                    employeeCode: string;
                    roleTitle: string;
                    department: string;
                    avatarUrl: string | null;
                };
                employees_performance_review_assignments_reviewer_idToemployees: {
                    id: string;
                    name: string;
                    employeeCode: string;
                    roleTitle: string;
                };
            } & {
                id: string;
                status: import("@prisma/client").$Enums.WorkItemStatus;
                employee_id: string;
                created_at: Date;
                updated_at: Date;
                cycle_id: string;
                reviewer_id: string;
                review_type: import("@prisma/client").$Enums.ReviewType;
                rating: import("@prisma/client/runtime/library").Decimal | null;
                comments: string | null;
                self_review_data: import("@prisma/client/runtime/library").JsonValue | null;
                manager_review_data: import("@prisma/client/runtime/library").JsonValue | null;
                calculated_score: import("@prisma/client/runtime/library").Decimal | null;
                score_breakdown: import("@prisma/client/runtime/library").JsonValue | null;
                is_locked: boolean;
                submitted_at: Date | null;
            })[];
        } & {
            id: string;
            name: string;
            status: import("@prisma/client").$Enums.ReviewCycleStatus;
            organization_id: string;
            description: string | null;
            created_at: Date;
            updated_at: Date;
            created_by_id: string | null;
            start_date: Date;
            is_locked: boolean;
            end_date: Date;
            review_period: string;
            goal_setting_deadline: Date | null;
            self_review_deadline: Date | null;
            manager_review_deadline: Date | null;
            calibration_date: Date | null;
            scoring_weights: import("@prisma/client/runtime/library").JsonValue | null;
            settings: import("@prisma/client/runtime/library").JsonValue | null;
        })[];
        assignments: ({
            performance_review_cycles: {
                id: string;
                name: string;
                status: import("@prisma/client").$Enums.ReviewCycleStatus;
                organization_id: string;
                description: string | null;
                created_at: Date;
                updated_at: Date;
                created_by_id: string | null;
                start_date: Date;
                is_locked: boolean;
                end_date: Date;
                review_period: string;
                goal_setting_deadline: Date | null;
                self_review_deadline: Date | null;
                manager_review_deadline: Date | null;
                calibration_date: Date | null;
                scoring_weights: import("@prisma/client/runtime/library").JsonValue | null;
                settings: import("@prisma/client/runtime/library").JsonValue | null;
            };
            employees_performance_review_assignments_employee_idToemployees: {
                id: string;
                name: string;
                employeeCode: string;
                roleTitle: string;
                department: string;
                avatarUrl: string | null;
            };
            employees_performance_review_assignments_reviewer_idToemployees: {
                id: string;
                name: string;
                employeeCode: string;
                roleTitle: string;
            };
        } & {
            id: string;
            status: import("@prisma/client").$Enums.WorkItemStatus;
            employee_id: string;
            created_at: Date;
            updated_at: Date;
            cycle_id: string;
            reviewer_id: string;
            review_type: import("@prisma/client").$Enums.ReviewType;
            rating: import("@prisma/client/runtime/library").Decimal | null;
            comments: string | null;
            self_review_data: import("@prisma/client/runtime/library").JsonValue | null;
            manager_review_data: import("@prisma/client/runtime/library").JsonValue | null;
            calculated_score: import("@prisma/client/runtime/library").Decimal | null;
            score_breakdown: import("@prisma/client/runtime/library").JsonValue | null;
            is_locked: boolean;
            submitted_at: Date | null;
        })[];
        feedback: any[];
        recommendations: ({
            employees_performance_recommendations_employee_idToemployees: {
                id: string;
                name: string;
                employeeCode: string;
                roleTitle: string;
                department: string;
            };
            employees_performance_recommendations_recommender_idToemployees: {
                id: string;
                name: string;
                employeeCode: string;
            };
        } & {
            id: string;
            type: import("@prisma/client").$Enums.RecommendationType;
            status: import("@prisma/client").$Enums.RecommendationStatus;
            employee_id: string;
            created_at: Date;
            updated_at: Date;
            cycle_id: string | null;
            recommender_id: string;
            justification: string;
            proposed_value: import("@prisma/client/runtime/library").JsonValue | null;
        })[];
    }>;
    handleCycleAction(user: any, body: any): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.WorkItemStatus;
        employee_id: string;
        created_at: Date;
        updated_at: Date;
        cycle_id: string;
        reviewer_id: string;
        review_type: import("@prisma/client").$Enums.ReviewType;
        rating: import("@prisma/client/runtime/library").Decimal | null;
        comments: string | null;
        self_review_data: import("@prisma/client/runtime/library").JsonValue | null;
        manager_review_data: import("@prisma/client/runtime/library").JsonValue | null;
        calculated_score: import("@prisma/client/runtime/library").Decimal | null;
        score_breakdown: import("@prisma/client/runtime/library").JsonValue | null;
        is_locked: boolean;
        submitted_at: Date | null;
    } | {
        id: string;
        created_at: Date;
        cycle_id: string | null;
        review_type: import("@prisma/client").$Enums.ReviewType;
        rating: import("@prisma/client/runtime/library").Decimal | null;
        author_id: string;
        recipient_id: string;
        content: string;
        categories: import("@prisma/client/runtime/library").JsonValue | null;
        private: boolean;
        is_anonymous: boolean;
    } | {
        id: string;
        name: string;
        status: import("@prisma/client").$Enums.ReviewCycleStatus;
        organization_id: string;
        description: string | null;
        created_at: Date;
        updated_at: Date;
        created_by_id: string | null;
        start_date: Date;
        is_locked: boolean;
        end_date: Date;
        review_period: string;
        goal_setting_deadline: Date | null;
        self_review_deadline: Date | null;
        manager_review_deadline: Date | null;
        calibration_date: Date | null;
        scoring_weights: import("@prisma/client/runtime/library").JsonValue | null;
        settings: import("@prisma/client/runtime/library").JsonValue | null;
    } | {
        success: boolean;
        data: {
            id: string;
            status: import("@prisma/client").$Enums.WorkItemStatus;
            employee_id: string;
            created_at: Date;
            updated_at: Date;
            cycle_id: string;
            reviewer_id: string;
            review_type: import("@prisma/client").$Enums.ReviewType;
            rating: import("@prisma/client/runtime/library").Decimal | null;
            comments: string | null;
            self_review_data: import("@prisma/client/runtime/library").JsonValue | null;
            manager_review_data: import("@prisma/client/runtime/library").JsonValue | null;
            calculated_score: import("@prisma/client/runtime/library").Decimal | null;
            score_breakdown: import("@prisma/client/runtime/library").JsonValue | null;
            is_locked: boolean;
            submitted_at: Date | null;
        };
        scoreResult: import("./engines/score-engine").PerformanceScoreResult;
    }>;
    getCompetenciesData(user: any, employeeId?: string, cycleId?: string): Promise<{
        competencies: {
            id: string;
            name: string;
            organization_id: string;
            description: string | null;
            is_active: boolean;
            scale: import("@prisma/client/runtime/library").JsonValue;
        }[];
        assessments: ({
            performance_competencies: {
                id: string;
                name: string;
                organization_id: string;
                description: string | null;
                is_active: boolean;
                scale: import("@prisma/client/runtime/library").JsonValue;
            };
            employees_performance_competency_assessments_assessor_idToemployees: {
                id: string;
                name: string;
                employeeCode: string;
                roleTitle: string;
            };
        } & {
            id: string;
            employee_id: string;
            cycle_id: string | null;
            rating: import("@prisma/client/runtime/library").Decimal;
            comments: string | null;
            competency_id: string;
            assessor_id: string;
            assessed_at: Date;
        })[];
    }>;
    handleCompetencyAction(user: any, body: any): Promise<{
        performance_competencies: {
            id: string;
            name: string;
            organization_id: string;
            description: string | null;
            is_active: boolean;
            scale: import("@prisma/client/runtime/library").JsonValue;
        };
    } & {
        id: string;
        employee_id: string;
        cycle_id: string | null;
        rating: import("@prisma/client/runtime/library").Decimal;
        comments: string | null;
        competency_id: string;
        assessor_id: string;
        assessed_at: Date;
    }>;
    getPips(user: any, employeeId?: string): Promise<({
        performance_pip_milestones: {
            id: string;
            title: string;
            status: import("@prisma/client").$Enums.WorkItemStatus;
            note: string | null;
            due_date: Date;
            pip_id: string;
        }[];
        employees_performance_improvement_plans_employee_idToemployees: {
            id: string;
            name: string;
            employeeCode: string;
            roleTitle: string;
            department: string;
            avatarUrl: string | null;
        };
        employees_performance_improvement_plans_manager_idToemployees: {
            id: string;
            name: string;
            employeeCode: string;
            roleTitle: string;
        };
    } & {
        id: string;
        title: string;
        status: import("@prisma/client").$Enums.PipStatus;
        reason: string;
        employee_id: string;
        created_at: Date;
        updated_at: Date;
        start_date: Date;
        manager_id: string;
        expectations: string;
        review_date: Date;
        end_date: Date | null;
        outcome: string | null;
    })[]>;
    handlePipAction(user: any, body: any): Promise<{
        id: string;
        title: string;
        status: import("@prisma/client").$Enums.PipStatus;
        reason: string;
        employee_id: string;
        created_at: Date;
        updated_at: Date;
        start_date: Date;
        manager_id: string;
        expectations: string;
        review_date: Date;
        end_date: Date | null;
        outcome: string | null;
    } | {
        id: string;
        title: string;
        status: import("@prisma/client").$Enums.WorkItemStatus;
        note: string | null;
        due_date: Date;
        pip_id: string;
    } | null>;
    getCalibrationData(user: any, cycleId?: string, departmentId?: string): Promise<{
        sessions: ({
            departments: {
                id: string;
                name: string;
                organization_id: string;
                business_unit_id: string | null;
                created_at: Date;
                updated_at: Date;
                code: string;
                is_active: boolean;
                head_employee_id: string | null;
                parent_id: string | null;
            } | null;
            performance_calibration_ratings: ({
                employees: {
                    id: string;
                    name: string;
                    employeeCode: string;
                    roleTitle: string;
                    department: string;
                    avatarUrl: string | null;
                };
            } & {
                id: string;
                employee_id: string;
                session_id: string;
                original_rating: import("@prisma/client/runtime/library").Decimal | null;
                calibrated_rating: import("@prisma/client/runtime/library").Decimal;
                rationale: string | null;
            })[];
            performance_review_cycles: {
                id: string;
                name: string;
                status: import("@prisma/client").$Enums.ReviewCycleStatus;
                organization_id: string;
                description: string | null;
                created_at: Date;
                updated_at: Date;
                created_by_id: string | null;
                start_date: Date;
                is_locked: boolean;
                end_date: Date;
                review_period: string;
                goal_setting_deadline: Date | null;
                self_review_deadline: Date | null;
                manager_review_deadline: Date | null;
                calibration_date: Date | null;
                scoring_weights: import("@prisma/client/runtime/library").JsonValue | null;
                settings: import("@prisma/client/runtime/library").JsonValue | null;
            };
        } & {
            id: string;
            name: string;
            status: string;
            organization_id: string;
            department_id: string | null;
            created_at: Date;
            cycle_id: string;
            scheduled_at: Date;
        })[];
        departments: {
            id: string;
            name: string;
            organization_id: string;
            business_unit_id: string | null;
            created_at: Date;
            updated_at: Date;
            code: string;
            is_active: boolean;
            head_employee_id: string | null;
            parent_id: string | null;
        }[];
        distribution: {
            level5: number;
            level4: number;
            level3: number;
            level2: number;
            level1: number;
            total: number;
            average: number;
        };
        assignments: ({
            employees_performance_review_assignments_employee_idToemployees: {
                id: string;
                name: string;
                employeeCode: string;
                roleTitle: string;
                department: string;
            };
        } & {
            id: string;
            status: import("@prisma/client").$Enums.WorkItemStatus;
            employee_id: string;
            created_at: Date;
            updated_at: Date;
            cycle_id: string;
            reviewer_id: string;
            review_type: import("@prisma/client").$Enums.ReviewType;
            rating: import("@prisma/client/runtime/library").Decimal | null;
            comments: string | null;
            self_review_data: import("@prisma/client/runtime/library").JsonValue | null;
            manager_review_data: import("@prisma/client/runtime/library").JsonValue | null;
            calculated_score: import("@prisma/client/runtime/library").Decimal | null;
            score_breakdown: import("@prisma/client/runtime/library").JsonValue | null;
            is_locked: boolean;
            submitted_at: Date | null;
        })[];
    }>;
    handleCalibrationAction(user: any, body: any): Promise<{
        id: string;
        name: string;
        status: string;
        organization_id: string;
        department_id: string | null;
        created_at: Date;
        cycle_id: string;
        scheduled_at: Date;
    } | {
        id: string;
        employee_id: string;
        session_id: string;
        original_rating: import("@prisma/client/runtime/library").Decimal | null;
        calibrated_rating: import("@prisma/client/runtime/library").Decimal;
        rationale: string | null;
    }>;
}
