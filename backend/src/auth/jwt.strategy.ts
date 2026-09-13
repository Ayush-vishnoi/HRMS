import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { resolveRbacRole } from '../common/auth/roles';

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

    // The database stores the true role (employee/manager/admin/ceo/super_admin),
    // but the legacy RBAC surface used by inline checks only understands
    // employee/manager/admin. We expose BOTH on req.user:
    //   - `rawRole`  : the real role, used by the hierarchy-aware RolesGuard
    //     and `@Roles()` decorator for executive/system-admin-only endpoints.
    //   - `userRole` : the resolved legacy role (ceo/super_admin -> admin) so
    //     every existing `userRole === 'admin'` check still passes for them.
    // The raw role also reaches clients through /api/auth/login and
    // /api/auth/session so the UI can label and route executives correctly.
    if (!employee) return null;

    return {
      ...employee,
      rawRole: employee.userRole,
      userRole: resolveRbacRole(employee.userRole),
    };
  }
}
