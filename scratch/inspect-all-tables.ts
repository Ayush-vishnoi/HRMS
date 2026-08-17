import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tables: any = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);
  console.log('ALL EXISTING TABLES IN DB:', tables.map((t: any) => t.table_name));
}

main().finally(() => prisma.$disconnect());
