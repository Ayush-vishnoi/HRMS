import { PrismaClient } from '@prisma/client';

const directUrl = "postgresql://neondb_owner:npg_rOXz3IDn5Lky@ep-delicate-cake-ayexo0r4.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";
const p = new PrismaClient({
  datasources: {
    db: { url: directUrl }
  }
});

async function main() {
  console.log('Testing direct connection...');
  await p.$connect();
  const c = await p.employee.count();
  console.log('Direct connection SUCCESS! Employee count:', c);
}

main().catch(console.error).finally(() => p.$disconnect());
