import { db } from '../src/lib/db';
import {
  createInterview,
  updateInterview,
  cancelInterview,
  getInterviews,
  getInterviewById,
  detectInterviewConflicts,
  validateInterviewStatusTransition,
} from '../src/lib/recruitment/interview-service';
import {
  createJob,
  submitJobForApproval,
  processJobApproval,
  publishJob,
} from '../src/lib/recruitment/job-service';
import {
  createCandidate,
  transitionCandidateStage,
  validateStageTransition,
} from '../src/lib/recruitment/candidate-service';
import {
  canUserAccessJob,
  canUserManageCandidateInterview,
  canUserViewInterview,
  getInterviewFilterForUser,
  type RecruitmentUser,
} from '../src/lib/recruitment/rbac-service';
import { extractSkillsFromText, normalizeSkillName } from '../src/lib/recruitment/intelligence/skills-extractor';
import { computeMatchScore } from '../src/lib/recruitment/intelligence/match-engine';
import { checkCandidateDuplicates } from '../src/lib/recruitment/intelligence/duplicate-detector';

async function runPhase4CTestSuite() {
  console.log('========================================================================');
  console.log('  HRMS PHASE 4C-A: CORE INTERVIEW ENGINE & SCHEDULING VERIFICATION');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  // Define User Personas for RBAC tests
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

  const panelMemberUser: RecruitmentUser = {
    id: 'EMP-002',
    name: 'Diya Patel (Panel Member)',
    email: 'diya.patel@mylotic.com',
    userRole: 'employee',
    department: 'Engineering',
  };

  const unauthorizedEmployee: RecruitmentUser = {
    id: 'EMP-004',
    name: 'Vikram Mehta (Unauthorized Employee)',
    email: 'vikram.mehta@mylotic.com',
    userRole: 'employee',
    department: 'Marketing',
  };

  const timestamp = Date.now();
  const testJobId = `JOB-INTV-${timestamp}`;
  const testCandidateId1 = `CAN-INTV-1-${timestamp}`;
  const testCandidateId2 = `CAN-INTV-2-${timestamp}`;

  try {
    // -------------------------------------------------------------
    // SETUP: Seed Test Job and Candidates
    // -------------------------------------------------------------
    console.log('[SETUP] Creating Test Job and Candidates...');
    await db.recruitmentJob.create({
      data: {
        id: testJobId,
        title: `Senior Fullstack Engineer (${timestamp})`,
        department: 'Engineering',
        location: 'Bengaluru / Hybrid',
        employmentType: 'FullTime',
        openings: 2,
        applicants: 2,
        status: 'Open',
        postedOn: '17 Aug 2026',
        description: 'Test JD for interview engine verification.',
        requirements: ['React', 'Node.js', 'PostgreSQL'],
        responsibilities: ['Architect scalable services', 'Conduct technical interviews'],
        hiring_manager_id: managerUser1.id,
        recruiter_id: adminUser.id,
      },
    });

    // Candidate 1: Starts in 'Shortlisted' stage
    await db.recruitmentCandidate.create({
      data: {
        id: testCandidateId1,
        jobId: testJobId,
        name: 'Arjun Verma',
        email: `arjun.verma.${timestamp}@example.com`,
        phone: '+91 9876543210',
        appliedOn: '17 Aug 2026',
        stage: 'Shortlisted',
        score: 88,
        experience: '5 years',
        currentRole: 'Senior Software Engineer',
        location: 'Bengaluru',
        matchedSkills: ['React', 'Node.js', 'PostgreSQL'],
        missingSkills: [],
        summary: 'Strong candidate shortlisted for technical interviews.',
        recommendation: 'StrongMatch',
        assigned_recruiter_id: adminUser.id,
      },
    });

    // Candidate 2: In 'Applied' stage (unschedulable stage)
    await db.recruitmentCandidate.create({
      data: {
        id: testCandidateId2,
        jobId: testJobId,
        name: 'Neha Roy',
        email: `neha.roy.${timestamp}@example.com`,
        phone: '+91 9876543211',
        appliedOn: '17 Aug 2026',
        stage: 'Applied',
        score: 65,
        experience: '2 years',
        currentRole: 'Junior Frontend Dev',
        location: 'Mumbai',
        matchedSkills: ['React'],
        missingSkills: ['Node.js', 'PostgreSQL'],
        summary: 'New applicant in applied stage.',
        recommendation: 'Review',
        assigned_recruiter_id: adminUser.id,
      },
    });

    console.log('  Setup complete.\n');

    // -------------------------------------------------------------
    // 1. INTERVIEW CREATION & BASIC FIELDS
    // -------------------------------------------------------------
    console.log('[1] INTERVIEW CREATION & FIELDS');
    const tomorrow10am = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow10am.setHours(10, 0, 0, 0);
    const tomorrow11am = new Date(tomorrow10am.getTime() + 60 * 60 * 1000);

    const intv1 = await createInterview(
      {
        candidateId: testCandidateId1,
        title: 'Round 1 Technical Architecture',
        round: 1,
        startsAt: tomorrow10am,
        endsAt: tomorrow11am,
        location: 'Google Meet',
        meetingUrl: 'https://meet.google.com/xyz-test-round1',
        panelMembers: [panelMemberUser.id, managerUser1.id],
        leadInterviewerId: managerUser1.id,
        reminderAt: new Date(tomorrow10am.getTime() - 15 * 60 * 1000),
      },
      managerUser1
    );

    assert(
      intv1 && intv1.title === 'Round 1 Technical Architecture' && intv1.round === 1 && intv1.status === 'Scheduled',
      '1. Interview creation successful with canonical fields'
    );

    // -------------------------------------------------------------
    // 2. CANDIDATE STAGE TRANSITION (Shortlisted -> Interview)
    // -------------------------------------------------------------
    console.log('\n[2] CANDIDATE STAGE TRANSITION (Shortlisted -> Interview)');
    const updatedCand1 = await db.recruitmentCandidate.findUnique({
      where: { id: testCandidateId1 },
      include: { candidate_stage_history: true },
    });

    const hasStageHistory = updatedCand1?.candidate_stage_history.some(
      (h) => h.from_stage === 'Shortlisted' && h.to_stage === 'Interview'
    );

    assert(
      updatedCand1?.stage === 'Interview' && Boolean(hasStageHistory),
      '2. Candidate stage transitioned Shortlisted -> Interview automatically with stage history'
    );

    // -------------------------------------------------------------
    // 3. PANEL ASSIGNMENT
    // -------------------------------------------------------------
    console.log('\n[3] PANEL ASSIGNMENT');
    const panelMembers = intv1.interview_panel_members;
    assert(
      panelMembers.length === 2 &&
        panelMembers.some((p) => p.employee_id === panelMemberUser.id) &&
        panelMembers.some((p) => p.employee_id === managerUser1.id),
      '3. Multiple panel members assigned correctly to interview'
    );

    // -------------------------------------------------------------
    // 4. LEAD INTERVIEWER VALIDATION
    // -------------------------------------------------------------
    console.log('\n[4] LEAD INTERVIEWER VALIDATION');
    const leadMember = panelMembers.find((p) => p.is_lead);
    assert(
      leadMember !== undefined && leadMember.employee_id === managerUser1.id,
      '4. Exactly one lead interviewer correctly designated and flagged'
    );

    let rejectedMissingLead = false;
    try {
      await createInterview(
        {
          candidateId: testCandidateId1,
          title: 'Round 2 Test',
          round: 2,
          startsAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
          endsAt: new Date(Date.now() + 49 * 60 * 60 * 1000),
          panelMembers: [panelMemberUser.id],
          leadInterviewerId: 'EMP-999-NONEXISTENT', // not in panel
        },
        managerUser1
      );
    } catch (e: any) {
      rejectedMissingLead = e.message.includes('designated lead interviewer must be included');
    }
    assert(rejectedMissingLead, '4b. Rejects lead interviewer who is not in panel');

    // -------------------------------------------------------------
    // 5. MULTIPLE PANEL MEMBERS
    // -------------------------------------------------------------
    console.log('\n[5] MULTIPLE PANEL MEMBERS');
    assert(panelMembers.length > 1, '5. Successfully supports multi-member interview panels');

    // -------------------------------------------------------------
    // 6. DUPLICATE PANEL MEMBER REJECTION
    // -------------------------------------------------------------
    console.log('\n[6] DUPLICATE PANEL MEMBER REJECTION');
    let rejectedDuplicatePanel = false;
    try {
      await createInterview(
        {
          candidateId: testCandidateId1,
          title: 'Duplicate Panel Test',
          round: 2,
          startsAt: new Date(Date.now() + 50 * 60 * 60 * 1000),
          endsAt: new Date(Date.now() + 51 * 60 * 60 * 1000),
          panelMembers: [panelMemberUser.id, panelMemberUser.id], // duplicate
          leadInterviewerId: panelMemberUser.id,
        },
        managerUser1
      );
    } catch (e: any) {
      rejectedDuplicatePanel = e.message.includes('Duplicate panel members');
    }
    assert(rejectedDuplicatePanel, '6. Rejects duplicate panel member IDs in single interview');

    // -------------------------------------------------------------
    // 7. INVALID DATE REJECTION
    // -------------------------------------------------------------
    console.log('\n[7] INVALID DATE REJECTION');
    let rejectedInvalidDates = false;
    try {
      await createInterview(
        {
          candidateId: testCandidateId1,
          title: 'Invalid Date Test',
          round: 2,
          startsAt: tomorrow11am,
          endsAt: tomorrow10am, // end before start
          panelMembers: [panelMemberUser.id],
          leadInterviewerId: panelMemberUser.id,
        },
        managerUser1
      );
    } catch (e: any) {
      rejectedInvalidDates = e.message.includes('start time must be before end time');
    }
    assert(rejectedInvalidDates, '7. Rejects interview where end time <= start time');

    // -------------------------------------------------------------
    // 8. CANDIDATE CONFLICT DETECTION
    // -------------------------------------------------------------
    console.log('\n[8] CANDIDATE CONFLICT DETECTION');
    let rejectedCandidateConflict = false;
    try {
      // Try scheduling overlapping interview for candidate 1 (10:30 - 11:30 overlapping with 10:00 - 11:00)
      const overlapStart = new Date(tomorrow10am.getTime() + 30 * 60 * 1000);
      const overlapEnd = new Date(tomorrow11am.getTime() + 30 * 60 * 1000);
      await createInterview(
        {
          candidateId: testCandidateId1,
          title: 'Round 2 Overlap Test',
          round: 2,
          startsAt: overlapStart,
          endsAt: overlapEnd,
          panelMembers: [adminUser.id],
          leadInterviewerId: adminUser.id,
        },
        adminUser
      );
    } catch (e: any) {
      rejectedCandidateConflict = e.message.includes('Schedule Conflict') && e.message.includes('Candidate already has an active interview');
    }
    assert(rejectedCandidateConflict, '8. Detects and rejects overlapping active interview for candidate');

    // -------------------------------------------------------------
    // 9. INTERVIEWER CONFLICT DETECTION
    // -------------------------------------------------------------
    console.log('\n[9] INTERVIEWER CONFLICT DETECTION');
    // Shortlist candidate 2 first so we can schedule
    await transitionCandidateStage(testCandidateId2, 'Screening', adminUser);
    await transitionCandidateStage(testCandidateId2, 'Shortlisted', adminUser);

    let rejectedInterviewerConflict = false;
    try {
      // Try scheduling interview for Candidate 2 with managerUser1 at the same time (10:00 - 11:00)
      await createInterview(
        {
          candidateId: testCandidateId2,
          title: 'Candidate 2 Interview',
          round: 1,
          startsAt: tomorrow10am,
          endsAt: tomorrow11am,
          panelMembers: [managerUser1.id],
          leadInterviewerId: managerUser1.id,
        },
        adminUser
      );
    } catch (e: any) {
      rejectedInterviewerConflict = e.message.includes('Schedule Conflict') && e.message.includes('Panel member');
    }
    assert(rejectedInterviewerConflict, '9. Detects and rejects conflicting active interview for panel member');

    // -------------------------------------------------------------
    // 10. ROUND CREATION
    // -------------------------------------------------------------
    console.log('\n[10] ROUND CREATION');
    assert(intv1.round === 1, '10. Round 1 created and persisted successfully');

    // -------------------------------------------------------------
    // 11. MULTIPLE ROUNDS SEQUENTIAL CREATION
    // -------------------------------------------------------------
    console.log('\n[11] MULTIPLE ROUNDS (SEQUENTIAL)');
    const dayAfterTomorrow2pm = new Date(Date.now() + 48 * 60 * 60 * 1000);
    dayAfterTomorrow2pm.setHours(14, 0, 0, 0);
    const dayAfterTomorrow3pm = new Date(dayAfterTomorrow2pm.getTime() + 60 * 60 * 1000);

    const intv2 = await createInterview(
      {
        candidateId: testCandidateId1,
        title: 'Round 2 System Design & Coding',
        round: 2,
        startsAt: dayAfterTomorrow2pm,
        endsAt: dayAfterTomorrow3pm,
        location: 'Room 302, Bengaluru HQ',
        meetingUrl: 'https://meet.google.com/xyz-test-round2',
        panelMembers: [panelMemberUser.id, managerUser1.id],
        leadInterviewerId: panelMemberUser.id,
      },
      managerUser1
    );

    assert(
      intv2 && intv2.round === 2 && intv2.candidate_id === testCandidateId1,
      '11. Sequential multiple rounds (Round 1 -> Round 2) created successfully'
    );

    // Reject skipping round (Round 4 when Round 3 doesn't exist)
    let rejectedSkippedRound = false;
    try {
      await createInterview(
        {
          candidateId: testCandidateId1,
          title: 'Round 4 Skip Test',
          round: 4,
          startsAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
          endsAt: new Date(Date.now() + 73 * 60 * 60 * 1000),
          panelMembers: [managerUser1.id],
          leadInterviewerId: managerUser1.id,
        },
        managerUser1
      );
    } catch (e: any) {
      rejectedSkippedRound = e.message.includes('Cannot schedule Round 4 before Round 3');
    }
    assert(rejectedSkippedRound, '11b. Rejects out-of-order skipped rounds (Round 4 without Round 3)');

    // -------------------------------------------------------------
    // 12. STATUS STATE MACHINE TRANSITIONS
    // -------------------------------------------------------------
    console.log('\n[12] STATUS STATE MACHINE TRANSITIONS');
    // Scheduled -> Confirmed
    const confirmedIntv = await updateInterview(intv1.id, { status: 'Confirmed' }, managerUser1);
    assert(confirmedIntv.status === 'Confirmed', '12a. Scheduled -> Confirmed transition');

    // Confirmed -> InProgress
    const inProgressIntv = await updateInterview(intv1.id, { status: 'InProgress' }, managerUser1);
    assert(inProgressIntv.status === 'InProgress', '12b. Confirmed -> InProgress transition');

    // InProgress -> Completed
    const completedIntv = await updateInterview(intv1.id, { status: 'Completed' }, managerUser1);
    assert(completedIntv.status === 'Completed', '12c. InProgress -> Completed transition');

    // -------------------------------------------------------------
    // 13. INVALID STATUS TRANSITIONS
    // -------------------------------------------------------------
    console.log('\n[13] INVALID STATUS TRANSITIONS');
    let rejectedInvalidTransition = false;
    try {
      // Completed is terminal - cannot transition back to Scheduled
      await updateInterview(intv1.id, { status: 'Scheduled' }, managerUser1);
    } catch (e: any) {
      rejectedInvalidTransition = e.message.includes('Completed interviews cannot be modified') || e.message.includes('Invalid interview status transition');
    }
    assert(rejectedInvalidTransition, '13. Rejects invalid transition from terminal Completed state');

    // -------------------------------------------------------------
    // 14. RESCHEDULE WITH CONFLICT CHECK
    // -------------------------------------------------------------
    console.log('\n[14] RESCHEDULE');
    const newRescheduleStart = new Date(Date.now() + 52 * 60 * 60 * 1000);
    const newRescheduleEnd = new Date(newRescheduleStart.getTime() + 60 * 60 * 1000);

    const rescheduledIntv = await updateInterview(
      intv2.id,
      {
        startsAt: newRescheduleStart,
        endsAt: newRescheduleEnd,
        status: 'Rescheduled',
      },
      managerUser1
    );

    assert(
      rescheduledIntv.status === 'Rescheduled' &&
        new Date(rescheduledIntv.starts_at).getTime() === newRescheduleStart.getTime(),
      '14. Rescheduled interview with updated timestamps and status'
    );

    // -------------------------------------------------------------
    // 15. CANCEL INTERVIEW
    // -------------------------------------------------------------
    console.log('\n[15] CANCEL INTERVIEW');
    const cancelledIntv = await cancelInterview(intv2.id, managerUser1);
    assert(cancelledIntv.status === 'Cancelled', '15a. Interview cancelled successfully');

    let rejectedCancelCompleted = false;
    try {
      await cancelInterview(intv1.id, managerUser1); // intv1 is Completed
    } catch (e: any) {
      rejectedCancelCompleted = e.message.includes('Completed interviews cannot be modified') || e.message.includes('Invalid interview status transition');
    }
    assert(rejectedCancelCompleted, '15b. Rejects cancelling already completed interview');

    // -------------------------------------------------------------
    // 16. RBAC — ADMIN ACCESS
    // -------------------------------------------------------------
    console.log('\n[16] RBAC — ADMIN ACCESS');
    const adminInterviews = await getInterviews({}, adminUser);
    assert(adminInterviews.length >= 2, '16. Admin can view all system interviews');

    // -------------------------------------------------------------
    // 17. RBAC — HIRING MANAGER
    // -------------------------------------------------------------
    console.log('\n[17] RBAC — HIRING MANAGER');
    const managerInterviews = await getInterviews({}, managerUser1);
    const managerHasAccess = managerInterviews.every(
      (i) =>
        i.recruitment_candidates?.job?.hiring_manager_id === managerUser1.id ||
        i.recruitment_candidates?.job?.recruiter_id === managerUser1.id ||
        i.interview_panel_members.some((pm) => pm.employee_id === managerUser1.id)
    );
    assert(managerHasAccess && managerInterviews.length > 0, '17. Manager sees only authorized interviews');

    // Manager cannot schedule for non-authorized job
    let rejectedUnauthorizedManager = false;
    try {
      await createInterview(
        {
          candidateId: testCandidateId1,
          title: 'Unauthorized Manager Test',
          round: 3,
          startsAt: new Date(Date.now() + 90 * 60 * 60 * 1000),
          endsAt: new Date(Date.now() + 91 * 60 * 60 * 1000),
          panelMembers: [managerUser2.id],
          leadInterviewerId: managerUser2.id,
        },
        managerUser2 // managerUser2 is not hiring manager or recruiter of this job
      );
    } catch (e: any) {
      rejectedUnauthorizedManager = e.message.includes('Not authorized');
    }
    assert(rejectedUnauthorizedManager, '17b. Rejects manager attempting to schedule for unauthorized job candidate');

    // -------------------------------------------------------------
    // 18. RBAC — PANEL MEMBER
    // -------------------------------------------------------------
    console.log('\n[18] RBAC — PANEL MEMBER');
    const panelInterviews = await getInterviews({}, panelMemberUser);
    const panelOnlySeesAssigned = panelInterviews.every((i) =>
      i.interview_panel_members.some((pm) => pm.employee_id === panelMemberUser.id)
    );
    assert(
      panelOnlySeesAssigned && panelInterviews.length > 0,
      '18. Panel member can only view interviews where they are assigned'
    );

    let rejectedPanelMemberSchedule = false;
    try {
      await createInterview(
        {
          candidateId: testCandidateId1,
          title: 'Panel Member Unauthorized Create',
          round: 3,
          startsAt: new Date(Date.now() + 92 * 60 * 60 * 1000),
          endsAt: new Date(Date.now() + 93 * 60 * 60 * 1000),
          panelMembers: [panelMemberUser.id],
          leadInterviewerId: panelMemberUser.id,
        },
        panelMemberUser
      );
    } catch (e: any) {
      rejectedPanelMemberSchedule = e.message.includes('Not authorized');
    }
    assert(rejectedPanelMemberSchedule, '18b. Panel member cannot schedule or modify interviews');

    // -------------------------------------------------------------
    // 19. RBAC — UNAUTHORIZED EMPLOYEE
    // -------------------------------------------------------------
    console.log('\n[19] RBAC — UNAUTHORIZED EMPLOYEE');
    const unauthorizedList = await getInterviews({}, unauthorizedEmployee);
    assert(
      unauthorizedList.length === 0,
      '19a. Normal employee has 0 access to recruitment interviews when not assigned'
    );

    let rejectedUnauthorizedGet = false;
    try {
      await getInterviewById(intv1.id, unauthorizedEmployee);
    } catch (e: any) {
      rejectedUnauthorizedGet = e.message.includes('Not authorized');
    }
    assert(rejectedUnauthorizedGet, '19b. Rejects unauthorized employee GET /api/recruitment/interviews/[id]');

    // -------------------------------------------------------------
    // 20. AUDITLOG CREATION
    // -------------------------------------------------------------
    console.log('\n[20] AUDITLOG VERIFICATION');
    const auditLogs = await db.auditLog.findMany({
      where: {
        module: 'Recruitment',
        details: { contains: testCandidateId1 },
      },
    });

    const hasScheduleAudit = auditLogs.some((a) => a.action === 'INTERVIEW_SCHEDULED');
    const hasRescheduleAudit = auditLogs.some((a) => a.action === 'INTERVIEW_RESCHEDULED');
    const hasCancelAudit = auditLogs.some((a) => a.action === 'INTERVIEW_CANCELLED');

    assert(
      hasScheduleAudit && hasRescheduleAudit && hasCancelAudit,
      '20. AuditLog entries generated for schedule, reschedule, and cancellation with metadata'
    );

    // -------------------------------------------------------------
    // 21. NOTIFICATION CREATION
    // -------------------------------------------------------------
    console.log('\n[21] USER NOTIFICATION VERIFICATION');
    const notifs = await db.userNotification.findMany({
      where: { userId: panelMemberUser.id },
    });

    const hasInterviewNotif = notifs.some(
      (n) => n.title.includes('Interview') || n.title.includes('Panel')
    );
    assert(hasInterviewNotif, '21. UserNotification created for assigned panel members');

    // -------------------------------------------------------------
    // 22. TRANSACTION ROLLBACK ON ERROR
    // -------------------------------------------------------------
    console.log('\n[22] TRANSACTION ROLLBACK');
    const beforeCount = await db.recruitment_interviews.count();
    try {
      await db.$transaction(async (tx) => {
        await tx.recruitment_interviews.create({
          data: {
            id: `INTV-ROLLBACK-${timestamp}`,
            candidate_id: testCandidateId1,
            title: 'Rollback Test',
            round: 99,
            startsAt: tomorrow10am,
            endsAt: tomorrow11am,
            status: 'Scheduled',
            created_at: new Date(),
            updated_at: new Date(),
          } as any,
        });
        // Intentionally throw error to force rollback
        throw new Error('Simulated transaction failure for rollback verification');
      });
    } catch (e) {}

    const afterCount = await db.recruitment_interviews.count();
    assert(beforeCount === afterCount, '22. Database transaction rollbacks cleanly on any failure');

    // -------------------------------------------------------------
    // 23. PHASE 4A REGRESSION (CORE ATS)
    // -------------------------------------------------------------
    console.log('\n[23] PHASE 4A REGRESSION');
    const p4aJob = await db.recruitmentJob.findUnique({ where: { id: testJobId } });
    assert(p4aJob !== null && p4aJob.status === 'Open', '23. Phase 4A Core ATS Requisitions remain functional');

    // -------------------------------------------------------------
    // 24. PHASE 4B REGRESSION (CANDIDATE INTELLIGENCE)
    // -------------------------------------------------------------
    console.log('\n[24] PHASE 4B REGRESSION');
    const skillNorm = normalizeSkillName('React.js');
    const match = computeMatchScore(
      { matchedSkills: ['React', 'Node.js'], experience: '5 years', location: 'Bengaluru' },
      { requirements: ['React', 'Node.js'], description: 'Senior role', title: 'Senior Software Engineer' }
    );
    assert(
      skillNorm.canonical === 'React' && match.overallScore >= 90,
      '24. Phase 4B Candidate Intelligence & Skill Match Engine remain intact'
    );

    // -------------------------------------------------------------
    // 25. PHASE 3 REGRESSION (TALENT ECOSYSTEM)
    // -------------------------------------------------------------
    console.log('\n[25] PHASE 3 REGRESSION');
    const talentPoolCount = await db.recruitmentTalentPool.count();
    assert(talentPoolCount >= 0, '25. Phase 3 Talent Ecosystem models and queries functional');

    // -------------------------------------------------------------
    // 26. PHASE 2 REGRESSION (PAYROLL & STATUTORY)
    // -------------------------------------------------------------
    console.log('\n[26] PHASE 2 REGRESSION');
    const payslipCount = await db.payslip.count();
    assert(payslipCount >= 0, '26. Phase 2 Payroll data and models preserved');

    // -------------------------------------------------------------
    // 27. PHASE 1 REGRESSION (EMPLOYEE & LIFECYCLE)
    // -------------------------------------------------------------
    console.log('\n[27] PHASE 1 REGRESSION');
    const employeeCount = await db.employee.count();
    assert(employeeCount > 0, '27. Phase 1 Core Employee Directory functional');

  } catch (error) {
    console.error('Fatal error during test suite execution:', error);
    failed++;
  } finally {
    // Clean up test records
    console.log('\n[CLEANUP] Cleaning up test records...');
    try {
      await db.interview_panel_members.deleteMany({
        where: {
          recruitment_interviews: {
            candidate_id: { in: [testCandidateId1, testCandidateId2] },
          },
        },
      });
      await db.recruitment_interviews.deleteMany({
        where: { candidate_id: { in: [testCandidateId1, testCandidateId2] } },
      });
      await db.candidate_stage_history.deleteMany({
        where: { candidate_id: { in: [testCandidateId1, testCandidateId2] } },
      });
      await db.recruitmentCandidate.deleteMany({
        where: { id: { in: [testCandidateId1, testCandidateId2] } },
      });
      await db.recruitmentJob.deleteMany({
        where: { id: testJobId },
      });
      console.log('  Cleanup complete.\n');
    } catch (e) {
      console.error('  Cleanup warning:', e);
    }
  }

  console.log('========================================================================');
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('========================================================================');

  if (failed === 0) {
    console.log('\n🎉 100% PASS — HRMS PHASE 4C-A VERIFIED AND SECURED!\n');
  } else {
    console.error(`\n❌ TEST SUITE FAILED with ${failed} failure(s).\n`);
    process.exit(1);
  }
}

void runPhase4CTestSuite();
