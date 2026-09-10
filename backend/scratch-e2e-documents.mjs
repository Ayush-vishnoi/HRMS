/**
 * E2E for the Documents center backend + notifications DELETE fix.
 * Covers: GET /documents scoping, upload → HR notification (bug 1),
 * review verify/reject → employee notifications, employee request → HR fulfil
 * → download (Sent → Downloaded), HR request → employee upload → reject,
 * share, download access control, DELETE notification single/all/ownership
 * guard + 65s survival across the 60-second poll (bug 2), and full cleanup.
 */
const BASE = 'http://localhost:4000/api';

const CRED = {
  ayush: ['ayush.vishnoi@company.com', 'deu6FruKTIELI84dZ_dkfz1FAa1!'],
  priya: ['priya.sharma@company.com', 'V_1ldEkKnHYsWM_8NPASj6W_Aa1!'],
};
const EMP_ID = 'EMP-001'; // ayush (employee)
const ADMIN_ID = 'EMP-006'; // priya (admin)

const TAG = `E2E-${Date.now().toString(36)}`; // unique per run, used in names + cleanup
const PDF = Buffer.from(`%PDF-1.4\n${TAG} e2e test file\n%%EOF\n`);
let failures = 0;
const ok = (cond, label) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}`);
  if (!cond) failures++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function req(token, method, path, { json, form } = {}) {
  const headers = { Authorization: `Bearer ${token}` };
  let body;
  if (form) body = form;
  else if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body });
  const ct = res.headers.get('content-type') ?? '';
  return { status: res.status, json: ct.includes('json') ? await res.json() : null, res };
}

async function notifications(token) {
  const r = await req(token, 'GET', '/notifications');
  return r.json?.data ?? [];
}

/** Notifications are written fire-and-forget, so retry briefly until visible. */
async function waitForNotif(token, title, tries = 12) {
  for (let i = 0; i < tries; i++) {
    const hit = (await notifications(token)).find(
      (n) => n.title === title && (n.message ?? '').includes(TAG),
    );
    if (hit) return hit;
    await sleep(300);
  }
  return null;
}

const { PrismaClient } = await import('@prisma/client');
const db = new PrismaClient();

/** Removes every artifact tagged with the 'E2E-' prefix (any run). */
async function cleanup() {
  const notifs = await db.userNotification.deleteMany({
    where: { type: 'Documents', message: { contains: 'E2E-' } },
  });
  const requests = await db.documentRequest.findMany({
    where: { documentType: { startsWith: 'E2E-' } },
    select: { id: true },
  });
  const reqIds = requests.map((r) => r.id);
  let atts = 0;
  if (reqIds.length) {
    atts = (await db.documentRequestAttachment.deleteMany({ where: { requestId: { in: reqIds } } })).count;
  }
  const docs = await db.employeeDocument.findMany({
    where: { name: { startsWith: 'E2E-' } },
    select: { id: true, storage_key: true },
  });
  const docIds = docs.map((d) => d.id);
  const blobKeys = docs.map((d) => d.storage_key).filter(Boolean);
  let delDocs = 0;
  let delReqs = 0;
  let delBlobs = 0;
  if (docIds.length) delDocs = (await db.employeeDocument.deleteMany({ where: { id: { in: docIds } } })).count;
  if (reqIds.length) delReqs = (await db.documentRequest.deleteMany({ where: { id: { in: reqIds } } })).count;
  if (blobKeys.length) delBlobs = (await db.documentBlob.deleteMany({ where: { id: { in: blobKeys } } })).count;
  return { notifs: notifs.count, attachments: atts, documents: delDocs, requests: delReqs, blobs: delBlobs };
}

try {
  const pre = await cleanup();
  if (pre.documents || pre.requests || pre.notifs) {
    console.log(`pre-cleaned leftovers: ${JSON.stringify(pre)}`);
  }

  const ayushTkn = await login('ayush');
  const priyaTkn = await login('priya');
  ok(true, 'logins succeeded (employee + HR admin)');

  // ---------- GET /documents scoping ----------
  const empDocs = await req(ayushTkn, 'GET', '/documents');
  ok(empDocs.status === 200 && empDocs.json?.success === true, 'GET /documents (employee) returns 200 success');
  const empData = empDocs.json?.data ?? {};
  ok(
    ['documents', 'requests', 'templates', 'staff'].every((k) => Array.isArray(empData[k] ?? [])),
    'payload contains documents/requests/templates/staff arrays',
  );
  ok((empData.documents ?? []).every((d) => d.employeeId === EMP_ID), 'employee only sees own documents');

  const admDocs = await req(priyaTkn, 'GET', '/documents');
  const admData = admDocs.json?.data ?? {};
  ok(
    admDocs.status === 200 && (admData.staff ?? []).some((s) => s.id === EMP_ID),
    'admin payload includes staff directory with the employee',
  );

  // ---------- upload ----------
  const fd = new FormData();
  fd.append('file', new Blob([PDF], { type: 'application/pdf' }), `${TAG}-payslip.pdf`);
  fd.append('name', `${TAG} Test Payslip`);
  fd.append('type', 'Payslip');
  const up = await req(ayushTkn, 'POST', '/documents/upload', { form: fd });
  ok(up.json?.success === true, 'employee upload succeeds');
  const doc = up.json?.data?.document ?? {};
  const upDocId = doc.id;
  ok(
    !!upDocId && doc.status === 'Under Review' && doc.uploadedByEmployee === true,
    `uploaded doc is Under Review (got "${doc.status}")`,
  );
  ok(
    doc.downloadUrl === `/api/documents/${upDocId}/download` && doc.downloadable === false,
    'downloadUrl present but not downloadable until verified',
  );

  const badFd = new FormData();
  badFd.append('file', new Blob([Buffer.from('nope')], { type: 'text/plain' }), 'bad.txt');
  const badUp = await req(ayushTkn, 'POST', '/documents/upload', { form: badFd });
  ok(badUp.status === 400 && badUp.json?.success === false, `unsupported mime rejected (400, got ${badUp.status})`);

  // ---------- BUG 1: HR must be notified of the upload ----------
  const hrNotif1 = await waitForNotif(priyaTkn, 'Document Submitted for Verification');
  ok(!!hrNotif1, 'HR received "Document Submitted for Verification" (bug 1 fixed)');
  ok(hrNotif1?.type === 'Documents' && hrNotif1?.linkUrl === '/documents', 'notification type/link correct');

  // ---------- review ----------
  const empReview = await req(ayushTkn, 'POST', '/documents/review', {
    json: { documentId: upDocId, decision: 'verify' },
  });
  ok(empReview.status === 403, `employee cannot review (403, got ${empReview.status})`);

  const rvw = await req(priyaTkn, 'POST', '/documents/review', {
    json: { documentId: upDocId, decision: 'verify' },
  });
  ok(rvw.json?.success === true && rvw.json?.data?.document?.status === 'Verified', 'HR verify → status Verified');
  ok(rvw.json?.data?.request === null, 'unlinked document → request null');

  const empNotif1 = await waitForNotif(ayushTkn, 'Document Verified');
  ok(!!empNotif1, 'employee received "Document Verified"');

  // ---------- download (owner + verified) ----------
  const dl = await req(ayushTkn, 'GET', `/documents/${upDocId}/download`);
  ok(dl.status === 200, `owner download of verified doc (200, got ${dl.status})`);
  const dlBytes = dl.status === 200 ? Buffer.from(await dl.res.arrayBuffer()) : Buffer.alloc(0);
  ok(dlBytes.length === PDF.length, `downloaded bytes match upload (${dlBytes.length}/${PDF.length})`);
  const disp = dl.res.headers.get('content-disposition') ?? '';
  ok(disp.includes('attachment') && disp.includes(TAG), `Content-Disposition filename (got "${disp}")`);
  ok((dl.res.headers.get('content-type') ?? '').includes('application/pdf'), 'Content-Type is application/pdf');

  const afterDl = await req(ayushTkn, 'GET', '/documents');
  const dlDoc = (afterDl.json?.data?.documents ?? []).find((d) => d.id === upDocId);
  ok(!!dlDoc?.downloadedAt, 'download recorded (downloadedAt set)');

  // ---------- employee request → HR fulfil ----------
  const freq = await req(ayushTkn, 'POST', '/documents/request', {
    json: { documentType: `${TAG} Certificate`, reason: 'E2E test request' },
  });
  ok(freq.json?.success === true, 'employee document request created');
  const reqId1 = freq.json?.data?.request?.id;
  ok(
    !!reqId1 && freq.json?.data?.request?.status === 'Pending' && freq.json?.data?.request?.initiatedByHr === false,
    'request Pending, employee-initiated',
  );
  const hrNotif2 = await waitForNotif(priyaTkn, 'New Document Request');
  ok(!!hrNotif2, 'HR received "New Document Request"');

  const ffd = new FormData();
  ffd.append('requestId', reqId1);
  ffd.append('files', new Blob([PDF], { type: 'application/pdf' }), `${TAG}-hr-response.pdf`);
  const ful = await req(priyaTkn, 'POST', '/documents/fulfil', { form: ffd });
  ok(ful.json?.success === true, 'HR fulfil succeeds');
  const fulReq = ful.json?.data?.request ?? {};
  const att = fulReq.attachments?.[0];
  ok(fulReq.status === 'Sent' && !!att?.downloadUrl, 'request Sent with attachment downloadUrl');
  ok(att?.name === `${TAG}-hr-response.pdf`, 'attachment carries the uploaded filename');
  const empNotif2 = await waitForNotif(ayushTkn, 'Document Request Fulfilled');
  ok(!!empNotif2, 'employee received "Document Request Fulfilled"');

  const attDl = await req(ayushTkn, 'GET', `/documents/${att.documentId}/download`);
  ok(attDl.status === 200, 'employee downloads HR attachment (200)');
  const afterAttDl = await req(ayushTkn, 'GET', '/documents');
  const movedReq = (afterAttDl.json?.data?.requests ?? []).find((r) => r.id === reqId1);
  ok(movedReq?.status === 'Downloaded', `Sent → Downloaded after attachment download (got "${movedReq?.status}")`);

  // ---------- HR request → employee upload → reject ----------
  const hrq = await req(priyaTkn, 'POST', '/documents/hr-request', {
    json: { employeeId: EMP_ID, documentType: `${TAG} HR Doc`, reason: 'E2E hr request' },
  });
  ok(hrq.json?.success === true, 'HR-initiated request created');
  const reqId2 = hrq.json?.data?.request?.id;
  ok(
    hrq.json?.data?.request?.status === 'Requested' && hrq.json?.data?.request?.initiatedByHr === true,
    'request Requested, HR-initiated',
  );
  const empNotif3 = await waitForNotif(ayushTkn, 'HR Requested a Document');
  ok(!!empNotif3, 'employee received "HR Requested a Document"');

  const rfd = new FormData();
  rfd.append('file', new Blob([PDF], { type: 'application/pdf' }), `${TAG}-hr-doc.pdf`);
  rfd.append('name', `${TAG} HR Response`);
  rfd.append('requestId', reqId2);
  const up2 = await req(ayushTkn, 'POST', '/documents/upload', { form: rfd });
  ok(up2.json?.success === true, 'employee upload against HR request succeeds');
  const doc2 = up2.json?.data?.document ?? {};
  ok(
    doc2.status === 'Under Review' && up2.json?.data?.request?.status === 'Submitted',
    'doc Under Review, request Submitted',
  );
  const hrNotif3 = await waitForNotif(priyaTkn, 'Document Submitted for HR Request');
  ok(!!hrNotif3, 'HR received "Document Submitted for HR Request"');

  const rej = await req(priyaTkn, 'POST', '/documents/review', {
    json: { documentId: doc2.id, decision: 'reject', reason: 'E2E blurry scan' },
  });
  ok(rej.json?.success === true && rej.json?.data?.document?.status === 'Action Required', 'reject → doc Action Required');
  ok(rej.json?.data?.request?.status === 'Rejected', 'linked request Rejected');
  const empNotif4 = await waitForNotif(ayushTkn, 'Document Needs Attention');
  ok(!!empNotif4 && empNotif4.message.includes('blurry'), 'employee received "Document Needs Attention" with reason');

  const rejDl = await req(ayushTkn, 'GET', `/documents/${doc2.id}/download`);
  ok(rejDl.status === 403, `unverified/unshared doc blocked for owner (403, got ${rejDl.status})`);

  // ---------- share ----------
  const shr = await req(priyaTkn, 'POST', '/documents/share', { json: { documentId: upDocId } });
  ok(shr.json?.success === true && shr.json?.data?.document?.sharedByHr === true, 'HR share → sharedByHr true');
  const empNotif5 = await waitForNotif(ayushTkn, 'Document Shared');
  ok(!!empNotif5, 'employee received "Document Shared"');

  // ---------- BUG 2: deleting notifications must stick ----------
  const beforeList = await notifications(ayushTkn);
  const target = beforeList.find((n) => (n.message ?? '').includes(TAG));
  ok(!!target, 'employee has a tagged notification to delete');

  const wrongOwner = await req(priyaTkn, 'DELETE', `/notifications/${target.id}`);
  ok(wrongOwner.status === 404, `another user cannot delete it (404, got ${wrongOwner.status})`);

  const del1 = await req(ayushTkn, 'DELETE', `/notifications/${target.id}`);
  ok(del1.json?.success === true, 'owner DELETE single succeeds');
  const afterList = await notifications(ayushTkn);
  ok(!afterList.some((n) => n.id === target.id), 'deleted notification gone from GET');
  ok(afterList.length === beforeList.length - 1, `other notifications intact (${afterList.length}/${beforeList.length - 1})`);
  const dbRow = await db.userNotification.findUnique({ where: { id: target.id } });
  ok(dbRow === null, 'row removed from DB — no poll can resurrect it');

  // clear-all (capture first, restore after, so demo notifications survive the test)
  const captured = await notifications(ayushTkn);
  const delAll = await req(ayushTkn, 'DELETE', '/notifications');
  const deletedCount = delAll.json?.data?.deleted;
  ok(
    delAll.json?.success === true && typeof deletedCount === 'number' && deletedCount >= 1,
    `DELETE all succeeds (deleted ${deletedCount})`,
  );
  const emptyList = await notifications(ayushTkn);
  ok(emptyList.length === 0, 'all notifications removed');
  if (captured.length) {
    await db.userNotification.createMany({
      data: captured.map((n) => ({
        id: n.id,
        userId: n.userId,
        title: n.title,
        message: n.message,
        type: n.type,
        linkUrl: n.linkUrl ?? null,
        isRead: n.isRead,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
    });
    console.log(`restored ${captured.length} pre-existing notification(s) for demo continuity`);
  }

  // ---------- survive the 60-second poll ----------
  console.log('waiting 65s to cross the 60-second notification poll interval…');
  await sleep(65_000);
  const finalList = await notifications(ayushTkn);
  ok(!finalList.some((n) => n.id === target.id), 'after 65s the deleted notification is still gone (bug 2 fixed)');
  ok(finalList.some((n) => (n.message ?? '').includes(TAG)), 'restored tagged notifications still visible');

  console.log(`\n${failures === 0 ? 'ALL E2E CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
} catch (err) {
  console.error('E2E ERROR:', err.message);
  failures++;
} finally {
  try {
    const out = await cleanup();
    console.log(
      `CLEANUP DONE — removed ${out.notifs} notification(s), ${out.documents} document(s), ${out.blobs} blob(s), ${out.requests} request(s), ${out.attachments} attachment(s)`,
    );
  } catch (e) {
    console.error('CLEANUP ERROR:', e.message);
  }
  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}
