/**
 * READ-ONLY diagnostic for the "0/5 Clearance not updating" issue.
 * Lists every exit request with its clearance row count + statuses.
 * Does NOT modify any data. Safe to run.
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
    () =>
      db.exitRequest.findMany({
        include: { clearances: true },
        orderBy: { createdAt: 'desc' },
      }),
    'findMany'
  );

  console.log(`=== ${exitRequests.length} exit requests ===`);
  for (const req of exitRequests) {
    const cleared = req.clearances.filter((c) => c.status === 'Cleared').length;
    const statuses = req.clearances.map((c) => `${c.department}:${c.status}`).join(', ');
    console.log(
      [
        `${req.id} | emp=${req.employeeId}`,
        `stage="${req.workflowStage}"`,
        `status="${req.status}"`,
        `clearances=${req.clearances.length} (${cleared} cleared)`,
        `[${statuses}]`,
      ].join(' | ')
    );
  }

  const zeroClearance = exitRequests.filter((r) => r.clearances.length === 0);
  console.log(
    `\n=== Requests with ZERO clearance rows (show 0/5 with no way to clear): ${zeroClearance.length} ===`
  );
  for (const req of zeroClearance) {
    console.log(`${req.id} | emp=${req.employeeId} | stage="${req.workflowStage}"`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
