/**
 * READ-ONLY helper for runtime exit-module testing.
 * Finds an admin employee and a suitable test employee (no active exit
 * request, not exited/offboarded) so the POST action chain can be exercised
 * against the dev server via the x-user-id header.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const INACTIVE_EXIT_STATUSES = ['Completed', 'Cancelled', 'Rejected', 'Withdrawn'];

async function main() {
  const admin = await db.employee.findFirst({
    where: { userRole: 'admin', status: { notIn: ['Exited', 'Offboarded'] } },
    select: { id: true, employeeCode: true, name: true, email: true },
  });
  console.log('ADMIN=' + JSON.stringify(admin));

  const activeExits = await db.exitRequest.findMany({
    where: { status: { notIn: INACTIVE_EXIT_STATUSES } },
    select: { employeeId: true },
  });
  const busyEmployeeIds = [...new Set(activeExits.map((e) => e.employeeId))];

  const candidates = await db.employee.findMany({
    where: {
      userRole: 'employee',
      status: { notIn: ['Offboarded'] },
      id: { notIn: busyEmployeeIds },
    },
    select: { id: true, employeeCode: true, name: true, email: true, managerId: true },
    take: 5,
  });
  console.log('CANDIDATES=' + JSON.stringify(candidates, null, 2));

  // Also show the manager of the first candidate (for manager_approve testing).
  if (candidates.length > 0 && candidates[0].managerId) {
    const manager = await db.employee.findUnique({
      where: { id: candidates[0].managerId },
      select: { id: true, employeeCode: true, name: true, userRole: true },
    });
    console.log('MANAGER=' + JSON.stringify(manager));
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
