/**
 * FIX 1 cleanup — remove duplicate exit requests.
 *
 * Context: submit_resignation used to create an ExitRequest unconditionally,
 * so rapid re-submissions produced duplicates. EMP-001 (EMP-2026-089)
 * currently has 16 requests (15 created within ~11 seconds on 2026-08-18
 * plus 1 on 2026-08-26) with 80 orphaned clearance rows.
 *
 * Rule: for every employee with more than one exit request, KEEP the most
 * recently created request and DELETE all earlier duplicates together with
 * their child rows (department clearances, KT tasks, exit interviews,
 * F&F settlements).
 *
 * Safety: runs as a DRY RUN by default and only prints what it would delete.
 * Pass --apply to perform the actual deletion inside a transaction.
 *
 * Usage:
 *   npx tsx scratch/cleanup-exit-duplicates.ts           # dry run
 *   npx tsx scratch/cleanup-exit-duplicates.ts --apply   # delete
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DuplicatePlan {
  employeeId: string;
  keepId: string;
  deleteIds: string[];
}

async function buildPlan(): Promise<DuplicatePlan[]> {
  const grouped = await prisma.exitRequest.groupBy({
    by: ['employeeId'],
    _count: { employeeId: true },
    having: { employeeId: { _count: { gt: 1 } } },
  });

  const plans: DuplicatePlan[] = [];
  for (const group of grouped) {
    const requests = await prisma.exitRequest.findMany({
      where: { employeeId: group.employeeId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true },
    });
    const [keep, ...duplicates] = requests;
    plans.push({
      employeeId: group.employeeId,
      keepId: keep.id,
      deleteIds: duplicates.map((d) => d.id),
    });
  }
  return plans;
}

async function main() {
  const apply = process.argv.includes('--apply');

  const plans = await buildPlan();
  if (plans.length === 0) {
    console.log('No employees with duplicate exit requests. Nothing to do.');
    return;
  }

  let totalDeletes = 0;
  for (const plan of plans) {
    const employee = await prisma.employee.findUnique({
      where: { id: plan.employeeId },
      select: { employeeCode: true, name: true },
    });
    console.log(
      `\nEmployee ${plan.employeeId} (${employee?.employeeCode ?? '?'} — ${employee?.name ?? '?'}):`
    );
    console.log(`  KEEP    ${plan.keepId}`);
    for (const id of plan.deleteIds) {
      const [clearances, ktTasks, interviews, settlements] = await Promise.all([
        prisma.exitDepartmentClearance.count({ where: { exitRequestId: id } }),
        prisma.knowledgeTransferTask.count({ where: { exitRequestId: id } }),
        prisma.exitInterview.count({ where: { exitRequestId: id } }),
        prisma.fullAndFinalSettlement.count({ where: { exitRequestId: id } }),
      ]);
      console.log(
        `  DELETE  ${id}  (clearances: ${clearances}, ktTasks: ${ktTasks}, interviews: ${interviews}, settlements: ${settlements})`
      );
      totalDeletes += 1;
    }
  }

  if (!apply) {
    console.log(`\nDRY RUN — ${totalDeletes} duplicate exit request(s) would be deleted.`);
    console.log('Re-run with --apply to execute the deletion.');
    return;
  }

  const allDeleteIds = plans.flatMap((plan) => plan.deleteIds);
  const deleted = await prisma.$transaction(
    async (tx) => {
      await tx.exitDepartmentClearance.deleteMany({ where: { exitRequestId: { in: allDeleteIds } } });
      await tx.knowledgeTransferTask.deleteMany({ where: { exitRequestId: { in: allDeleteIds } } });
      await tx.exitInterview.deleteMany({ where: { exitRequestId: { in: allDeleteIds } } });
      await tx.fullAndFinalSettlement.deleteMany({ where: { exitRequestId: { in: allDeleteIds } } });
      const result = await tx.exitRequest.deleteMany({ where: { id: { in: allDeleteIds } } });
      return result.count;
    },
    { timeout: 60_000 }
  );
  console.log(`\nAPPLIED — deleted ${deleted} duplicate exit request(s).`);

  const remaining = await prisma.exitRequest.groupBy({
    by: ['employeeId'],
    _count: { employeeId: true },
    having: { employeeId: { _count: { gt: 1 } } },
  });
  if (remaining.length === 0) {
    console.log('Verification passed: every employee now has at most one exit request.');
  } else {
    console.log(`WARNING: ${remaining.length} employee(s) still have duplicate exit requests.`);
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
