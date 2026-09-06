// Smoke test for the meetings + calendar API contract (NestJS backend on :4000).
import { readFileSync } from 'node:fs';

const BASE = 'http://localhost:4000/api';

function envValue(key) {
  const match = readFileSync('.env.local', 'utf8').match(new RegExp(`^${key}="?([^"\\n]+)"?$`, 'm'));
  if (!match) throw new Error(`${key} not found in .env.local`);
  return match[1];
}

async function login(identifier, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  const json = await res.json();
  if (!res.ok || !json.accessToken) throw new Error(`login failed (${res.status}): ${JSON.stringify(json).slice(0, 200)}`);
  return json.accessToken;
}

function check(label, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) process.exitCode = 1;
}

const token = await login(envValue('DEMO_EMPLOYEE_EMAIL'), envValue('DEMO_EMPLOYEE_PASSWORD'));
const auth = { Authorization: `Bearer ${token}` };

// 1. GET /meetings — list (frontend contract: { success: true, data: Meeting[] })
{
  const res = await fetch(`${BASE}/meetings`, { headers: auth });
  const json = await res.json();
  const ok = res.status === 200 && json.success === true && Array.isArray(json.data);
  check('GET /meetings (list)', ok, `status=${res.status}, count=${json.data?.length}`);
  if (ok && json.data.length > 0) {
    const m = json.data[0];
    const shapeOk =
      typeof m.id === 'string' &&
      typeof m.title === 'string' &&
      typeof m.startsAt === 'string' &&
      m.organizer && typeof m.organizer.name === 'string' &&
      Array.isArray(m.attendees);
    check('  meeting shape (organizer/attendees/ISO dates)', shapeOk, `id=${m.id}, attendees=${m.attendees.length}`);
  }
}

// 2. GET /meetings?search= — employee picker
{
  const res = await fetch(`${BASE}/meetings?search=arjun`, { headers: auth });
  const json = await res.json();
  const ok = res.status === 200 && json.success === true && Array.isArray(json.data) && json.data.length > 0;
  check('GET /meetings?search=arjun (employee picker)', ok, `status=${res.status}, results=${json.data?.length}`);
  if (ok) {
    const e = json.data[0];
    const shapeOk = typeof e.id === 'string' && typeof e.name === 'string' && typeof e.email === 'string';
    check('  search result shape (id/name/email)', shapeOk, `first=${e.name}`);
  }
}

// 3. GET /meetings?id= — single meeting
{
  const list = await (await fetch(`${BASE}/meetings`, { headers: auth })).json();
  if (list.data?.length > 0) {
    const target = list.data[0];
    const res = await fetch(`${BASE}/meetings?id=${encodeURIComponent(target.id)}`, { headers: auth });
    const json = await res.json();
    const ok = res.status === 200 && json.success === true && json.data?.id === target.id;
    check(`GET /meetings?id=${target.id}`, ok, `status=${res.status}`);
  } else {
    check('GET /meetings?id= (skipped — no meetings in list)', true);
  }
}

// 4. GET /meetings?id=UNKNOWN — 404 with { success: false, error }
{
  const res = await fetch(`${BASE}/meetings?id=MTG-DOES-NOT-EXIST`, { headers: auth });
  const json = await res.json().catch(() => ({}));
  const ok = res.status === 404 && json.success === false && typeof json.error === 'string';
  check('GET /meetings?id=UNKNOWN (404 shape)', ok, `status=${res.status}, error=${json.error}`);
}

// 5. GET /calendar?from&to — calendar events (frontend expects json.data)
{
  const res = await fetch(`${BASE}/calendar?from=2026-09-01&to=2026-09-30`, { headers: auth });
  const json = await res.json();
  const ok = res.status === 200 && json.success === true && Array.isArray(json.data);
  check('GET /calendar?from&to (wrapped data)', ok, `status=${res.status}, events=${json.data?.length}`);
}

// 6. POST /meetings — create a meeting, then clean up
{
  const search = await (await fetch(`${BASE}/meetings?search=arjun`, { headers: auth })).json();
  const attendeeId = search.data?.[0]?.id;
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const end = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();
  const res = await fetch(`${BASE}/meetings`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Smoke Test Meeting',
      type: 'TEAM',
      description: 'created by smoke test',
      startsAt: start,
      endsAt: end,
      allDay: false,
      location: 'Test Room',
      videoLink: '',
      department: '',
      recurrence: 'NONE',
      reminderMinutes: 15,
      attendeeIds: attendeeId ? [attendeeId] : [],
    }),
  });
  const json = await res.json();
  const ok = res.status === 201 && json.success === true && json.data?.id;
  check('POST /meetings (create)', ok, `status=${res.status}, id=${json.data?.id}`);
  if (ok) {
    const created = json.data;
    const shapeOk = created.organizer?.name && Array.isArray(created.attendees) && created.attendees.every((a) => a.rsvp);
    check('  created shape (organizer + attendees with rsvp)', shapeOk, `attendees=${created.attendees.length}`);

    // 7. PATCH /meetings — cancel it (organizer-only action)
    const cancelRes = await fetch(`${BASE}/meetings`, {
      method: 'PATCH',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: created.id, action: 'cancel' }),
    });
    const cancelJson = await cancelRes.json();
    const cancelOk = cancelRes.status === 200 && cancelJson.success === true && cancelJson.data?.status === 'CANCELLED';
    check('PATCH /meetings {action:cancel}', cancelOk, `status=${cancelRes.status}, status=${cancelJson.data?.status}`);
  }
}

// 8. Unauthenticated request must be 401
{
  const res = await fetch(`${BASE}/meetings`);
  check('GET /meetings without token (401)', res.status === 401, `status=${res.status}`);
}

console.log(process.exitCode ? '\nSMOKE TEST FAILED' : '\nALL SMOKE TESTS PASSED');
