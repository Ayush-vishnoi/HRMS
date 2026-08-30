/**
 * READ-ONLY diagnostic for the Exit module duplicate-resignation bug.
 * Does NOT modify any data. Safe to run.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  // 1. Total exit requests + per-employee counts
  const grouped = await db.exitRequest.groupBy({
    by: ['employeeId'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });
  console.log('=== Exit requests per employee ===');
  for (const g of grouped) {
    console.log(`${g.employeeId}: ${g._count.id} requests`);
  }

  // 2. Resolve employee names/codes for employees with >1 request
  const dupEmployeeIds = grouped.filter((g) => g._count.id > 1).map((g) => g.employeeId);
  if (dupEmployeeIds.length > 0) {
    const dupEmployees = await db.employee.findMany({
      where: { id: { in: dupEmployeeIds } },
      select: { id: true, employeeCode: true, name: true, department: true, status: true, userRole: true },
    });
    console.log('\n=== Employees with duplicates ===');
    console.log(JSON.stringify(dupEmployees, null, 2));
  }

  // 3. Look up the employee the user mentioned (EMP-2026-089 — could be employeeCode or id)
  const byCode = await db.employee.findFirst({
    where: { OR: [{ employeeCode: 'EMP-2026-089' }, { id: 'EMP-2026-089' }] },
    select: { id: true, employeeCode: true, name: true, department: true, status: true },
  });
  console.log('\n=== Lookup EMP-2026-089 (by code or id) ===');
  console.log(byCode ? JSON.stringify(byCode, null, 2) : 'Not found');

  // 4. Full detail of all exit requests for the top duplicated employee
  const topEmployeeId = grouped[0]?.employeeId;
  if (topEmployeeId) {
    const reqs = await db.exitRequest.findMany({
      where: { employeeId: topEmployeeId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        resignationDate: true,
        requestedRelievingDate: true,
        reasonCategory: true,
        noticePeriodDays: true,
        status: true,
        managerApproval: true,
        hrApproval: true,
        createdAt: true,
      },
    });
    console.log(`\n=== All exit requests for ${topEmployeeId} (oldest first) ===`);
    for (const r of reqs) {
      console.log(
        `${r.id} | submitted: ${r.resignationDate} | relieving: ${r.requestedRelievingDate} | reason: ${r.reasonCategory} | notice: ${r.noticePeriodDays}d | status: ${r.status} | mgr: ${r.managerApproval} | hr: ${r.hrApproval} | createdAt: ${r.createdAt.toISOString()}`
      );
    }

    // 5. Related child rows for those requests (what a cleanup script must handle)
    const ids = reqs.map((r) => r.id);
    const [clearances, ktTasks, interviews, settlements] = await Promise.all([
      db.exitDepartmentClearance.count({ where: { exitRequestId: { in: ids } } }),
      db.knowledgeTransferTask.count({ where: { exitRequestId: { in: ids } } }),
      db.exitInterview.count({ where: { exitRequestId: { in: ids } } }),
      db.fullAndFinalSettlement.count({ where: { exitRequestId: { in: ids } } }),
    ]);
    console.log(`\n=== Child rows across those ${ids.length} requests ===`);
    console.log(`clearances: ${clearances}, ktTasks: ${ktTasks}, interviews: ${interviews}, settlements: ${settlements}`);
  }

  // 6. Status distribution of all exit requests
  const allReqs = await db.exitRequest.findMany({ select: { status: true } });
  const statusCounts: Record<string, number> = {};
  for (const r of allReqs) statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  console.log('\n=== Status distribution (all exit requests) ===');
  console.log(JSON.stringify(statusCounts));

  // 7. Alumni records + employee statuses
  const alumniCount = await db.alumniRecord.count();
  const offboarded = await db.employee.count({ where: { status: 'Offboarded' } });
  console.log(`\n=== Alumni records: ${alumniCount}, Employees with status Offboarded: ${offboarded} ===`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
