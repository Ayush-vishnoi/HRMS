import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tableNames = [
    'onboarding_tasks',
    'background_verifications',
    'recruitment_interviews',
    'recruitment_offers',
    'performance_goals',
    'performance_review_cycles',
    'work_shifts',
    'timesheets',
    'overtime_requests',
  ];

  for (const name of tableNames) {
    const cols: any = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = '${name}'
    `);
    console.log(`\n=== TABLE: ${name} ===`);
    console.log(cols.map((c: any) => `${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`).join(', '));
  }
}

main().finally(() => prisma.$disconnect());
