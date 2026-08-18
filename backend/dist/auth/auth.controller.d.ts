import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
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
        employeeCode: string;
        name: string;
        email: string;
        userRole: import("@prisma/client").$Enums.UserRole;
        department: string;
        avatarUrl: string | null;
        status: import("@prisma/client").$Enums.EmploymentStatus;
    } | null>;
}
