/**
 * One-time backfill: set locked_until on exit letters (Relieving / Experience)
 * that were generated before the lock workflow existed.
 *
 * For each such letter, resolves the employee's latest exit request and sets
 * locked_until to the start of the relieving date (approved, else requested).
 * Letters already downloaded (downloaded_at set) are left untouched.
 *
 * Usage: npx tsx scratch/backfill-letter-locks.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXIT_LETTER_NAMES = ['Relieving Letter', 'Experience Letter'];

async function main() {
  const letters = await prisma.employeeDocument.findMany({
    where: {
      name: { in: EXIT_LETTER_NAMES },
      storage_key: { not: null },
      locked_until: null,
      downloaded_at: null,
    },
    select: { id: true, employeeId: true, name: true },
  });
  console.log(`Found ${letters.length} unlocked exit letter(s) to backfill.`);

  for (const letter of letters) {
    const exitRequest = await prisma.exitRequest.findFirst({
      where: { employeeId: letter.employeeId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, approvedRelievingDate: true, requestedRelievingDate: true },
    });
    if (!exitRequest) {
      console.log(`  [skip] ${letter.name} (${letter.id}): no exit request found`);
      continue;
    }
    const relievingDateStr = exitRequest.approvedRelievingDate || exitRequest.requestedRelievingDate;
    const lockedUntil = new Date(`${relievingDateStr.slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(lockedUntil.getTime())) {
      console.log(`  [skip] ${letter.name} (${letter.id}): invalid relieving date ${relievingDateStr}`);
      continue;
    }
    await prisma.employeeDocument.update({
      where: { id: letter.id },
      data: { locked_until: lockedUntil },
    });
    console.log(
      `  [ok] ${letter.name} (${letter.id}) locked until ${lockedUntil.toISOString().slice(0, 10)} (exit ${exitRequest.id})`,
    );
  }
  console.log('Backfill complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
