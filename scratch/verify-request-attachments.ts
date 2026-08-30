import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  // Reproduces the exact query shape from GET /api/documents that previously
  // threw PrismaClientValidationError: Unknown field `attachments` for include.
  const requests = await db.documentRequest.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: {
      employee: { select: { id: true, name: true, employeeCode: true, department: true } },
      attachments: {
        include: { document: { select: { id: true, name: true, storage_key: true } } },
        orderBy: { addedAt: 'asc' },
      },
    },
  });
  console.log(`OK: fetched ${requests.length} document request(s) with attachments include.`);
  for (const req of requests) {
    console.log(`- ${req.id} | ${req.documentType} | ${req.status} | attachments: ${req.attachments.length}`);
  }
}

main()
  .catch((error) => {
    console.error('FAILED:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
