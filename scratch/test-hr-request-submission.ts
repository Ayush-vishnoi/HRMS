/* End-to-end test: HR document request submission flow.
 * 1. HR Admin creates an hr-request for the employee.
 * 2. Employee uploads a document linked to that request (type forced server-side).
 * 3. Request becomes Submitted; document is Under Review (pending verification).
 * 4. HR verifies the document; request becomes Verified.
 * 5. Negative check: employee cannot link an upload to someone else's request.
 */
import { PrismaClient } from '@prisma/client';

const BASE = 'http://localhost:3000';
const db = new PrismaClient();

const HR = { email: 'priya.sharma@company.com', password: 'V_1ldEkKnHYsWM_8NPASj6W_Aa1!' };
const EMP = { email: 'ayush.vishnoi@company.com', password: 'deu6FruKTIELI84dZ_dkfz1FAa1!' };

async function login(creds: { email: string; password: string }) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: creds.email, password: creds.password }),
  });
  const cookie = res.headers.get('set-cookie')?.split(';')[0] || '';
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(`Login failed for ${creds.email}`);
  return cookie;
}

async function api(cookie: string, body: BodyInit, isJson: boolean) {
  const res = await fetch(`${BASE}/api/documents`, {
    method: 'POST',
    headers: isJson ? { 'Content-Type': 'application/json', cookie } : { cookie },
    body,
  });
  return { status: res.status, json: await res.json() };
}

async function main() {
  const hrCookie = await login(HR);
  const empCookie = await login(EMP);
  const emp = await db.employee.findFirst({ where: { email: EMP.email } });
  if (!emp) throw new Error('Employee not found');
  console.log(`✔ Logged in. Employee: ${emp.name} (${emp.id})`);

  // 1. HR creates the request
  const hrReq = await api(hrCookie, JSON.stringify({ action: 'hr-request', employeeId: emp.id, documentType: 'Aadhaar Card', reason: 'Onboarding KYC — please submit by Friday.' }), true);
  if (!hrReq.json.success) throw new Error(`hr-request failed: ${JSON.stringify(hrReq.json)}`);
  const requestId: string = hrReq.json.data.id;
  console.log(`✔ HR request created: ${requestId} (status: ${hrReq.json.data.status})`);

  // 2. Employee uploads against the request — tries to spoof the type, server must override
  const form = new FormData();
  form.set('action', 'upload');
  form.set('requestId', requestId);
  form.set('type', 'Other'); // spoof attempt — should be ignored
  form.set('name', 'Aadhaar (e2e test)');
  form.set('file', new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x65, 0x32, 0x65])], 'aadhaar.pdf', { type: 'application/pdf' }));
  const upload = await api(empCookie, form, false);
  if (!upload.json.success) throw new Error(`upload failed: ${JSON.stringify(upload.json)}`);
  const docId: string = upload.json.data.id;
  console.log(`✔ Employee uploaded ${docId} — type forced to "${upload.json.data.type}" (spoof "Other" ignored), doc status: ${upload.json.data.status}`);

  // 3. Request should now be Submitted + linked
  const linked = await db.documentRequest.findUnique({ where: { id: requestId } });
  if (linked?.status !== 'Submitted' || linked.submittedDocumentId !== docId) {
    throw new Error(`Link failed: status=${linked?.status}, linked=${linked?.submittedDocumentId}`);
  }
  console.log(`✔ Request status: Submitted, linked document: ${linked.submittedDocumentId}`);

  // 4. HR verifies the document → request becomes Verified
  const approve = await api(hrCookie, JSON.stringify({ action: 'approve', documentId: docId }), true);
  if (!approve.json.success) throw new Error(`approve failed: ${JSON.stringify(approve.json)}`);
  const verified = await db.documentRequest.findUnique({ where: { id: requestId } });
  console.log(`✔ HR verified document — request status now: ${verified?.status}`);

  // 5. Negative: employee cannot link to a request that is not theirs / already closed
  const badForm = new FormData();
  badForm.set('action', 'upload');
  badForm.set('requestId', 'HRR-does-not-exist');
  badForm.set('file', new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'x.pdf', { type: 'application/pdf' }));
  const bad = await api(empCookie, badForm, false);
  console.log(bad.status === 404 ? '✔ Unknown requestId correctly rejected (404)' : `✖ Expected 404, got ${bad.status}: ${JSON.stringify(bad.json)}`);

  // Cleanup test artifacts
  await db.documentRequest.delete({ where: { id: requestId } });
  await db.employeeDocument.delete({ where: { id: docId } });
  await db.documentBlob.deleteMany({ where: { id: { contains: docId } } });
  console.log('✔ Cleanup done. E2E TEST PASSED');
}

main()
  .catch((err) => { console.error('✖ E2E TEST FAILED:', err); process.exitCode = 1; })
  .finally(() => void db.$disconnect());
