/**
 * Employee database audit:
 *  - Total employees in the database
 *  - Data completeness per employee (key profile fields)
 *  - Status / role breakdown
 *  - Which employee IDs are "running" in the system:
 *      * live (unexpired) auth sessions
 *      * activity footprint across operational tables
 *
 * Run: npx tsx scratch/audit-employees.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function fmtDate(d: Date | null | undefined): string {
  if (!d) return 'never';
  return d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

async function main() {
  console.log('=== EMPLOYEE DATABASE AUDIT ===\n');

  // ------------------------------------------------------------------
  // 1. Totals & breakdowns
  // ------------------------------------------------------------------
  const [total, byStatus, byRole] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.employee.groupBy({ by: ['userRole'], _count: { _all: true } }),
  ]);
  console.log(`TOTAL EMPLOYEES: ${total}`);
  console.log('\nBy status:');
  for (const s of byStatus.sort((a, b) => b._count._all - a._count._all)) {
    console.log(`  ${s.status.padEnd(12)} ${s._count._all}`);
  }
  console.log('By userRole:');
  for (const r of byRole.sort((a, b) => b._count._all - a._count._all)) {
    console.log(`  ${r.userRole.padEnd(12)} ${r._count._all}`);
  }

  // ------------------------------------------------------------------
  // 2. Per-employee completeness + activity
  // ------------------------------------------------------------------
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      employeeCode: true,
      name: true,
      email: true,
      userRole: true,
      status: true,
      roleTitle: true,
      department: true,
      phone: true,
      joinDate: true,
      location: true,
      salary: true,
      managerId: true,
      organization_id: true,
      passwordHash: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { employeeCode: 'asc' },
  });

  // Live sessions per employee
  const liveSessions = await prisma.authSession.groupBy({
    by: ['employeeId'],
    where: { expires: { gt: new Date() } },
    _count: { _all: true },
  });
  const liveSessionMap = new Map(liveSessions.map((s) => [s.employeeId, s._count._all]));

  // Activity footprint across operational tables (raw SQL, skip missing tables)
  const tables: { table_name: string }[] = await prisma.$queryRawUnsafe(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
  `);
  const existing = new Set(tables.map((t) => t.table_name));

  const activityTables: { table: string; column: string; label: string }[] = [
    { table: 'auth_sessions', column: 'employee_id', label: 'sessions' },
    { table: 'attendance_records', column: 'employee_id', label: 'attendance' },
    { table: 'leave_requests', column: 'employee_id', label: 'leaves' },
    { table: 'payslips', column: 'employee_id', label: 'payslips' },
    { table: 'meeting_attendees', column: 'employee_id', label: 'meetings' },
    { table: 'help_desk_tickets', column: 'employee_id', label: 'tickets' },
    { table: 'messages', column: 'sender_id', label: 'chat' },
    { table: 'timesheets', column: 'employee_id', label: 'timesheets' },
    { table: 'overtime_requests', column: 'employee_id', label: 'overtime' },
    { table: 'employee_documents', column: 'employee_id', label: 'documents' },
    { table: 'employee_onboardings', column: 'employee_id', label: 'onboarding' },
    { table: 'exit_requests', column: 'employee_id', label: 'exit' },
  ];

  const activityMap = new Map<string, Set<string>>(); // employeeId -> set of labels
  for (const { table, column, label } of activityTables) {
    if (!existing.has(table)) continue;
    try {
      const rows: { employee_id: string }[] = await prisma.$queryRawUnsafe(
        `SELECT DISTINCT "${column}" AS employee_id FROM "${table}" WHERE "${column}" IS NOT NULL`
      );
      for (const r of rows) {
        if (!activityMap.has(r.employee_id)) activityMap.set(r.employee_id, new Set());
        activityMap.get(r.employee_id)!.add(label);
      }
    } catch (e) {
      console.log(`  (skipped ${table}: ${(e as Error).message.slice(0, 60)})`);
    }
  }

  // ------------------------------------------------------------------
  // 3. Completeness scoring
  // ------------------------------------------------------------------
  const requiredFields: (keyof (typeof employees)[number])[] = [
    'name', 'email', 'roleTitle', 'department', 'joinDate', 'location',
  ];
  let completeCount = 0;
  const incompleteList: string[] = [];

  for (const e of employees) {
    const missing: string[] = [];
    for (const f of requiredFields) {
      const v = e[f];
      if (v === null || v === undefined || v === '') missing.push(f);
    }
    if (!e.phone) missing.push('phone');
    if (!e.managerId) missing.push('managerId');
    if (!e.organization_id) missing.push('organization_id');
    if (!e.passwordHash) missing.push('passwordHash(login)');
    if (Number(e.salary) <= 0) missing.push('salary');

    const isComplete = missing.length === 0;
    if (isComplete) completeCount++;
    else incompleteList.push(`${e.employeeCode}: missing ${missing.join(', ')}`);
  }

  console.log(`\nCOMPLETE PROFILES (all key fields + login + salary): ${completeCount}/${total}`);
  if (incompleteList.length > 0 && incompleteList.length <= 30) {
    console.log('Incomplete:');
    for (const l of incompleteList) console.log(`  ${l}`);
  } else if (incompleteList.length > 30) {
    console.log(`Incomplete: ${incompleteList.length} employees (showing first 10)`);
    for (const l of incompleteList.slice(0, 10)) console.log(`  ${l}`);
  }

  // ------------------------------------------------------------------
  // 4. Per-employee "running in system" view
  // ------------------------------------------------------------------
  console.log('\nPER-EMPLOYEE VIEW (sorted by employeeCode):');
  console.log('CODE      | NAME                 | ROLE    | STATUS     | LIVE-SESS | LAST LOGIN            | ACTIVITY');
  console.log('-'.repeat(140));

  let withLiveSession = 0;
  let withAnyActivity = 0;
  const rows = employees.map((e) => {
    const sess = liveSessionMap.get(e.id) ?? 0;
    const acts = activityMap.get(e.id);
    return { e, sess, acts };
  });
  // sort: live sessions first, then activity, then code
  rows.sort((a, b) => {
    if (b.sess !== a.sess) return b.sess - a.sess;
    const aAct = a.acts?.size ?? 0;
    const bAct = b.acts?.size ?? 0;
    if (bAct !== aAct) return bAct - aAct;
    return a.e.employeeCode.localeCompare(b.e.employeeCode);
  });

  for (const { e, sess, acts } of rows) {
    if (sess > 0) withLiveSession++;
    if (acts && acts.size > 0) withAnyActivity++;
    const activity = acts && acts.size > 0 ? [...acts].sort().join(',') : '-';
    console.log(
      `${e.employeeCode.padEnd(9)} | ${(e.name || '').slice(0, 20).padEnd(20)} | ${e.userRole.padEnd(7)} | ${e.status.padEnd(10)} | ${String(sess).padEnd(9)} | ${fmtDate(e.lastLoginAt).padEnd(21)} | ${activity}`
    );
  }

  // ------------------------------------------------------------------
  // 5. Summary
  // ------------------------------------------------------------------
  const active = byStatus.find((s) => String(s.status) === 'Active')?._count._all ?? 0;
  const offboarded = (byStatus.find((s) => String(s.status) === 'Offboarded')?._count._all ?? 0)
    + (byStatus.find((s) => String(s.status) === 'Exited')?._count._all ?? 0);
  const otherStatus = total - active - offboarded;

  console.log('\n=== SUMMARY ===');
  console.log(`Total employees in DB:            ${total}`);
  console.log(`  Active status:                  ${active}`);
  console.log(`  Offboarded/Exited:              ${offboarded}`);
  console.log(`  Other status (OnLeave/Remote):  ${otherStatus}`);
  console.log(`Complete profiles:                ${completeCount}`);
  console.log(`With LIVE session right now:      ${withLiveSession}`);
  console.log(`With activity in system tables:   ${withAnyActivity}`);
  console.log(`Can log in (passwordHash set):    ${employees.filter((e) => !!e.passwordHash).length}`);
}

main()
  .catch((e) => {
    console.error('Audit failed:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
