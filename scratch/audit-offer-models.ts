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
