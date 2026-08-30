import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const db = new PrismaClient();

async function main() {
  const docs = await db.employeeDocument.findMany({
    where: { employeeId: 'EMP-004' },
    select: {
      id: true,
      name: true,
      type: true,
      mime_type: true,
      size_bytes: true,
      storage_provider: true,
      storage_key: true,
      template_id: true,
    },
  });
  console.log('DOCUMENTS=' + JSON.stringify(docs, null, 2));

  const secureDocsDir = path.join(process.cwd(), 'uploads', 'documents', 'employee');

  for (const doc of docs) {
    if (!doc.storage_key) continue;
    const filePath = path.join(secureDocsDir, doc.storage_key);
    if (existsSync(filePath)) {
      const buf = await readFile(filePath);
      const isPdf = buf.subarray(0, 5).toString('ascii') === '%PDF-';
      console.log(
        `FILE ${doc.id}: ${filePath} exists, ${buf.length} bytes, PDF magic=${isPdf}`,
      );
    } else {
      console.log(`FILE ${doc.id}: ${filePath} MISSING on disk`);
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
