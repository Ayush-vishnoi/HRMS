import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    login(dto: LoginDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            name: string;
            employeeCode: string;
            userRole: import("@prisma/client").$Enums.UserRole;
            department: string;
            avatarUrl: string | null;
            mustChangePassword: boolean;
        };
    }>;
    getSession(userId: string): Promise<{
        id: string;
        employeeCode: string;
        name: string;
        email: string;
        userRole: import("@prisma/client").$Enums.UserRole;
        department: string;
        avatarUrl: string | null;
        status: import("@prisma/client").$Enums.EmploymentStatus;
        mustChangePassword: boolean;
    } | null>;
    changePassword(userId: string, body: {
        currentPassword?: string;
        newPassword?: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
}
