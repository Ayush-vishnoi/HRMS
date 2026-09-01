/* One-off: list assets with serials starting SN-TEST- / SN-E2E- for cleanup confirmation. */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const assets = await prisma.asset.findMany({
    where: {
      OR: [{ serialNumber: { startsWith: 'SN-TEST-' } }, { serialNumber: { startsWith: 'SN-E2E-' } }],
    },
    include: { assignedTo: { select: { id: true, name: true, email: true } } },
    orderBy: { serialNumber: 'asc' },
  });

  console.log(`Found ${assets.length} test/seed asset(s):\n`);
  for (const a of assets) {
    console.log(
      [
        `id=${a.id}`,
        `tag=${a.assetTag}`,
        `serial=${a.serialNumber}`,
        `name="${a.name}"`,
        `category=${a.category}`,
        `status=${a.status}`,
        `assignedTo=${a.assignedTo ? `${a.assignedTo.name} <${a.assignedTo.email}>` : '(none)'}`,
      ].join(' | ')
    );
  }

  const total = await prisma.asset.count();
  console.log(`\nTotal assets in table: ${total}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
