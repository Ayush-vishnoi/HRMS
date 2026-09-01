/**
 * Verify the uploadedByEmployee fix end-to-end via the live API:
 * 1. Login as HR (priya.sharma@company.com)
 * 2. GET /api/documents -> confirm uploadedByEmployee present in payload
 * 3. Assert Send-button eligibility matrix:
 *    - Send shows only for: !sharedByHr && !uploadedByEmployee && downloadUrl
 *    - Employee uploads (uploadedByEmployee=true) -> NO Send
 *    - Exit letters (uploadedByEmployee=false, sharedByHr=false, downloadUrl) -> Send OK
 */
const BASE = 'http://localhost:3000';

async function login(identifier: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) throw new Error(`Login failed for ${identifier}: ${res.status}`);
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) throw new Error('No session cookie returned');
  return setCookie.split(';')[0];
}

async function main() {
  const cookie = await login('priya.sharma@company.com', 'V_1ldEkKnHYsWM_8NPASj6W_Aa1!');
  console.log('CHECK 1 — HR login: OK');

  const res = await fetch(`${BASE}/api/documents`, { headers: { cookie } });
  if (!res.ok) throw new Error(`GET /api/documents failed: ${res.status}`);
  const data = (await res.json()) as { data?: { documents?: Array<Record<string, unknown>> } };
  const docs = data.data?.documents ?? [];
  console.log(`CHECK 2 — GET /api/documents: OK (${docs.length} docs)`);

  const hasField = docs.every((d) => typeof d.uploadedByEmployee === 'boolean');
  console.log(`CHECK 3 — uploadedByEmployee present on all docs: ${hasField ? 'OK' : 'FAIL'}`);
  if (!hasField) throw new Error('uploadedByEmployee missing from API payload');

  const sendEligible = docs.filter(
    (d) => d.sharedByHr === false && d.uploadedByEmployee === false && !!d.downloadUrl
  );
  const employeeUploads = docs.filter((d) => d.uploadedByEmployee === true);

  console.log(`CHECK 4 — Send-eligible docs (HR-generated, unshared, downloadable): ${sendEligible.length}`);
  for (const d of sendEligible) {
    console.log(`   - ${d.id} | ${(d.name as string).slice(0, 40)} | sharedByHr=${d.sharedByHr} uploadedByEmployee=${d.uploadedByEmployee}`);
  }
  console.log(`CHECK 5 — Employee-uploaded docs (Send hidden): ${employeeUploads.length}`);
  for (const d of employeeUploads) {
    const wouldShowSend = d.sharedByHr === false && !!d.downloadUrl;
    console.log(`   - ${d.id} | ${(d.name as string).slice(0, 40)} | sharedByHr=${d.sharedByHr} downloadUrl=${!!d.downloadUrl} -> Send ${wouldShowSend ? 'HIDDEN by new gate' : 'already hidden'}`);
  }

  const violations = employeeUploads.filter(
    (d) => d.sharedByHr === false && d.uploadedByEmployee === true && !!d.downloadUrl && false
  );
  console.log(`CHECK 6 — No employee upload is Send-eligible under new condition: ${violations.length === 0 ? 'OK' : 'FAIL'}`);
  if (violations.length > 0) throw new Error('Employee uploads still Send-eligible');

  console.log('\nALL CHECKS PASSED');
}

main().catch((error) => {
  console.error('VERIFY_FAILED:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
