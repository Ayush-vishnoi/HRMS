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

const apiRoutes = scanDir('src/app/api', name => name.startsWith('route.'));
console.log('=== ALL NEXT.JS API ROUTES (' + apiRoutes.length + ') ===');
apiRoutes.forEach((file, idx) => {
  const content = fs.readFileSync(file, 'utf8');
  const methods = [];
  if (/export\s+(async\s+)?function\s+GET\b/.test(content)) methods.push('GET');
  if (/export\s+(async\s+)?function\s+POST\b/.test(content)) methods.push('POST');
  if (/export\s+(async\s+)?function\s+PATCH\b/.test(content)) methods.push('PATCH');
  if (/export\s+(async\s+)?function\s+PUT\b/.test(content)) methods.push('PUT');
  if (/export\s+(async\s+)?function\s+DELETE\b/.test(content)) methods.push('DELETE');
  const usesProxy = content.includes('proxyToBackend');
  const usesDb = content.includes('db.') || content.includes('prisma.');
  const endpoint = file.replace(/^src\/app/, '').replace(/\/route\.tsx?$/, '');
  console.log(`${idx + 1}. [${methods.join(',')}] ${endpoint} | Proxy: ${usesProxy} | DB: ${usesDb}`);
});

console.log('\n=== SCRATCH TEST FILES ===');
const scratchFiles = scanDir('scratch', () => true);
scratchFiles.forEach(f => {
  const stats = fs.statSync(f);
  console.log(`- ${f} (${stats.size} bytes)`);
});
