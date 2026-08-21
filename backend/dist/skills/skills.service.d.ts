import { PrismaService } from '../prisma/prisma.service';
export declare class SkillsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(employeeId?: string): Promise<{
        allSkills: {
            id: string;
            name: string;
            createdAt: Date;
            category: string;
            description: string | null;
        }[];
        employeeSkills: ({
            skill: {
                id: string;
                name: string;
                createdAt: Date;
                category: string;
                description: string | null;
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
            category: string;
            description: string | null;
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
