import { Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private prisma;
    constructor(prisma: PrismaService);
    validate(payload: {
        sub: string;
        email: string;
        userRole: string;
    }): Promise<{
        rawRole: import("@prisma/client").$Enums.UserRole;
        userRole: "employee" | "manager" | "admin";
        id: string;
        name: string;
        employeeCode: string;
        email: string;
        department: string;
        avatarUrl: string | null;
        status: import("@prisma/client").$Enums.EmploymentStatus;
        lockedUntil: Date | null;
    } | null>;
}
export {};
