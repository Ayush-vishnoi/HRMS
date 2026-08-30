/**
 * ONE-TIME backfill: sync the Manager/HR NOC rows in the 5-department
 * clearance matrix with the approval state of each exit request.
 * - managerApproval === 'Approved'  -> Manager NOC = Cleared
 * - hrApproval === 'Approved'       -> HR NOC = Cleared
 * Idempotent: only updates rows still not 'Cleared'.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 5): Promise<T> {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      console.warn(`${label} attempt ${i}/${attempts} failed: ${(err as Error).message}`);
      if (i === attempts) throw err;
      await new Promise((r) => setTimeout(r, 4000 * i));
    }
  }
  throw new Error('unreachable');
}

async function main() {
  const exitRequests = await withRetry(
    () => db.exitRequest.findMany({ select: { id: true, managerApproval: true, hrApproval: true } }),
    'findMany'
  );

  let managerCleared = 0;
  let hrCleared = 0;

  for (const req of exitRequests) {
    if (req.managerApproval === 'Approved') {
      const res = await withRetry(
        () =>
          db.exitDepartmentClearance.updateMany({
            where: { exitRequestId: req.id, department: 'Manager', status: { not: 'Cleared' } },
            data: {
              status: 'Cleared',
              clearedAt: new Date(),
              remarks: 'Auto-cleared by manager approval (backfill).',
            },
          }),
        `manager-noc ${req.id}`
      );
      managerCleared += res.count;
    }
    if (req.hrApproval === 'Approved') {
      // HR approval finalises the matrix: clear ALL remaining NOCs
      // (HR, IT, Finance, Admin — Manager handled above).
      const res = await withRetry(
        () =>
          db.exitDepartmentClearance.updateMany({
            where: { exitRequestId: req.id, status: { not: 'Cleared' } },
            data: {
              status: 'Cleared',
              clearedAt: new Date(),
              remarks: 'Auto-cleared by HR approval (backfill).',
            },
          }),
        `hr-noc ${req.id}`
      );
      hrCleared += res.count;
    }
  }

  console.log(`Backfill complete: ${managerCleared} Manager NOC(s) and ${hrCleared} HR NOC(s) cleared.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
