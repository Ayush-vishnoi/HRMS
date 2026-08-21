const fs = require('fs');
const path = require('path');

function scanDir(dir, fileMatcher) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name !== 'node_modules' && item.name !== '.next' && item.name !== 'dist') {
        results = results.concat(scanDir(full, fileMatcher));
      }
    } else if (fileMatcher(item.name)) {
      results.push(full.replace(/\\/g, '/'));
    }
  }
  return results;
}

console.log('=== FULL MODULE-BY-MODULE AUDIT ===');

const pages = [
  'analytics', 'assets', 'attendance', 'benefits', 'candidate/login', 'candidate/offers/[id]', 'candidate/portal',
  'disciplinary', 'documents', 'employee-lifecycle', 'employees', 'employees/[id]', 'engagement', 'exit',
  'expenses', 'grievances', 'help-desk', 'leaves', 'lms', 'meetings', 'my-team', 'payroll',
  'performance', 'policies', 'recruitment', 'skills', 'talent', 'workforce'
];

pages.forEach(p => {
  const pagePath = `src/app/${p}/page.tsx`;
  const apiPath = `src/app/api/${p}/route.ts`;
  const nestControllerPath = `backend/src/${p.split('/')[0]}/${p.split('/')[0]}.controller.ts`;
  
  const hasPage = fs.existsSync(pagePath);
  const hasNextApi = fs.existsSync(apiPath);
  const hasNestCtrl = fs.existsSync(nestControllerPath);
  
  let pageFetches = [];
  if (hasPage) {
    const c = fs.readFileSync(pagePath, 'utf8');
    const m = [...c.matchAll(/fetch\s*\(\s*([`'"])(\/api\/[^`'"]+)\1/g)].map(x => x[2]);
    pageFetches = Array.from(new Set(m));
  }
  
  console.log(`Module [${p}]`);
  console.log(`  Frontend Page: ${hasPage ? pagePath : 'MISSING'}`);
  console.log(`  Next.js API:   ${hasNextApi ? apiPath : 'No root route.ts (may have subroutes)'}`);
  console.log(`  NestJS Ctrl:   ${hasNestCtrl ? nestControllerPath : 'MISSING'}`);
  console.log(`  Page Fetches:  ${pageFetches.length > 0 ? pageFetches.join(' | ') : 'NONE (uses context/mock)'}`);
  console.log('');
});
