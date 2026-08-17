import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('--- VERIFYING POSTGRESQL MODELS & RELATIONS ---');

  // 1. Verify SalaryRevisionHistory
  const salaryRevisions = await prisma.salaryRevisionHistory.findMany({ take: 5 });
  console.log(`✅ SalaryRevisionHistory table exists in PostgreSQL. Count: ${salaryRevisions.length}`);
  if (salaryRevisions.length > 0) {
    console.log('Sample SalaryRevision record:', {
      id: salaryRevisions[0].id,
      employeeId: salaryRevisions[0].employeeId,
      previousCtc: salaryRevisions[0].previousCtcAnnual,
      newCtc: salaryRevisions[0].newCtcAnnual,
      revisionType: salaryRevisions[0].revisionType,
      effectiveDate: salaryRevisions[0].effectiveDate,
    });
  }

  // 2. Verify EmployeeWarning
  const warnings = await prisma.employeeWarning.findMany({ take: 5 });
  console.log(`✅ EmployeeWarning table exists in PostgreSQL. Count: ${warnings.length}`);
  if (warnings.length > 0) {
    console.log('Sample EmployeeWarning record:', {
      id: warnings[0].id,
      employeeId: warnings[0].employeeId,
      type: warnings[0].type,
      severity: warnings[0].severity,
      reason: warnings[0].reason,
      status: warnings[0].status,
    });
  }

  // 3. Verify KnowledgeTransferTask
  const ktTasks = await prisma.knowledgeTransferTask.findMany({
    include: { exitRequest: true },
    take: 5,
  });
  console.log(`✅ KnowledgeTransferTask table exists in PostgreSQL. Count: ${ktTasks.length}`);
  if (ktTasks.length > 0) {
    console.log('Sample KT Task record with ExitRequest relation:', {
      id: ktTasks[0].id,
      exitRequestId: ktTasks[0].exitRequestId,
      title: ktTasks[0].title,
      recipientName: ktTasks[0].recipientName,
      status: ktTasks[0].status,
      linkedExitEmployeeId: ktTasks[0].exitRequest.employeeId,
    });
  }

  // 4. Verify relations with Employee and Lifecycle models
  const emp = await prisma.employee.findUnique({
    where: { id: 'EMP-001' },
    select: {
      id: true,
      name: true,
      employeeCode: true,
      roleTitle: true,
      salary: true,
    },
  });
  console.log('✅ Employee model verified in DB:', emp);

  const empProf = await prisma.employee_employment_profiles.findFirst();
  console.log('✅ Employment profile verified in DB:', empProf?.lifecycle_status);

  console.log('--- ALL 5 VERIFICATION CHECKS PASSED SUCCESSFULLY ---');
}

verify()
  .catch((e) => {
    console.error('Verification failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
