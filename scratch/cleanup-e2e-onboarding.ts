/**
 * E2E test-data cleanup — remove the employee + related onboarding records
 * created by scratch/test-onboarding-e2e.mjs runs.
 *
 * Context: the 5-step onboarding flow (EMP-YYYY-NNN creation) is verified with
 * ad-hoc E2E runs against the dev server. Each run creates a full onboarding
 * package: employee, onboarding + tasks, employment profile, personal profile,
 * salary structure, address-proof document request, bank-details record,
 * department asset requests, audit log + notifications.
 *
 * Rule: delete every Employee whose roleTitle contains "E2E Test" (the marker
 * used by the E2E script), together with all their dependent rows. Matching is
 * by exact roleTitle marker so legitimate employees are never touched.
 *
 * Safety: runs as a DRY RUN by default and only prints what it would delete.
 * Pass --apply to perform the actual deletion.
 *
 * Usage:
 *   npx tsx scratch/cleanup-e2e-onboarding.ts           # dry run
 *   npx tsx scratch/cleanup-e2e-onboarding.ts --apply   # delete
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const E2E_ROLE_MARKER = 'E2E Test Engineer';

async function main() {
  const apply = process.argv.includes('--apply');

  const testEmployees = await prisma.employee.findMany({
    where: { roleTitle: E2E_ROLE_MARKER },
    select: { id: true, employeeCode: true, name: true, email: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  if (testEmployees.length === 0) {
    console.log('No E2E onboarding employees found. Nothing to do.');
    return;
  }

  console.log(`Found ${testEmployees.length} E2E onboarding employee(s):\n`);
  for (const e of testEmployees) {
    console.log(`  ${e.employeeCode}  ${e.name}  <${e.email}>  (${e.id})`);
  }

  if (!apply) {
    console.log('\nDRY RUN — nothing deleted. Re-run with --apply to delete.');
    return;
  }

  let deleted = 0;
  for (const e of testEmployees) {
    // Delete children first (no cascade on most relations), then the employee.
    // (onboardingTask + backgroundVerification cascade from employeeOnboarding.
    // Admin notifications reference the employee only by code in message text.)
    const r = await prisma.$transaction([
      prisma.employeeOnboarding.deleteMany({ where: { employeeId: e.id } }),
      prisma.employee_employment_profiles.deleteMany({ where: { employee_id: e.id } }),
      prisma.employee_personal_profiles.deleteMany({ where: { employee_id: e.id } }),
      prisma.salaryStructure.deleteMany({ where: { employeeId: e.id } }),
      prisma.documentRequest.deleteMany({ where: { employeeId: e.id } }),
      prisma.employee_bank_details.deleteMany({ where: { employee_id: e.id } }),
      prisma.assetRequest.deleteMany({ where: { requestedById: e.id } }),
      prisma.auditLog.deleteMany({ where: { employeeId: e.id } }),
      prisma.userNotification.deleteMany({ where: { userId: e.id } }),
      prisma.userNotification.deleteMany({ where: { message: { contains: e.employeeCode } } }),
      prisma.employee.deleteMany({ where: { id: e.id } }),
    ]);
    const total = r.reduce((sum, x) => sum + x.count, 0);
    deleted += total;
    console.log(`  Deleted ${total} rows for ${e.employeeCode}.`);
  }

  console.log(`\nDone — ${deleted} rows removed.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
