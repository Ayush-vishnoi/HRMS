/**
 * Additive migration: employee_documents.shared_by_hr (BOOLEAN NOT NULL DEFAULT false)
 * and shared_at (TIMESTAMPTZ NULL). Existing Verified documents are backfilled to
 * shared_by_hr = true so previously verified/HR-generated documents stay downloadable
 * for employees after the new share-gating goes live.
 *
 * Usage: npx tsx scratch/migrate-document-sharing.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS shared_by_hr BOOLEAN NOT NULL DEFAULT false`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ(6)`,
  );
  const backfill = await prisma.$executeRawUnsafe(
    `UPDATE employee_documents SET shared_by_hr = true, shared_at = updated_at WHERE status = 'Verified' AND shared_by_hr = false`,
  );
  console.log(`Columns ensured; ${backfill} Verified document(s) backfilled to shared_by_hr = true.`);
}

main()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
