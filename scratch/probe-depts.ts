import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const departments = await db.employee.groupBy({ by: ['department'], _count: { _all: true } });
  const locations = await db.employee.groupBy({ by: ['location'], _count: { _all: true } });
  console.log('DEPARTMENTS:', departments.map(d => `${d.department}(${d._count._all})`).join(', '));
  console.log('LOCATIONS:', locations.map(l => `${l.location}(${l._count._all})`).join(', '));
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
