import { PrismaClient } from '@prisma/client';
import { POST as createEmployeeApi, GET as getEmployeesApi } from '../src/app/api/employees/route';
import { POST as createAttendanceApi, GET as getAttendanceApi } from '../src/app/api/attendance/route';
import { POST as createLeaveApi, GET as getLeavesApi, PATCH as updateLeaveApi } from '../src/app/api/leaves/route';
import { POST as createAssetApi, GET as getAssetsApi, PATCH as updateAssetApi } from '../src/app/api/assets/route';
import { POST as createHelpDeskApi, GET as getHelpDeskApi, PATCH as updateHelpDeskApi } from '../src/app/api/help-desk/route';
import { POST as createPolicyApi, GET as getPoliciesApi } from '../src/app/api/policies/route';
import { POST as createRecruitmentJobApi, GET as getRecruitmentApi, PATCH as updateCandidateStageApi } from '../src/app/api/recruitment/route';

const db = new PrismaClient();

function createMockRequest(url: string, method: string, body?: any): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function runStorageVerification() {
  console.log('================================================================');
  console.log('STARTING BACKEND API & REAL DATABASE PERSISTENCE TESTS');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // TEST 1: EMPLOYEES
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Employees API & DB Storage ---');
  const uniqueEmployeeEmail = `db-test-${Date.now()}@example.com`;
  const employeePayload = {
    name: 'DB Test Employee 001',
    email: uniqueEmployeeEmail,
    roleTitle: 'Senior Test Engineer',
    department: 'Engineering',
    phone: '+91 99999 11111',
    location: 'Bengaluru HQ',
    salary: 1500000,
    managerId: 'EMP-002',
    userRole: 'employee',
    status: 'Active',
  };

  try {
    const res = await createEmployeeApi(createMockRequest('http://localhost:3000/api/employees', 'POST', employeePayload));
    const json = await res.json();
    console.log('API POST Response:', json);

    // Direct DB Check
    const dbRecord = await db.employee.findUnique({
      where: { email: uniqueEmployeeEmail },
    });
    console.log('Direct DB Query Result for Employee:', dbRecord);

    // Read back via GET API
    const getRes = await getEmployeesApi();
    const getJson = await getRes.json();
    const foundInApi = getJson.data?.some((e: any) => e.email === uniqueEmployeeEmail);
    console.log('Found in GET /api/employees:', foundInApi);
  } catch (err) {
    console.error('Error in Employee test:', err);
  }

  // --------------------------------------------------------------------------
  // TEST 2: ATTENDANCE
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Attendance API & DB Storage ---');
  const attendancePayload = {
    employeeId: 'EMP-001',
    date: '2026-08-13',
    checkIn: '09:15 AM',
    checkOut: '06:15 PM',
    hoursWorked: '9h 0m',
    status: 'On Time', // Notice schema enum mapping vs API route logic
    location: 'Office - HQ',
  };

  try {
    const res = await createAttendanceApi(createMockRequest('http://localhost:3000/api/attendance', 'POST', attendancePayload));
    const json = await res.json();
    console.log('Attendance API POST Response:', json);

    if (json.data?.id) {
      const dbRecord = await db.attendanceRecord.findUnique({
        where: { id: json.data.id },
      });
      console.log('Direct DB Query for Attendance:', dbRecord);
    }
  } catch (err) {
    console.error('Error in Attendance test:', err);
  }

  // --------------------------------------------------------------------------
  // TEST 3: LEAVES (CREATE, READ, UPDATE)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Leaves API & DB Storage ---');
  const leavePayload = {
    employeeId: 'EMP-001',
    leaveType: 'Sick',
    startDate: '2026-08-20',
    endDate: '2026-08-21',
    days: 2,
    reason: 'Medical checkup and recovery',
  };

  let createdLeaveId = '';
  try {
    const res = await createLeaveApi(createMockRequest('http://localhost:3000/api/leaves', 'POST', leavePayload));
    const json = await res.json();
    console.log('Leave API POST Response:', json);
    createdLeaveId = json.data?.id;

    if (createdLeaveId) {
      // DB Check
      const dbRecord = await db.leaveRequest.findUnique({
        where: { id: createdLeaveId },
      });
      console.log('Direct DB Query for Leave Request:', dbRecord);

      // Update via PATCH
      const patchRes = await updateLeaveApi(createMockRequest('http://localhost:3000/api/leaves', 'PATCH', {
        id: createdLeaveId,
        status: 'Approved',
        reviewerId: 'EMP-002',
      }));
      const patchJson = await patchRes.json();
      console.log('Leave API PATCH Response:', patchJson);

      // Verify DB updated
      const updatedDbRecord = await db.leaveRequest.findUnique({
        where: { id: createdLeaveId },
      });
      console.log('Direct DB Query after PATCH (Approved):', updatedDbRecord);
    }
  } catch (err) {
    console.error('Error in Leaves test:', err);
  }

  // --------------------------------------------------------------------------
  // TEST 4: ASSETS (CREATE, READ, UPDATE)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: Assets API & DB Storage ---');
  const assetPayload = {
    category: 'Laptop',
    name: 'Dell XPS 15 9530',
    brand: 'Dell',
    model: 'Core i7 / 32GB / 1TB SSD',
    serialNumber: `SN-TEST-${Date.now()}`,
    purchaseDate: '13 Aug 2026',
    purchaseCost: '₹1,65,000',
    warrantyUntil: '12 Aug 2029',
    status: 'Available',
    location: 'Bengaluru Office',
    condition: 'New',
    notes: 'Test inventory unit',
  };

  let createdAssetId = '';
  try {
    const res = await createAssetApi(createMockRequest('http://localhost:3000/api/assets', 'POST', assetPayload));
    const json = await res.json();
    console.log('Asset API POST Response:', json);
    createdAssetId = json.data?.id;

    if (createdAssetId) {
      // DB Check
      const dbRecord = await db.asset.findUnique({
        where: { id: createdAssetId },
      });
      console.log('Direct DB Query for Asset:', dbRecord);

      // Update via PATCH (Assign to employee)
      const patchRes = await updateAssetApi(createMockRequest('http://localhost:3000/api/assets', 'PATCH', {
        id: createdAssetId,
        status: 'Assigned',
        assignedToId: 'EMP-001',
      }));
      const patchJson = await patchRes.json();
      console.log('Asset API PATCH Response:', patchJson);

      const updatedDbRecord = await db.asset.findUnique({
        where: { id: createdAssetId },
        include: { assignedTo: true },
      });
      console.log('Direct DB Query after PATCH (Assigned):', updatedDbRecord);
    }
  } catch (err) {
    console.error('Error in Assets test:', err);
  }

  // --------------------------------------------------------------------------
  // TEST 5: HELP DESK / GRIEVANCES (CREATE, READ, UPDATE)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: Help Desk & Grievances API & DB Storage ---');
  const ticketPayload = {
    employeeId: 'EMP-001',
    category: 'Payroll',
    priority: 'High',
    subject: 'Discrepancy in August Conveyance Allowance',
    description: 'The conveyance allowance is missing from the recent payslip generation.',
  };

  let createdTicketId = '';
  try {
    const res = await createHelpDeskApi(createMockRequest('http://localhost:3000/api/help-desk', 'POST', ticketPayload));
    const json = await res.json();
    console.log('Help Desk API POST Response:', json);
    createdTicketId = json.data?.id;

    if (createdTicketId) {
      const dbRecord = await db.helpDeskTicket.findUnique({
        where: { id: createdTicketId },
      });
      console.log('Direct DB Query for Ticket:', dbRecord);

      // Update / Resolve
      const patchRes = await updateHelpDeskApi(createMockRequest('http://localhost:3000/api/help-desk', 'PATCH', {
        id: createdTicketId,
        status: 'Resolved',
        resolution: 'Conveyance allowance adjusted and credited.',
        resolvedById: 'EMP-006',
      }));
      const patchJson = await patchRes.json();
      console.log('Help Desk API PATCH Response:', patchJson);

      const updatedDbRecord = await db.helpDeskTicket.findUnique({
        where: { id: createdTicketId },
      });
      console.log('Direct DB Query after PATCH (Resolved):', updatedDbRecord);
    }
  } catch (err) {
    console.error('Error in Help Desk test:', err);
  }

  // --------------------------------------------------------------------------
  // TEST 6: POLICIES & ACKNOWLEDGEMENT (CREATE, ACKNOWLEDGE, READ)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: Policies API & DB Storage ---');
  const policyPayload = {
    title: 'AI & Data Ethics Policy 2026',
    summary: 'Guidelines for responsible use of AI tools and handling proprietary code and datasets.',
    category: 'Information Security',
    version: 'v1.0',
    effectiveDate: '15 Aug 2026',
    uploadedById: 'EMP-006',
    mandatory: true,
    acknowledgementRequired: true,
    fileName: 'ai-data-ethics-policy-2026.pdf',
    fileSize: '1.4 MB',
  };

  let createdPolicyId = '';
  try {
    const res = await createPolicyApi(createMockRequest('http://localhost:3000/api/policies', 'POST', policyPayload));
    const json = await res.json();
    console.log('Policy API POST Response:', json);
    createdPolicyId = json.data?.id;

    if (createdPolicyId) {
      const dbRecord = await db.companyPolicy.findUnique({
        where: { id: createdPolicyId },
      });
      console.log('Direct DB Query for Policy:', dbRecord);

      // Acknowledge policy
      const ackRes = await createPolicyApi(createMockRequest('http://localhost:3000/api/policies', 'POST', {
        action: 'acknowledge',
        policyId: createdPolicyId,
        employeeId: 'EMP-001',
      }));
      const ackJson = await ackRes.json();
      console.log('Policy Ack API POST Response:', ackJson);

      const dbAck = await db.policyAcknowledgement.findUnique({
        where: {
          policyId_employeeId: {
            policyId: createdPolicyId,
            employeeId: 'EMP-001',
          },
        },
      });
      console.log('Direct DB Query for Policy Acknowledgement:', dbAck);
    }
  } catch (err) {
    console.error('Error in Policies test:', err);
  }

  // --------------------------------------------------------------------------
  // TEST 7: RECRUITMENT (JOBS & CANDIDATES)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: Recruitment API & DB Storage ---');
  const jobPayload = {
    title: 'Senior DevOps / SRE Engineer',
    department: 'Engineering',
    location: 'Bengaluru / Hybrid',
    employmentType: 'Full-time',
    openings: 2,
    description: 'Manage cloud infrastructure, CI/CD pipelines, and observability.',
    requirements: ['AWS', 'Kubernetes', 'Terraform', 'PostgreSQL', 'Docker'],
  };

  let createdJobId = '';
  try {
    const res = await createRecruitmentJobApi(createMockRequest('http://localhost:3000/api/recruitment', 'POST', jobPayload));
    const json = await res.json();
    console.log('Recruitment Job API POST Response:', json);
    createdJobId = json.data?.id;

    if (createdJobId) {
      const dbRecord = await db.recruitmentJob.findUnique({
        where: { id: createdJobId },
      });
      console.log('Direct DB Query for Job:', dbRecord);
    }

    // Update candidate stage (using existing seed candidate CAN-001)
    const patchRes = await updateCandidateStageApi(createMockRequest('http://localhost:3000/api/recruitment', 'PATCH', {
      candidateId: 'CAN-001',
      stage: 'Shortlisted',
    }));
    const patchJson = await patchRes.json();
    console.log('Candidate Stage API PATCH Response:', patchJson);

    const updatedCandidate = await db.recruitmentCandidate.findUnique({
      where: { id: 'CAN-001' },
    });
    console.log('Direct DB Query for Candidate CAN-001 Stage:', updatedCandidate?.stage);
  } catch (err) {
    console.error('Error in Recruitment test:', err);
  }

  await db.$disconnect();
  console.log('\n================================================================');
  console.log('ALL REAL STORAGE TESTS FINISHED');
  console.log('================================================================');
}

runStorageVerification();
