/**
 * E2E test-data cleanup — remove expense claims created by manual E2E
 * verification runs.
 *
 * Context: the Expenses module has no automated test suite; E2E verification
 * is done with ad-hoc curl calls against the dev server. Those runs create
 * real ExpenseClaim rows (titles/merchants containing "E2E" / "Test") that
 * then show up in the employee-visible claims list and pollute the stat
 * cards.
 *
 * Rule: delete every ExpenseClaim whose title or merchantName contains the
 * standalone word "E2E" or "Test" (case-insensitive, word-boundary match so
 * legitimate words like "Latest" or "Contest" never trigger a false
 * positive). ExpenseClaim has no child tables, so a plain deleteMany is
 * safe.
 *
 * Safety: runs as a DRY RUN by default and only prints what it would delete.
 * Pass --apply to perform the actual deletion.
 *
 * Usage:
 *   npx tsx scratch/cleanup-e2e-expense-claims.ts           # dry run
 *   npx tsx scratch/cleanup-e2e-expense-claims.ts --apply   # delete
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Word-boundary match: "E2E Test Vendor" matches, "Latest Fashion" does not.
const TEST_MARKER = /\b(e2e|test)\b/i;

function isTestClaim(claim: { title: string; merchantName: string }): boolean {
  return TEST_MARKER.test(claim.title) || TEST_MARKER.test(claim.merchantName);
}

async function main() {
  const apply = process.argv.includes('--apply');

  const allClaims = await prisma.expenseClaim.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      claimNumber: true,
      title: true,
      merchantName: true,
      amount: true,
      managerStatus: true,
      financeStatus: true,
      paymentStatus: true,
      employeeId: true,
      createdAt: true,
    },
  });

  const testClaims = allClaims.filter(isTestClaim);
  console.log(
    `Scanned ${allClaims.length} expense claim(s); ${testClaims.length} look like E2E test data.\n`
  );

  if (testClaims.length === 0) {
    console.log('Nothing to clean up.');
    return;
  }

  for (const claim of testClaims) {
    console.log(
      `  DELETE  ${claim.claimNumber}  ₹${claim.amount}  "${claim.title}" @ ${claim.merchantName}  ` +
        `[Mgr: ${claim.managerStatus}, HR: ${claim.financeStatus}, Pay: ${claim.paymentStatus}]  ` +
        `filed ${claim.createdAt.toISOString().split('T')[0]} by ${claim.employeeId}`
    );
  }

  if (!apply) {
    console.log(`\nDRY RUN — ${testClaims.length} test claim(s) would be deleted.`);
    console.log('Re-run with --apply to execute the deletion.');
    return;
  }

  const result = await prisma.expenseClaim.deleteMany({
    where: { id: { in: testClaims.map((c) => c.id) } },
  });
  console.log(`\nAPPLIED — deleted ${result.count} test claim(s).`);

  const remaining = (await prisma.expenseClaim.findMany()).filter(isTestClaim);
  if (remaining.length === 0) {
    console.log('Verification passed: no E2E test claims remain.');
  } else {
    console.log(`WARNING: ${remaining.length} test claim(s) still remain.`);
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
