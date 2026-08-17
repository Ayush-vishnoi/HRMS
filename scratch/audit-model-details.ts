import * as fs from 'fs';
import * as path from 'path';

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
const schema = fs.readFileSync(schemaPath, 'utf8');

const targetModels = [
  'recruitment_offers',
  'recruitment_offer_approvals',
  'DocumentTemplate',
  'document_signatures',
  'EmployeeOnboarding',
  'RecruitmentCandidate',
  'RecruitmentJob',
  'SalaryStructure',
  'SalaryRevisionHistory',
  'recruitment_job_approvals',
];

targetModels.forEach((modelName) => {
  const regex = new RegExp(`model\\s+${modelName}\\s+\\{([\\s\\S]*?)\\}`, 'm');
  const match = schema.match(regex);
  console.log(`====================================================`);
  console.log(`MODEL: ${modelName}`);
  console.log(`====================================================`);
  if (match) {
    console.log(match[0]);
  } else {
    console.log(`NOT FOUND`);
  }
  console.log('\n');
});

// Also search for enums related to offer, approval, onboarding
const enumMatches = [...schema.matchAll(/enum\s+([a-zA-Z0-9_]+)\s+\{([\s\S]*?)\}/g)];
console.log(`====================================================`);
console.log(`ALL RELEVANT ENUMS`);
console.log(`====================================================`);
enumMatches.forEach((e) => {
  if (
    /offer/i.test(e[1]) ||
    /approval/i.test(e[1]) ||
    /candidate/i.test(e[1]) ||
    /stage/i.test(e[1]) ||
    /status/i.test(e[1]) ||
    /document/i.test(e[1])
  ) {
    console.log(e[0]);
    console.log('\n');
  }
});
