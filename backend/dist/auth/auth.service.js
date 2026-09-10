"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const argon2 = __importStar(require("argon2"));
let AuthService = class AuthService {
    prisma;
    jwtService;
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async login(dto) {
        const identifier = dto.identifier.trim();
        const employee = await this.prisma.employee.findFirst({
            where: {
                OR: [
                    { email: identifier.toLowerCase() },
                    { employeeCode: identifier.toUpperCase() },
                ],
            },
        });
        if (!employee || !employee.passwordHash) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const now = new Date();
        if (employee.status === 'Exited') {
            if (!employee.lockedUntil || employee.lockedUntil <= now) {
                throw new common_1.UnauthorizedException('Your employment has ended. Login access has been revoked after the exit grace window.');
            }
        }
        else if (employee.lockedUntil && employee.lockedUntil > now) {
            throw new common_1.UnauthorizedException('Account is locked. Try again later.');
        }
        const valid = await argon2.verify(employee.passwordHash, dto.password);
        if (!valid) {
            await this.prisma.employee.update({
                where: { id: employee.id },
                data: { failedLoginAttempts: { increment: 1 } },
            });
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        await this.prisma.employee.update({
            where: { id: employee.id },
            data: { failedLoginAttempts: 0, lastLoginAt: new Date() },
        });
        const payload = { sub: employee.id, email: employee.email, userRole: employee.userRole };
        const token = this.jwtService.sign(payload);
        return {
            accessToken: token,
            user: {
                id: employee.id,
                email: employee.email,
                name: employee.name,
                employeeCode: employee.employeeCode,
                userRole: employee.userRole,
                department: employee.department,
                avatarUrl: employee.avatarUrl,
                mustChangePassword: employee.mustChangePassword,
            },
        };
    }
    async getSession(userId) {
        return this.prisma.employee.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                employeeCode: true,
                userRole: true,
                department: true,
                avatarUrl: true,
                status: true,
                mustChangePassword: true,
            },
        });
    }
    async changePassword(userId, body) {
        const employee = await this.prisma.employee.findUnique({ where: { id: userId } });
        if (!employee || !employee.passwordHash) {
            throw new common_1.UnauthorizedException('Account not found');
        }
        const current = (body.currentPassword ?? '').trim();
        const next = (body.newPassword ?? '').trim();
        if (!current || !next)
            throw new common_1.UnauthorizedException('Current and new passwords are required');
        if (next.length < 8)
            throw new common_1.UnauthorizedException('New password must be at least 8 characters');
        if (next === current)
            throw new common_1.UnauthorizedException('New password must be different from the current password');
        const valid = await argon2.verify(employee.passwordHash, current);
        if (!valid)
            throw new common_1.UnauthorizedException('Current password is incorrect');
        const passwordHash = await argon2.hash(next);
        await this.prisma.employee.update({
            where: { id: userId },
            data: { passwordHash, mustChangePassword: false, failedLoginAttempts: 0 },
        });
        return { success: true, message: 'Password updated successfully.' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map