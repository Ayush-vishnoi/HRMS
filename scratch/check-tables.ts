import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function checkTables() {
  try {
    const result: any = await db.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `;
    console.log('Tables in public schema:', result);
  } catch (err) {
    console.error('Error querying tables:', err);
  } finally {
    await db.$disconnect();
  }
}

checkTables();
