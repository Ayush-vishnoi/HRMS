/** Inspect all employee_documents rows to audit the Send-eligibility matrix. */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const rows = await db.$queryRawUnsafe(`
    SELECT id, name, shared_by_hr, uploaded_by_employee,
           storage_key IS NOT NULL AS has_storage,
           template_id IS NOT NULL AS has_template,
           locked_until
    FROM employee_documents
    ORDER BY created_at DESC
    LIMIT 30
  `);
  for (const r of rows) {
    console.log(
      `${r.id} | ${String(r.name).slice(0, 32).padEnd(32)} | shared=${r.shared_by_hr} empUp=${r.uploaded_by_employee} storage=${r.has_storage} tmpl=${r.has_template} locked=${r.locked_until ? 'yes' : 'no'}`
    );
  }
}

main()
  .catch((error) => {
    console.error('FAILED:', error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
