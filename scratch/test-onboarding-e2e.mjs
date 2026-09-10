// E2E test for the 5-step onboarding flow (steps 2b + 4b focus).
// Run: node scratch/test-onboarding-e2e.mjs
const BASE = 'http://localhost:4000/api';
const fs = await import('node:fs');

const hrToken = fs.readFileSync('/tmp/hrms-token.txt', 'utf8').trim();

const log = (label, value) => console.log(`\n=== ${label} ===\n`, typeof value === 'string' ? value : JSON.stringify(value, null, 2).slice(0, 1200));

const call = async (path, { method = 'GET', token, body } = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
};

// 1. Find a candidate that has no onboarding record yet.
const lifecycle = await call('/employee-lifecycle', { token: hrToken });
const candidates = lifecycle.json?.data?.candidates ?? [];
log('lifecycle candidates count', candidates.length);
// The backend already filters candidates to `onboarding: null`, so any listed candidate is fresh.
const fresh = candidates[0];
if (!fresh) {
  console.error('No fresh candidate available — aborting.');
  process.exit(1);
}
log('picked candidate', { id: fresh.id, name: fresh.name, email: fresh.email });

// 2. Onboard them (STEP 1-4).
const onboardRes = await call('/employee-lifecycle', {
  method: 'POST',
  token: hrToken,
  body: {
    action: 'onboard',
    candidateId: fresh.id,
    name: fresh.name,
    email: `e2e.onboarding.${Date.now()}@company.com`,
    phone: '+91 90000 00000',
    roleTitle: 'E2E Test Engineer',
    department: 'Engineering',
    location: 'Bengaluru',
    joinDate: new Date().toISOString().slice(0, 10),
    salary: 600000,
    probationMonths: 6,
    dateOfBirth: '1995-05-10',
    gender: 'Male',
    currentAddress: '12 MG Road, Bengaluru',
    emergencyContactName: 'Test Guardian',
    emergencyContactPhone: '+91 91111 11111',
    emergencyContactRelation: 'Parent',
  },
});
log('onboard result', { status: onboardRes.status, code: onboardRes.json?.data?.employee?.employeeCode, hasTempPassword: Boolean(onboardRes.json?.data?.temporaryPassword) });
const { employee, temporaryPassword } = onboardRes.json?.data ?? {};
if (!employee || !temporaryPassword) {
  console.error('Onboarding failed:', onboardRes.json);
  process.exit(1);
}
console.log('Employee code:', employee.employeeCode, '| temp password:', temporaryPassword);

// 3. Login with the temp password.
const loginRes = await call('/auth/login', { method: 'POST', body: { identifier: employee.email, password: temporaryPassword } });
log('login with temp password', { status: loginRes.status, mustChangePassword: loginRes.json?.user?.mustChangePassword });
const empToken = loginRes.json?.accessToken;
if (!empToken) {
  console.error('Login failed:', loginRes.json);
  process.exit(1);
}

// 4. Session must expose mustChangePassword=true.
const session1 = await call('/auth/session', { token: empToken });
log('session before reset', { status: session1.status, mustChangePassword: session1.json?.data?.mustChangePassword });

// 5. Wrong current password must fail (raw error surfacing).
const badReset = await call('/auth/change-password', { method: 'POST', token: empToken, body: { currentPassword: 'wrong-password', newPassword: 'NewStrongPass123' } });
log('change-password with WRONG current', { status: badReset.status, body: badReset.json });

// 6. Correct reset.
const resetRes = await call('/auth/change-password', { method: 'POST', token: empToken, body: { currentPassword: temporaryPassword, newPassword: 'NewStrongPass123' } });
log('change-password with correct current', { status: resetRes.status, body: resetRes.json });

// 7. Session must now show mustChangePassword=false.
const session2 = await call('/auth/session', { token: empToken });
log('session after reset', { status: session2.status, mustChangePassword: session2.json?.data?.mustChangePassword });

// 8. Bank details: GET should show the Pending record created at onboarding.
const bankGet1 = await call('/employee-lifecycle/bank-details', { token: empToken });
log('bank-details GET (before submit)', { status: bankGet1.status, body: bankGet1.json });

// 9. Invalid IFSC must fail.
const badBank = await call('/employee-lifecycle/bank-details', {
  method: 'POST', token: empToken,
  body: { accountHolderName: employee.name, bankName: 'HDFC Bank', accountNumber: '1234567890', ifscCode: 'BADIFSC1' },
});
log('bank-details POST (invalid IFSC)', { status: badBank.status, body: badBank.json });

// 10. Valid submission.
const bankPost = await call('/employee-lifecycle/bank-details', {
  method: 'POST', token: empToken,
  body: { accountHolderName: employee.name, bankName: 'HDFC Bank', accountNumber: '50100234567890', ifscCode: 'HDFC0001234' },
});
log('bank-details POST (valid)', { status: bankPost.status, status_field: bankPost.json?.data?.status, submitted_at: bankPost.json?.data?.submitted_at });

// 11. Re-login with the NEW password to confirm credentials work end-to-end.
const relogin = await call('/auth/login', { method: 'POST', body: { identifier: employee.email, password: 'NewStrongPass123' } });
log('re-login with NEW password', { status: relogin.status, mustChangePassword: relogin.json?.user?.mustChangePassword });

// 12. Probation Confirm (STEP 5) — HR side. Controller maps `probation_action` → probationAction({ employeeId, decision }).
const probRes = await call('/employee-lifecycle', {
  method: 'POST', token: hrToken,
  body: { action: 'probation_action', employeeId: employee.id, decision: 'Confirm' },
});
log('probation Confirm (raw)', { status: probRes.status, body: probRes.json });

// 13. Employee status should now be Active.
const empAfter = await call(`/employees/${employee.id}`, { token: hrToken });
log('employee after confirm', { status: empAfter.status, employeeStatus: empAfter.json?.data?.status ?? empAfter.json?.data?.employee?.status });

console.log('\n=== E2E COMPLETE ===');
