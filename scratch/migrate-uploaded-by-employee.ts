/* Apply 20260831092500_uploaded_by_employee against the remote Neon DB. */
import { PrismaClient } from '@prisma/client';

const statements = [
  `ALTER TABLE "employee_documents" ADD COLUMN IF NOT EXISTS "uploaded_by_employee" BOOLEAN NOT NULL DEFAULT false`,
];

async function main() {
  const db = new PrismaClient();
  for (const sql of statements) {
    try {
      await db.$executeRawUnsafe(sql);
      console.log('OK  ', sql.slice(0, 80));
    } catch (error) {
      console.error('FAIL', sql.slice(0, 80), error);
      process.exitCode = 1;
    }
  }
  await db.$disconnect();
}

void main();
