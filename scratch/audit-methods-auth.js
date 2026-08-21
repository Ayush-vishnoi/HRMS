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

const apiRoutes = scanDir('src/app/api', f => f.startsWith('route.'));

console.log('=== DETAILED SECURITY & AUTH MATRIX PER ENDPOINT ===\n');

apiRoutes.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const endpoint = file.replace(/^src\/app/, '').replace(/\/route\.tsx?$/, '');
  
  const hasGet = /export\s+(async\s+)?function\s+GET\b/.test(content);
  const hasPost = /export\s+(async\s+)?function\s+POST\b/.test(content);
  const hasPatch = /export\s+(async\s+)?function\s+PATCH\b/.test(content);
  const hasPut = /export\s+(async\s+)?function\s+PUT\b/.test(content);
  const hasDelete = /export\s+(async\s+)?function\s+DELETE\b/.test(content);
  
  // Inspect each method block
  ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].forEach(method => {
    const methodRegex = new RegExp(`export\\s+(async\\s+)?function\\s+${method}\\b([\\s\\S]*?)(?=(export\\s+(async\\s+)?function|$))`);
    const match = content.match(methodRegex);
    if (match) {
      const block = match[2];
      const hasAuth = block.includes('requireEmployee') || 
                      block.includes('requireRole') || 
                      block.includes('requireEmployeeAccess') || 
                      block.includes('requireRecruitmentUser') ||
                      block.includes('getAuthenticatedRecruitmentUser') ||
                      block.includes('verifyCandidateSession') ||
                      block.includes('authenticateCredentials') ||
                      block.includes('proxyToBackend') ||
                      block.includes('authSessionCookieName') ||
                      block.includes('getCurrentEmployee');
      
      const usesDb = block.includes('db.') || block.includes('prisma.');
      const takesId = block.includes('params') || block.includes('searchParams') || block.includes('body');
      
      console.log(`${method.padEnd(6)} ${endpoint.padEnd(50)} | Protected: ${hasAuth ? 'YES' : 'NO ❌'} | DB: ${usesDb}`);
    }
  });
});
