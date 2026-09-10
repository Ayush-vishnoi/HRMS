import { PrismaService } from '../prisma/prisma.service';
import { NotifyService } from '../common/notifications/notify.service';
export declare class TalentService {
    private prisma;
    private notify;
    constructor(prisma: PrismaService, notify: NotifyService);
    findAll(userId: string, userRole: string, employeeId?: string): Promise<{
        careerPaths: {
            id: string;
            department: string;
            organization_id: string;
            created_at: Date;
            updated_at: Date;
            current_role_title: string;
            next_role_title: string;
            level_order: number;
            min_experience_years: number;
            required_skills_summary: string;
            competencies_summary: string;
            performance_expectation: string;
            recommended_training_ids: string[];
            is_active: boolean;
        }[];
        aspiration: {
            id: string;
            employee_id: string;
            created_at: Date;
            updated_at: Date;
            target_role: string;
            target_department: string | null;
            target_timeline: string;
            skills_to_develop: string[];
            manager_notes: string | null;
            hr_notes: string | null;
            last_discussed_at: Date | null;
        } | null;
        benchmarks: ({
            skill: {
                id: string;
                createdAt: Date;
                name: string;
                description: string | null;
                category: string;
            };
        } & {
            id: string;
            designation_id: string | null;
            priority: string;
            created_at: Date;
            updated_at: Date;
            role_title: string;
            skill_id: string;
            required_proficiency: string;
            min_proficiency_level: number;
            recommended_course_id: string | null;
        })[];
        talentPools: any;
        successionPlans: any;
    }>;
    handleAction(userId: string, userRole: string, body: any): Promise<{
        id: string;
        employee_id: string;
        created_at: Date;
        updated_at: Date;
        target_role: string;
        target_department: string | null;
        target_timeline: string;
        skills_to_develop: string[];
        manager_notes: string | null;
        hr_notes: string | null;
        last_discussed_at: Date | null;
    } | {
        id: string;
        name: string;
        organization_id: string;
        description: string | null;
        category: string;
        created_at: Date;
        updated_at: Date;
        created_by_id: string | null;
        is_confidential: boolean;
    } | {
        id: string;
        notes: string | null;
        employee_id: string;
        pool_id: string;
        added_by_id: string | null;
        added_at: Date;
    } | {
        id: string;
        department: string;
        organization_id: string;
        created_at: Date;
        updated_at: Date;
        critical_role_title: string;
        incumbent_employee_id: string | null;
        emergency_successor_id: string | null;
        successors_json: string;
        risk_level: string;
        last_reviewed_at: Date | null;
    }>;
}
