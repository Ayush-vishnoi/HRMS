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

console.log('=== DEEP CODEBASE AUDIT SCAN ===');

// 1. Scan all frontend fetch calls across ALL .ts/.tsx files in src/
const allSrcFiles = scanDir('src', f => f.endsWith('.ts') || f.endsWith('.tsx'));
const frontendFetchCalls = [];

allSrcFiles.forEach(file => {
  if (file.startsWith('src/app/api/')) return; // skip api routes
  const content = fs.readFileSync(file, 'utf8');
  
  // match fetch('/api/...') or fetch(`/api/...`)
  const regex = /fetch\s*\(\s*([`'"])(\/api\/[^`'"]+)\1/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    frontendFetchCalls.push({
      callerFile: file,
      rawPath: match[2],
      cleanPath: match[2].split('?')[0],
    });
  }
  
  // match apiRequest('/...') or api.get('/...')
  const apiRegex = /api(Request|\.(get|post|patch|put|delete))\s*\(\s*([`'"])(\/[^`'"]+)\3/g;
  while ((match = apiRegex.exec(content)) !== null) {
    frontendFetchCalls.push({
      callerFile: file,
      rawPath: '/api' + match[4],
      cleanPath: ('/api' + match[4]).split('?')[0],
    });
  }
});

console.log(`Total Frontend API calls found: ${frontendFetchCalls.length}`);
const uniqueFrontendEndpoints = Array.from(new Set(frontendFetchCalls.map(f => f.cleanPath)));
console.log(`Unique Frontend endpoints called (${uniqueFrontendEndpoints.length}):`);
uniqueFrontendEndpoints.sort().forEach(ep => {
  const callers = frontendFetchCalls.filter(f => f.cleanPath === ep).map(f => f.callerFile);
  console.log(`  - ${ep} (called in ${Array.from(new Set(callers)).join(', ')})`);
});

// 2. Scan all Next.js API route definitions
const nextRoutes = scanDir('src/app/api', f => f.startsWith('route.'));
console.log(`\nTotal Next.js API Routes: ${nextRoutes.length}`);

// 3. Scan all NestJS Controller routes
const nestControllers = scanDir('backend/src', f => f.endsWith('.controller.ts'));
const nestEndpoints = [];

nestControllers.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const controllerDecorator = content.match(/@Controller\((['"`])(.*?)(\1)\)/);
  const basePath = controllerDecorator ? controllerDecorator[2] : '';
  
  const lines = content.split('\n');
  lines.forEach(line => {
    const methodMatch = line.match(/@(Get|Post|Patch|Put|Delete)\((.*?)\)/);
    if (methodMatch) {
      const verb = methodMatch[1].toUpperCase();
      const subPath = methodMatch[2].replace(/['"`]/g, '').trim();
      const fullPath = `/api/${basePath}${subPath ? '/' + subPath : ''}`.replace(/\/+/g, '/');
      nestEndpoints.push({ verb, fullPath, file });
    }
  });
});

console.log(`\nTotal NestJS Endpoints: ${nestEndpoints.length}`);
nestEndpoints.forEach(ne => console.log(`  ${ne.verb.padEnd(6)} ${ne.fullPath} (${ne.file})`));

// 4. Compare Architecture: Next.js API routes vs NestJS API routes
console.log('\n=== ARCHITECTURAL DUALITY ANALYSIS ===');
console.log('Checking which endpoints exist in Next.js vs NestJS vs Frontend consumers:');

const nextEndpointPaths = nextRoutes.map(f => f.replace(/^src\/app/, '').replace(/\/route\.tsx?$/, ''));

console.log('\nEndpoints existing in BOTH Next.js and NestJS:');
nextEndpointPaths.forEach(nep => {
  const nestMatch = nestEndpoints.filter(ne => ne.fullPath === nep || ne.fullPath.replace(/:id/g, '[id]') === nep);
  if (nestMatch.length > 0) {
    console.log(`  [DUPLICATED] ${nep} (Next.js route & NestJS: ${nestMatch.map(n => n.verb + ' ' + n.file).join(', ')})`);
  }
});

console.log('\nNext.js Endpoints with NO NestJS equivalent:');
nextEndpointPaths.forEach(nep => {
  const nestMatch = nestEndpoints.filter(ne => ne.fullPath === nep || ne.fullPath.replace(/:id/g, '[id]') === nep);
  if (nestMatch.length === 0) {
    console.log(`  [NEXT.JS ONLY] ${nep}`);
  }
});

console.log('\nNestJS Endpoints with NO Next.js Route equivalent:');
const uniqueNestPaths = Array.from(new Set(nestEndpoints.map(ne => ne.fullPath.replace(/:id/g, '[id]'))));
uniqueNestPaths.forEach(nep => {
  if (!nextEndpointPaths.includes(nep)) {
    console.log(`  [NESTJS ONLY] ${nep}`);
  }
});
