import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// Applies prisma/migrations/20260831090000_hr_request_submission/migration.sql
// against the remote database. Idempotent so it is safe to re-run.
const STATEMENTS = [
  `ALTER TYPE "DocumentRequestStatus" ADD VALUE IF NOT EXISTS 'Submitted'`,
  `ALTER TYPE "DocumentRequestStatus" ADD VALUE IF NOT EXISTS 'Verified'`,
  `ALTER TYPE "DocumentRequestStatus" ADD VALUE IF NOT EXISTS 'Rejected'`,
  `ALTER TABLE "document_requests" ADD COLUMN IF NOT EXISTS "submitted_document_id" VARCHAR(36)`,
  `ALTER TABLE "document_requests" DROP CONSTRAINT IF EXISTS "document_requests_submitted_document_id_fkey"`,
  `ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_submitted_document_id_fkey" FOREIGN KEY ("submitted_document_id") REFERENCES "employee_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
  `CREATE INDEX IF NOT EXISTS "document_requests_submitted_document_id_idx" ON "document_requests"("submitted_document_id")`,
];

async function main() {
  for (const stmt of STATEMENTS) {
    try {
      await db.$executeRawUnsafe(stmt);
      console.log('OK  :', stmt.slice(0, 90));
    } catch (err) {
      console.error('FAIL:', stmt.slice(0, 90), err);
      throw err;
    }
  }
  console.log('HR request submission migration complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => void db.$disconnect());
