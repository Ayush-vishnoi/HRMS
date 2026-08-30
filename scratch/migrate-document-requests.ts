/**
 * Targeted, additive-only migration for the Documents "Requests" workflow
 * (employee request -> HR fulfillment with attachments).
 *
 * Same approach as migrate-exit-schema.ts: the database has unrelated drift,
 * so `prisma db push` would demand --accept-data-loss. This script applies
 * ONLY the approved changes, idempotently:
 *
 *   1. Add 'Requested', 'Sent', 'Downloaded' to the DocumentRequestStatus enum.
 *   2. Add sent_at / downloaded_at columns to document_requests.
 *   3. Change default status for new rows to 'Requested'.
 *   4. Create document_request_attachments table (FKs to document_requests,
 *      employee_documents, employees) + indexes.
 *   5. Backfill legacy rows: Pending/'In Progress' -> Requested,
 *      Ready/Delivered -> Sent (approved by user).
 *
 * Note: ALTER TYPE ... ADD VALUE cannot run inside a transaction block, so
 * each statement runs separately via $executeRawUnsafe (no wrapping tx).
 *
 * Usage: npx tsx scratch/migrate-document-requests.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STATEMENTS = [
  // 1. Enum values (must come before statements referencing them)
  `ALTER TYPE "DocumentRequestStatus" ADD VALUE IF NOT EXISTS 'Requested'`,
  `ALTER TYPE "DocumentRequestStatus" ADD VALUE IF NOT EXISTS 'Sent'`,
  `ALTER TYPE "DocumentRequestStatus" ADD VALUE IF NOT EXISTS 'Downloaded'`,
  // 2. New columns on document_requests
  `ALTER TABLE "document_requests" ADD COLUMN IF NOT EXISTS "sent_at" TIMESTAMPTZ(6)`,
  `ALTER TABLE "document_requests" ADD COLUMN IF NOT EXISTS "downloaded_at" TIMESTAMPTZ(6)`,
  // 3. Default for new rows
  `ALTER TABLE "document_requests" ALTER COLUMN "status" SET DEFAULT 'Requested'`,
  // 4. Attachments table
  `CREATE TABLE IF NOT EXISTS "document_request_attachments" (
    "id" VARCHAR(36) NOT NULL,
    "request_id" VARCHAR(36) NOT NULL,
    "document_id" VARCHAR(36) NOT NULL,
    "source" VARCHAR(20) NOT NULL DEFAULT 'upload',
    "added_by_id" VARCHAR(36) NOT NULL,
    "added_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "document_request_attachments_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_request_attachments_request_id_fkey') THEN
      ALTER TABLE "document_request_attachments"
        ADD CONSTRAINT "document_request_attachments_request_id_fkey"
        FOREIGN KEY ("request_id") REFERENCES "document_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  `DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_request_attachments_document_id_fkey') THEN
      ALTER TABLE "document_request_attachments"
        ADD CONSTRAINT "document_request_attachments_document_id_fkey"
        FOREIGN KEY ("document_id") REFERENCES "employee_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  `DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_request_attachments_added_by_id_fkey') THEN
      ALTER TABLE "document_request_attachments"
        ADD CONSTRAINT "document_request_attachments_added_by_id_fkey"
        FOREIGN KEY ("added_by_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  `CREATE INDEX IF NOT EXISTS "document_request_attachments_request_id_idx" ON "document_request_attachments"("request_id")`,
  `CREATE INDEX IF NOT EXISTS "document_request_attachments_document_id_idx" ON "document_request_attachments"("document_id")`,
  // 5. Legacy backfill (approved)
  `UPDATE "document_requests" SET "status" = 'Requested' WHERE "status" IN ('Pending', 'In Progress')`,
  `UPDATE "document_requests" SET "status" = 'Sent' WHERE "status" IN ('Ready', 'Delivered')`,
];

async function main() {
  for (const sql of STATEMENTS) {
    console.log(`Running: ${sql}`);
    await prisma.$executeRawUnsafe(sql);
  }
  console.log('\nAll statements applied successfully.');

  // Verify
  const columns = await prisma.$queryRawUnsafe<{ column_name: string; data_type: string; column_default: string | null }[]>(
    `SELECT column_name, data_type, column_default FROM information_schema.columns
     WHERE table_name = 'document_requests' AND column_name IN ('sent_at', 'downloaded_at', 'status')`
  );
  console.log('\ndocument_requests columns:');
  for (const c of columns) console.log(`  ${c.column_name}: ${c.data_type} (default: ${c.column_default})`);

  const table = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
    `SELECT table_name FROM information_schema.tables WHERE table_name = 'document_request_attachments'`
  );
  console.log(`\ndocument_request_attachments table exists: ${table.length > 0}`);

  const statuses = await prisma.$queryRawUnsafe<{ status: string; count: bigint }[]>(
    `SELECT "status"::text AS status, COUNT(*)::bigint AS count FROM "document_requests" GROUP BY "status" ORDER BY "status"`
  );
  console.log('\ndocument_requests status distribution:');
  for (const s of statuses) console.log(`  ${s.status}: ${s.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
