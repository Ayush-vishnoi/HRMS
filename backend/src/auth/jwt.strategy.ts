import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { LOCKOUT_STATUSES } from '../auth/access-control.constants';

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
        lockedUntil: true,
      },
    });

    if (!employee) return null;

    // Force-logout of a live session: JWTs are stateless, so a token issued
    // before an employee was terminated/exited would otherwise keep working
    // until it expires. We re-load the employee on every request anyway, so
    // reject here once access has been cut. A *future* lockedUntil on an
    // Exited account is the post-relieving grace window and still permits
    // access; a past/absent lockedUntil means access is revoked now.
    if (LOCKOUT_STATUSES.includes(employee.status)) {
      if (!employee.lockedUntil || employee.lockedUntil <= new Date()) {
        throw new UnauthorizedException('Access revoked.');
      }
    }

    // The database keeps a distinct 'ceo' role for executive accounts, but the
    // API's RBAC surface is employee/manager/admin. Normalize CEO to admin
    // level on req.user so every guard and @CurrentUser role check treats
    // executives as admins, while exposing the raw role as `rawRole` so
    // CEO-only capabilities (delegation, immediate termination) can enforce
    // against it. The raw role also reaches clients through the /api/auth
    // login and session responses.
    return {
      ...employee,
      rawRole: employee.userRole,
      userRole: employee.userRole === 'ceo' ? ('admin' as const) : employee.userRole,
    };
  }
}
