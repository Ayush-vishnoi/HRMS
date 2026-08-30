/**
 * Backfill: move existing on-disk documents (uploads/) into PostgreSQL
 * document_blobs, then mark employee_documents rows as storage_provider='db'.
 * Safe to re-run (upsert on each blob).
 *
 * Usage: npx tsx scratch/backfill-document-blobs.ts
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const db = new PrismaClient();

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  txt: 'text/plain',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

// disk directory -> blob category
const LOCATIONS: Array<{ dir: string; category: string }> = [
  { dir: path.join(process.cwd(), 'uploads', 'documents', 'employee'), category: 'employee' },
  { dir: path.join(process.cwd(), 'uploads', 'documents', 'offers'), category: 'offers' },
  { dir: path.join(process.cwd(), 'uploads', 'resumes'), category: 'resumes' },
  { dir: path.join(process.cwd(), 'uploads', 'expenses'), category: 'expenses' },
];

async function main() {
  let totalFiles = 0;
  let totalBytes = 0;
  const backfilledKeys: string[] = [];

  for (const { dir, category } of LOCATIONS) {
    let files: string[];
    try {
      files = await fs.readdir(dir);
    } catch {
      console.log(`Skipping ${dir} (does not exist)`);
      continue;
    }

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) continue;

      const data = await fs.readFile(filePath);
      const ext = path.extname(file).toLowerCase().slice(1);
      const mimeType = MIME_BY_EXT[ext] ?? 'application/octet-stream';

      await db.$executeRawUnsafe(
        `INSERT INTO "document_blobs" ("id", "category", "mime_type", "size_bytes", "data", "created_at")
         VALUES ($1, $2, $3, $4, $5, now())
         ON CONFLICT ("id") DO UPDATE
           SET "category" = EXCLUDED."category",
               "mime_type" = EXCLUDED."mime_type",
               "size_bytes" = EXCLUDED."size_bytes",
               "data" = EXCLUDED."data"`,
        file,
        category,
        mimeType,
        data.length,
        data,
      );

      totalFiles += 1;
      totalBytes += data.length;
      backfilledKeys.push(file);
      console.log(`  ✔ [${category}] ${file} (${(data.length / 1024).toFixed(1)} KB)`);
    }
  }

  console.log(`\nBackfilled ${totalFiles} files (${(totalBytes / 1024 / 1024).toFixed(2)} MB) into document_blobs.`);

  // Flip employee_documents rows whose bytes now live in Postgres
  if (backfilledKeys.length > 0) {
    const result = await db.employeeDocument.updateMany({
      where: { storage_key: { in: backfilledKeys }, storage_provider: 'local-private' },
      data: { storage_provider: 'db' },
    });
    console.log(`Updated ${result.count} employee_documents rows to storage_provider='db'.`);
  }

  // Verify
  const counts = await db.$queryRawUnsafe<{ category: string; count: bigint; bytes: bigint }[]>(
    `SELECT "category", COUNT(*)::bigint AS count, SUM("size_bytes")::bigint AS bytes
     FROM "document_blobs" GROUP BY "category" ORDER BY "category"`,
  );
  console.log('\nVerification — document_blobs by category:');
  for (const row of counts) {
    console.log(`  ${row.category.padEnd(10)} ${row.count} files (${(Number(row.bytes) / 1024).toFixed(1)} KB)`);
  }

  const remaining = await db.employeeDocument.count({ where: { storage_provider: 'local-private' } });
  console.log(`\nemployee_documents still on 'local-private': ${remaining}`);
  console.log('Done.');
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
