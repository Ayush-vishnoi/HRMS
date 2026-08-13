import { PrismaClient } from '@prisma/client';
import { POST as employeePost, GET as employeeGet } from '../src/app/api/employees/route';
import { POST as attendancePost, GET as attendanceGet, PATCH as attendancePatch } from '../src/app/api/attendance/route';
import { POST as leavePost, GET as leaveGet, PATCH as leavePatch } from '../src/app/api/leaves/route';
import { POST as assetPost, GET as assetGet, PATCH as assetPatch } from '../src/app/api/assets/route';
import { POST as helpDeskPost, GET as helpDeskGet, PATCH as helpDeskPatch } from '../src/app/api/help-desk/route';
import { POST as policyPost, GET as policyGet } from '../src/app/api/policies/route';
import { POST as recruitmentPost, GET as recruitmentGet, PATCH as recruitmentPatch } from '../src/app/api/recruitment/route';
import { POST as meetingPost, GET as meetingGet, PATCH as meetingPatch } from '../src/app/api/meetings/route';

const db = new PrismaClient();

function createMockRequest(url: string, method: string, body?: any): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function runEndToEndVerification() {
  console.log('========================================================================');
  console.log('COMPLETE END-TO-END DATABASE PERSISTENCE VERIFICATION');
  console.log('========================================================================\n');

  const results: Record<string, { api: boolean; dbStored: boolean; dbVerified: boolean; readPersists: boolean; update?: boolean; status: string }> = {};

  // --------------------------------------------------------------------------
  // 1. EMPLOYEES
  // --------------------------------------------------------------------------
  console.log('1. Testing Employee Onboarding...');
  const testEmpEmail = `persisted-emp-${Date.now()}@company.com`;
  const empPayload = {
    name: 'Persisted Test Employee',
    email: testEmpEmail,
    roleTitle: 'FullStack Cloud Engineer',
    department: 'Engineering',
    phone: '+91 91234 56789',
    location: 'Bengaluru HQ',
    salary: 2200000,
    managerId: 'EMP-002',
    userRole: 'employee',
  };

  try {
    const postRes = await employeePost(createMockRequest('http://localhost:3000/api/employees', 'POST', empPayload));
    const postJson = await postRes.json();
    const apiSuccess = postJson.success === true && Boolean(postJson.data?.id);

    const dbRecord = await db.employee.findUnique({ where: { email: testEmpEmail } });
    const dbStored = Boolean(dbRecord);

    const getRes = await employeeGet();
    const getJson = await getRes.json();
    const readPersists = getJson.data?.some((e: any) => e.email === testEmpEmail);

    results['Employee Onboarding'] = {
      api: apiSuccess,
      dbStored,
      dbVerified: dbStored && dbRecord?.name === empPayload.name,
      readPersists,
      status: apiSuccess && dbStored && readPersists ? 'PASS' : 'FAIL',
    };
    console.log('   Result:', results['Employee Onboarding']);
  } catch (err) {
    console.error('   Employee Test Error:', err);
    results['Employee Onboarding'] = { api: false, dbStored: false, dbVerified: false, readPersists: false, status: 'FAIL' };
  }

  // --------------------------------------------------------------------------
  // 2. ATTENDANCE
  // --------------------------------------------------------------------------
  console.log('\n2. Testing Attendance Punch In / Out...');
  const testAttDate = '2026-08-14';
  const attPayload = {
    employeeId: 'EMP-001',
    date: testAttDate,
    checkIn: '09:05 AM',
    status: 'On Time',
    location: 'Bengaluru HQ',
  };

  try {
    const postRes = await attendancePost(createMockRequest('http://localhost:3000/api/attendance', 'POST', attPayload));
    const postJson = await postRes.json();
    const createdId = postJson.data?.id;
    const apiSuccess = postJson.success === true && Boolean(createdId);

    const dbRecord = await db.attendanceRecord.findUnique({ where: { id: createdId } });
    const dbStored = Boolean(dbRecord);

    // Test Clock Out (PATCH)
    let updateSuccess = false;
    if (createdId) {
      const patchRes = await attendancePatch(createMockRequest('http://localhost:3000/api/attendance', 'PATCH', {
        id: createdId,
        checkOut: '06:05 PM',
        hoursWorked: '9h 0m',
      }));
      const patchJson = await patchRes.json();
      const updatedDb = await db.attendanceRecord.findUnique({ where: { id: createdId } });
      updateSuccess = patchJson.success && updatedDb?.checkOut === '06:05 PM';
    }

    const getRes = await attendanceGet(createMockRequest(`http://localhost:3000/api/attendance?employeeId=EMP-001`, 'GET'));
    const getJson = await getRes.json();
    const readPersists = getJson.data?.some((a: any) => a.id === createdId);

    results['Attendance Management'] = {
      api: apiSuccess,
      dbStored,
      dbVerified: dbStored && dbRecord?.checkIn === '09:05 AM',
      readPersists,
      update: updateSuccess,
      status: apiSuccess && dbStored && readPersists && updateSuccess ? 'PASS' : 'FAIL',
    };
    console.log('   Result:', results['Attendance Management']);
  } catch (err) {
    console.error('   Attendance Test Error:', err);
    results['Attendance Management'] = { api: false, dbStored: false, dbVerified: false, readPersists: false, status: 'FAIL' };
  }

  // --------------------------------------------------------------------------
  // 3. LEAVE MANAGEMENT (CREATE, READ, UPDATE)
  // --------------------------------------------------------------------------
  console.log('\n3. Testing Leave Management (Create & Approve)...');
  const leavePayload = {
    employeeId: 'EMP-001',
    leaveType: 'Earned',
    startDate: '2026-09-01',
    endDate: '2026-09-05',
    days: 5,
    reason: 'Annual family festival trip',
  };

  try {
    const postRes = await leavePost(createMockRequest('http://localhost:3000/api/leaves', 'POST', leavePayload));
    const postJson = await postRes.json();
    const leaveId = postJson.data?.id;
    const apiSuccess = postJson.success === true && Boolean(leaveId);

    const dbRecord = await db.leaveRequest.findUnique({ where: { id: leaveId } });
    const dbStored = Boolean(dbRecord);

    // Approve leave (PATCH)
    let updateSuccess = false;
    if (leaveId) {
      const patchRes = await leavePatch(createMockRequest('http://localhost:3000/api/leaves', 'PATCH', {
        id: leaveId,
        status: 'Approved',
        reviewerId: 'EMP-002',
      }));
      const patchJson = await patchRes.json();
      const updatedDb = await db.leaveRequest.findUnique({ where: { id: leaveId } });
      updateSuccess = patchJson.success && updatedDb?.status === 'Approved' && updatedDb?.reviewerId === 'EMP-002';
    }

    const getRes = await leaveGet(createMockRequest('http://localhost:3000/api/leaves', 'GET'));
    const getJson = await getRes.json();
    const readPersists = getJson.data?.requests?.some((r: any) => r.id === leaveId);

    results['Leave Management'] = {
      api: apiSuccess,
      dbStored,
      dbVerified: dbStored && dbRecord?.days === 5,
      readPersists,
      update: updateSuccess,
      status: apiSuccess && dbStored && readPersists && updateSuccess ? 'PASS' : 'FAIL',
    };
    console.log('   Result:', results['Leave Management']);
  } catch (err) {
    console.error('   Leave Test Error:', err);
    results['Leave Management'] = { api: false, dbStored: false, dbVerified: false, readPersists: false, status: 'FAIL' };
  }

  // --------------------------------------------------------------------------
  // 4. ASSETS (CREATE, READ, UPDATE/ASSIGN)
  // --------------------------------------------------------------------------
  console.log('\n4. Testing Assets & Device Inventory...');
  const uniqueSerial = `SN-E2E-${Date.now()}`;
  const assetPayload = {
    name: 'MacBook Air M3 15-inch',
    category: 'Laptop',
    brand: 'Apple',
    model: '16GB / 512GB / Midnight',
    serialNumber: uniqueSerial,
    warrantyUntil: '15 Aug 2029',
    purchaseCost: '₹1,34,900',
    location: 'Bengaluru Office',
    status: 'Available',
    condition: 'New',
  };

  try {
    const postRes = await assetPost(createMockRequest('http://localhost:3000/api/assets', 'POST', assetPayload));
    const postJson = await postRes.json();
    const assetId = postJson.data?.id;
    const apiSuccess = postJson.success === true && Boolean(assetId);

    const dbRecord = await db.asset.findUnique({ where: { serialNumber: uniqueSerial } });
    const dbStored = Boolean(dbRecord);

    // Assign to Employee (PATCH)
    let updateSuccess = false;
    if (assetId) {
      const patchRes = await assetPatch(createMockRequest('http://localhost:3000/api/assets', 'PATCH', {
        id: assetId,
        status: 'Assigned',
        assignedToId: 'EMP-001',
      }));
      const patchJson = await patchRes.json();
      const updatedDb = await db.asset.findUnique({ where: { id: assetId } });
      updateSuccess = patchJson.success && updatedDb?.status === 'Assigned' && updatedDb?.assignedToId === 'EMP-001';
    }

    const getRes = await assetGet();
    const getJson = await getRes.json();
    const readPersists = getJson.data?.some((a: any) => a.id === assetId);

    results['Assets & Inventory'] = {
      api: apiSuccess,
      dbStored,
      dbVerified: dbStored && dbRecord?.brand === 'Apple',
      readPersists,
      update: updateSuccess,
      status: apiSuccess && dbStored && readPersists && updateSuccess ? 'PASS' : 'FAIL',
    };
    console.log('   Result:', results['Assets & Inventory']);
  } catch (err) {
    console.error('   Assets Test Error:', err);
    results['Assets & Inventory'] = { api: false, dbStored: false, dbVerified: false, readPersists: false, status: 'FAIL' };
  }

  // --------------------------------------------------------------------------
  // 5. HELP DESK & GRIEVANCES (CREATE, READ, UPDATE/RESOLVE)
  // --------------------------------------------------------------------------
  console.log('\n5. Testing Help Desk & Grievance Box...');
  const ticketPayload = {
    employeeId: 'EMP-001',
    category: 'Grievance / Complaint',
    priority: 'High',
    subject: 'Request for ergonomic desk adjustment',
    description: 'Workstation lumbar support and monitor stand required as per doctor recommendation.',
  };

  try {
    const postRes = await helpDeskPost(createMockRequest('http://localhost:3000/api/help-desk', 'POST', ticketPayload));
    const postJson = await postRes.json();
    const ticketId = postJson.data?.id;
    const apiSuccess = postJson.success === true && Boolean(ticketId);

    const dbRecord = await db.helpDeskTicket.findUnique({ where: { id: ticketId } });
    const dbStored = Boolean(dbRecord);

    // Resolve ticket (PATCH)
    let updateSuccess = false;
    if (ticketId) {
      const patchRes = await helpDeskPatch(createMockRequest('http://localhost:3000/api/help-desk', 'PATCH', {
        id: ticketId,
        status: 'Resolved',
        resolution: 'Ergonomic chair and adjustable arm provided by Facilities team.',
        resolvedById: 'EMP-006',
      }));
      const patchJson = await patchRes.json();
      const updatedDb = await db.helpDeskTicket.findUnique({ where: { id: ticketId } });
      updateSuccess = patchJson.success && updatedDb?.status === 'Resolved' && updatedDb?.resolvedById === 'EMP-006';
    }

    const getRes = await helpDeskGet(createMockRequest('http://localhost:3000/api/help-desk', 'GET'));
    const getJson = await getRes.json();
    const readPersists = getJson.data?.some((t: any) => t.id === ticketId);

    results['Help Desk & Grievances'] = {
      api: apiSuccess,
      dbStored,
      dbVerified: dbStored && dbRecord?.subject === ticketPayload.subject,
      readPersists,
      update: updateSuccess,
      status: apiSuccess && dbStored && readPersists && updateSuccess ? 'PASS' : 'FAIL',
    };
    console.log('   Result:', results['Help Desk & Grievances']);
  } catch (err) {
    console.error('   Help Desk Test Error:', err);
    results['Help Desk & Grievances'] = { api: false, dbStored: false, dbVerified: false, readPersists: false, status: 'FAIL' };
  }

  // --------------------------------------------------------------------------
  // 6. POLICIES & ACKNOWLEDGEMENT
  // --------------------------------------------------------------------------
  console.log('\n6. Testing Policies & Acknowledgements...');
  const policyPayload = {
    title: 'Remote Work Security Standard 2026',
    summary: 'Guidelines for VPN use, public Wi-Fi safety, and disk encryption.',
    category: 'Information Security',
    version: 'v2.1',
    effectiveDate: '15 Aug 2026',
    uploadedById: 'EMP-006',
    mandatory: true,
    acknowledgementRequired: true,
    fileName: 'remote-work-security-v2.1.pdf',
    fileSize: '1.6 MB',
  };

  try {
    const postRes = await policyPost(createMockRequest('http://localhost:3000/api/policies', 'POST', policyPayload));
    const postJson = await postRes.json();
    const policyId = postJson.data?.id;
    const apiSuccess = postJson.success === true && Boolean(policyId);

    const dbRecord = await db.companyPolicy.findUnique({ where: { id: policyId } });
    const dbStored = Boolean(dbRecord);

    // Acknowledge policy
    let ackSuccess = false;
    if (policyId) {
      const ackRes = await policyPost(createMockRequest('http://localhost:3000/api/policies', 'POST', {
        action: 'acknowledge',
        policyId,
        employeeId: 'EMP-001',
      }));
      const ackJson = await ackRes.json();
      const dbAck = await db.policyAcknowledgement.findUnique({
        where: {
          policyId_employeeId: { policyId, employeeId: 'EMP-001' },
        },
      });
      ackSuccess = ackJson.success && Boolean(dbAck);
    }

    const getRes = await policyGet(createMockRequest(`http://localhost:3000/api/policies?employeeId=EMP-001`, 'GET'));
    const getJson = await getRes.json();
    const readPersists = getJson.data?.some((p: any) => p.id === policyId);

    results['Company Policies & Acknowledgements'] = {
      api: apiSuccess,
      dbStored,
      dbVerified: dbStored && dbRecord?.title === policyPayload.title,
      readPersists,
      update: ackSuccess,
      status: apiSuccess && dbStored && readPersists && ackSuccess ? 'PASS' : 'FAIL',
    };
    console.log('   Result:', results['Company Policies & Acknowledgements']);
  } catch (err) {
    console.error('   Policies Test Error:', err);
    results['Company Policies & Acknowledgements'] = { api: false, dbStored: false, dbVerified: false, readPersists: false, status: 'FAIL' };
  }

  // --------------------------------------------------------------------------
  // 7. RECRUITMENT (JOBS & CANDIDATE STAGES)
  // --------------------------------------------------------------------------
  console.log('\n7. Testing Recruitment Jobs & Candidate Stage Moves...');
  const jobPayload = {
    title: 'Cloud Security Architect',
    department: 'Engineering',
    location: 'Bengaluru / Hybrid',
    employmentType: 'Full-time',
    openings: 1,
    description: 'Lead identity, zero-trust network, and infrastructure security.',
    requirements: ['AWS', 'IAM', 'SOC2', 'Kubernetes Security'],
  };

  try {
    const postRes = await recruitmentPost(createMockRequest('http://localhost:3000/api/recruitment', 'POST', jobPayload));
    const postJson = await postRes.json();
    const jobId = postJson.data?.id;
    const apiSuccess = postJson.success === true && Boolean(jobId);

    const dbRecord = await db.recruitmentJob.findUnique({ where: { id: jobId } });
    const dbStored = Boolean(dbRecord);

    // Update candidate stage (PATCH)
    let stageSuccess = false;
    const patchRes = await recruitmentPatch(createMockRequest('http://localhost:3000/api/recruitment', 'PATCH', {
      candidateId: 'CAN-002',
      stage: 'Shortlisted',
    }));
    const patchJson = await patchRes.json();
    const updatedCandidate = await db.recruitmentCandidate.findUnique({ where: { id: 'CAN-002' } });
    stageSuccess = patchJson.success && updatedCandidate?.stage === 'Shortlisted';

    const getRes = await recruitmentGet();
    const getJson = await getRes.json();
    const readPersists = getJson.data?.jobs?.some((j: any) => j.id === jobId);

    results['Recruitment Management'] = {
      api: apiSuccess,
      dbStored,
      dbVerified: dbStored && dbRecord?.title === jobPayload.title,
      readPersists,
      update: stageSuccess,
      status: apiSuccess && dbStored && readPersists && stageSuccess ? 'PASS' : 'FAIL',
    };
    console.log('   Result:', results['Recruitment Management']);
  } catch (err) {
    console.error('   Recruitment Test Error:', err);
    results['Recruitment Management'] = { api: false, dbStored: false, dbVerified: false, readPersists: false, status: 'FAIL' };
  }

  // --------------------------------------------------------------------------
  // 8. MEETINGS & ATTENDEES (CREATE, RSVP, RETRIEVE)
  // --------------------------------------------------------------------------
  console.log('\n8. Testing Meetings & RSVP Scheduler...');
  const meetingPayload = {
    title: 'Architecture Review: Postgres Storage Engine',
    type: 'TEAM',
    description: 'Review database indexes, connection pooling, and latency metrics.',
    startsAt: '2026-08-16T11:00:00.000Z',
    endsAt: '2026-08-16T12:00:00.000Z',
    allDay: false,
    location: 'Bengaluru HQ, Room 4',
    videoLink: 'https://meet.company.com/arch-review',
    organizerId: 'EMP-001',
    attendeeIds: ['EMP-001', 'EMP-002', 'EMP-003'],
    department: 'Engineering',
    recurrence: 'NONE',
    reminderMinutes: 15,
  };

  try {
    const postRes = await meetingPost(createMockRequest('http://localhost:3000/api/meetings', 'POST', meetingPayload));
    const postJson = await postRes.json();
    const meetingId = postJson.data?.id;
    const apiSuccess = postJson.success === true && Boolean(meetingId);

    const dbRecord = await db.meeting.findUnique({
      where: { id: meetingId },
      include: { attendees: true },
    });
    const dbStored = Boolean(dbRecord) && dbRecord?.attendees.length === 3;

    // Update RSVP (PATCH)
    let rsvpSuccess = false;
    if (meetingId) {
      const patchRes = await meetingPatch(createMockRequest('http://localhost:3000/api/meetings', 'PATCH', {
        id: meetingId,
        action: 'rsvp',
        employeeId: 'EMP-002',
        rsvp: 'ACCEPTED',
      }));
      const patchJson = await patchRes.json();
      const updatedAttendee = await db.meetingAttendee.findUnique({
        where: { meetingId_employeeId: { meetingId, employeeId: 'EMP-002' } },
      });
      rsvpSuccess = patchJson.success && updatedAttendee?.rsvp === 'ACCEPTED';
    }

    const getRes = await meetingGet(createMockRequest('http://localhost:3000/api/meetings', 'GET'));
    const getJson = await getRes.json();
    const readPersists = getJson.data?.some((m: any) => m.id === meetingId);

    results['Meetings & Scheduling'] = {
      api: apiSuccess,
      dbStored,
      dbVerified: dbStored && dbRecord?.title === meetingPayload.title,
      readPersists,
      update: rsvpSuccess,
      status: apiSuccess && dbStored && readPersists && rsvpSuccess ? 'PASS' : 'FAIL',
    };
    console.log('   Result:', results['Meetings & Scheduling']);
  } catch (err) {
    console.error('   Meetings Test Error:', err);
    results['Meetings & Scheduling'] = { api: false, dbStored: false, dbVerified: false, readPersists: false, status: 'FAIL' };
  }

  await db.$disconnect();

  console.log('\n========================================================================');
  console.log('FINAL END-TO-END VERIFICATION SUMMARY');
  console.log('========================================================================');
  console.table(results);
}

runEndToEndVerification();
