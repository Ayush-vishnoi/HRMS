import { db } from '../src/lib/db';
import { GET as payrollGet } from '../src/app/api/payroll/route';
import { GET as performanceGet, POST as performancePost, PATCH as performancePatch } from '../src/app/api/performance/route';
import { GET as documentsGet, POST as documentsPost } from '../src/app/api/documents/route';
import { GET as myTeamGet, PATCH as myTeamPatch } from '../src/app/api/my-team/route';
import { GET as analyticsGet } from '../src/app/api/analytics/route';

function createMockRequest(url: string, method = 'GET', body?: any): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function verify5Modules() {
  console.log('========================================================================');
  console.log('VERIFYING 5 NEWLY CONNECTED MODULES (DATABASE-BACKED)');
  console.log('========================================================================\n');

  const results: Record<string, { api: boolean; dbStored: boolean; dbVerified: boolean; readPersists: boolean; status: string; details?: string }> = {};

  // 1. PAYROLL
  console.log('1. Testing Payroll & Payslips Module...');
  try {
    const res = await payrollGet(createMockRequest('http://localhost:3000/api/payroll?employeeId=EMP-001&role=employee'));
    const json = await res.json();
    const payslips = json.data?.payslips || [];
    const dbCount = await db.payslip.count({ where: { employeeId: 'EMP-001' } });
    const apiSuccess = json.success && payslips.length > 0;
    const dbStored = dbCount > 0;
    const dbVerified = payslips.length === dbCount;

    results['Payroll'] = {
      api: apiSuccess,
      dbStored,
      dbVerified,
      readPersists: payslips.length > 0 && typeof json.data.annualCtc === 'number',
      status: apiSuccess && dbStored && dbVerified ? 'PASS' : 'FAIL',
      details: `Retrieved ${payslips.length} payslips for EMP-001 (Annual CTC: ₹${json.data?.annualCtc})`,
    };
    console.log('   Payroll Result:', results['Payroll']);
  } catch (err) {
    console.error('   Payroll Error:', err);
    results['Payroll'] = { api: false, dbStored: false, dbVerified: false, readPersists: false, status: 'FAIL' };
  }

  // 2. KRAs / PERFORMANCE
  console.log('\n2. Testing Performance / KRAs Module...');
  try {
    // 2a. Fetch existing KRAs
    const getRes1 = await performanceGet(createMockRequest('http://localhost:3000/api/performance?employeeId=EMP-001&role=employee'));
    const getJson1 = await getRes1.json();
    const initialCount = getJson1.data?.length || 0;

    // 2b. Assign new KRA (POST)
    const postRes = await performancePost(createMockRequest('http://localhost:3000/api/performance', 'POST', {
      title: 'Implement Database Resilience Tests',
      description: 'Create automated stress and failover test suites for PostgreSQL.',
      keyResult: 'Zero data loss with p99 latency < 50ms.',
      category: 'Engineering Excellence',
      assignedToId: 'EMP-001',
      assignedById: 'EMP-002',
      dueDate: '25 Aug 2026',
      priority: 'High',
      weightage: 25,
    }));
    const postJson = await postRes.json();
    const createdKraId = postJson.data?.id;

    // 2c. Update Progress (PATCH)
    let patchSuccess = false;
    if (createdKraId) {
      const patchRes = await performancePatch(createMockRequest('http://localhost:3000/api/performance', 'PATCH', {
        id: createdKraId,
        progress: 85,
        status: 'In Progress',
        lastUpdate: 'Test harness completed, benchmarking under 100 concurrent workers.',
      }));
      const patchJson = await patchRes.json();
      patchSuccess = patchJson.success && patchJson.data?.progress === 85;
    }

    // 2d. Verify DB Record
    const dbKra = await db.performanceKra.findUnique({ where: { id: createdKraId } });
    const dbStored = Boolean(dbKra);
    const dbVerified = dbKra?.progress === 85 && dbKra?.assignedToId === 'EMP-001';

    results['Performance / KRAs'] = {
      api: postJson.success && patchSuccess,
      dbStored,
      dbVerified,
      readPersists: dbStored && dbVerified,
      status: postJson.success && patchSuccess && dbStored && dbVerified ? 'PASS' : 'FAIL',
      details: `Created and updated KRA ${createdKraId} in PostgreSQL`,
    };
    console.log('   KRAs Result:', results['Performance / KRAs']);
  } catch (err) {
    console.error('   Performance / KRAs Error:', err);
    results['Performance / KRAs'] = { api: false, dbStored: false, dbVerified: false, readPersists: false, status: 'FAIL' };
  }

  // 3. EMPLOYEE DOCUMENTS
  console.log('\n3. Testing Documents & Requests Module...');
  try {
    // 3a. Upload document
    const uploadRes = await documentsPost(createMockRequest('http://localhost:3000/api/documents', 'POST', {
      action: 'upload',
      employeeId: 'EMP-001',
      name: 'PostgreSQL Certification 2026.pdf',
      type: 'Education Certificate',
      size: '2.4 MB',
      note: 'Certified PostgreSQL Administrator qualification.',
    }));
    const uploadJson = await uploadRes.json();
    const docId = uploadJson.data?.id;

    // 3b. Request document
    const reqRes = await documentsPost(createMockRequest('http://localhost:3000/api/documents', 'POST', {
      action: 'request',
      employeeId: 'EMP-001',
      documentType: 'Salary Certificate for Visa',
      reason: 'Needed for travel visa application.',
    }));
    const reqJson = await reqRes.json();
    const reqId = reqJson.data?.id;

    // 3c. Verify in DB
    const dbDoc = await db.employeeDocument.findUnique({ where: { id: docId } });
    const dbReq = await db.documentRequest.findUnique({ where: { id: reqId } });
    const dbStored = Boolean(dbDoc) && Boolean(dbReq);

    // 3d. Fetch via GET
    const getRes = await documentsGet(createMockRequest('http://localhost:3000/api/documents?employeeId=EMP-001&role=employee'));
    const getJson = await getRes.json();
    const readPersists = getJson.data?.documents?.some((d: any) => d.id === docId) &&
                         getJson.data?.requests?.some((r: any) => r.id === reqId);

    results['Employee Documents'] = {
      api: uploadJson.success && reqJson.success,
      dbStored,
      dbVerified: dbDoc?.name === 'PostgreSQL Certification 2026.pdf' && dbReq?.documentType === 'Salary Certificate for Visa',
      readPersists,
      status: uploadJson.success && reqJson.success && dbStored && readPersists ? 'PASS' : 'FAIL',
      details: `Created doc ${docId} and request ${reqId} in PostgreSQL`,
    };
    console.log('   Documents Result:', results['Employee Documents']);
  } catch (err) {
    console.error('   Documents Error:', err);
    results['Employee Documents'] = { api: false, dbStored: false, dbVerified: false, readPersists: false, status: 'FAIL' };
  }

  // 4. MY TEAM
  console.log('\n4. Testing My Team Module...');
  try {
    const getRes = await myTeamGet(createMockRequest('http://localhost:3000/api/my-team?managerId=EMP-002'));
    const getJson = await getRes.json();
    const teams = getJson.data || [];

    // Save note via PATCH
    const patchRes = await myTeamPatch(createMockRequest('http://localhost:3000/api/my-team', 'PATCH', {
      employeeId: 'EMP-003',
      managerId: 'EMP-002',
      notes: 'Reviewed Q3 architecture milestones and platform security checklist.',
    }));
    const patchJson = await patchRes.json();

    const dbMeta = await db.teamMemberMetadata.findUnique({
      where: {
        employeeId_managerId: {
          employeeId: 'EMP-003',
          managerId: 'EMP-002',
        },
      },
    });

    const dbStored = teams.length > 0 && Boolean(dbMeta);
    const dbVerified = dbMeta?.notes === 'Reviewed Q3 architecture milestones and platform security checklist.';

    results['My Team'] = {
      api: getJson.success && patchJson.success,
      dbStored,
      dbVerified,
      readPersists: teams.length > 0,
      status: getJson.success && patchJson.success && dbStored && dbVerified ? 'PASS' : 'FAIL',
      details: `Retrieved ${teams.length} managed teams and updated metadata for EMP-003 in PostgreSQL`,
    };
    console.log('   My Team Result:', results['My Team']);
  } catch (err) {
    console.error('   My Team Error:', err);
    results['My Team'] = { api: false, dbStored: false, dbVerified: false, readPersists: false, status: 'FAIL' };
  }

  // 5. ANALYTICS
  console.log('\n5. Testing Analytics Module...');
  try {
    const getRes = await analyticsGet();
    const getJson = await getRes.json();
    const data = getJson.data;

    const actualCount = await db.employee.count();
    const apiSuccess = getJson.success && typeof data.totalHeadcount === 'number';
    const dbStored = actualCount > 0;
    const dbVerified = data.totalHeadcount === actualCount && Array.isArray(data.recruitmentPipeline);

    results['Analytics'] = {
      api: apiSuccess,
      dbStored,
      dbVerified,
      readPersists: apiSuccess && dbVerified,
      status: apiSuccess && dbStored && dbVerified ? 'PASS' : 'FAIL',
      details: `Live Headcount: ${data.totalHeadcount}, Open HR Actions: ${data.openHrActions}, Attendance Rate: ${data.attendanceRate}`,
    };
    console.log('   Analytics Result:', results['Analytics']);
  } catch (err) {
    console.error('   Analytics Error:', err);
    results['Analytics'] = { api: false, dbStored: false, dbVerified: false, readPersists: false, status: 'FAIL' };
  }

  await db.$disconnect();

  console.log('\n========================================================================');
  console.log('5 MODULES VERIFICATION SUMMARY');
  console.log('========================================================================');
  console.table(results);
}

verify5Modules();
