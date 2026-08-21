import { PrismaService } from '../prisma/prisma.service';
export declare class MyTeamService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(userId: string, userRole: string, managerId?: string): Promise<{
        id: string;
        name: string;
        department: string;
        manager: string;
        leaderId: string;
        focus: string;
        leader: {
            employee: {
                id: any;
                employeeCode: any;
                name: any;
                role: any;
                department: any;
                email: any;
                phone: any;
                avatar: any;
                status: any;
                joinDate: any;
                location: any;
                salary: number;
            };
            metadata: {
                employeeId: any;
                focus: string;
                workload: number;
                goalProgress: number;
                goalLabel: string;
                nextOneToOne: string;
                risk: string;
                notes: string;
            };
        };
        members: {
            employee: {
                id: any;
                employeeCode: any;
                name: any;
                role: any;
                department: any;
                email: any;
                phone: any;
                avatar: any;
                status: any;
                joinDate: any;
                location: any;
                salary: number;
            };
            metadata: {
                employeeId: any;
                focus: string;
                workload: number;
                goalProgress: number;
                goalLabel: string;
                nextOneToOne: string;
                risk: string;
                notes: string;
            };
        }[];
    }[]>;
    updateMetadata(userId: string, userRole: string, body: any): Promise<{
        id: string;
        managerId: string;
        updatedAt: Date;
        notes: string;
        employeeId: string;
        focus: string;
        workload: number;
        goalProgress: number;
        goalLabel: string;
        nextOneToOne: string;
        risk: import("@prisma/client").$Enums.TeamRisk;
    }>;
}
