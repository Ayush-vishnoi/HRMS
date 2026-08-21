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

const pages = scanDir('src/app', name => name.startsWith('page.'));

console.log('=== DETAILED FRONTEND PAGE AUDIT ===\n');

const auditResults = pages.map(pageFile => {
  const content = fs.readFileSync(pageFile, 'utf8');
  const route = pageFile.replace(/^src\/app/, '').replace(/\/page\.tsx?$/, '') || '/';
  
  // Extract fetch URLs
  const fetchMatches = [...content.matchAll(/fetch\s*\(\s*[`'"]([^`'"]+)[`'"]/g)].map(m => m[1]);
  const fetchWithBackticks = [...content.matchAll(/fetch\s*\(\s*`([^`]+)`/g)].map(m => m[1]);
  const allFetches = Array.from(new Set([...fetchMatches, ...fetchWithBackticks]));

  // Extract HTTP methods in fetch
  const methods = [];
  if (/method:\s*['"]POST['"]/i.test(content)) methods.push('POST');
  if (/method:\s*['"]PATCH['"]/i.test(content)) methods.push('PATCH');
  if (/method:\s*['"]PUT['"]/i.test(content)) methods.push('PUT');
  if (/method:\s*['"]DELETE['"]/i.test(content)) methods.push('DELETE');
  if (allFetches.length > 0 && methods.length === 0) methods.push('GET');

  // Check state and features
  const usesHRMS = content.includes('useHRMS');
  const usesState = content.includes('useState');
  const usesEffect = content.includes('useEffect');
  const hasForms = /<form\b|<input\b|<select\b|<textarea\b/.test(content);
  const hasModals = /Modal|Drawer|Dialog/.test(content);
  const hasLoadingState = /loading|isLoading|isSubmitting|isPending/i.test(content);
  const hasErrorState = /error|setError|errorMessage/i.test(content);
  const hasSuccessState = /success|setSuccess|toast/i.test(content);
  
  // Mock data usage
  const importsMock = /MOCK_|INITIAL_|mockData|fixtures/i.test(content);
  
  return {
    route,
    pageFile,
    allFetches,
    methods,
    usesHRMS,
    usesState,
    usesEffect,
    hasForms,
    hasModals,
    hasLoadingState,
    hasErrorState,
    hasSuccessState,
    importsMock,
    lines: content.split('\n').length,
  };
});

auditResults.forEach((r, idx) => {
  console.log(`${idx + 1}. ROUTE: ${r.route} (${r.lines} lines)`);
  console.log(`   Fetches: ${r.allFetches.length > 0 ? r.allFetches.join(', ') : 'NONE'}`);
  console.log(`   Fetch Methods: ${r.methods.join(', ') || 'None'}`);
  console.log(`   HRMSContext: ${r.usesHRMS} | Mock imports: ${r.importsMock}`);
  console.log(`   Forms: ${r.hasForms} | Modals: ${r.hasModals} | Loading: ${r.hasLoadingState} | Error: ${r.hasErrorState}`);
  console.log('----------------------------------------------------');
});
