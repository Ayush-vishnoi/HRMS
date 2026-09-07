import { PrismaService } from '../prisma/prisma.service';
export declare class MyTeamService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(userId: string, userRole: string, managerId?: string): Promise<{
        id: any;
        name: any;
        department: any;
        manager: any;
        leaderId: any;
        focus: any;
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
                focus: any;
                workload: any;
                goalProgress: any;
                goalLabel: any;
                nextOneToOne: any;
                risk: string;
                notes: any;
            };
        };
        members: any;
    }[]>;
    createTeam(user: {
        id: string;
        userRole: string;
    }, body: any): Promise<{
        id: any;
        name: any;
        department: any;
        manager: any;
        leaderId: any;
        focus: any;
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
                focus: any;
                workload: any;
                goalProgress: any;
                goalLabel: any;
                nextOneToOne: any;
                risk: string;
                notes: any;
            };
        };
        members: any;
    }>;
    deleteTeam(user: {
        id: string;
        userRole: string;
    }, teamId?: string): Promise<{
        id: string;
        name: string;
        deleted: boolean;
    }>;
    handleAction(user: {
        id: string;
        userRole: string;
    }, body: any): Promise<{
        id: string;
        managerId: string;
        updatedAt: Date;
        employeeId: string;
        notes: string;
        focus: string;
        workload: number;
        goalProgress: number;
        goalLabel: string;
        nextOneToOne: string;
        risk: import("@prisma/client").$Enums.TeamRisk;
    } | {
        id: any;
        name: any;
        department: any;
        manager: any;
        leaderId: any;
        focus: any;
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
                focus: any;
                workload: any;
                goalProgress: any;
                goalLabel: any;
                nextOneToOne: any;
                risk: string;
                notes: any;
            };
        };
        members: any;
    } | {
        success: boolean;
        data: {
            id: any;
            name: any;
            department: any;
            manager: any;
            leaderId: any;
            focus: any;
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
                    focus: any;
                    workload: any;
                    goalProgress: any;
                    goalLabel: any;
                    nextOneToOne: any;
                    risk: string;
                    notes: any;
                };
            };
            members: any;
        };
        addedCount: number;
    }>;
    updateMetadata(userId: string, userRole: string, body: any): Promise<{
        id: string;
        managerId: string;
        updatedAt: Date;
        employeeId: string;
        notes: string;
        focus: string;
        workload: number;
        goalProgress: number;
        goalLabel: string;
        nextOneToOne: string;
        risk: import("@prisma/client").$Enums.TeamRisk;
    }>;
    private updateLeader;
    private addMembers;
    private removeMember;
    private assertMembersAvailableForDepartment;
    private assertCanManage;
    private throwDepartmentConflict;
    private loadMetadata;
    private formatTeam;
}
