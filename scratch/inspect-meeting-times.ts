import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const now = new Date();
  const meetings = await db.meeting.findMany({
    select: { id: true, title: true, startsAt: true, endsAt: true, status: true, allDay: true },
    orderBy: { startsAt: 'asc' },
  });
  console.log('NOW:', now.toISOString());
  console.log('TOTAL:', meetings.length);
  for (const m of meetings) {
    const phase = m.endsAt < now ? 'PAST' : m.startsAt > now ? 'FUTURE' : 'ONGOING-WINDOW';
    console.log(
      m.id,
      '|',
      m.status.padEnd(10),
      '|',
      phase.padEnd(14),
      '|',
      m.startsAt.toISOString(),
      '->',
      m.endsAt.toISOString(),
      '|',
      JSON.stringify(m.title.slice(0, 40)),
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
