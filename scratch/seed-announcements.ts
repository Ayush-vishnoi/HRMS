import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const JUNK_MEETING_IDS = [
  'MTG-011', // sklajlsjlkj
  'MTG-012', // asn,manf,
  'MTG-009', // wDWD
  'MTG-010', // SEFZS
  'MTG-008', // ewfw
  'MTG-013', // fcgfgfc
  'MTG-016', // rtheheh
  'MTG-017', // hgh
  'MTG-007', // mhgv (cancelled junk)
  'MTG-VERIFY-1787119672216', // test artifact
  'MTG-015', // Workflow Test 1:1 (approved for removal)
];

async function main() {
  // 1. Delete junk meetings (attendees cascade)
  const deleted = await db.meeting.deleteMany({
    where: { id: { in: JUNK_MEETING_IDS } },
  });
  console.log(`Deleted ${deleted.count} junk meetings.`);

  // 2. Seed the two static dashboard announcements as real rows
  const existing = await db.announcement.count();
  if (existing > 0) {
    console.log(`Announcements already seeded (${existing} rows) — skipping seed.`);
    return;
  }

  const publisher = await db.employee.findUnique({
    where: { email: 'priya.sharma@company.com' },
    select: { id: true, department: true },
  });
  if (!publisher) throw new Error('Publisher priya.sharma@company.com not found');

  const now = new Date();
  const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

  await db.announcement.createMany({
    data: [
      {
        id: 'ANN-001',
        title: 'Independence Day Celebration 2026',
        body: 'Join us for the flag-hoisting ceremony, cultural performances, and breakfast on August 15 at 9:00 AM in the office courtyard.',
        category: 'Event',
        postedById: publisher.id,
        postedByDepartment: 'People & Culture',
        isPinned: true,
        publishedAt: now,
        targetAudience: 'All',
      },
      {
        id: 'ANN-002',
        title: 'Upcoming Holiday: Independence Day Weekend',
        body: 'Office will remain closed on Friday, August 15th. Have a great long weekend!',
        category: 'Holiday',
        postedById: publisher.id,
        postedByDepartment: 'Facilities',
        isPinned: false,
        publishedAt: fourDaysAgo,
        targetAudience: 'All',
      },
    ],
  });
  console.log('Seeded ANN-001 (Event, pinned) and ANN-002 (Holiday).');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
