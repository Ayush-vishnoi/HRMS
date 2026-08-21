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

console.log('=== ROUTE AUTH & RBAC AUDIT ===\n');

apiRoutes.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const endpoint = file.replace(/^src\/app/, '').replace(/\/route\.tsx?$/, '');
  
  const hasRequireEmployee = content.includes('requireEmployee') || content.includes('getCurrentEmployee');
  const hasRequireRole = content.includes('requireRole');
  const hasRequireAccess = content.includes('requireEmployeeAccess') || content.includes('requireRecruitmentUser');
  const isCandidateRoute = endpoint.startsWith('/api/candidate/');
  const isPublicAuth = endpoint.startsWith('/api/auth/');
  
  let authStatus = 'PUBLIC / UNPROTECTED';
  if (isPublicAuth) authStatus = 'AUTH ENDPOINT (PUBLIC)';
  else if (isCandidateRoute) authStatus = 'CANDIDATE TOKEN AUTH';
  else if (hasRequireRole) authStatus = 'STRICT RBAC (requireRole)';
  else if (hasRequireAccess) authStatus = 'RESOURCE ACCESS CHECK (requireEmployeeAccess/requireRecruitmentUser)';
  else if (hasRequireEmployee) authStatus = 'AUTHENTICATED USER ONLY (requireEmployee)';
  
  console.log(`Endpoint: ${endpoint.padEnd(50)} -> [${authStatus}]`);
});
