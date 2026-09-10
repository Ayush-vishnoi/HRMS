/**
 * E2E test for the exit clearance workflow against the live dev server.
 * Covers: submit → withdraw → resubmit → manager approve → HR approve →
 * KT create/complete/verify → clearance → F&F → generate letter → complete exit,
 * plus permission negatives, GET scoping, DB assertions and full cleanup.
 */
const BASE = 'http://localhost:4000/api';

const CRED = {
  ayush: ['ayush.vishnoi@company.com', 'deu6FruKTIELI84dZ_dkfz1FAa1!'],
  arjun: ['arjun.mehta@company.com', 'N21-BelaOarVH9PjUZPKSmBhAa1!'],
  priya: ['priya.sharma@company.com', 'V_1ldEkKnHYsWM_8NPASj6W_Aa1!'],
};
const EMP_ID = 'EMP-001'; // ayush (employee, manager = EMP-002 arjun)
const MGR_ID = 'EMP-002'; // arjun (manager)
const ADMIN_ID = 'EMP-006'; // priya (admin)

const TEST_START = new Date();
let failures = 0;
let exitId1 = null; // first (withdrawn) request
let exitId = null; // active request
const ok = (cond, label) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}`);
  if (!cond) failures++;
};

async function login(key) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: CRED[key][0], password: CRED[key][1] }),
  });
  const json = await res.json();
  const token = json?.data?.accessToken ?? json?.accessToken;
  if (!token) throw new Error(`login failed for ${key}: ${JSON.stringify(json).slice(0, 300)}`);
  return token;
}

async function act(token, body) {
  const res = await fetch(`${BASE}/exit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

async function list(token, qs = '') {
  const res = await fetch(`${BASE}/exit${qs}`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: res.status, json: await res.json() };
}

function isoPlusDays(days) {
  return new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
}

const { PrismaClient } = await import('@prisma/client');
const db = new PrismaClient();

// Clean up any leftovers from a previous failed run before starting.
async function cleanupTestArtifacts() {
  const leftovers = await db.exitRequest.findMany({
    where: { employeeId: EMP_ID, createdAt: { gte: new Date(Date.now() - 6 * 3600 * 1000) } },
    select: { id: true },
  });
  const ids = leftovers.map((r) => r.id);
  if (ids.length) {
    await db.knowledgeTransferTask.deleteMany({ where: { exitRequestId: { in: ids } } });
    await db.exitInterview.deleteMany({ where: { exitRequestId: { in: ids } } });
    await db.fullAndFinalSettlement.deleteMany({ where: { exitRequestId: { in: ids } } });
    await db.exitDepartmentClearance.deleteMany({ where: { exitRequestId: { in: ids } } });
    await db.exitRequest.deleteMany({ where: { id: { in: ids } } });
  }
  await db.alumniRecord.deleteMany({ where: { employeeId: EMP_ID } });
  await db.employeeDocument.deleteMany({
    where: { employeeId: EMP_ID, type: { in: ['Relieving_Letter', 'Experience_Letter'] } },
  });
  await db.employee.update({ where: { id: EMP_ID }, data: { status: 'Active', lockedUntil: null } });
  if (ids.length) console.log(`pre-cleaned ${ids.length} leftover exit request(s)`);
}

