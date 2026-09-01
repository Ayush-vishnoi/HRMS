/**
 * Backfill — unstick expense claims filed by managers.
 *
 * Context: claims filed by a manager used to enter the two-level approval
 * flow at managerStatus=Pending. But a manager cannot approve their own
 * claim, and in this org a manager's reporting manager is an HR admin, who
 * may only act on the HR (level-2) field. Such claims deadlocked at
 * Pending/Pending — nobody could ever move them forward.
 *
 * The API now creates manager-filed claims with the manager level skipped
 * (managerStatus=Approved, HR admin approval only). This script applies the
 * same rule to legacy rows: every claim whose owner has userRole 'manager'
 * and managerStatus still 'Pending' is advanced to 'Approved' so HR admins
 * can review it directly. financeStatus/paymentStatus are untouched — the
 * HR decision stays with HR.
 *
 * Safety: dry run by default; pass --apply to perform the update.
 *
 * Usage:
 *   npx tsx scratch/backfill-manager-claim-level.ts           # dry run
 *   npx tsx scratch/backfill-manager-claim-level.ts --apply   # update
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes('--apply');

  const managers = await prisma.employee.findMany({
    where: { userRole: 'manager' },
    select: { id: true, name: true },
  });
  if (managers.length === 0) {
    console.log('No manager employees found — nothing to do.');
    return;
  }

  const stuck = await prisma.expenseClaim.findMany({
    where: {
      employeeId: { in: managers.map((m) => m.id) },
      managerStatus: 'Pending',
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      claimNumber: true,
      title: true,
      employeeId: true,
      managerStatus: true,
      financeStatus: true,
    },
  });

  if (stuck.length === 0) {
    console.log('No stuck manager-filed claims found — nothing to do.');
    return;
  }

  for (const claim of stuck) {
    const owner = managers.find((m) => m.id === claim.employeeId);
    console.log(
      `[${apply ? 'UPDATE' : 'DRY RUN'}] ${claim.claimNumber} "${claim.title}" by ${owner?.name ?? claim.employeeId}: managerStatus Pending -> Approved (manager level skipped, HR review only)`,
    );
  }

  if (apply) {
    const result = await prisma.expenseClaim.updateMany({
      where: { id: { in: stuck.map((c) => c.id) } },
      data: { managerStatus: 'Approved' },
    });
    console.log(`\nUpdated ${result.count} claim(s).`);
  } else {
    console.log('\nDry run — pass --apply to update these claims.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
