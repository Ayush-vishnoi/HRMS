import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
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
      throw new UnauthorizedException('Invalid credentials');
    }

    const now = new Date();
    if (employee.status === 'Exited') {
      // Exited accounts: lockedUntil is the END of the post-relieving grace
      // window — login access is allowed only until that moment, then revoked.
      if (!employee.lockedUntil || employee.lockedUntil <= now) {
        throw new UnauthorizedException(
          'Your employment has ended. Login access has been revoked after the exit grace window.',
        );
      }
    } else if (employee.lockedUntil && employee.lockedUntil > now) {
      throw new UnauthorizedException('Account is locked. Try again later.');
    }

    const valid = await argon2.verify(employee.passwordHash, dto.password);
    if (!valid) {
      await this.prisma.employee.update({
        where: { id: employee.id },
        data: { failedLoginAttempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid credentials');
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

  async getSession(userId: string) {
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

  /**
   * POST /api/auth/change-password — self-service password change used by the
   * forced first-login reset (mustChangePassword) flow. Requires the current
   * password and enforces a minimum length of 8 characters.
   */
  async changePassword(userId: string, body: { currentPassword?: string; newPassword?: string }) {
    const employee = await this.prisma.employee.findUnique({ where: { id: userId } });
    if (!employee || !employee.passwordHash) {
      throw new UnauthorizedException('Account not found');
    }

    const current = (body.currentPassword ?? '').trim();
    const next = (body.newPassword ?? '').trim();
    if (!current || !next) throw new UnauthorizedException('Current and new passwords are required');
    if (next.length < 8) throw new UnauthorizedException('New password must be at least 8 characters');
    if (next === current) throw new UnauthorizedException('New password must be different from the current password');

    const valid = await argon2.verify(employee.passwordHash, current);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    const passwordHash = await argon2.hash(next);
    await this.prisma.employee.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false, failedLoginAttempts: 0 },
    });

    return { success: true, message: 'Password updated successfully.' };
  }
}
