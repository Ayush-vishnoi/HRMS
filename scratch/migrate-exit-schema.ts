/**
 * Targeted, additive-only migration for the Exit module overhaul.
 *
 * Why not `prisma db push`: the database has unrelated drift in the meetings
 * tables (RsvpStatus enum value `TENTATIVE` and meeting_attendees.invite_status
 * column exist in DB but not in schema.prisma), so a full push demands
 * --accept-data-loss, which would destroy that meeting data. This script
 * applies ONLY the approved Exit changes, idempotently:
 *
 *   1. Add 'Exited' to the EmploymentStatus enum.
 *   2. Add 4 columns to exit_requests:
 *      - manager_approved_at  TIMESTAMP(3)
 *      - hr_approved_at       TIMESTAMP(3)
 *      - rejection_reason     TEXT
 *      - workflow_stage       TEXT NOT NULL DEFAULT 'Pending Manager Approval'
 *
 * Usage: npx tsx scratch/migrate-exit-schema.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STATEMENTS = [
  `ALTER TYPE "EmploymentStatus" ADD VALUE IF NOT EXISTS 'Exited'`,
  `ALTER TABLE "exit_requests" ADD COLUMN IF NOT EXISTS "manager_approved_at" TIMESTAMP(3)`,
  `ALTER TABLE "exit_requests" ADD COLUMN IF NOT EXISTS "hr_approved_at" TIMESTAMP(3)`,
  `ALTER TABLE "exit_requests" ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT`,
  `ALTER TABLE "exit_requests" ADD COLUMN IF NOT EXISTS "workflow_stage" TEXT NOT NULL DEFAULT 'Pending Manager Approval'`,
];

async function main() {
  for (const sql of STATEMENTS) {
    console.log(`Running: ${sql}`);
    await prisma.$executeRawUnsafe(sql);
  }
  console.log('\nAll statements applied successfully.');

  // Verify
  const columns = await prisma.$queryRawUnsafe<{ column_name: string; data_type: string; column_default: string | null }[]>(
    `SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'exit_requests' AND column_name IN ('manager_approved_at','hr_approved_at','rejection_reason','workflow_stage')`
  );
  console.log('\nVerification — exit_requests columns:');
  for (const col of columns) {
    console.log(`  ${col.column_name}: ${col.data_type}${col.column_default ? ` default ${col.column_default}` : ''}`);
  }
  const enumValues = await prisma.$queryRawUnsafe<{ enumlabel: string }[]>(
    `SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'EmploymentStatus'`
  );
  console.log('\nVerification — EmploymentStatus values:', enumValues.map((v) => v.enumlabel).join(', '));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
