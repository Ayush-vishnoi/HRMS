import * as fs from 'fs';
import * as path from 'path';

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
const schema = fs.readFileSync(schemaPath, 'utf8');

// Match all model names
const modelMatches = [...schema.matchAll(/model\s+([a-zA-Z0-9_]+)\s+\{([\s\S]*?)\}/g)];

console.log(`Total Models: ${modelMatches.length}`);

const models = modelMatches.map(m => {
  const name = m[1];
  const body = m[2];
  return {
    name,
    hasCandidate: /candidate/i.test(body),
    hasJob: /job/i.test(body),
    hasOffer: /offer/i.test(body),
    hasApproval: /approval/i.test(body),
    hasSalary: /salary/i.test(body) || /compensation/i.test(body) || /ctc/i.test(body),
    hasDocument: /document/i.test(body) || /template/i.test(body),
    hasOnboarding: /onboarding/i.test(body),
  };
});

console.log('\n--- ALL MODELS ---');
modelMatches.forEach(m => console.log(`- ${m[1]}`));

console.log('\n--- MODELS WITH OFFER KEYWORD ---');
models.filter(m => m.hasOffer).forEach(m => console.log(`- ${m.name}`));

console.log('\n--- MODELS WITH APPROVAL KEYWORD ---');
models.filter(m => m.hasApproval).forEach(m => console.log(`- ${m.name}`));

console.log('\n--- MODELS WITH SALARY/COMPENSATION KEYWORD ---');
models.filter(m => m.hasSalary).forEach(m => console.log(`- ${m.name}`));

console.log('\n--- MODELS WITH DOCUMENT/TEMPLATE KEYWORD ---');
models.filter(m => m.hasDocument).forEach(m => console.log(`- ${m.name}`));

console.log('\n--- MODELS WITH ONBOARDING KEYWORD ---');
models.filter(m => m.hasOnboarding).forEach(m => console.log(`- ${m.name}`));
