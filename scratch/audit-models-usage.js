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

const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Parse models from schema.prisma
const modelBlocks = schemaContent.split(/model\s+/);
const models = [];

for (let i = 1; i < modelBlocks.length; i++) {
  const block = modelBlocks[i];
  const nameMatch = block.match(/^(\w+)\s*\{/);
  if (!nameMatch) continue;
  const modelName = nameMatch[1];
  
  const mapMatch = block.match(/@@map\("([^"]+)"\)/);
  const tableName = mapMatch ? mapMatch[1] : modelName;
  
  models.push({ modelName, tableName });
}

console.log(`Total Prisma Models parsed: ${models.length}`);

// Scan usage in src/ and backend/src/
const allCodeFiles = [
  ...scanDir('src', f => f.endsWith('.ts') || f.endsWith('.tsx')),
  ...scanDir('backend/src', f => f.endsWith('.ts')),
];

const modelUsage = models.map(m => {
  // Check prisma.modelName / db.modelName / db.modelName. / prisma.modelName.
  // In Prisma Client, camelCase is generated: e.g. db.employee, db.recruitmentCandidate, db.business_units
  const camelName = m.modelName.charAt(0).toLowerCase() + m.modelName.slice(1);
  
  const callers = [];
  allCodeFiles.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    const regex1 = new RegExp(`\\b(db|prisma)\\.${camelName}\\b`);
    const regex2 = new RegExp(`\\b(db|prisma)\\.${m.modelName}\\b`);
    const regex3 = new RegExp(`\\b(db|prisma)\\.${m.tableName}\\b`);
    if (regex1.test(content) || regex2.test(content) || regex3.test(content)) {
      callers.push(f);
    }
  });
  
  return {
    modelName: m.modelName,
    tableName: m.tableName,
    usedCount: callers.length,
    callers: Array.from(new Set(callers)),
  };
});

console.log('\n=== MODEL USAGE SUMMARY ===');
const usedModels = modelUsage.filter(m => m.usedCount > 0);
const unusedModels = modelUsage.filter(m => m.usedCount === 0);

console.log(`Actively Used Models (${usedModels.length}):`);
usedModels.forEach(m => {
  console.log(`  - ${m.modelName} (Table: ${m.tableName}): used in ${m.callers.length} files`);
});

console.log(`\nUnused / Orphan Models (${unusedModels.length}):`);
unusedModels.forEach(m => {
  console.log(`  - ${m.modelName} (Table: ${m.tableName})`);
});
