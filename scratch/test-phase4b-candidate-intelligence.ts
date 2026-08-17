import { db } from '../src/lib/db';
import { validateResumeFile, computeFileHash } from '../src/lib/recruitment/intelligence/extractor';
import { extractSkillsFromText, normalizeSkillName } from '../src/lib/recruitment/intelligence/skills-extractor';
import { parseResumeContent } from '../src/lib/recruitment/intelligence/parser';
import { computeMatchScore, calculateAndPersistMatch } from '../src/lib/recruitment/intelligence/match-engine';
import { checkCandidateDuplicates, generateDuplicateKey, normalizePhoneForMatching } from '../src/lib/recruitment/intelligence/duplicate-detector';
import {
  rediscoverCandidatesForJob,
  addCandidateToNewJob,
  createRecruitmentTalentPool,
  addCandidateToTalentPool,
  listRecruitmentTalentPools,
} from '../src/lib/recruitment/intelligence/rediscovery-service';

async function runPhase4BVerification() {
  console.log('===============================================================');
  console.log('  HRMS PHASE 4B — CANDIDATE INTELLIGENCE & ATS VERIFICATION');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // 1. DOCUMENT VALIDATION & SECURITY
    // -------------------------------------------------------------
    console.log('\n[1] DOCUMENT VALIDATION & SECURITY');
    const validTxt = Buffer.from('John Doe\nSoftware Engineer\n5 years experience in React and Node.js');
    const validDocx = Buffer.from('PK\x03\x04mock docx file content');
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB

    const res1 = validateResumeFile('resume.pdf', validTxt);
    assert(res1.valid && res1.extension === '.pdf', 'Accepts valid PDF filename');

    const res2 = validateResumeFile('resume.docx', validDocx);
    assert(res2.valid && res2.extension === '.docx', 'Accepts valid DOCX file');

    const res3 = validateResumeFile('resume.txt', validTxt);
    assert(res3.valid && res3.extension === '.txt', 'Accepts valid TXT file');

    const res4 = validateResumeFile('malicious.exe', validTxt);
    assert(!res4.valid && (res4.error?.includes('Unsupported file format') || false), 'Rejects executable files (.exe)');

    const res5 = validateResumeFile('huge.pdf', largeBuffer);
    assert(!res5.valid && (res5.error?.includes('exceeds the 10MB limit') || false), 'Rejects files over 10MB limit');

    const hash1 = computeFileHash(validTxt);
    const hash2 = computeFileHash(validTxt);
    const hash3 = computeFileHash(validDocx);
    assert(hash1 === hash2 && hash1.length === 64, 'Computes deterministic SHA-256 file fingerprint');
    assert(hash1 !== hash3, 'Generates unique hash per distinct file payload');

    // -------------------------------------------------------------
    // 2. SKILL NORMALIZATION & CANONICAL TAXONOMY
    // -------------------------------------------------------------
    console.log('\n[2] SKILL NORMALIZATION & CANONICAL TAXONOMY');
    const norm1 = normalizeSkillName('React.js');
    assert(norm1.canonical === 'React' && norm1.category === 'Frontend', 'Normalizes React.js alias -> React');

    const norm2 = normalizeSkillName('Postgres');
    assert(norm2.canonical === 'PostgreSQL' && norm2.category === 'Database', 'Normalizes Postgres alias -> PostgreSQL');

    const norm3 = normalizeSkillName('NodeJS');
    assert(norm3.canonical === 'Node.js' && norm3.category === 'Backend', 'Normalizes NodeJS alias -> Node.js');

    const sampleResumeText = `
      Priya Sharma
      Senior Full Stack Engineer
      priya.sharma.test@example.com
      +91 9876543210
      Bengaluru, India
      https://linkedin.com/in/priyasharma-test
      https://github.com/priyasharma-dev

      SUMMARY:
      Passionate engineer with 6 years of experience building scalable distributed systems with React, TypeScript, Node.js, GraphQL, PostgreSQL, Docker, AWS, and Kubernetes.

      EXPERIENCE:
      Senior Software Engineer | Tech Corp
      Jan 2022 - Present
      - Architected microservices with Node.js and PostgreSQL.
      - Built web applications using Next.js, React.js and Tailwind.

      Software Engineer | Innovate Systems
      2019 - 2022
      - Developed REST APIs in TypeScript and Python.

      EDUCATION:
      B.Tech in Computer Science & Engineering
      National Institute of Technology, 2019
    `;

    const extractedSkills = await extractSkillsFromText(sampleResumeText);
    const extractedSkillNames = extractedSkills.map((s) => s.name);
    assert(extractedSkillNames.includes('React'), 'Extracts React from resume text');
    assert(extractedSkillNames.includes('Node.js'), 'Extracts Node.js from resume text');
    assert(extractedSkillNames.includes('PostgreSQL'), 'Extracts PostgreSQL from resume text');
    assert(extractedSkillNames.includes('TypeScript'), 'Extracts TypeScript from resume text');
    assert(extractedSkills.every((s) => s.confidence === 'HIGH' || s.confidence === 'MEDIUM'), 'Assigns confidence ratings to extracted skills');

    // -------------------------------------------------------------
    // 3. DETERMINISTIC RESUME PARSER
    // -------------------------------------------------------------
    console.log('\n[3] DETERMINISTIC RESUME PARSER');
    const parsedData = await parseResumeContent(sampleResumeText);

    assert(parsedData.name === 'Priya Sharma', `Extracted correct candidate name: ${parsedData.name}`);
    assert(parsedData.email === 'priya.sharma.test@example.com', `Extracted correct email: ${parsedData.email}`);
    assert(parsedData.phone?.includes('9876543210') || false, `Extracted correct phone number: ${parsedData.phone}`);
    assert(parsedData.location?.includes('Bengaluru') || false, `Extracted candidate location: ${parsedData.location}`);
    assert(parsedData.socialLinks.linkedin?.includes('priyasharma-test') || false, 'Extracted LinkedIn profile URL');
    assert(parsedData.socialLinks.github?.includes('priyasharma-dev') || false, 'Extracted GitHub profile URL');
    assert(parsedData.totalExperienceYears >= 5.0, `Calculated non-overlapping total experience: ${parsedData.totalExperienceYears} yrs`);
    assert(parsedData.workHistory.length >= 2, `Parsed structured work history entries: ${parsedData.workHistory.length} roles`);
    assert(parsedData.education.length > 0 && parsedData.education[0].degree.includes('B.Tech'), `Parsed structured education: ${parsedData.education[0]?.degree}`);
    assert(parsedData.provenance.name === 'PARSED' && parsedData.provenance.skills === 'PARSED', 'Accurately tracks data provenance (PARSED)');

    // -------------------------------------------------------------
    // 4. EXPLAINABLE CANDIDATE-JOB MATCH ENGINE
    // -------------------------------------------------------------
    console.log('\n[4] EXPLAINABLE MATCH ENGINE & SCORING');

    // Create test job requisition
    const testJob = await db.recruitmentJob.upsert({
      where: { id: 'JOB-INTEL-TEST' },
      create: {
        id: 'JOB-INTEL-TEST',
        title: 'Lead Full Stack Engineer',
        department: 'Engineering',
        location: 'Bengaluru / Hybrid',
        employmentType: 'FullTime',
        openings: 2,
        applicants: 1,
        status: 'Open',
        postedOn: '17 Aug 2026',
        description: 'Lead engineering team building cloud-native platform',
        requirements: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Kubernetes', 'Go'],
        experience_min: 4.0,
        experience_max: 8.0,
      },
      update: {
        title: 'Lead Full Stack Engineer',
        requirements: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Kubernetes', 'Go'],
        experience_min: 4.0,
        experience_max: 8.0,
      },
    });

    const candidateProfile = {
      name: 'Priya Sharma',
      matchedSkills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker'],
      experience: '6.0 years',
      location: 'Bengaluru, India',
      parsed_resume: parsedData,
    };

    const matchResult = computeMatchScore(candidateProfile, testJob);

    assert(matchResult.overallScore >= 70 && matchResult.overallScore <= 100, `Calculated weighted overall score: ${matchResult.overallScore}%`);
    assert(matchResult.matchedSkills.includes('React') && matchResult.matchedSkills.includes('PostgreSQL'), 'Identified matched skills');
    assert(matchResult.missingSkills.includes('Go'), 'Identified missing skills (Go)');
    assert(matchResult.experienceScore === 100, `Experience score matches senior requirement: ${matchResult.experienceScore}%`);
    assert(matchResult.experienceGap.includes('Exceeds minimum') || matchResult.experienceGap.includes('Matches'), `Generated experience gap analysis: "${matchResult.experienceGap}"`);
    assert(matchResult.explanation.length > 20, `Generated human-readable narrative explanation: "${matchResult.explanation}"`);

    // -------------------------------------------------------------
    // 5. CANDIDATE MATCH PERSISTENCE & DATABASE RECORD
    // -------------------------------------------------------------
    console.log('\n[5] MATCH PERSISTENCE & CANDIDATE MODEL');

    const testCandidate = await db.recruitmentCandidate.upsert({
      where: { id: 'CAN-INTEL-TEST' },
      create: {
        id: 'CAN-INTEL-TEST',
        jobId: testJob.id,
        name: 'Priya Sharma',
        email: 'priya.sharma.test@example.com',
        phone: '+91 9876543210',
        appliedOn: '17 Aug 2026',
        stage: 'Applied',
        score: matchResult.overallScore,
        ai_match_score: matchResult.overallScore,
        experience: '6.0 years',
        currentRole: 'Senior Full Stack Engineer',
        location: 'Bengaluru, India',
        matchedSkills: matchResult.matchedSkills,
        missingSkills: matchResult.missingSkills,
        summary: parsedData.summary,
        parsed_resume: parsedData as any,
        duplicate_key: generateDuplicateKey('priya.sharma.test@example.com', '+91 9876543210', hash1),
      },
      update: {
        score: matchResult.overallScore,
        ai_match_score: matchResult.overallScore,
        matchedSkills: matchResult.matchedSkills,
        missingSkills: matchResult.missingSkills,
        parsed_resume: parsedData as any,
      },
    });

    const persistedMatch = await calculateAndPersistMatch(testCandidate.id, testJob.id);
    assert(persistedMatch.overallScore === matchResult.overallScore, 'Persisted match score in RecruitmentCandidateMatch table');

    const matchDbRecord = await db.recruitmentCandidateMatch.findUnique({
      where: { candidateId_jobId: { candidateId: testCandidate.id, jobId: testJob.id } },
    });
    assert(matchDbRecord !== null && matchDbRecord.engineVersion === 'v1.0', 'Verified RecruitmentCandidateMatch record integrity');

    // -------------------------------------------------------------
    // 6. MULTI-SIGNAL DUPLICATE DETECTION ENGINE
    // -------------------------------------------------------------
    console.log('\n[6] MULTI-SIGNAL DUPLICATE DETECTION ENGINE');

    // Create Candidate Resume Document record for hash checking
    await db.candidateResumeDocument.upsert({
      where: { candidateId: testCandidate.id },
      create: {
        candidateId: testCandidate.id,
        fileName: 'priya_sharma_resume.pdf',
        fileType: 'pdf',
        fileSize: 10240,
        storagePath: 'uploads/resumes/priya_sharma_resume.pdf',
        fileHash: hash1,
        parsingStatus: 'COMPLETED',
        parserVersion: 'v1.0-deterministic',
      },
      update: {
        fileHash: hash1,
      },
    });

    // Check Duplicate by Email
    const dupByEmail = await checkCandidateDuplicates({
      email: 'priya.sharma.test@example.com',
      excludeCandidateId: 'SOME-OTHER-ID',
    });
    assert(dupByEmail.hasDuplicates && dupByEmail.duplicates[0].matchingFields.includes('Email Address'), 'Detects duplicate application by exact email match (HIGH confidence)');

    // Check Duplicate by Phone
    const dupByPhone = await checkCandidateDuplicates({
      phone: '9876543210',
      excludeCandidateId: 'SOME-OTHER-ID',
    });
    assert(dupByPhone.hasDuplicates && dupByPhone.duplicates[0].matchingFields.includes('Phone Number'), 'Detects duplicate application by normalized phone number (HIGH confidence)');

    // Check Duplicate by Resume SHA-256 Hash
    const dupByHash = await checkCandidateDuplicates({
      fileHash: hash1,
      excludeCandidateId: 'SOME-OTHER-ID',
    });
    assert(dupByHash.hasDuplicates && dupByHash.duplicates[0].matchingFields.some((f) => f.includes('Hash')), 'Detects duplicate application by resume file SHA-256 fingerprint');

    // Check Unique Applicant (no false positive)
    const uniqueCheck = await checkCandidateDuplicates({
      email: 'completely.unique.applicant@domain.com',
      phone: '9123456789',
    });
    assert(!uniqueCheck.hasDuplicates, 'Accurately flags unique candidate as non-duplicate');

    // -------------------------------------------------------------
    // 7. CANDIDATE REDISCOVERY & TALENT POOLS
    // -------------------------------------------------------------
    console.log('\n[7] CANDIDATE REDISCOVERY & RECRUITMENT TALENT POOLS');

    // Create a target job for rediscovery
    const targetRediscoveryJob = await db.recruitmentJob.upsert({
      where: { id: 'JOB-TARGET-REDISCOVER' },
      create: {
        id: 'JOB-TARGET-REDISCOVER',
        title: 'Senior TypeScript / React Developer',
        department: 'Product Engineering',
        location: 'Bengaluru / Hybrid',
        employmentType: 'FullTime',
        openings: 1,
        applicants: 0,
        status: 'Open',
        postedOn: '17 Aug 2026',
        description: 'Build enterprise Next.js and TypeScript apps',
        requirements: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
        experience_min: 3.0,
      },
      update: {
        requirements: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
      },
    });

    const realEmp = await db.employee.findFirst({ select: { id: true, department: true, name: true, email: true } });
    const mockAdminUser = {
      id: realEmp?.id || 'EMP-001',
      name: realEmp?.name || 'HR Admin',
      email: realEmp?.email || 'admin@example.com',
      userRole: 'admin' as const,
      department: realEmp?.department || 'HR',
    };

    const redisQuery = await rediscoverCandidatesForJob(targetRediscoveryJob.id, mockAdminUser, { minScore: 50 });
    assert(redisQuery.length > 0 && redisQuery.some((c) => c.candidateId === testCandidate.id), 'Successfully rediscovered matching historical candidate for new requisition');

    const rediscoveredCandidate = redisQuery.find((c) => c.candidateId === testCandidate.id);
    assert(rediscoveredCandidate !== undefined && rediscoveredCandidate.matchScore >= 70, `Calculated fit score against new job: ${rediscoveredCandidate?.matchScore}%`);

    // 1-Click Add Rediscovered Candidate to New Job
    const addedCandidate = await addCandidateToNewJob(testCandidate.id, targetRediscoveryJob.id, mockAdminUser, 'Top rediscovery match for Q3 hiring sprint');
    assert(addedCandidate.id.startsWith('CAN-RED-'), `Added candidate to new job with distinct application ID: ${addedCandidate.id}`);
    assert(addedCandidate.jobId === targetRediscoveryJob.id, 'Candidate linked to target job requisition');
    assert(addedCandidate.tags.includes('Rediscovered'), 'Candidate tagged as "Rediscovered"');

    // Verify Talent Pool Management
    const testPool = await createRecruitmentTalentPool('Senior Full Stack Specialists', 'Curated pipeline of 5+ yrs Node & React engineers', ['FullStack', 'React', 'Node.js'], mockAdminUser);
    assert(testPool.id !== undefined && testPool.name === 'Senior Full Stack Specialists', 'Created Recruitment Talent Pool');

    const membership = await addCandidateToTalentPool(testPool.id, testCandidate.id, 'High priority candidate for future architect roles', mockAdminUser);
    assert(membership.poolId === testPool.id && membership.candidateId === testCandidate.id, 'Added candidate to recruitment talent pool');

    const allPools = await listRecruitmentTalentPools();
    assert(allPools.some((p) => p.id === testPool.id), 'Listed recruitment talent pools with active member tracking');

    // -------------------------------------------------------------
    // CLEANUP TEST ARTIFACTS
    // -------------------------------------------------------------
    console.log('\n[8] CLEANUP');
    await db.recruitmentCandidateMatch.deleteMany({
      where: { candidateId: { in: [testCandidate.id, addedCandidate.id] } },
    });
    await db.candidateResumeDocument.deleteMany({
      where: { candidateId: { in: [testCandidate.id, addedCandidate.id] } },
    });
    await db.recruitmentTalentPoolMember.deleteMany({
      where: { poolId: testPool.id },
    });
    await db.recruitmentTalentPool.deleteMany({
      where: { id: testPool.id },
    });
    await db.candidate_notes.deleteMany({
      where: { candidate_id: { in: [testCandidate.id, addedCandidate.id] } },
    });
    await db.candidate_stage_history.deleteMany({
      where: { candidate_id: { in: [testCandidate.id, addedCandidate.id] } },
    });
    await db.recruitmentCandidate.deleteMany({
      where: { id: { in: [testCandidate.id, addedCandidate.id] } },
    });
    await db.recruitmentJob.deleteMany({
      where: { id: { in: [testJob.id, targetRediscoveryJob.id] } },
    });
    assert(true, 'Test records cleaned up gracefully');

  } catch (err: any) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('\n===============================================================');
  console.log(`  PHASE 4B TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

void runPhase4BVerification();
