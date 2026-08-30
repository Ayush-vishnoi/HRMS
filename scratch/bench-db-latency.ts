/**
 * Benchmarks per-query latency to Neon so we can separate network round-trip
 * cost from application-level query fan-out.
 * Run: npx tsx scratch/bench-db-latency.ts
 * Optional: DATABASE_URL_OVERRIDE=... to test a different endpoint.
 */
import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL_OVERRIDE;
const db = url
  ? new PrismaClient({ log: ['error'], datasources: { db: { url } } })
  : new PrismaClient({ log: ['error'] });

async function timeQuery(label: string, fn: () => Promise<unknown>) {
  const start = performance.now();
  await fn();
  const ms = performance.now() - start;
  console.log(`${label}: ${ms.toFixed(0)}ms`);
  return ms;
}

async function main() {
  console.log(`endpoint: ${url ? url.split('@')[1]?.split('/')[0] : 'default (.env)'}`);

  // First query includes connection establishment (DNS + TCP + TLS + auth).
  await timeQuery('query #1 (cold, includes connect)', () => db.$queryRaw`SELECT 1`);
  await timeQuery('query #2 (warm pooled)', () => db.$queryRaw`SELECT 1`);
  await timeQuery('query #3 (warm pooled)', () => db.$queryRaw`SELECT 1`);
  await timeQuery('query #4 (warm pooled)', () => db.$queryRaw`SELECT 1`);
  await timeQuery('query #5 (warm pooled)', () => db.$queryRaw`SELECT 1`);

  // A realistic single-row lookup, like the auth adapter performs.
  await timeQuery('authSession findUnique (miss)', () =>
    db.authSession.findUnique({ where: { sessionToken: 'bench-nonexistent-token' } }),
  );

  // Parallel batch, like payroll's Promise.all
  const start = performance.now();
  await Promise.all([
    db.payslip.findMany({ take: 1 }),
    db.employee.findFirst({ select: { id: true } }),
    db.payrollCycleItem.findMany({ take: 1 }),
  ]);
  console.log(`parallel x3 (payroll-like): ${(performance.now() - start).toFixed(0)}ms`);

  await db.$disconnect();
}

main().catch((err) => {
  console.error('bench failed:', err);
  process.exit(1);
});
