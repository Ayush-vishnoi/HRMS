/* One-off: delete approved SN-TEST-/SN-E2E- test asset rows. */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const where = {
    OR: [{ serialNumber: { startsWith: 'SN-TEST-' } }, { serialNumber: { startsWith: 'SN-E2E-' } }],
  };
  const before = await prisma.asset.findMany({ where, select: { id: true, serialNumber: true } });
  console.log(`Deleting ${before.length} rows: ${before.map((a) => a.id).join(', ')}`);
  const { count } = await prisma.asset.deleteMany({ where });
  console.log(`Deleted ${count} asset(s). Remaining total: ${await prisma.asset.count()}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
