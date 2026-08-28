import { MyTeamService } from './my-team.service';
export declare class MyTeamController {
    private myTeamService;
    constructor(myTeamService: MyTeamService);
    findAll(user: any, managerId?: string): Promise<{
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
    updateMetadata(user: any, body: any): Promise<{
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
}
