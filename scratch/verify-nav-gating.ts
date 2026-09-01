/**
 * Verification: Recruitment ATS, Onboarding & BGV, and Asset & Inventory
 * must be HR-admin-only in the UI (removed from the manager portal).
 *
 * Checks NAV_ITEMS visibility + isRouteAllowedForRole route guarding for
 * employee / manager / admin against the three restricted routes (and a
 * few control routes that must stay unchanged).
 *
 * Usage: npx tsx scratch/verify-nav-gating.ts
 */
import {
  isRouteAllowedForRole,
  NAV_ITEMS,
} from '../src/shared/lib/navigation';

type Role = 'employee' | 'manager' | 'admin';

const RESTRICTED = [
  { name: 'Recruitment ATS', href: '/recruitment' },
  { name: 'Onboarding & BGV', href: '/employee-lifecycle' },
  { name: 'Asset & Inventory', href: '/assets' },
  { name: 'People Analytics', href: '/analytics' },
];

const CONTROLS = [
  { name: 'My Assets (self-service)', href: '/my-assets', expect: ['employee', 'manager', 'admin'] },
  { name: 'My Team', href: '/my-team', expect: ['manager'] },
  { name: 'Exit & Clearance', href: '/exit', expect: ['employee', 'manager', 'admin'] },
  { name: 'Grievance / Complaint', href: '/grievances', expect: ['employee', 'manager'] },
  { name: 'Tasks', href: '/tasks', expect: ['employee', 'manager', 'admin'] },
];

let failures = 0;
const check = (label: string, ok: boolean) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failures += 1;
};

console.log('=== Sidebar visibility (NAV_ITEMS) ===');
for (const role of ['employee', 'manager', 'admin'] as Role[]) {
  const names = NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => item.name);
  for (const feature of RESTRICTED) {
    const visible = names.includes(feature.name);
    const expected = role === 'admin';
    check(`${role} sidebar shows "${feature.name}" -> ${visible} (expected ${expected})`, visible === expected);
  }
}

console.log('\n=== Route guard (isRouteAllowedForRole) ===');
const routeCases: Array<{ path: string; role: Role; expected: boolean }> = [];
for (const feature of RESTRICTED) {
  routeCases.push({ path: feature.href, role: 'admin', expected: true });
  routeCases.push({ path: feature.href, role: 'manager', expected: false });
  routeCases.push({ path: feature.href, role: 'employee', expected: false });
  // Deep links (sub-routes + query-style paths) must be blocked too
  routeCases.push({ path: `${feature.href}/some/deep/link`, role: 'manager', expected: false });
}
for (const control of CONTROLS) {
  for (const role of ['employee', 'manager', 'admin'] as Role[]) {
    routeCases.push({
      path: control.href,
      role,
      expected: control.expect.includes(role),
    });
  }
}
for (const { path, role, expected } of routeCases) {
  const allowed = isRouteAllowedForRole(path, role);
  check(`${role} can access ${path} -> ${allowed} (expected ${expected})`, allowed === expected);
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
