/**
 * Backfill: grant the default annual leave allocation to every existing
 * employee who has no LeaveBalance rows for the current year.
 *
 * Respects the unique [employeeId, year, leaveType] constraint via
 * skipDuplicates, so re-running is safe. Dry-run by default; pass --apply
 * to write.
 *
 * Usage (from backend/):  node ../scratch/backfill-leave-balances.mjs --apply
 */
import { createRequire } from 'node:module';

const require = createRequire(process.cwd() + '/node_modules/@prisma/client/index.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');
const YEAR = new Date().getUTCFullYear();

const DEFAULTS = [
  { leaveType: 'Casual', total: 12 },
  { leaveType: 'Sick', total: 10 },
  { leaveType: 'Earned', total: 20 },
  { leaveType: 'WFH', total: 12 },
];

async function main() {
  const employees = await prisma.employee.findMany({
    select: { id: true, employeeCode: true, name: true, status: true },
    orderBy: { employeeCode: 'asc' },
  });
  const existing = await prisma.leaveBalance.findMany({
    where: { year: YEAR },
    select: { employeeId: true, leaveType: true },
  });
  const has = new Set(existing.map((b) => `${b.employeeId}:${b.leaveType}`));

  let toCreate = 0;
  const perEmployee = [];
  for (const emp of employees) {
    const rows = DEFAULTS.filter(
      (d) => !has.has(`${emp.id}:${d.leaveType}`),
    ).map((d) => ({
      employeeId: emp.id,
      year: YEAR,
      leaveType: d.leaveType,
      total: d.total,
      used: 0,
      remaining: d.total,
    }));
    if (rows.length > 0) {
      perEmployee.push({ emp, rows });
      toCreate += rows.length;
    }
  }

  console.log(
    `Employees: ${employees.length} | with ${YEAR} balances: ${employees.length - perEmployee.length} | missing: ${perEmployee.length} (${toCreate} rows)`,
  );

  if (!APPLY) {
    for (const { emp, rows } of perEmployee) {
      console.log(
        `  DRY ${emp.employeeCode} ${emp.name} [${emp.status}] -> ${rows.map((r) => r.leaveType).join(', ')}`,
      );
    }
    console.log('Dry run only. Re-run with --apply to write.');
    return;
  }

  let created = 0;
  for (const { emp, rows } of perEmployee) {
    const res = await prisma.leaveBalance.createMany({
      data: rows,
      skipDuplicates: true,
    });
    created += res.count;
    console.log(
      `  SEEDED ${emp.employeeCode} ${emp.name} +${res.count} (${rows.map((r) => r.leaveType).join(', ')})`,
    );
  }
  console.log(`Done. Rows created: ${created}`);
}

main()
  .catch((e) => {
    console.error('ERR:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
