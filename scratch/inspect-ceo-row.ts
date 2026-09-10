/* Inspect the ceo employee row: timestamps + org columns, and first-seen info. */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      email: string;
      user_role: string;
      created_at: Date;
      updated_at: Date;
      organization_id: string | null;
      business_unit_id: string | null;
      department_id: string | null;
      designation_id: string | null;
    }>
  >`SELECT id, name, email, user_role, created_at, updated_at, organization_id, business_unit_id, department_id, designation_id
    FROM employees WHERE user_role = 'ceo'`;
  for (const r of rows) console.log(JSON.stringify(r, null, 2));
}

main()
  .catch((err) => {
    console.error('FAILED:', err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
