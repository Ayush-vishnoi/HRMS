/**
 * One-time backfill: candidates that already have an EmployeeOnboarding row
 * but were never moved to stage 'Joined' (pre-fix legacy data). These stale
 * rows kept showing in the active recruitment pipeline with a live
 * "Start Onboarding" action.
 *
 * Dry-run by default; pass --apply to write.
 * Usage: node scratch/backfill-joined-stage.mjs [--apply]
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('/Users/ayushvishnoi/Documents/GitHub/HRMS/backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');

async function main() {
  const stale = await prisma.recruitmentCandidate.findMany({
    where: { onboarding: { isNot: null }, stage: { not: 'Joined' } },
    select: { id: true, name: true, email: true, stage: true, jobId: true },
    orderBy: { createdAt: 'desc' },
  });

  if (stale.length === 0) {
    console.log('No stale onboarded candidates found. Nothing to do.');
    return;
  }

  console.log(`Found ${stale.length} onboarded candidate(s) not in stage 'Joined':`);
  for (const c of stale) {
    console.log(`  - ${c.name} <${c.email}> (stage: ${c.stage}, id: ${c.id})`);
  }

  if (!APPLY) {
    console.log('\nDRY RUN — no changes made. Re-run with --apply to update.');
    return;
  }

  for (const c of stale) {
    await prisma.$transaction([
      prisma.candidate_stage_history.create({
        data: {
          id: crypto.randomUUID(),
          candidate_id: c.id,
          from_stage: c.stage,
          to_stage: 'Joined',
          changed_by_id: null,
          note: 'Backfill: onboarding record already exists',
        },
      }),
      prisma.recruitmentCandidate.update({
        where: { id: c.id },
        data: { stage: 'Joined' },
      }),
    ]);
    console.log(`  ✓ ${c.name}: ${c.stage} → Joined`);
  }
  console.log(`\nApplied ${stale.length} update(s).`);
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
