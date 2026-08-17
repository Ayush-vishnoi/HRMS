import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function test() {
  for (let i = 0; i < 5; i++) {
    try {
      console.log(`Attempt ${i+1}...`);
      await p.$connect();
      const res = await p.employee.count();
      console.log(`Success! Employee count: ${res}`);
      return;
    } catch (e: any) {
      console.log(`Error: ${e.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
test().finally(() => p.$disconnect());
