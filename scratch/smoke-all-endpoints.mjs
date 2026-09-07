// Comprehensive smoke test: hit every frontend-called GET endpoint on the
// NestJS backend, report status + {success,data} shape for each.
import { readFileSync } from 'node:fs';

const BASE = 'http://localhost:4000';

function envValue(key) {
  const match = readFileSync('.env.local', 'utf8').match(new RegExp(`^${key}="?([^"\\n]+)"?$`, 'm'));
  if (!match) throw new Error(`${key} not found in .env.local`);
  return match[1];
}

async function login(identifier, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  const json = await res.json();
  if (!res.ok || !json.accessToken) throw new Error(`login failed for ${identifier} (${res.status})`);
  return json.accessToken;
}

const empToken = await login(envValue('DEMO_EMPLOYEE_EMAIL'), envValue('DEMO_EMPLOYEE_PASSWORD'));
const hrToken = await login(envValue('DEMO_HR_ADMIN_EMAIL'), envValue('DEMO_HR_ADMIN_PASSWORD'));

// [path, expected shape] — shape: 'array' = data is Array, 'object' = data is object, 'any' = don't care
const endpoints = [
  ['/api/employees', 'array'],
  ['/api/leaves', 'object'],
  ['/api/help-desk', 'array'],
  ['/api/attendance', 'array'],
  ['/api/meetings', 'array'],
  ['/api/calendar?from=2026-09-01&to=2026-09-30', 'array'],
  ['/api/notifications', 'any'],
  ['/api/announcements', 'array'],
  ['/api/tasks', 'any'],
  ['/api/chat/conversations', 'array'],
  ['/api/chat/unread-count', 'any'],
  ['/api/assets', 'array'],
  ['/api/my-assets', 'array'],
  ['/api/asset-requests', 'array'],
  ['/api/payroll?view=my', 'object'],
  ['/api/payroll/engine', 'array'],
  ['/api/payroll/structures', 'any'],
  ['/api/payroll/loans?view=all', 'array'],
  ['/api/payroll/variable-pay?view=all', 'array'],
  ['/api/payroll/statutory-rules', 'object'],
  ['/api/expenses?view=my', 'array'],
  ['/api/performance', 'any'],
  ['/api/performance/goals', 'array'],
  ['/api/performance/cycles', 'any'],
  ['/api/performance/competencies', 'any'],
  ['/api/recruitment', 'any'],
  ['/api/recruitment/jobs', 'array'],
  ['/api/recruitment/candidates', 'array'],
  ['/api/recruitment/interviews', 'any'],
  ['/api/recruitment/offers', 'any'],
  ['/api/exit', 'array'],
  ['/api/benefits', 'array'],
  ['/api/policies', 'array'],
  ['/api/analytics', 'object'],
  ['/api/my-team', 'object'],
  ['/api/engagement', 'any'],
  ['/api/skills', 'any'],
  ['/api/talent', 'any'],
  ['/api/lms', 'any'],
  ['/api/disciplinary', 'array'],
  ['/api/employee-lifecycle', 'array'],
  ['/api/workforce', 'any'],
];

let pass = 0;
let fail = 0;

async function probe(token, label, [path, expected]) {
  try {
    const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json().catch(() => null);
    const issues = [];
    if (res.status === 404) issues.push('404 ROUTE MISSING');
    else if (res.status === 401) issues.push('401 UNAUTHORIZED');
    else if (res.status === 403) issues.push('403 FORBIDDEN');
    else if (res.status >= 500) issues.push(`${res.status} SERVER ERROR`);
    else if (!json) issues.push(`status ${res.status}, non-JSON body`);
    else {
      if (json.success !== true) issues.push(`no success:true (keys: ${Object.keys(json).slice(0, 5).join(',')})`);
      if (json.success === true && expected === 'array' && !Array.isArray(json.data)) {
        issues.push(`data not array (${json.data === undefined ? 'undefined' : typeof json.data})`);
      }
      if (json.success === true && expected === 'object' && (json.data === undefined || Array.isArray(json.data))) {
        issues.push(`data not object (${json.data === undefined ? 'undefined' : 'array'})`);
      }
    }
    if (issues.length === 0) {
      const detail = Array.isArray(json?.data) ? `${json.data.length} rows` : typeof json?.data;
      console.log(`PASS [${label}] ${path} — ${res.status}, ${detail}`);
      pass++;
    } else {
      console.log(`FAIL [${label}] ${path} — ${issues.join('; ')}`);
      fail++;
    }
  } catch (err) {
    console.log(`FAIL [${label}] ${path} — ${err.message}`);
    fail++;
  }
}

console.log('=== EMPLOYEE VIEW ===');
for (const ep of endpoints) await probe(empToken, 'emp', ep);
console.log('\n=== HR ADMIN VIEW ===');
for (const ep of endpoints) await probe(hrToken, 'hr', ep);

console.log(`\nRESULT: ${pass} pass, ${fail} fail`);
