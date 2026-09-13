/**
 * Central role model shared across the backend RBAC surface.
 *
 * The application recognises five roles arranged on a single privilege ladder.
 * Each rung can do everything the rungs below it can, plus its own extras:
 *
 *   employee < manager < admin < ceo < super_admin
 *
 * - employee     — self-service (own profile, attendance, leave, payslips…)
 * - manager      — the above + team management
 * - admin        — HR operations (the "HR Admin" persona)
 * - ceo          — executive: full org-wide visibility + the executive dashboard
 * - super_admin  — system owner: user & role administration, audit logs
 *
 * Historically the API's inline permission checks only understood
 * employee/manager/admin, and executives were folded into `admin`. We keep that
 * behaviour for backwards compatibility via {@link resolveRbacRole}: `ceo` and
 * `super_admin` still satisfy every existing `userRole === 'admin'` check, so no
 * HR workflow regresses. Genuinely privileged, role-specific endpoints opt in to
 * the finer-grained ladder through the `@Roles()` decorator + `RolesGuard`, which
 * read the *raw* role.
 */

export const ROLE_RANK = {
  employee: 0,
  manager: 1,
  admin: 2,
  ceo: 3,
  super_admin: 4,
} as const;

export type AppRole = keyof typeof ROLE_RANK;

/** Every role, ordered from lowest to highest privilege. */
export const APP_ROLES = Object.keys(ROLE_RANK) as AppRole[];

/** The legacy RBAC surface used by inline `userRole === ...` checks. */
export type RbacRole = 'employee' | 'manager' | 'admin';

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && value in ROLE_RANK;
}

/**
 * True when `rawRole` sits at or above `required` on the privilege ladder.
 * Unknown roles never satisfy any requirement.
 */
export function hasRoleAtLeast(rawRole: string | null | undefined, required: AppRole): boolean {
  if (!isAppRole(rawRole)) return false;
  return ROLE_RANK[rawRole] >= ROLE_RANK[required];
}

/**
 * Collapse a raw role onto the legacy employee/manager/admin surface so the
 * ~60 inline `userRole === 'admin'` checks keep working. `ceo` and
 * `super_admin` both resolve to `admin`; unknown roles fall back to `employee`.
 */
export function resolveRbacRole(rawRole: string | null | undefined): RbacRole {
  if (rawRole === 'manager') return 'manager';
  if (hasRoleAtLeast(rawRole, 'admin')) return 'admin';
  return 'employee';
}

export interface RoleDefinition {
  value: AppRole;
  label: string;
  description: string;
}

/** Human-friendly labels + descriptions, surfaced by the admin console UI. */
export const ROLE_DEFINITIONS: Record<AppRole, RoleDefinition> = {
  employee: {
    value: 'employee',
    label: 'Employee',
    description: 'Self-service access to their own profile, attendance, leave, and payslips.',
  },
  manager: {
    value: 'manager',
    label: 'Manager',
    description: 'Everything an employee can do, plus management of their direct team.',
  },
  admin: {
    value: 'admin',
    label: 'HR Admin',
    description: 'Full HR operations: employees, payroll, recruitment, policies, and analytics.',
  },
  ceo: {
    value: 'ceo',
    label: 'CEO',
    description: 'Executive oversight with organization-wide visibility and the executive dashboard.',
  },
  super_admin: {
    value: 'super_admin',
    label: 'Super Admin',
    description: 'System owner: manages users, assigns roles, and reviews the audit trail.',
  },
};
