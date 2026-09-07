import { PrismaService } from '../prisma/prisma.service';
export declare class SkillsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(employeeId?: string): Promise<{
        allSkills: {
            id: string;
            createdAt: Date;
            name: string;
            description: string | null;
            category: string;
        }[];
        employeeSkills: ({
            skill: {
                id: string;
                createdAt: Date;
                name: string;
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
            createdAt: Date;
            name: string;
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