try {
  await cleanupTestArtifacts();
  const tkn = { ayush: await login('ayush'), arjun: await login('arjun'), priya: await login('priya') };
  ok(true, 'all three logins succeeded');

  // ---------- GET scoping ----------
  const selfList = await list(tkn.ayush);
  ok(selfList.status === 200 && selfList.json?.success, 'GET /exit as employee returns success');
  const selfData = selfList.json?.data ?? {};
  ok(
    ['exitRequests', 'alumniRecords', 'assignedAssets', 'employees'].every((k) => k in selfData),
    'GET response contains all four keys',
  );
  const mgrList = await list(tkn.arjun);
  ok(
    mgrList.status === 200 && (mgrList.json?.data?.employees?.length ?? 0) > 0,
    'GET /exit as manager returns employees directory for KT selector',
  );
  const otherView = await list(tkn.ayush, `?employeeId=${ADMIN_ID}`);
  ok(
    otherView.status === 403 && otherView.json?.success === false,
    'employee viewing another employee is forbidden (403)',
  );

  // ---------- 1. submit_resignation ----------
  const relDate = isoPlusDays(50);
  const sub = await act(tkn.ayush, {
    action: 'submit_resignation',
    requestedRelievingDate: relDate,
    reasonCategory: 'New Opportunity',
    reasonDetails: 'E2E test run',
    noticePeriodDays: 60,
  });
  ok(sub.json?.success === true, 'submit_resignation succeeds');
  const exit1 = sub.json?.data;
  ok(exit1?.workflowStage === 'Pending Manager Approval', `stage = Pending Manager Approval (got ${exit1?.workflowStage})`);
  ok((exit1?.clearances?.length ?? 0) === 5, `5 department clearances created (got ${exit1?.clearances?.length})`);
  exitId1 = exit1?.id;

  // ---------- permission negative ----------
  const neg = await act(tkn.ayush, { action: 'hr_approve', exitRequestId: exitId1 });
  ok(neg.json?.success === false && neg.status === 403, `employee cannot hr_approve (403, got ${neg.status})`);

  // duplicate active resignation guard
  const dup = await act(tkn.ayush, {
    action: 'submit_resignation', requestedRelievingDate: relDate, reasonCategory: 'Other',
  });
  ok(dup.json?.success === false && dup.status === 400, `duplicate active resignation blocked (400, got ${dup.status})`);

  // ---------- 2. withdraw_resignation ----------
  const wd = await act(tkn.ayush, { action: 'withdraw_resignation', exitRequestId: exitId1 });
  ok(wd.json?.success === true, 'withdraw_resignation succeeds');
  ok(wd.json?.data?.status === 'Withdrawn' && wd.json?.data?.workflowStage === 'Withdrawn', 'withdrawn → status/stage Withdrawn');

  // ---------- 3. resubmit after withdrawal ----------
  const sub2 = await act(tkn.ayush, {
    action: 'submit_resignation',
    requestedRelievingDate: relDate,
    reasonCategory: 'New Opportunity',
    reasonDetails: 'E2E test run 2',
    noticePeriodDays: 60,
  });
  ok(sub2.json?.success === true, 'resubmit after withdrawal succeeds');
  exitId = sub2.json?.data?.id;
  ok(!!exitId && exitId !== exitId1, 'new exit request id issued');

  // ---------- 4. manager_approve ----------
  const ma = await act(tkn.arjun, { action: 'manager_approve', exitRequestId: exitId, remarks: 'Approved, good luck.' });
  ok(ma.json?.success === true, 'manager_approve succeeds');
  ok(ma.json?.data?.workflowStage === 'Pending HR Approval', `stage → Pending HR Approval (got ${ma.json?.data?.workflowStage})`);
  ok(ma.json?.data?.managerApproval === 'Approved', 'managerApproval = Approved');

  // manager action at wrong stage
  const maAgain = await act(tkn.arjun, { action: 'manager_approve', exitRequestId: exitId });
  ok(maAgain.json?.success === false && maAgain.status === 400, 'second manager_approve blocked at wrong stage (400)');

  // ---------- 5. hr_approve ----------
  const approvedRel = isoPlusDays(45);
  const ha = await act(tkn.priya, {
    action: 'hr_approve', exitRequestId: exitId, approvedRelievingDate: approvedRel,
  });
  ok(ha.json?.success === true, 'hr_approve succeeds');
  ok(ha.json?.data?.workflowStage === 'In Notice Period', `stage → In Notice Period (got ${ha.json?.data?.workflowStage})`);
  ok(ha.json?.data?.approvedRelievingDate === approvedRel, 'approvedRelievingDate stored');

  // ---------- 6. KT tasks ----------
  const kt = await act(tkn.priya, {
    action: 'kt_task_create', exitRequestId: exitId,
    title: 'E2E handover doc', description: 'transfer runbook',
    recipientEmployeeId: MGR_ID, recipientName: 'Arjun Mehta', dueDate: isoPlusDays(10),
  });
  ok(kt.json?.success === true, 'kt_task_create succeeds (admin)');
  const taskId = kt.json?.data?.id;
  ok(kt.json?.data?.status === 'Pending' && kt.json?.data?.recipientEmployeeId === MGR_ID, 'KT task Pending, recipient stored');

  const ktDone = await act(tkn.arjun, { action: 'kt_task_update', taskId, status: 'Completed' });
  ok(ktDone.json?.success === true && ktDone.json?.data?.status === 'Completed', 'recipient marks KT Completed');

  const ktVer = await act(tkn.priya, { action: 'kt_task_update', taskId, status: 'Verified', notes: 'verified in e2e' });
  ok(ktVer.json?.success === true && ktVer.json?.data?.status === 'Verified', 'admin verifies KT task');
  ok(ktVer.json?.data?.verifiedById === ADMIN_ID, 'verifiedById = admin');

  // employee cannot create KT
  const ktNeg = await act(tkn.ayush, {
    action: 'kt_task_create', exitRequestId: exitId, title: 'x', recipientEmployeeId: MGR_ID,
  });
  ok(ktNeg.json?.success === false && ktNeg.status === 403, 'employee cannot create KT task (403)');

  // ---------- 7. interview_submit ----------
  const iv = await act(tkn.ayush, {
    action: 'interview_submit', exitRequestId: exitId,
    primaryReason: 'New Opportunity', ratingCompany: 5, ratingManager: 4, ratingCulture: 4,
    wouldRecommend: true, feedbackText: 'E2E interview feedback',
  });
  ok(iv.json?.success === true && iv.json?.data?.feedbackText === 'E2E interview feedback', 'interview_submit (employee) succeeds');

  // ---------- 8. clearance_update ----------
  const clr = sub2.json?.data?.clearances ?? [];
  const itClr = clr.find((c) => c.department === 'IT');
  const cu = await act(tkn.priya, {
    action: 'clearance_update', clearanceId: itClr.id, status: 'Cleared',
    remarks: 'E2E cleared',
  });
  ok(cu.json?.success === true && cu.json?.data?.status === 'Cleared', 'clearance_update → Cleared');

  const afterClr = await db.exitRequest.findUnique({ where: { id: exitId }, select: { workflowStage: true } });
  ok(afterClr?.workflowStage === 'Clearance In Progress', `first NOC → Clearance In Progress (got ${afterClr?.workflowStage})`);

  // clear the rest
  for (const c of clr.filter((x) => x.id !== itClr.id)) {
    await act(tkn.arjun, { action: 'clearance_update', clearanceId: c.id, status: 'Cleared', remarks: 'E2E' });
  }

  // ---------- 9. calculate_ff ----------
  const ff = await act(tkn.priya, {
    action: 'calculate_ff', exitRequestId: exitId, employeeId: EMP_ID,
    totalPayableDays: 30, basicPay: 50000, leaveEncashmentAmount: 15000,
    gratuityAmount: 25000, bonusPayable: 10000, pendingDuesDeduction: 0, taxDeduction: 5000,
  });
  ok(ff.json?.success === true, 'calculate_ff succeeds');
  ok(ff.json?.data?.netSettlementAmount === 95000, `net = 95000 (got ${ff.json?.data?.netSettlementAmount})`);
  const afterFf = await db.exitRequest.findUnique({ where: { id: exitId }, select: { workflowStage: true } });
  ok(afterFf?.workflowStage === 'Settled', `calculate_ff → Settled (got ${afterFf?.workflowStage})`);

  // ---------- 10. generate_letter ----------
  const gl = await act(tkn.priya, { action: 'generate_letter', exitRequestId: exitId, letterType: 'Relieving_Letter' });
  ok(gl.json?.success === true, 'generate_letter succeeds');
  ok(
    typeof gl.json?.data?.downloadUrl === 'string' && gl.json?.data?.downloadUrl.startsWith('data:application/pdf;base64,'),
    'downloadUrl is a base64 pdf data URL',
  );
  const glDoc = await db.employeeDocument.findFirst({
    where: { employeeId: EMP_ID, type: 'Relieving_Letter' },
  });
  ok(!!glDoc && glDoc.status === 'Verified' && glDoc.shared_by_hr === true, 'letter persisted to EmployeeDocument (Verified, shared_by_hr)');

  // non-admin cannot generate
  const glNeg = await act(tkn.ayush, { action: 'generate_letter', exitRequestId: exitId, letterType: 'Experience_Letter' });
  ok(glNeg.json?.success === false && glNeg.status === 403, 'employee cannot generate letter (403)');

  // ---------- 11. complete_exit ----------
  const ce = await act(tkn.priya, { action: 'complete_exit', exitRequestId: exitId, employeeId: EMP_ID });
  ok(ce.json?.success === true, 'complete_exit succeeds');
  ok(ce.json?.data?.status === 'Completed' && ce.json?.data?.workflowStage === 'Exited', 'status Completed / stage Exited');

  const empAfter = await db.employee.findUnique({ where: { id: EMP_ID }, select: { status: true, lockedUntil: true } });
  ok(empAfter?.status === 'Exited', 'employee status = Exited');
  const expectedLock = new Date(`${approvedRel}T23:59:59.999`);
  expectedLock.setDate(expectedLock.getDate() + 30);
  const lockDelta = empAfter?.lockedUntil ? Math.abs(empAfter.lockedUntil.getTime() - expectedLock.getTime()) : Infinity;
  ok(lockDelta < 60000, `lockedUntil ≈ relieving EOD + 30d (delta ${Math.round(lockDelta / 1000)}s)`);

  const alumni = await db.alumniRecord.findUnique({ where: { employeeId: EMP_ID } });
  ok(!!alumni && !!alumni.relievingLetterUrl && !!alumni.experienceLetterUrl, 'AlumniRecord archived with both letter URLs');
  ok(alumni?.exitDate === approvedRel, `alumni exitDate = approved relieving date (got ${alumni?.exitDate})`);

  const docs = await db.employeeDocument.findMany({
    where: { employeeId: EMP_ID, type: { in: ['Relieving_Letter', 'Experience_Letter'] } },
  });
  ok(docs.length === 2 && docs.every((d) => d.locked_until !== null), 'both letters locked until relieving date');

  // login still allowed during grace window
  const relogin = await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: CRED.ayush[0], password: CRED.ayush[1] }),
  });
  ok([200, 201].includes(relogin.status), 'exited employee can still log in within grace window');

  // login blocked after the grace window ends
  await db.employee.update({
    where: { id: EMP_ID },
    data: { lockedUntil: new Date(Date.now() - 86400000) }, // grace expired yesterday
  });
  const expiredLogin = await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: CRED.ayush[0], password: CRED.ayush[1] }),
  });
  ok(expiredLogin.status === 401, 'exited employee cannot log in after grace window (401)');

  // notifications were emitted
  const notifCount = await db.userNotification.count({
    where: { type: 'Exit', createdAt: { gte: TEST_START } },
  });
  ok(notifCount >= 12, `Exit notifications emitted (${notifCount} ≥ 12)`);

  console.log(`\n${failures === 0 ? 'ALL E2E CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
} catch (err) {
  console.error('E2E ERROR:', err.message);
  failures++;
} finally {
  // ---------- cleanup ----------
  try {
    await cleanupTestArtifacts();
    await db.userNotification.deleteMany({
      where: { type: 'Exit', createdAt: { gte: TEST_START } },
    });
    console.log('CLEANUP DONE');
  } catch (e) {
    console.error('CLEANUP ERROR:', e.message);
  }
  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}
