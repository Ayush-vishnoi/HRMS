import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Reads the JWT from the standard `Authorization: Bearer <token>` header, and
 * falls back to a `?token=` query parameter. The query fallback exists because
 * some routes (resume / offer-document downloads) are opened by the browser as
 * plain anchors or `window.open`, which cannot attach an Authorization header
 * when the token is stored in localStorage rather than a cookie.
 */
const jwtFromRequest = ExtractJwt.fromExtractors([
  ExtractJwt.fromAuthHeaderAsBearerToken(),
  (req: Request): string | null => {
    const token = (req?.query as Record<string, unknown> | undefined)?.token;
    if (typeof token === 'string' && token.length > 0) return token;
    return null;
  },
]);

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'hrms-secret-key',
    });
  }

  async validate(payload: { sub: string; email: string; userRole: string }) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: payload.sub },
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

    // The database keeps a distinct 'ceo' role for executive accounts, but the
    // API's RBAC surface is employee/manager/admin. Normalize CEO to admin
    // level on req.user so every guard and @CurrentUser role check treats
    // executives as admins. The raw role still reaches clients through the
    // /api/auth/login and /api/auth/session responses.
    if (employee?.userRole === 'ceo') {
      return { ...employee, userRole: 'admin' as const };
    }

    return employee;
  }
}
