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
        };
    }>;
    getSession(userId: string): Promise<{
        id: string;
        name: string;
        employeeCode: string;
        email: string;
        userRole: import("@prisma/client").$Enums.UserRole;
        department: string;
        avatarUrl: string | null;
        status: import("@prisma/client").$Enums.EmploymentStatus;
    } | null>;
}
