import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const meetings = await db.meeting.findMany({
    include: {
      organizer: { select: { id: true, name: true } },
      attendees: { include: { employee: { select: { id: true, name: true } } } },
    },
    orderBy: { startsAt: 'asc' },
  });
  for (const m of meetings) {
    console.log(`${m.id} | ${m.title} | type=${m.type} | dept=${m.department ?? '-'} | status=${m.status} | organizer=${m.organizer.name} (${m.organizer.id})`);
    console.log(`   attendees: ${m.attendees.map((a) => `${a.employee.name}(${a.rsvp}${a.responseReason ? `:"${a.responseReason}"` : ''})`).join(', ') || 'NONE'}`);
  }
  const employees = await db.employee.findMany({ select: { id: true, name: true, userRole: true }, orderBy: { id: 'asc' } });
  console.log('\nEMPLOYEES:');
  for (const e of employees) console.log(`${e.id} | ${e.name} | ${e.userRole}`);
}

main().finally(() => db.$disconnect());
