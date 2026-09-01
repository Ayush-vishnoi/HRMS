import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const before = await prisma.userNotification.count({ where: { userId: 'EMP-001' } });
  console.log(`EMP-001 notifications before: ${before}`);

  const created = await prisma.userNotification.create({
    data: {
      userId: 'EMP-001',
      title: 'Notification System Live',
      message: 'The HRMS notification system is now fully functional. Any update across the platform will appear here.',
      type: 'System',
      linkUrl: '/dashboard',
    },
  });
  console.log(`Created test notification: ${created.id}`);

  const unread = await prisma.userNotification.count({
    where: { userId: 'EMP-001', isRead: false },
  });
  console.log(`EMP-001 unread count: ${unread}`);

  const byType = await prisma.userNotification.groupBy({
    by: ['type'],
    _count: { _all: true },
    orderBy: { _count: { type: 'desc' } },
  });
  console.log('\nAll notifications by type:');
  for (const row of byType) {
    console.log(`  ${row.type}: ${row._count._all}`);
  }

  const total = await prisma.userNotification.count();
  console.log(`\nTotal notifications in system: ${total}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
