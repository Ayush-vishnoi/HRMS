import { SkillsService } from './skills.service';
export declare class SkillsController {
    private skillsService;
    constructor(skillsService: SkillsService);
    findAll(employeeId?: string): Promise<{
        allSkills: {
            id: string;
            name: string;
            createdAt: Date;
            description: string | null;
            category: string;
        }[];
        employeeSkills: ({
            skill: {
                id: string;
                name: string;
                createdAt: Date;
                description: string | null;
                category: string;
            };
        } & {
            id: string;
            createdAt: Date;
            employeeId: string;
            skillId: string;
            proficiency: string;
            yearsExp: number;
            verified: boolean;
        })[];
    }>;
    upsertSkill(body: any): Promise<{
        skill: {
            id: string;
            name: string;
            createdAt: Date;
            description: string | null;
            category: string;
        };
    } & {
        id: string;
        createdAt: Date;
        employeeId: string;
        skillId: string;
        proficiency: string;
        yearsExp: number;
        verified: boolean;
    }>;
}
