/**
 * Additive-only migration: create document_blobs table for PostgreSQL-based
 * document storage (replaces local-disk uploads/). Safe to re-run.
 *
 * Usage: npx tsx scratch/migrate-document-blobs.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('Creating document_blobs table (if not exists)...');

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "document_blobs" (
      "id" VARCHAR(255) NOT NULL,
      "category" VARCHAR(30) NOT NULL,
      "mime_type" VARCHAR(120),
      "size_bytes" INTEGER NOT NULL,
      "data" BYTEA NOT NULL,
      "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
      CONSTRAINT "document_blobs_pkey" PRIMARY KEY ("id")
    )
  `);
  console.log('  ✔ table document_blobs');

  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_document_blobs_category" ON "document_blobs"("category")
  `);
  console.log('  ✔ index idx_document_blobs_category');

  // Verify
  const columns = await db.$queryRawUnsafe(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'document_blobs' ORDER BY ordinal_position
  `);
  console.log('\nVerification — document_blobs columns:');
  for (const col of columns as any[]) {
    console.log(`  ${col.column_name.padEnd(12)} ${col.data_type}`);
  }

  const count = await db.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM "document_blobs"`,
  );
  console.log(`\nExisting rows: ${count[0].count}`);
  console.log('\nDone.');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
