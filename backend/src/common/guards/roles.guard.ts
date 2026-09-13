import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppRole, hasRoleAtLeast } from '../auth/roles';

export const ROLES_KEY = 'roles';

/**
 * Hierarchy-aware role guard.
 *
 * A handler/class annotated with `@Roles('ceo')` admits anyone at or above
 * `ceo` on the privilege ladder (i.e. ceo and super_admin). `@Roles('super_admin')`
 * admits only super_admin. When several roles are listed, satisfying any one of
 * them is enough.
 *
 * The check runs against the user's RAW role (`rawRole`), which the JWT strategy
 * preserves even while it collapses `userRole` onto the legacy admin surface.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    const rawRole: string | undefined = user?.rawRole ?? user?.userRole;

    const permitted = requiredRoles.some((role) => hasRoleAtLeast(rawRole, role as AppRole));
    if (!permitted) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
