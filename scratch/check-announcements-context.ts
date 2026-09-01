import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const meetings = await db.meeting.findMany({
    select: { id: true, title: true, startsAt: true, status: true, organizerId: true },
    orderBy: { startsAt: 'asc' },
    take: 20,
  });
  console.log('=== MEETINGS (next 20 by startsAt) ===');
  for (const m of meetings) {
    console.log(JSON.stringify({ id: m.id, title: m.title, startsAt: m.startsAt, status: m.status }));
  }

  const departments = await db.employee.groupBy({
    by: ['department'],
    _count: { _all: true },
  });
  console.log('\n=== DEPARTMENTS (from employees) ===');
  for (const d of departments) {
    console.log(`${d.department} (${d._count._all})`);
  }

  const locations = await db.employee.groupBy({
    by: ['location'],
    _count: { _all: true },
  });
  console.log('\n=== LOCATIONS (from employees) ===');
  for (const l of locations) {
    console.log(`${l.location} (${l._count._all})`);
  }

  const roles = await db.employee.groupBy({
    by: ['userRole'],
    _count: { _all: true },
  });
  console.log('\n=== USER ROLES ===');
  for (const r of roles) {
    console.log(`${r.userRole} (${r._count._all})`);
  }

  // Check if any announcement-like table already exists
  const tables = await db.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name ILIKE '%announce%'
  `;
  console.log('\n=== ANNOUNCEMENT-LIKE TABLES ===');
  console.log(tables.length ? tables.map((t) => t.table_name).join(', ') : '(none)');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
