// One-off: remove orphaned admin notifications left by the E2E onboarding run
// (the employee EMP-2026-011 was already deleted by cleanup-e2e-onboarding.ts).
// Run: node scratch/delete-e2e-notifs.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('/Users/ayushvishnoi/Documents/GitHub/HRMS/backend/node_modules/@prisma/client');

const prisma = new PrismaClient();

const found = await prisma.userNotification.findMany({
  where: { message: { contains: 'EMP-2026-011' } },
  select: { id: true, userId: true, title: true },
});
console.log('Found orphaned notifications:', found.length, found);

const r = await prisma.userNotification.deleteMany({ where: { message: { contains: 'EMP-2026-011' } } });
console.log('Deleted:', r.count);

await prisma.$disconnect();
