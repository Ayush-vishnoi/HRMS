import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tables: any = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);

  for (const t of tables) {
    try {
      const countRes: any = await prisma.$queryRawUnsafe(`SELECT count(*) as count FROM "${t.table_name}"`);
      const count = countRes[0]?.count || 0;
      console.log(`Table: ${t.table_name} -> ${count} rows`);
    } catch (e: any) {
      console.log(`Table: ${t.table_name} -> error: ${e.message}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
