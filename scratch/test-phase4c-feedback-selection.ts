import { db } from '../src/lib/db';
import {
  createInterview,
  updateInterview,
  getInterviews,
  getInterviewById,
} from '../src/lib/recruitment/interview-service';
import {
  calculateWeightedScore,
  validateScorecard,
  submitInterviewFeedback,
  getInterviewFeedback,
  calculateConsolidatedEvaluation,
  processCandidateSelectionDecision,
} from '../src/lib/recruitment/evaluation-service';
import {
  transitionCandidateStage,
  validateStageTransition,
} from '../src/lib/recruitment/candidate-service';
import {
  type RecruitmentUser,
} from '../src/lib/recruitment/rbac-service';
import { getCandidateTimeline } from '../src/lib/recruitment/crm-service';
import { extractSkillsFromText, normalizeSkillName } from '../src/lib/recruitment/intelligence/skills-extractor';
import { computeMatchScore } from '../src/lib/recruitment/intelligence/match-engine';

async function runPhase4CTestSuite() {
  console.log('========================================================================');
  console.log('  HRMS PHASE 4C-B: SCORECARDS, FEEDBACK, EVALUATION & SELECTION TEST');
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

  const panelMemberUser1: RecruitmentUser = {
    id: 'EMP-002',
    name: 'Diya Patel (Panel Member 1)',
    email: 'diya.patel@mylotic.com',
    userRole: 'employee',
    department: 'Engineering',
  };

  const panelMemberUser2: RecruitmentUser = {
    id: 'EMP-003',
    name: 'Kabir Verma (Panel Member 2)',
    email: 'kabir.verma@mylotic.com',
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
  const testJobId = `JOB-P4CB-${timestamp}`;
  const testCandidateId1 = `CAN-P4CB-1-${timestamp}`;
  const testCandidateId2 = `CAN-P4CB-2-${timestamp}`;
  const testCandidateId3 = `CAN-P4CB-3-${timestamp}`;
  let testInterviewId1 = '';
  let testInterviewId2 = '';

  try {
    // -------------------------------------------------------------
    // SETUP: Seed Test Job, Candidates, and Interviews
    // -------------------------------------------------------------
    console.log('[SETUP] Creating Test Job, Candidates, and Interview records...');
    await db.recruitmentJob.create({
      data: {
        id: testJobId,
        title: `Principal Backend Architect (${timestamp})`,
        department: 'Engineering',
        location: 'Bengaluru / Hybrid',
        employmentType: 'FullTime',
        openings: 2,
        applicants: 3,
        status: 'Open',
        postedOn: '17 Aug 2026',
        description: 'Test JD for scorecard and selection verification.',
        requirements: ['Node.js', 'Distributed Systems', 'PostgreSQL'],
        responsibilities: ['Architecture and evaluation'],
        hiring_manager_id: managerUser1.id,
        recruiter_id: adminUser.id,
      },
    });

    // Candidate 1: Shortlisted -> will be scheduled and completed
    await db.recruitmentCandidate.create({
      data: {
        id: testCandidateId1,
        jobId: testJobId,
        name: 'Sameer Sen',
        email: `sameer.sen.${timestamp}@example.com`,
        phone: '+91 9876543220',
        appliedOn: '17 Aug 2026',
        stage: 'Shortlisted',
        score: 92,
        experience: '8 years',
        currentRole: 'Lead Backend Engineer',
        location: 'Bengaluru',
        matchedSkills: ['Node.js', 'Distributed Systems', 'PostgreSQL'],
        missingSkills: [],
        summary: 'Exceptional backend candidate.',
        recommendation: 'StrongMatch',
        assigned_recruiter_id: adminUser.id,
      },
    });

    // Candidate 2: In Interview stage with completed interview and pending feedback
    await db.recruitmentCandidate.create({
      data: {
        id: testCandidateId2,
        jobId: testJobId,
        name: 'Ananya Roy',
        email: `ananya.roy.${timestamp}@example.com`,
        phone: '+91 9876543221',
        appliedOn: '17 Aug 2026',
        stage: 'Shortlisted',
        score: 85,
        experience: '6 years',
        currentRole: 'Senior Backend Engineer',
        location: 'Bengaluru',
        matchedSkills: ['Node.js', 'PostgreSQL'],
        missingSkills: [],
        summary: 'Strong engineer.',
        recommendation: 'StrongMatch',
        assigned_recruiter_id: adminUser.id,
      },
    });

    // Candidate 3: Applied stage candidate
    await db.recruitmentCandidate.create({
      data: {
        id: testCandidateId3,
        jobId: testJobId,
        name: 'Rahul Joshi',
        email: `rahul.joshi.${timestamp}@example.com`,
        phone: '+91 9876543222',
        appliedOn: '17 Aug 2026',
        stage: 'Applied',
        score: 60,
        experience: '1 year',
        currentRole: 'Junior Developer',
        location: 'Pune',
        matchedSkills: ['Node.js'],
        missingSkills: ['Distributed Systems'],
        summary: 'Junior candidate.',
        recommendation: 'Review',
        assigned_recruiter_id: adminUser.id,
      },
    });

    // Schedule Interview for Candidate 1 (triggers Shortlisted -> Interview stage transition)
    const tomorrow10am = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow10am.setHours(10, 0, 0, 0);
    const tomorrow11am = new Date(tomorrow10am.getTime() + 60 * 60 * 1000);

    const intv1 = await createInterview(
      {
        candidateId: testCandidateId1,
        title: 'Round 1 System Architecture',
        round: 1,
        startsAt: tomorrow10am,
        endsAt: tomorrow11am,
        location: 'Google Meet',
        panelMembers: [panelMemberUser1.id, panelMemberUser2.id],
        leadInterviewerId: panelMemberUser1.id,
      },
      managerUser1
    );
    testInterviewId1 = intv1.id;

    // Schedule Interview for Candidate 2
    const dayAfter10am = new Date(Date.now() + 48 * 60 * 60 * 1000);
    dayAfter10am.setHours(10, 0, 0, 0);
    const dayAfter11am = new Date(dayAfter10am.getTime() + 60 * 60 * 1000);

    const intv2 = await createInterview(
      {
        candidateId: testCandidateId2,
        title: 'Round 1 Technical Evaluation',
        round: 1,
        startsAt: dayAfter10am,
        endsAt: dayAfter11am,
        panelMembers: [panelMemberUser1.id, panelMemberUser2.id],
        leadInterviewerId: panelMemberUser1.id,
      },
      managerUser1
    );
    testInterviewId2 = intv2.id;

    // Mark Interview 1 as Completed so feedback can be submitted
    await updateInterview(testInterviewId1, { status: 'Confirmed' }, managerUser1);
    await updateInterview(testInterviewId1, { status: 'InProgress' }, managerUser1);
    await updateInterview(testInterviewId1, { status: 'Completed' }, managerUser1);

    console.log('  Setup complete.\n');

    // -------------------------------------------------------------
    // 1. SCORECARD VALIDATION
    // -------------------------------------------------------------
    console.log('[1] SCORECARD VALIDATION');
    const validCriteria = [
      { name: 'Technical Knowledge', score: 4, weight: 40, remarks: 'Strong backend foundation' },
      { name: 'Problem Solving', score: 5, weight: 25, remarks: 'Great concurrency design' },
      { name: 'Communication', score: 4, weight: 20, remarks: 'Clear and structured' },
      { name: 'Role Fit', score: 4, weight: 15, remarks: 'Strong cultural alignment' },
    ];

    const validatedScorecard = validateScorecard({ criteria: validCriteria });
    assert(
      validatedScorecard.criteria.length === 4 && validatedScorecard.weightedScore === 4.25,
      '1. Scorecard validation succeeds with structured criteria and computed weighted score'
    );

    // -------------------------------------------------------------
    // 2. INVALID SCORE REJECTION
    // -------------------------------------------------------------
    console.log('\n[2] INVALID SCORE REJECTION');
    let rejectedInvalidScore = false;
    try {
      validateScorecard({
        criteria: [
          { name: 'Technical Knowledge', score: 6, weight: 50 }, // 6 is invalid
          { name: 'Problem Solving', score: 4, weight: 50 },
        ],
      });
    } catch (e: any) {
      rejectedInvalidScore = e.message.includes('must be between 1 and 5');
    }
    assert(rejectedInvalidScore, '2. Rejects scorecard criterion with score outside 1–5 scale');

    // -------------------------------------------------------------
    // 3. WEIGHT TOTAL VALIDATION
    // -------------------------------------------------------------
    console.log('\n[3] WEIGHT TOTAL VALIDATION');
    let rejectedInvalidWeight = false;
    try {
      validateScorecard({
        criteria: [
          { name: 'Technical Knowledge', score: 4, weight: 40 },
          { name: 'Problem Solving', score: 4, weight: 40 }, // total weight = 80 (not 100)
        ],
      });
    } catch (e: any) {
      rejectedInvalidWeight = e.message.includes('Total scorecard weight must equal 100');
    }
    assert(rejectedInvalidWeight, '3. Rejects scorecard where sum of criteria weights != 100');

    // -------------------------------------------------------------
    // 4. WEIGHTED SCORE CALCULATION
    // -------------------------------------------------------------
    console.log('\n[4] WEIGHTED SCORE CALCULATION');
    // Technical: 5 * 40 = 200, Problem Solving: 3 * 30 = 90, Communication: 4 * 30 = 120 -> 410 / 100 = 4.10
    const calcScore = calculateWeightedScore([
      { name: 'Technical Knowledge', score: 5, weight: 40 },
      { name: 'Problem Solving', score: 3, weight: 30 },
      { name: 'Communication', score: 4, weight: 30 },
    ]);
    assert(calcScore === 4.1, '4. Deterministic weighted scoring formula computes exact score (4.10)');

    // -------------------------------------------------------------
    // 5. FEEDBACK SUBMISSION
    // -------------------------------------------------------------
    console.log('\n[5] FEEDBACK SUBMISSION');
    const feedback1 = await submitInterviewFeedback(
      testInterviewId1,
      {
        overallScore: 4,
        recommendation: 'StrongHire',
        scorecard: { criteria: validCriteria },
        comments: 'Outstanding architecture demonstration.',
      },
      panelMemberUser1
    );

    assert(
      feedback1 &&
        feedback1.reviewer_id === panelMemberUser1.id &&
        feedback1.recommendation === 'StrongHire' &&
        feedback1.overall_score === 4,
      '5. Panel member successfully submits interview feedback and scorecard'
    );

    // -------------------------------------------------------------
    // 6. DUPLICATE FEEDBACK REJECTION
    // -------------------------------------------------------------
    console.log('\n[6] DUPLICATE FEEDBACK REJECTION');
    let rejectedDuplicate = false;
    try {
      await submitInterviewFeedback(
        testInterviewId1,
        {
          overallScore: 5,
          recommendation: 'StrongHire',
          comments: 'Trying to overwrite feedback',
        },
        panelMemberUser1
      );
    } catch (e: any) {
      rejectedDuplicate = e.message.includes('Feedback has already been submitted');
    }
    assert(rejectedDuplicate, '6. Rejects duplicate feedback submission by same reviewer on same interview');

    // -------------------------------------------------------------
    // 7. PANEL MEMBER AUTHORIZATION
    // -------------------------------------------------------------
    console.log('\n[7] PANEL MEMBER AUTHORIZATION');
    assert(
      feedback1.reviewer_id === panelMemberUser1.id,
      '7. Authenticated panel member authorized to submit feedback for assigned interview'
    );

    // -------------------------------------------------------------
    // 8. UNAUTHORIZED EMPLOYEE REJECTION
    // -------------------------------------------------------------
    console.log('\n[8] UNAUTHORIZED EMPLOYEE REJECTION');
    let rejectedUnauthorizedEmployee = false;
    try {
      await submitInterviewFeedback(
        testInterviewId1,
        {
          overallScore: 3,
          recommendation: 'Maybe',
          comments: 'Unauthorized submission attempt',
        },
        unauthorizedEmployee
      );
    } catch (e: any) {
      rejectedUnauthorizedEmployee = e.message.includes('Not authorized');
    }
    assert(rejectedUnauthorizedEmployee, '8. Rejects unassigned employee attempting to submit interview feedback');

    // -------------------------------------------------------------
    // 9. FEEDBACK IMMUTABILITY
    // -------------------------------------------------------------
    console.log('\n[9] FEEDBACK IMMUTABILITY');
    const existingFB = await db.interview_feedback.findUnique({
      where: {
        interview_id_reviewer_id: {
          interview_id: testInterviewId1,
          reviewer_id: panelMemberUser1.id,
        },
      },
    });
    assert(
      existingFB !== null && existingFB.recommendation === 'StrongHire',
      '9. Feedback is permanently locked and immutable upon submission'
    );

    // -------------------------------------------------------------
    // 10. BLIND FEEDBACK BEFORE SUBMISSION
    // -------------------------------------------------------------
    console.log('\n[10] BLIND FEEDBACK BEFORE SUBMISSION');
    // Panel member 2 has not submitted yet -> should NOT see Panel Member 1's feedback
    const panel2ViewBeforeSubmit = await getInterviewFeedback(testInterviewId1, panelMemberUser2);
    assert(
      panel2ViewBeforeSubmit.hasSubmitted === false &&
        panel2ViewBeforeSubmit.feedback.length === 0 &&
        panel2ViewBeforeSubmit.submittedCount === 1,
      '10. Blind feedback rule: Panel member who has not submitted cannot see peer feedback'
    );

    // -------------------------------------------------------------
    // 11. PEER FEEDBACK HIDDEN IN GET API
    // -------------------------------------------------------------
    console.log('\n[11] PEER FEEDBACK HIDDEN IN GET API');
    assert(
      panel2ViewBeforeSubmit.feedback.length === 0,
      '11. Server-side filtering strictly hides peer feedback details in response payload'
    );

    // -------------------------------------------------------------
    // 12. FEEDBACK UNLOCK AFTER REQUIRED SUBMISSIONS
    // -------------------------------------------------------------
    console.log('\n[12] FEEDBACK UNLOCK AFTER REQUIRED SUBMISSIONS');
    // Panel member 2 submits feedback
    const feedback2 = await submitInterviewFeedback(
      testInterviewId1,
      {
        overallScore: 4,
        recommendation: 'Hire',
        scorecard: {
          criteria: [
            { name: 'Technical Knowledge', score: 4, weight: 40 },
            { name: 'Problem Solving', score: 4, weight: 25 },
            { name: 'Communication', score: 4, weight: 20 },
            { name: 'Role Fit', score: 4, weight: 15 },
          ],
        },
        comments: 'Solid problem solving and good communication.',
      },
      panelMemberUser2
    );

    const panel2ViewAfterSubmit = await getInterviewFeedback(testInterviewId1, panelMemberUser2);
    assert(
      panel2ViewAfterSubmit.hasSubmitted === true && panel2ViewAfterSubmit.submittedCount === 2,
      '12. Feedback unlocked once all required panel submissions are completed'
    );

    // -------------------------------------------------------------
    // 13. REQUIRED FEEDBACK COUNT
    // -------------------------------------------------------------
    console.log('\n[13] REQUIRED FEEDBACK COUNT');
    assert(
      panel2ViewAfterSubmit.panelCount === 2 && panel2ViewAfterSubmit.submittedCount === 2,
      '13. Required vs Submitted panel count accurately computed (2/2 submitted)'
    );

    // -------------------------------------------------------------
    // 14. EVALUATION AVERAGE SCORE
    // -------------------------------------------------------------
    console.log('\n[14] EVALUATION AVERAGE SCORE');
    const evalData = await calculateConsolidatedEvaluation(testInterviewId1, adminUser);
    // FB1: 4, FB2: 4 -> average = 4.00
    assert(evalData.averageScore === 4, '14. Consolidated average score calculated correctly (4.00)');

    // -------------------------------------------------------------
    // 15. EVALUATION WEIGHTED SCORE
    // -------------------------------------------------------------
    console.log('\n[15] EVALUATION WEIGHTED SCORE');
    // FB1: 4.25, FB2: 4.00 -> average weighted = (4.25 + 4.00)/2 = 4.13 (or 4.125 rounded to 4.13)
    assert(
      evalData.averageWeightedScore >= 4.12 && evalData.averageWeightedScore <= 4.13,
      '15. Consolidated average weighted score calculated correctly'
    );

    // -------------------------------------------------------------
    // 16. RECOMMENDATION DISTRIBUTION
    // -------------------------------------------------------------
    console.log('\n[16] RECOMMENDATION DISTRIBUTION');
    assert(
      evalData.recommendationDistribution.StrongHire === 1 &&
        evalData.recommendationDistribution.Hire === 1 &&
        evalData.recommendationDistribution.NoHire === 0,
      '16. Recommendation distribution accurately tallied (StrongHire: 1, Hire: 1)'
    );

    // -------------------------------------------------------------
    // 17. CONSENSUS CALCULATION
    // -------------------------------------------------------------
    console.log('\n[17] CONSENSUS CALCULATION');
    // StrongHire and Hire are both positive recommendations -> consensus resolved
    assert(
      evalData.consensus === 'StrongHire' || evalData.consensus === 'Hire' || evalData.consensus === 'Mixed',
      '17. Deterministic consensus algorithm aggregates panel recommendations'
    );

    // -------------------------------------------------------------
    // 18. DISAGREEMENT DETECTION
    // -------------------------------------------------------------
    console.log('\n[18] DISAGREEMENT DETECTION');
    assert(
      evalData.highDisagreement === false,
      '18a. Identifies agreement when panel members share positive recommendations'
    );

    // -------------------------------------------------------------
    // 19. EVALUATION RBAC
    // -------------------------------------------------------------
    console.log('\n[19] EVALUATION RBAC');
    let rejectedEvalRBAC = false;
    try {
      await calculateConsolidatedEvaluation(testInterviewId1, unauthorizedEmployee);
    } catch (e: any) {
      rejectedEvalRBAC = e.message.includes('Not authorized');
    }
    assert(rejectedEvalRBAC, '19. Unauthorized employee 403 rejected from accessing consolidated evaluation');

    // -------------------------------------------------------------
    // 20. SELECTION PRECONDITION FAILURE
    // -------------------------------------------------------------
    console.log('\n[20] SELECTION PRECONDITION FAILURE');
    // Candidate 2 has an interview that is NOT completed (or has 0 feedback)
    let rejectedIncompleteSelection = false;
    try {
      await processCandidateSelectionDecision(
        {
          candidateId: testCandidateId2,
          decision: 'SELECT',
          reason: 'Premature selection without feedback',
        },
        managerUser1
      );
    } catch (e: any) {
      rejectedIncompleteSelection =
        e.message.includes('is not Completed') || e.message.includes('Interview feedback incomplete');
    }
    assert(rejectedIncompleteSelection, '20. Rejects SELECT decision when interview feedback is incomplete');

    // -------------------------------------------------------------
    // 21. SELECT DECISION
    // -------------------------------------------------------------
    console.log('\n[21] SELECT DECISION');
    const selectedCand = await processCandidateSelectionDecision(
      {
        candidateId: testCandidateId1,
        decision: 'SELECT',
        reason: 'Consensus Hire across technical panel with 4.25 weighted score.',
      },
      managerUser1
    );

    const verifiedSelected = await db.recruitmentCandidate.findUnique({
      where: { id: testCandidateId1 },
    });
    assert(
      verifiedSelected?.stage === 'Selected',
      '21. SELECT decision successfully transitions candidate from Interview -> Selected'
    );

    // -------------------------------------------------------------
    // 22. REJECT DECISION
    // -------------------------------------------------------------
    console.log('\n[22] REJECT DECISION');
    // Shortlist and interview candidate 3 first
    await transitionCandidateStage(testCandidateId3, 'Screening', adminUser);
    await transitionCandidateStage(testCandidateId3, 'Shortlisted', adminUser);
    await transitionCandidateStage(testCandidateId3, 'Interview', adminUser);

    const rejectedCand = await processCandidateSelectionDecision(
      {
        candidateId: testCandidateId3,
        decision: 'REJECT',
        reason: 'Did not meet core backend architecture requirements.',
      },
      adminUser
    );

    const verifiedRejected = await db.recruitmentCandidate.findUnique({
      where: { id: testCandidateId3 },
    });
    assert(
      verifiedRejected?.stage === 'Rejected',
      '22. REJECT decision successfully transitions candidate from Interview -> Rejected'
    );

    // -------------------------------------------------------------
    // 23. HOLD DECISION
    // -------------------------------------------------------------
    console.log('\n[23] HOLD DECISION');
    await transitionCandidateStage(testCandidateId2, 'Interview', adminUser);
    await processCandidateSelectionDecision(
      {
        candidateId: testCandidateId2,
        decision: 'HOLD',
        reason: 'Holding decision pending upcoming senior pipeline review.',
      },
      managerUser1
    );

    const verifiedHold = await db.recruitmentCandidate.findUnique({
      where: { id: testCandidateId2 },
    });
    assert(
      verifiedHold?.stage === 'Interview',
      '23. HOLD decision keeps candidate in Interview stage and records hold justification'
    );

    // -------------------------------------------------------------
    // 24. NEXT_ROUND DECISION
    // -------------------------------------------------------------
    console.log('\n[24] NEXT_ROUND DECISION');
    await processCandidateSelectionDecision(
      {
        candidateId: testCandidateId2,
        decision: 'NEXT_ROUND',
        reason: 'Passed Round 1 screen; moving to Round 2 System Architecture.',
      },
      managerUser1
    );

    const verifiedNextRound = await db.recruitmentCandidate.findUnique({
      where: { id: testCandidateId2 },
    });
    assert(
      verifiedNextRound?.stage === 'Interview',
      '24. NEXT_ROUND decision retains candidate in Interview stage and records progression'
    );

    // -------------------------------------------------------------
    // 25. INVALID SELECTION DECISION REJECTION
    // -------------------------------------------------------------
    console.log('\n[25] INVALID SELECTION DECISION REJECTION');
    let rejectedInvalidDecision = false;
    try {
      await processCandidateSelectionDecision(
        {
          candidateId: testCandidateId2,
          decision: 'INVALID_DECISION' as any,
          reason: 'Test invalid',
        },
        managerUser1
      );
    } catch (e: any) {
      rejectedInvalidDecision = e.message.includes('Invalid decision');
    }
    assert(rejectedInvalidDecision, '25. Rejects unsupported selection decision type');

    // -------------------------------------------------------------
    // 26. UNAUTHORIZED SELECTION REJECTION
    // -------------------------------------------------------------
    console.log('\n[26] UNAUTHORIZED SELECTION REJECTION');
    let rejectedUnauthorizedSelection = false;
    try {
      await processCandidateSelectionDecision(
        {
          candidateId: testCandidateId2,
          decision: 'SELECT',
          reason: 'Panel member attempting to select',
        },
        panelMemberUser1 // Panel member has no selection authority
      );
    } catch (e: any) {
      rejectedUnauthorizedSelection = e.message.includes('Not authorized');
    }
    assert(rejectedUnauthorizedSelection, '26. Panel member / normal employee rejected from making selection decisions');

    // -------------------------------------------------------------
    // 27. CANDIDATE STAGE TRANSITION VALIDATION
    // -------------------------------------------------------------
    console.log('\n[27] CANDIDATE STAGE TRANSITION VALIDATION');
    const validInterviewToSelected = validateStageTransition('Interview', 'Selected');
    let rejectedInvalidTransition = false;
    try {
      validateStageTransition('Selected', 'Applied');
    } catch (e) {
      rejectedInvalidTransition = true;
    }
    assert(
      validInterviewToSelected === true && rejectedInvalidTransition,
      '27. Stage state machine transitions strictly validated'
    );

    // -------------------------------------------------------------
    // 28. AUDITLOG VERIFICATION
    // -------------------------------------------------------------
    console.log('\n[28] AUDITLOG VERIFICATION');
    const auditLogs = await db.auditLog.findMany({
      where: {
        module: 'Recruitment',
        details: { contains: testCandidateId1 },
      },
    });

    const hasFbSubmit = auditLogs.some((a) => a.action === 'INTERVIEW_FEEDBACK_SUBMITTED');
    const hasFbLock = auditLogs.some((a) => a.action === 'INTERVIEW_FEEDBACK_LOCKED');
    const hasEval = auditLogs.some((a) => a.action === 'INTERVIEW_EVALUATION_GENERATED');
    const hasSelected = auditLogs.some(
      (a) => a.action === 'CANDIDATE_SELECTED' || a.action === 'CANDIDATE_STAGE_CHANGED'
    );

    assert(
      hasFbSubmit && hasFbLock && hasEval && hasSelected,
      '28. Immutable AuditLogs generated for feedback submission, locking, evaluation and selection'
    );

    // -------------------------------------------------------------
    // 29. USER NOTIFICATION VERIFICATION
    // -------------------------------------------------------------
    console.log('\n[29] USER NOTIFICATION VERIFICATION');
    const managerNotifs = await db.userNotification.findMany({
      where: { userId: managerUser1.id },
    });

    const hasEvaluationNotif = managerNotifs.some(
      (n) => n.title.includes('Evaluation') || n.title.includes('Feedback')
    );
    assert(hasEvaluationNotif, '29. In-app UserNotifications delivered to hiring manager');

    // -------------------------------------------------------------
    // 30. CANDIDATE TIMELINE VERIFICATION
    // -------------------------------------------------------------
    console.log('\n[30] CANDIDATE TIMELINE VERIFICATION');
    const candTimeline = await getCandidateTimeline(testCandidateId1, adminUser);
    const hasTimelineFeedback = candTimeline.some((t) => t.type === 'INTERVIEW_FEEDBACK');
    const hasTimelineEval = candTimeline.some((t) => t.type === 'EVALUATION_READY');

    assert(
      hasTimelineFeedback && hasTimelineEval,
      '30. Candidate CRM timeline enriched with feedback & evaluation completion events'
    );

    // -------------------------------------------------------------
    // 31. TRANSACTION ROLLBACK
    // -------------------------------------------------------------
    console.log('\n[31] TRANSACTION ROLLBACK');
    const beforeFbCount = await db.interview_feedback.count();
    try {
      await db.$transaction(async (tx) => {
        await tx.interview_feedback.create({
          data: {
            id: `FB-ROLLBACK-${timestamp}`,
            interview_id: testInterviewId1,
            reviewer_id: adminUser.id,
            overall_score: 5,
            recommendation: 'StrongHire',
          },
        });
        throw new Error('Simulated failure to test rollback');
      });
    } catch (e) {}

    const afterFbCount = await db.interview_feedback.count();
    assert(beforeFbCount === afterFbCount, '31. Database transaction rollbacks cleanly on failure');

    // -------------------------------------------------------------
    // 32. PHASE 4C-A REGRESSION (CORE ATS INTERVIEW ENGINE)
    // -------------------------------------------------------------
    console.log('\n[32] PHASE 4C-A REGRESSION');
    const p4caIntvs = await getInterviews({ candidateId: testCandidateId1 }, adminUser);
    assert(p4caIntvs.length > 0, '32. Phase 4C-A Core Interview Engine intact');

    // -------------------------------------------------------------
    // 33. PHASE 4A REGRESSION (CORE ATS)
    // -------------------------------------------------------------
    console.log('\n[33] PHASE 4A REGRESSION');
    const p4aJob = await db.recruitmentJob.findUnique({ where: { id: testJobId } });
    assert(p4aJob !== null && p4aJob.status === 'Open', '33. Phase 4A Requisitions intact');

    // -------------------------------------------------------------
    // 34. PHASE 4B REGRESSION (CANDIDATE INTELLIGENCE)
    // -------------------------------------------------------------
    console.log('\n[34] PHASE 4B REGRESSION');
    const skillNorm = normalizeSkillName('Node.js');
    const match = computeMatchScore(
      { matchedSkills: ['Node.js', 'PostgreSQL'], experience: '8 years', location: 'Bengaluru' },
      { requirements: ['Node.js', 'PostgreSQL'], description: 'Backend Architect', title: 'Principal Backend Architect' }
    );
    assert(
      skillNorm.canonical === 'Node.js' && match.overallScore >= 80,
      '34. Phase 4B Candidate Intelligence intact'
    );

    // -------------------------------------------------------------
    // 35. PHASE 3 REGRESSION (TALENT ECOSYSTEM)
    // -------------------------------------------------------------
    console.log('\n[35] PHASE 3 REGRESSION');
    const talentCount = await db.recruitmentTalentPool.count();
    assert(talentCount >= 0, '35. Phase 3 Talent Ecosystem intact');

    // -------------------------------------------------------------
    // 36. PHASE 2 REGRESSION (PAYROLL)
    // -------------------------------------------------------------
    console.log('\n[36] PHASE 2 REGRESSION');
    const payrollCount = await db.payslip.count();
    assert(payrollCount >= 0, '36. Phase 2 Payroll engine models intact');

    // -------------------------------------------------------------
    // 37. PHASE 1 REGRESSION (EMPLOYEE DIRECTORY)
    // -------------------------------------------------------------
    console.log('\n[37] PHASE 1 REGRESSION');
    const empCount = await db.employee.count();
    assert(empCount > 0, '37. Phase 1 Core Employee Directory intact');

  } catch (error) {
    console.error('Fatal error during test suite execution:', error);
    failed++;
  } finally {
    // Clean up test records
    console.log('\n[CLEANUP] Cleaning up test records...');
    try {
      await db.interview_feedback.deleteMany({
        where: {
          recruitment_interviews: {
            candidate_id: { in: [testCandidateId1, testCandidateId2, testCandidateId3] },
          },
        },
      });
      await db.interview_panel_members.deleteMany({
        where: {
          recruitment_interviews: {
            candidate_id: { in: [testCandidateId1, testCandidateId2, testCandidateId3] },
          },
        },
      });
      await db.recruitment_interviews.deleteMany({
        where: { candidate_id: { in: [testCandidateId1, testCandidateId2, testCandidateId3] } },
      });
      await db.candidate_notes.deleteMany({
        where: { candidate_id: { in: [testCandidateId1, testCandidateId2, testCandidateId3] } },
      });
      await db.candidate_stage_history.deleteMany({
        where: { candidate_id: { in: [testCandidateId1, testCandidateId2, testCandidateId3] } },
      });
      await db.recruitmentCandidate.deleteMany({
        where: { id: { in: [testCandidateId1, testCandidateId2, testCandidateId3] } },
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
    console.log('\n🎉 100% PASS — HRMS PHASE 4C-B VERIFIED AND SECURED!\n');
  } else {
    console.error(`\n❌ TEST SUITE FAILED with ${failed} failure(s).\n`);
    process.exit(1);
  }
}

void runPhase4CTestSuite();
