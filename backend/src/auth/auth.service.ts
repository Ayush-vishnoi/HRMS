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

    if (employee.lockedUntil && employee.lockedUntil > new Date()) {
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
      },
    });
  }
}
