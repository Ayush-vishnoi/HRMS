/**
 * Targeted, additive-only migration for the exit-letter lock workflow.
 *
 * Why not `prisma db push`: the database has unrelated drift in the meetings
 * tables (RsvpStatus enum value `TENTATIVE` and meeting_attendees.invite_status
 * column exist in DB but not in schema.prisma), so a full push demands
 * --accept-data-loss, which would destroy that meeting data. This script
 * applies ONLY the approved employee_documents changes, idempotently:
 *
 *   1. locked_until   TIMESTAMPTZ(6) — exit letters stay locked until the
 *      notice period / relieving date ends; NULL means no lock.
 *   2. downloaded_at  TIMESTAMPTZ(6) — set once the employee downloads the
 *      letter; a non-NULL value means one-time download already consumed.
 *
 * Usage: npx tsx scratch/migrate-exit-documents.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STATEMENTS = [
  `ALTER TABLE "employee_documents" ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMPTZ(6)`,
  `ALTER TABLE "employee_documents" ADD COLUMN IF NOT EXISTS "downloaded_at" TIMESTAMPTZ(6)`,
];

async function main() {
  for (const sql of STATEMENTS) {
    console.log(`Running: ${sql}`);
    await prisma.$executeRawUnsafe(sql);
  }
  console.log('\nAll statements applied successfully.');

  // Verify
  const columns = await prisma.$queryRawUnsafe<{ column_name: string; data_type: string }[]>(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'employee_documents' AND column_name IN ('locked_until','downloaded_at')`
  );
  console.log('\nVerification — employee_documents columns:');
  for (const col of columns) {
    console.log(`  ${col.column_name}: ${col.data_type}`);
  }
  if (columns.length < 2) {
    throw new Error('Verification failed: expected both locked_until and downloaded_at to exist');
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
