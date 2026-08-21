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

console.log('=== 1. NEXT.JS API ROUTES ===');
const apiRoutes = scanDir('src/app/api', name => name.startsWith('route.'));
console.log('Total Next.js API Route files:', apiRoutes.length);

const nextRouteInfo = apiRoutes.map(file => {
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
  return { file, endpoint, methods, usesProxy, usesDb };
});

nextRouteInfo.forEach(r => {
  console.log(`[${r.methods.join(',') || 'NONE'}] ${r.endpoint} -> Proxy: ${r.usesProxy}, DB: ${r.usesDb}`);
});

console.log('\n=== 2. NESTJS CONTROLLERS & ENDPOINTS ===');
const nestControllers = scanDir('backend/src', name => name.endsWith('.controller.ts'));
console.log('Total NestJS Controllers:', nestControllers.length);

nestControllers.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const classMatch = content.match(/export\s+class\s+(\w+)/);
  const controllerDecorator = content.match(/@Controller\((['"`])(.*?)(\1)\)/);
  const basePath = controllerDecorator ? controllerDecorator[2] : '';
  console.log(`Controller: ${classMatch ? classMatch[1] : file} (base: /api/${basePath || ''})`);
  
  // Find methods
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const methodMatch = line.match(/@(Get|Post|Patch|Put|Delete)\((.*?)\)/);
    if (methodMatch) {
      const verb = methodMatch[1].toUpperCase();
      const subPath = methodMatch[2].replace(/['"`]/g, '').trim();
      const fullPath = `/api/${basePath}${subPath ? '/' + subPath : ''}`.replace(/\/+/g, '/');
      console.log(`   ${verb} ${fullPath}`);
    }
  });
});

console.log('\n=== 3. FRONTEND PAGES ===');
const pages = scanDir('src/app', name => name === 'page.tsx' || name === 'page.jsx');
console.log('Total Frontend Page files:', pages.length);
pages.forEach(p => {
  const route = p.replace(/^src\/app/, '').replace(/\/page\.tsx?$/, '') || '/';
  const content = fs.readFileSync(p, 'utf8');
  const isClient = content.includes("'use client'") || content.includes('"use client"');
  const callsFetch = content.includes('fetch(');
  const usesHRMSContext = content.includes('useHRMS');
  const usesReactQuery = content.includes('useQuery') || content.includes('useMutation');
  const usesApiClient = content.includes('apiRequest') || content.includes('api.');
  console.log(`Page: ${route} | Client: ${isClient} | fetch: ${callsFetch} | HRMSContext: ${usesHRMSContext} | Query: ${usesReactQuery} | api: ${usesApiClient}`);
});
