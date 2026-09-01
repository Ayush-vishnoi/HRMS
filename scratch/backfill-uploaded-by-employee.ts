/**
 * Backfill uploaded_by_employee for existing employee_documents rows.
 *
 * Discriminator (from the 5 creation paths audited):
 *  - Employee uploads (documents route.ts): storage_key set, template_id NULL, shared_by_hr false -> true
 *  - HR request-send (file): shared_by_hr true at creation -> excluded (Send already hidden)
 *  - HR request-send (template): template_id set + shared_by_hr true -> excluded
 *  - Exit letters (exit-document-service.ts): template_id set -> excluded
 *  - Recruitment conversion (conversion-service.ts): storage_key NULL -> excluded
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const result = await db.$executeRawUnsafe(`
    UPDATE employee_documents
    SET uploaded_by_employee = true
    WHERE storage_key IS NOT NULL
      AND template_id IS NULL
      AND shared_by_hr = false
      AND uploaded_by_employee = false
  `);
  console.log(`BACKFILL_OK: marked ${result} row(s) as uploaded_by_employee = true`);

  const stats = await db.$queryRawUnsafe<{ uploaded_by_employee: boolean; count: bigint }[]>(`
    SELECT uploaded_by_employee, COUNT(*)::bigint AS count
    FROM employee_documents
    GROUP BY uploaded_by_employee
  `);
  for (const row of stats) {
    console.log(`  uploaded_by_employee=${row.uploaded_by_employee}: ${row.count} rows`);
  }
}

main()
  .catch((error) => {
    console.error('BACKFILL_FAILED:', error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
