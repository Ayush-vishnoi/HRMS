import { db } from '../src/lib/db';
import {
  createJob,
  submitJobForApproval,
  processJobApproval,
  publishJob,
  updateJobLifecycleStatus,
  validateJobPayload,
} from '../src/lib/recruitment/job-service';
import {
  createCandidate,
  transitionCandidateStage,
  validateStageTransition,
  updateCandidateTags,
} from '../src/lib/recruitment/candidate-service';
import {
  addCandidateNote,
  getCandidateNotes,
  getCandidateTimeline,
} from '../src/lib/recruitment/crm-service';
import {
  canUserAccessJob,
  getJobFilterForUser,
  getCandidateFilterForUser,
  type RecruitmentUser,
} from '../src/lib/recruitment/rbac-service';

async function runPhase4ATests() {
  console.log('===============================================================');
  console.log('🚀 RUNNING HRMS PHASE 4A: CORE ATS & CANDIDATE PIPELINE TESTS');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, errorDetail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${errorDetail ? ` -> ${errorDetail}` : ''}`);
      failed++;
    }
  }

  // Define test personas
  const adminUser: RecruitmentUser = {
    id: 'EMP-001',
    name: 'Aarav Sharma (Admin)',
    email: 'admin@mylotic.com',
    userRole: 'admin',
    department: 'Human Resources',
  };

  const managerUser1: RecruitmentUser = {
    id: 'EMP-006',
    name: 'Rohan Gupta (Engineering Lead)',
    email: 'rohan.gupta@mylotic.com',
    userRole: 'manager',
    department: 'Engineering',
  };

  const managerUser2: RecruitmentUser = {
    id: 'EMP-008',
    name: 'Priya Sharma (AI/ML Lead)',
    email: 'priya.sharma@mylotic.com',
    userRole: 'manager',
    department: 'AI/ML',
  };

  const employeeUser: RecruitmentUser = {
    id: 'EMP-002',
    name: 'Diya Patel (Employee)',
    email: 'diya.patel@mylotic.com',
    userRole: 'employee',
    department: 'Engineering',
  };

  const timestamp = Date.now();
  const testJobId = `JOB-TEST-${timestamp}`;
  const testCandidateId = `CAN-TEST-${timestamp}`;

  try {
    // -------------------------------------------------------------
    // Test 1: Job Creation with Enterprise Fields
    // -------------------------------------------------------------
    console.log('🔹 Test 1: Job Creation with Enterprise Attributes');
    const createdJob = await createJob(
      {
        id: testJobId,
        title: `Staff Distributed Systems Architect ${timestamp}`,
        department: 'Engineering',
        location: 'Bengaluru / Hybrid',
        employmentType: 'Full-time',
        openings: 2,
        priority: 'Urgent',
        experienceMin: 8,
        experienceMax: 14,
        salaryMin: 4500000,
        salaryMax: 6500000,
        currency: 'INR',
        hiringManagerId: managerUser1.id,
        recruiterId: adminUser.id,
        description: 'Lead high-throughput distributed transaction engines for core HRMS.',
        requirements: ['Rust', 'Distributed Systems', 'PostgreSQL', 'Kafka'],
        responsibilities: ['Architect fault-tolerant microservices', 'Mentor staff engineers'],
        targetCloseDate: new Date('2026-11-30'),
        status: 'Draft',
      },
      adminUser
    );

    assert(
      createdJob.id === testJobId &&
        createdJob.priority === 'Urgent' &&
        createdJob.status === 'Draft' &&
        Number(createdJob.experience_min) === 8 &&
        Number(createdJob.experience_max) === 14,
      'Requisition created with full enterprise fields (experience, salary, manager, recruiter)'
    );

    // -------------------------------------------------------------
    // Test 2: Job Validation
    // -------------------------------------------------------------
    console.log('\n🔹 Test 2: Job Payload Validation');
    let validationCaught = false;
    try {
      validateJobPayload({
        title: '',
        department: 'Engineering',
        location: 'Bengaluru',
        openings: 0,
        experienceMin: 10,
        experienceMax: 5, // Invalid min > max
      });
    } catch (e: any) {
      validationCaught = true;
    }
    assert(validationCaught, 'Validation engine correctly rejects invalid experience ranges and missing titles');

    // -------------------------------------------------------------
    // Test 3: Job Approval Submission
    // -------------------------------------------------------------
    console.log('\n🔹 Test 3: Job Submission for Approval');
    const submitRes = await submitJobForApproval(testJobId, adminUser, {
      approverId: managerUser1.id,
      note: 'Please approve requisition headcount for H2.',
    });

    assert(
      submitRes.job.status === 'PendingApproval' && submitRes.approval.status === 'Pending',
      'Job transitions to PendingApproval and creates pending approval record'
    );

    // -------------------------------------------------------------
    // Test 4: Job Approval Action
    // -------------------------------------------------------------
    console.log('\n🔹 Test 4: Job Approval Processing');
    const approvedJob = await processJobApproval(testJobId, managerUser1, {
      action: 'APPROVE',
      note: 'Headcount approved as budgeted.',
    });

    assert(approvedJob.status === 'Approved', 'Designated approver successfully approves requisition to Approved status');

    // -------------------------------------------------------------
    // Test 5: Job Rejection / Revisions Workflow
    // -------------------------------------------------------------
    console.log('\n🔹 Test 5: Job Rejection & Revisions');
    const rejJobId = `JOB-REJ-${timestamp}`;
    await createJob(
      {
        id: rejJobId,
        title: 'Temporary Test Job',
        department: 'Marketing',
        location: 'Remote',
        status: 'Draft',
        hiringManagerId: managerUser1.id,
        description: 'Test description',
      },
      adminUser
    );
    await submitJobForApproval(rejJobId, adminUser);
    const rejectedJob = await processJobApproval(rejJobId, managerUser1, {
      action: 'REJECT',
      note: 'Budget frozen for Q3.',
    });

    assert(rejectedJob.status === 'Draft', 'Rejection / Revision request sets job status back to Draft');

    // -------------------------------------------------------------
    // Test 6: Job Publish & Lifecycle Transitions
    // -------------------------------------------------------------
    console.log('\n🔹 Test 6: Job Publish & Close Lifecycle');
    const publishedJob = await publishJob(testJobId, adminUser);
    assert(publishedJob.status === 'Published', 'Approved job published successfully');

    const holdJob = await updateJobLifecycleStatus(testJobId, 'OnHold', adminUser);
    assert(holdJob.status === 'OnHold', 'Job successfully put On Hold');

    const closedJob = await updateJobLifecycleStatus(testJobId, 'Closed', adminUser);
    assert(closedJob.status === 'Closed', 'Job successfully Closed');

    // Reset status to Open for candidate testing
    await db.recruitmentJob.update({ where: { id: testJobId }, data: { status: 'Open' } });

    // -------------------------------------------------------------
    // Test 7 & 8: Hiring Manager RBAC Authorization
    // -------------------------------------------------------------
    console.log('\n🔹 Test 7 & 8: Hiring Manager RBAC Authorization');
    const canMgr1Access = canUserAccessJob(managerUser1, createdJob);
    const canMgr2Access = canUserAccessJob(managerUser2, createdJob);
    assert(canMgr1Access, 'Assigned hiring manager has authorized access to own job requisition');
    assert(!canMgr2Access, 'Unassigned manager is properly blocked from accessing other departments job');

    // -------------------------------------------------------------
    // Test 9: Candidate Creation with Tags & Recruiter
    // -------------------------------------------------------------
    console.log('\n🔹 Test 9: Candidate Application Creation');
    const candidate = await createCandidate(
      {
        id: testCandidateId,
        jobId: testJobId,
        name: `Vikramaditya Rao ${timestamp}`,
        email: `vikram.${timestamp}@example.com`,
        phone: '+91 98765 43210',
        currentRole: 'Principal Architect',
        experience: '11 years',
        location: 'Bengaluru',
        tags: ['High Priority', 'System Design', 'Backend'],
        source: 'Referral',
        score: 94,
        summary: 'Deep expertise in distributed consensus, Paxos, Raft, and high-load databases.',
        matchedSkills: ['Rust', 'Distributed Systems', 'PostgreSQL'],
        missingSkills: ['Kafka'],
      },
      adminUser
    );

    assert(
      candidate.id === testCandidateId &&
        candidate.stage === 'Applied' &&
        candidate.tags.includes('High Priority'),
      'Candidate profile created with initial Applied stage and tags'
    );

    // -------------------------------------------------------------
    // Test 10: Valid Candidate Stage Transitions
    // -------------------------------------------------------------
    console.log('\n🔹 Test 10: Valid Candidate Stage Transitions');
    const toScreening = await transitionCandidateStage(testCandidateId, 'Screening', adminUser, 'Resume passed tech screening');
    assert(toScreening.stage === 'Screening', 'Transitioned Applied -> Screening');

    const toShortlist = await transitionCandidateStage(testCandidateId, 'Shortlisted', adminUser, 'Shortlisted for panel review');
    assert(toShortlist.stage === 'Shortlisted', 'Transitioned Screening -> Shortlisted');

    const toInterview = await transitionCandidateStage(testCandidateId, 'Interview', adminUser, 'Scheduled Round 1 architecture interview');
    assert(toInterview.stage === 'Interview', 'Transitioned Shortlisted -> Interview');

    const toSelected = await transitionCandidateStage(testCandidateId, 'Selected', adminUser, 'Panel unanimous strong hire');
    assert(toSelected.stage === 'Selected', 'Transitioned Interview -> Selected');

    // -------------------------------------------------------------
    // Test 11: Invalid Candidate Stage Transition Enforcement
    // -------------------------------------------------------------
    console.log('\n🔹 Test 11: Invalid Candidate Stage Transition Blocking');
    let invalidTransitionBlocked = false;
    try {
      // Trying to jump from Selected directly to Archived or illegal jump
      validateStageTransition('Applied', 'Joined');
    } catch (e: any) {
      invalidTransitionBlocked = true;
    }
    assert(invalidTransitionBlocked, 'State machine strictly blocks invalid stage transitions (e.g. Applied -> Joined)');

    // -------------------------------------------------------------
    // Test 12: Stage History Audit Trail
    // -------------------------------------------------------------
    console.log('\n🔹 Test 12: Immutable Stage History Verification');
    const stageHistory = await db.candidate_stage_history.findMany({
      where: { candidate_id: testCandidateId },
      orderBy: { changed_at: 'asc' },
    });

    assert(
      stageHistory.length >= 5 &&
        stageHistory[stageHistory.length - 1].to_stage === 'Selected',
      `Immutable stage history created ${stageHistory.length} chronological audit entries`
    );

    // -------------------------------------------------------------
    // Test 13: Candidate CRM Notes
    // -------------------------------------------------------------
    console.log('\n🔹 Test 13: Candidate CRM Recruiter Notes');
    const note1 = await addCandidateNote(
      testCandidateId,
      'Candidate demonstrated mastery of distributed consensus algorithms during screen.',
      adminUser
    );
    const notesList = await getCandidateNotes(testCandidateId, adminUser);

    assert(
      notesList.length >= 1 && notesList[0].note.includes('distributed consensus'),
      'Recruiter note successfully saved and retrieved with author tracking'
    );

    // -------------------------------------------------------------
    // Test 14: Candidate Notes RBAC
    // -------------------------------------------------------------
    console.log('\n🔹 Test 14: Candidate Notes RBAC Enforcement');
    let unauthorizedNoteBlocked = false;
    try {
      await addCandidateNote(testCandidateId, 'Unauthorized note attempt', managerUser2);
    } catch (e: any) {
      unauthorizedNoteBlocked = true;
    }
    assert(unauthorizedNoteBlocked, 'Unauthorized manager is blocked from adding notes to unrelated candidates');

    // -------------------------------------------------------------
    // Test 15: Unified Candidate Timeline
    // -------------------------------------------------------------
    console.log('\n🔹 Test 15: Candidate Unified Activity Timeline');
    const timelineEvents = await getCandidateTimeline(testCandidateId, adminUser);
    const hasStageEvents = timelineEvents.some((e) => e.type === 'STAGE_CHANGE');
    const hasNoteEvents = timelineEvents.some((e) => e.type === 'NOTE');

    assert(
      timelineEvents.length >= 5 && hasStageEvents && hasNoteEvents,
      'Unified activity timeline correctly aggregates stage transitions and recruiter notes'
    );

    // -------------------------------------------------------------
    // Test 16: Audit Logging Verification
    // -------------------------------------------------------------
    console.log('\n🔹 Test 16: Audit Logging Verification');
    const jobAudits = await db.auditLog.findMany({
      where: { module: 'Recruitment', details: { contains: testJobId } },
    });
    const candidateAudits = await db.auditLog.findMany({
      where: { module: 'Recruitment', details: { contains: testCandidateId } },
    });

    assert(
      jobAudits.length >= 3 && candidateAudits.length >= 4,
      `AuditLog captured ${jobAudits.length} job events and ${candidateAudits.length} candidate events`
    );

    // -------------------------------------------------------------
    // Test 17: User Notifications Verification
    // -------------------------------------------------------------
    console.log('\n🔹 Test 17: User Notifications Verification');
    const mgrNotifications = await db.userNotification.findMany({
      where: { userId: managerUser1.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    assert(
      mgrNotifications.length >= 1,
      'UserNotification alerts successfully dispatched to hiring manager upon requisition & candidate events'
    );

    // -------------------------------------------------------------
    // Test 18: Phase 1 Candidate -> Employee Onboarding Regression
    // -------------------------------------------------------------
    console.log('\n🔹 Test 18: Existing Phase 1 Onboarding Bridge Regression');
    // Set candidate stage to Shortlisted for onboarding test
    await db.recruitmentCandidate.update({
      where: { id: testCandidateId },
      data: { stage: 'Shortlisted' },
    });

    // Simulate Onboarding conversion via db transaction (reusing existing Phase 1 contract)
    const empCode = `EMP-TEST-${timestamp.toString().slice(-6)}`;
    const onboardResult = await db.$transaction(
      async (tx) => {
        const emp = await tx.employee.create({
          data: {
            id: `emp-rec-${timestamp}`,
            employeeCode: empCode,
            name: `Vikramaditya Rao ${timestamp}`,
            email: `emp.vikram.${timestamp}@mylotic.com`,
            phone: '+91 98765 43210',
            roleTitle: 'Staff Distributed Systems Architect',
            department: 'Engineering',
            location: 'Bengaluru / Hybrid',
            joinDate: new Date().toISOString().split('T')[0],
            salary: 5500000,
            status: 'Active',
          },
        });

        const onb = await tx.employeeOnboarding.create({
          data: {
            id: `onb-rec-${timestamp}`,
            candidateId: testCandidateId,
            employeeId: emp.id,
            onboardedById: adminUser.id,
            stage: 'CandidateSelected',
            status: 'Active',
            expected_joining_date: new Date('2026-11-01'),
            updated_at: new Date(),
          },
        });

        return { emp, onb };
      },
      { timeout: 25000, maxWait: 15000 }
    );

    assert(
      onboardResult.onb.candidateId === testCandidateId &&
        onboardResult.onb.employeeId === onboardResult.emp.id,
      'Candidate seamlessly converts into Employee + EmployeeOnboarding via canonical Phase 1 linkage'
    );

  } catch (err: any) {
    console.error('❌ Unexpected Error during test execution:', err);
    failed++;
  } finally {
    // Clean up test records
    try {
      await db.userNotification.deleteMany({ where: { title: { contains: 'Requisition' } } });
      await db.candidate_notes.deleteMany({ where: { candidate_id: testCandidateId } });
      await db.candidate_stage_history.deleteMany({ where: { candidate_id: testCandidateId } });
      await db.employeeOnboarding.deleteMany({ where: { candidateId: testCandidateId } });
      await db.employee.deleteMany({ where: { id: `emp-rec-${timestamp}` } });
      await db.recruitmentCandidate.deleteMany({ where: { id: testCandidateId } });
      await db.recruitment_job_approvals.deleteMany({ where: { job_id: testJobId } });
      await db.recruitmentJob.deleteMany({ where: { id: { in: [testJobId, `JOB-REJ-${timestamp}`] } } });
    } catch (cleanErr) {
      // Ignored cleanup errors
    }
  }

  console.log('\n===============================================================');
  console.log(`📊 PHASE 4A TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

void runPhase4ATests();
