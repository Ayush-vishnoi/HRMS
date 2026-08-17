import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rows: any = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'document_templates'
  `);
  console.log('document_templates columns in DB:', rows);
  const sample: any = await prisma.$queryRawUnsafe(`SELECT * FROM document_templates LIMIT 5`);
  console.log('document_templates sample rows:', sample);
}

main().finally(() => prisma.$disconnect());
