import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const requests = await db.exitRequest.findMany({
    select: {
      id: true,
      employeeId: true,
      status: true,
      workflowStage: true,
      managerApproval: true,
      hrApproval: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const employees = await db.employee.findMany({
    select: { id: true, name: true, userRole: true, managerId: true, status: true },
  });

  const empById = new Map(employees.map((e) => [e.id, e]));

  console.log('=== MANAGERS ===');
  for (const e of employees.filter((e) => e.userRole === 'manager')) {
    const reports = employees.filter((r) => r.managerId === e.id);
    console.log(
      `${e.id} ${e.name} (status=${e.status}) -> reports: ${reports.map((r) => `${r.id}(${r.status})`).join(', ') || 'NONE'}`,
    );
  }

  console.log('\n=== EXIT REQUESTS ===');
  for (const r of requests) {
    const emp = empById.get(r.employeeId);
    console.log(
      `${r.id}: employee=${r.employeeId}(${emp?.name}) manager=${emp?.managerId || 'NONE'} stage="${r.workflowStage}" status=${r.status} mgrApproval=${r.managerApproval} hrApproval=${r.hrApproval}`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
