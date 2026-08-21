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

console.log('=== API CONTRACT & BUG AUDIT ===');

// Check Meetings & Calendar
console.log('\n--- 1. Meetings & Calendar Contract ---');
const meetingsApi = fs.readFileSync('src/app/api/meetings/route.ts', 'utf8');
const calendarApi = fs.readFileSync('src/app/api/calendar/route.ts', 'utf8');
console.log('Meetings API has GET, POST, PATCH:', meetingsApi.includes('GET'), meetingsApi.includes('POST'), meetingsApi.includes('PATCH'));
console.log('Calendar API uses proxyToBackend:', calendarApi.includes('proxyToBackend'));

// Check Grievances
console.log('\n--- 2. Grievances Module ---');
const grievancesPage = fs.readFileSync('src/app/grievances/page.tsx', 'utf8');
console.log('Grievances page has fetch:', grievancesPage.includes('fetch('));
console.log('Grievances API route exists:', fs.existsSync('src/app/api/grievances/route.ts'));

// Check Workforce Module
console.log('\n--- 3. Workforce Module ---');
console.log('Workforce page exists:', fs.existsSync('src/app/workforce/page.tsx'));
console.log('Workforce API route exists:', fs.existsSync('src/app/api/workforce/route.ts'));

// Check Disciplinary Module
console.log('\n--- 4. Disciplinary Module ---');
console.log('Disciplinary page exists:', fs.existsSync('src/app/disciplinary/page.tsx'));
console.log('Disciplinary API route exists:', fs.existsSync('src/app/api/disciplinary/route.ts'));

// Check HelpDesk Ticket status & endpoints
console.log('\n--- 5. HelpDesk & Leaves Contracts ---');
const helpDeskApi = fs.readFileSync('src/app/api/help-desk/route.ts', 'utf8');
console.log('HelpDesk API methods:', helpDeskApi.includes('GET'), helpDeskApi.includes('POST'), helpDeskApi.includes('PATCH'));

const leavesApi = fs.readFileSync('src/app/api/leaves/route.ts', 'utf8');
console.log('Leaves API methods:', leavesApi.includes('GET'), leavesApi.includes('POST'), leavesApi.includes('PATCH'));

// Check Attendance API
console.log('\n--- 6. Attendance API ---');
const attendanceApi = fs.readFileSync('src/app/api/attendance/route.ts', 'utf8');
console.log('Attendance API methods:', attendanceApi.includes('GET'), attendanceApi.includes('POST'), attendanceApi.includes('PATCH'));

// Check Recruitment candidate intelligence and AI
console.log('\n--- 7. AI & Recruitment Intelligence ---');
const extractorExists = fs.existsSync('src/lib/recruitment/intelligence/extractor.ts');
const parserExists = fs.existsSync('src/lib/recruitment/intelligence/parser.ts');
const matchEngineExists = fs.existsSync('src/lib/recruitment/intelligence/match-engine.ts');
const aiAdapterExists = fs.existsSync('src/lib/recruitment/intelligence/ai-adapter.ts');
console.log('Intelligence files exist:', { extractorExists, parserExists, matchEngineExists, aiAdapterExists });

if (aiAdapterExists) {
  const aiAdapter = fs.readFileSync('src/lib/recruitment/intelligence/ai-adapter.ts', 'utf8');
  console.log('AI Adapter content sample:', aiAdapter.slice(0, 300));
}
