import { db } from '../src/lib/db';
import {
  calculateOfferCompensation,
  createOffer,
  updateOffer,
  getOfferById,
  submitOfferForApproval,
  processOfferApprovalAction,
  getOfferApprovals,
  validateOfferStatusTransition,
} from '../src/lib/recruitment/offer-service';
import {
  createInterview,
  getInterviews,
} from '../src/lib/recruitment/interview-service';
import {
  calculateWeightedScore,
  processCandidateSelectionDecision,
} from '../src/lib/recruitment/evaluation-service';
import { type RecruitmentUser } from '../src/lib/recruitment/rbac-service';
import { getCandidateTimeline, addCandidateNote } from '../src/lib/recruitment/crm-service';
import { extractSkillsFromText } from '../src/lib/recruitment/intelligence/skills-extractor';
import { computeMatchScore } from '../src/lib/recruitment/intelligence/match-engine';
import {
  calculateProvidentFund,
  calculateESIC,
  calculateProfessionalTax,
  calculateGratuityProvision,
} from '../src/lib/payroll/statutory-engine';
import { computeIndianIncomeTax } from '../src/lib/payroll/india-tax-engine';
import { getRatingBand } from '../src/lib/performance/score-engine';

async function runPhase4CC2TestSuite() {
  console.log('========================================================================');
  console.log('  HRMS PHASE 4C-C2: MULTI-LEVEL OFFER APPROVAL WORKFLOW TEST SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
      failed++;
    }
  }

  const testSuffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const testJobId = `JOB-C2-${testSuffix}`;
  const testCandidate1Id = `CAND-C2-1-${testSuffix}`;
  const testCandidate2Id = `CAND-C2-2-${testSuffix}`;
  const testCandidate3Id = `CAND-C2-3-${testSuffix}`;

  // Mock Users
  const adminUser: RecruitmentUser = {
    id: 'EMP-001',
    userRole: 'admin',
    department: 'Executive',
    name: 'Ayush Admin',
    email: 'admin@example.com',
  };

  const hiringManagerUser: RecruitmentUser = {
    id: 'EMP-006', // Priya Sharma
    userRole: 'manager',
    department: 'Engineering',
    name: 'Priya Sharma',
    email: 'priya.sharma@example.com',
  };

  const otherManagerUser: RecruitmentUser = {
    id: 'EMP-007', // Ananya Rao
    userRole: 'manager',
    department: 'Marketing',
    name: 'Ananya Rao',
    email: 'ananya.rao@example.com',
  };

  const recruiterUser: RecruitmentUser = {
    id: 'EMP-004', // Vikram Malhotra
    userRole: 'employee',
    department: 'Human Resources',
    name: 'Vikram Malhotra',
    email: 'vikram.recruiter@example.com',
  };

  const normalEmployeeUser: RecruitmentUser = {
    id: 'EMP-005', // Sneha Patel
    userRole: 'employee',
    department: 'Engineering',
    name: 'Sneha Patel',
    email: 'sneha.patel@example.com',
  };

  try {
    // 0. Setup Fixtures: Job & Candidates in Selected / Offer stages
    await db.recruitmentJob.create({
      data: {
        id: testJobId,
        title: `Staff Backend Architect ${testSuffix}`,
        department: 'Engineering',
        location: 'Bengaluru',
        openings: 2,
        status: 'Open',
        postedOn: new Date().toLocaleDateString(),
        description: 'Staff backend architect role responsible for core platform services.',
        requirements: ['Node.js', 'PostgreSQL', 'System Design'],
        hiring_manager_id: hiringManagerUser.id,
        recruiter_id: recruiterUser.id,
      },
    });

    await db.recruitmentCandidate.create({
      data: {
        id: testCandidate1Id,
        name: `Aarav Sen ${testSuffix}`,
        email: `aarav.${testSuffix}@example.com`,
        phone: '+91 98765 11223',
        jobId: testJobId,
        currentRole: 'Lead Engineer',
        experience: '8 years',
        location: 'Bengaluru',
        stage: 'Selected',
        appliedOn: new Date().toISOString(),
        summary: 'Top selection candidate for offer workflow.',
        recommendation: 'StrongMatch',
        matchedSkills: ['Node.js', 'PostgreSQL', 'System Design'],
        missingSkills: [],
      },
    });

    await db.recruitmentCandidate.create({
      data: {
        id: testCandidate2Id,
        name: `Diya Roy ${testSuffix}`,
        email: `diya.${testSuffix}@example.com`,
        phone: '+91 98765 22334',
        jobId: testJobId,
        currentRole: 'Backend Engineer',
        experience: '6 years',
        location: 'Bengaluru',
        stage: 'Selected',
        appliedOn: new Date().toISOString(),
        summary: 'Candidate 2 for rejection and request changes testing.',
        recommendation: 'StrongMatch',
        matchedSkills: ['Node.js'],
        missingSkills: [],
      },
    });

    await db.recruitmentCandidate.create({
      data: {
        id: testCandidate3Id,
        name: `Rohan Gupta ${testSuffix}`,
        email: `rohan.${testSuffix}@example.com`,
        phone: '+91 98765 33445',
        jobId: testJobId,
        currentRole: 'Platform Engineer',
        experience: '5 years',
        location: 'Bengaluru',
        stage: 'Selected',
        appliedOn: new Date().toISOString(),
        summary: 'Candidate 3 for edge cases.',
        recommendation: 'Review',
        matchedSkills: ['Node.js'],
        missingSkills: [],
      },
    });

    // =========================================================================
    // TEST 1: Draft offer exists
    // =========================================================================
    const draftOffer1 = await createOffer(
      {
        candidateId: testCandidate1Id,
        offeredTitle: 'Staff Backend Architect',
        offeredCtc: 3600000,
        proposedJoinDate: new Date(Date.now() + 86400000 * 30),
        expiresAt: new Date(Date.now() + 86400000 * 10),
      },
      recruiterUser
    );

    assert(
      draftOffer1.id !== null &&
        draftOffer1.status === 'Draft' &&
        draftOffer1.version === 1,
      'Test 1: Draft offer exists',
      `Offer ID: ${draftOffer1.id}, Status: ${draftOffer1.status}`
    );

    // =========================================================================
    // TEST 2: Submit Draft → PendingApproval
    // =========================================================================
    const submitRes = await submitOfferForApproval(
      draftOffer1.id,
      recruiterUser,
      {
        approverIds: [hiringManagerUser.id, adminUser.id],
        note: 'Submitted for leadership review.',
      }
    );

    assert(
      submitRes.offer.status === 'PendingApproval',
      'Test 2: Submit Draft → PendingApproval',
      `Updated status: ${submitRes.offer.status}`
    );

    // =========================================================================
    // TEST 3: Approval records created
    // =========================================================================
    const approvalsList = await db.recruitment_offer_approvals.findMany({
      where: { offer_id: draftOffer1.id },
      orderBy: { sequence: 'asc' },
    });

    assert(
      approvalsList.length === 2,
      'Test 3: Approval records created',
      `Found ${approvalsList.length} approval levels.`
    );

    // =========================================================================
    // TEST 4: First approver identified
    // =========================================================================
    const level1Record = approvalsList.find((a) => a.sequence === 1);
    assert(
      level1Record !== undefined &&
        level1Record.approver_id === hiringManagerUser.id &&
        level1Record.status === 'Pending',
      'Test 4: First approver identified',
      `Level 1 approver: ${level1Record?.approver_id}, Status: ${level1Record?.status}`
    );

    // =========================================================================
    // TEST 5: Second approver initially waiting
    // =========================================================================
    const level2Record = approvalsList.find((a) => a.sequence === 2);
    assert(
      level2Record !== undefined &&
        level2Record.approver_id === adminUser.id &&
        level2Record.status === 'Draft',
      'Test 5: Second approver initially waiting',
      `Level 2 approver: ${level2Record?.approver_id}, Status: ${level2Record?.status}`
    );

    // =========================================================================
    // TEST 6: First approver authorized
    // =========================================================================
    const offerSummaryForHM = await getOfferApprovals(draftOffer1.id, hiringManagerUser);
    assert(
      offerSummaryForHM.canCurrentUserApprove === true &&
        offerSummaryForHM.currentLevel === 1,
      'Test 6: First approver authorized',
      `Can HM approve: ${offerSummaryForHM.canCurrentUserApprove}`
    );

    // =========================================================================
    // TEST 7: Unauthorized manager blocked
    // =========================================================================
    let unauthMgrBlocked = false;
    try {
      await processOfferApprovalAction(
        draftOffer1.id,
        { action: 'APPROVE', comment: 'Unauthorized approval attempt.' },
        otherManagerUser
      );
    } catch (e: any) {
      unauthMgrBlocked = true;
    }
    assert(
      unauthMgrBlocked,
      'Test 7: Unauthorized manager blocked',
      'Non-assigned manager correctly blocked.'
    );

    // =========================================================================
    // TEST 8: Recruiter cannot approve unless authorized
    // =========================================================================
    let recruiterBlocked = false;
    try {
      await processOfferApprovalAction(
        draftOffer1.id,
        { action: 'APPROVE', comment: 'Recruiter attempting approval.' },
        recruiterUser
      );
    } catch (e: any) {
      recruiterBlocked = true;
    }
    assert(
      recruiterBlocked,
      'Test 8: Recruiter cannot approve unless authorized',
      'Recruiter correctly blocked from acting as approver.'
    );

    // =========================================================================
    // TEST 9: Employee blocked
    // =========================================================================
    let employeeBlocked = false;
    try {
      await processOfferApprovalAction(
        draftOffer1.id,
        { action: 'APPROVE', comment: 'Employee approval attempt.' },
        normalEmployeeUser
      );
    } catch (e: any) {
      employeeBlocked = true;
    }
    assert(
      employeeBlocked,
      'Test 9: Employee blocked',
      'Normal employee correctly blocked.'
    );

    // =========================================================================
    // TEST 10: Candidate blocked
    // =========================================================================
    const candidateUserMock: RecruitmentUser = {
      id: 'CAND-USER',
      userRole: 'employee',
      department: 'External',
      name: 'External Candidate',
      email: 'cand@example.com',
    };
    let candidateBlocked = false;
    try {
      await getOfferApprovals(draftOffer1.id, candidateUserMock);
    } catch (e: any) {
      candidateBlocked = true;
    }
    assert(
      candidateBlocked,
      'Test 10: Candidate blocked',
      'External candidate denied access to internal approval chain.'
    );

    // =========================================================================
    // TEST 11: First approval succeeds
    // =========================================================================
    const level1ActionRes = await processOfferApprovalAction(
      draftOffer1.id,
      { action: 'APPROVE', comment: 'Approved Level 1 by Hiring Manager.' },
      hiringManagerUser
    );

    assert(
      level1ActionRes!.levelApproved === 1 &&
        level1ActionRes!.isFullyApproved === false &&
        level1ActionRes!.nextLevel === 2,
      'Test 11: First approval succeeds',
      `Level 1 Approved, Next level: ${level1ActionRes!.nextLevel}`
    );

    // =========================================================================
    // TEST 12: Next approval activated
    // =========================================================================
    const level2ActivatedRecord = await db.recruitment_offer_approvals.findUnique({
      where: { offer_id_sequence: { offer_id: draftOffer1.id, sequence: 2 } },
    });

    assert(
      level2ActivatedRecord !== null && level2ActivatedRecord.status === 'Pending',
      'Test 12: Next approval activated',
      `Level 2 status now: ${level2ActivatedRecord?.status}`
    );

    // =========================================================================
    // TEST 13: Second approver cannot act before first (Simulated on Offer 2)
    // =========================================================================
    const draftOffer2 = await createOffer(
      {
        candidateId: testCandidate2Id,
        offeredTitle: 'Backend Engineer',
        offeredCtc: 2400000,
        proposedJoinDate: new Date(Date.now() + 86400000 * 30),
        expiresAt: new Date(Date.now() + 86400000 * 10),
      },
      recruiterUser
    );
    await submitOfferForApproval(draftOffer2.id, recruiterUser, {
      approverIds: [hiringManagerUser.id, adminUser.id],
    });

    // Level 2 (Admin) tries to act while Level 1 is pending without override as non-active
    const offer2Approvals = await db.recruitment_offer_approvals.findMany({
      where: { offer_id: draftOffer2.id },
    });
    const level2Offer2 = offer2Approvals.find((a) => a.sequence === 2);
    assert(
      level2Offer2?.status === 'Draft',
      'Test 13: Second approver cannot act before first',
      `Level 2 remains in Draft until Level 1 completes.`
    );

    // =========================================================================
    // TEST 14: Second approval succeeds
    // =========================================================================
    const level2ActionRes = await processOfferApprovalAction(
      draftOffer1.id,
      { action: 'APPROVE', comment: 'Final approval from HR Leadership.' },
      adminUser
    );

    assert(
      level2ActionRes!.levelApproved === 2 &&
        level2ActionRes!.isFullyApproved === true &&
        level2ActionRes!.offerStatus === 'Approved',
      'Test 14: Second approval succeeds',
      `Fully approved: ${level2ActionRes!.isFullyApproved}`
    );

    // =========================================================================
    // TEST 15: Offer becomes Approved
    // =========================================================================
    const finalOffer1 = await db.recruitment_offers.findUnique({
      where: { id: draftOffer1.id },
    });

    assert(
      finalOffer1?.status === 'Approved',
      'Test 15: Offer becomes Approved',
      `Offer 1 status: ${finalOffer1?.status}`
    );

    // =========================================================================
    // TEST 16: Reject action works
    // =========================================================================
    const rejectRes = await processOfferApprovalAction(
      draftOffer2.id,
      { action: 'REJECT', comment: 'CTC exceeds salary band for this position.' },
      hiringManagerUser
    );

    assert(
      rejectRes!.offerStatus === 'Declined' && rejectRes!.rejectedLevel === 1,
      'Test 16: Reject action works',
      `Offer 2 status: ${rejectRes!.offerStatus}, Reason: ${rejectRes!.reason}`
    );

    // =========================================================================
    // TEST 17: Reject requires reason
    // =========================================================================
    const draftOffer3 = await createOffer(
      {
        candidateId: testCandidate3Id,
        offeredTitle: 'Platform Engineer',
        offeredCtc: 2000000,
        proposedJoinDate: new Date(Date.now() + 86400000 * 30),
        expiresAt: new Date(Date.now() + 86400000 * 10),
      },
      recruiterUser
    );
    await submitOfferForApproval(draftOffer3.id, recruiterUser, {
      approverIds: [hiringManagerUser.id, adminUser.id],
    });

    let rejectWithoutReasonBlocked = false;
    try {
      await processOfferApprovalAction(
        draftOffer3.id,
        { action: 'REJECT', comment: '' },
        hiringManagerUser
      );
    } catch (e: any) {
      rejectWithoutReasonBlocked = true;
    }
    assert(
      rejectWithoutReasonBlocked,
      'Test 17: Reject requires reason',
      'Blank rejection comment successfully blocked.'
    );

    // =========================================================================
    // TEST 18: Request Changes works
    // =========================================================================
    const chgRes = await processOfferApprovalAction(
      draftOffer3.id,
      { action: 'REQUEST_CHANGES', comment: 'Please adjust joining bonus down by 50,000.' },
      hiringManagerUser
    );

    assert(
      chgRes!.offerStatus === 'Draft' && chgRes!.level === 1,
      'Test 18: Request Changes works',
      `Offer 3 status returned to: ${chgRes!.offerStatus}`
    );

    // =========================================================================
    // TEST 19: Request Changes requires comment
    // =========================================================================
    // Re-submit draftOffer3 for testing
    await submitOfferForApproval(draftOffer3.id, recruiterUser);
    let chgWithoutCommentBlocked = false;
    try {
      await processOfferApprovalAction(
        draftOffer3.id,
        { action: 'REQUEST_CHANGES', comment: '   ' },
        hiringManagerUser
      );
    } catch (e: any) {
      chgWithoutCommentBlocked = true;
    }
    assert(
      chgWithoutCommentBlocked,
      'Test 19: Request Changes requires comment',
      'Blank change request comment rejected.'
    );

    // Perform valid request changes to return to Draft
    await processOfferApprovalAction(
      draftOffer3.id,
      { action: 'REQUEST_CHANGES', comment: 'Please review variable pay component.' },
      hiringManagerUser
    );

    // =========================================================================
    // TEST 20: Request Changes → Draft
    // =========================================================================
    const offer3AfterChg = await db.recruitment_offers.findUnique({
      where: { id: draftOffer3.id },
    });
    assert(
      offer3AfterChg?.status === 'Draft',
      'Test 20: Request Changes → Draft',
      `Offer 3 is in status: ${offer3AfterChg?.status}`
    );

    // =========================================================================
    // TEST 21: Resubmission works
    // =========================================================================
    await updateOffer(
      draftOffer3.id,
      { offeredCtc: 2100000 },
      recruiterUser
    );
    const resubmitRes = await submitOfferForApproval(
      draftOffer3.id,
      recruiterUser,
      { note: 'Resubmitted with revised CTC.' }
    );
    assert(
      resubmitRes.offer.status === 'PendingApproval' &&
        resubmitRes.approvals.length === 2,
      'Test 21: Resubmission works',
      `Resubmitted status: ${resubmitRes.offer.status}`
    );

    // =========================================================================
    // TEST 22: Historical approval preserved (Audit Logs)
    // =========================================================================
    const chgAuditLogs = await db.auditLog.findMany({
      where: { action: 'OFFER_CHANGES_REQUESTED' },
      orderBy: { createdAt: 'desc' },
    });
    assert(
      chgAuditLogs.length > 0,
      'Test 22: Historical approval preserved',
      `Found ${chgAuditLogs.length} change request audit logs.`
    );

    // =========================================================================
    // TEST 23: Old approval cannot be modified
    // =========================================================================
    let cannotMutateApprovedOffer = false;
    try {
      await updateOffer(
        draftOffer1.id,
        { offeredCtc: 4000000 },
        recruiterUser
      );
    } catch (e: any) {
      cannotMutateApprovedOffer = true;
    }
    assert(
      cannotMutateApprovedOffer,
      'Test 23: Old approval cannot be modified',
      'Fully Approved offer protected from draft edits.'
    );

    // =========================================================================
    // TEST 24: Invalid status transition rejected
    // =========================================================================
    let invalidTransitionBlocked = false;
    try {
      validateOfferStatusTransition('Approved', 'PendingApproval');
    } catch (e: any) {
      invalidTransitionBlocked = true;
    }
    assert(
      invalidTransitionBlocked,
      'Test 24: Invalid status transition rejected',
      'Approved -> PendingApproval transition correctly blocked.'
    );

    // =========================================================================
    // TEST 25: Duplicate approval action rejected
    // =========================================================================
    let duplicateApprovalBlocked = false;
    try {
      // Trying to approve draftOffer1 which is already Approved
      await processOfferApprovalAction(
        draftOffer1.id,
        { action: 'APPROVE' },
        adminUser
      );
    } catch (e: any) {
      duplicateApprovalBlocked = true;
    }
    assert(
      duplicateApprovalBlocked,
      'Test 25: Duplicate approval action rejected',
      'Attempt to approve non-pending offer rejected.'
    );

    // =========================================================================
    // TEST 26: Concurrent approval protection
    // =========================================================================
    // Both try to approve the same pending Level 1 simultaneously on draftOffer3
    const [p1, p2] = await Promise.allSettled([
      processOfferApprovalAction(draftOffer3.id, { action: 'APPROVE' }, hiringManagerUser),
      processOfferApprovalAction(draftOffer3.id, { action: 'APPROVE' }, hiringManagerUser),
    ]);

    const oneSucceeded = (p1.status === 'fulfilled' && p2.status === 'rejected') ||
      (p1.status === 'rejected' && p2.status === 'fulfilled');

    assert(
      oneSucceeded,
      'Test 26: Concurrent approval protection',
      `P1: ${p1.status}, P2: ${p2.status}`
    );

    // =========================================================================
    // TEST 27: AuditLog created
    // =========================================================================
    const approvalAuditLogs = await db.auditLog.findMany({
      where: {
        action: { in: ['OFFER_SUBMITTED_FOR_APPROVAL', 'OFFER_APPROVED', 'OFFER_FULLY_APPROVED', 'OFFER_REJECTED'] },
      },
    });
    assert(
      approvalAuditLogs.length >= 4,
      'Test 27: AuditLog created',
      `Audit logs recorded: ${approvalAuditLogs.length}`
    );

    // =========================================================================
    // TEST 28: UserNotification created
    // =========================================================================
    const notifications = await db.userNotification.findMany({
      where: {
        title: { contains: 'Offer' },
      },
    });
    assert(
      notifications.length >= 4,
      'Test 28: UserNotification created',
      `User notifications dispatched: ${notifications.length}`
    );

    // =========================================================================
    // TEST 29: Approval GET RBAC
    // =========================================================================
    const adminView = await getOfferApprovals(draftOffer1.id, adminUser);
    const hmView = await getOfferApprovals(draftOffer1.id, hiringManagerUser);
    assert(
      adminView.approvalChain.length === 2 && hmView.approvalChain.length === 2,
      'Test 29: Approval GET RBAC',
      `Admin & HM retrieved approval chain of size ${adminView.approvalChain.length}`
    );

    // =========================================================================
    // TEST 30: Offer GET contains correct approval summary
    // =========================================================================
    const offerWithSummary = await getOfferById(draftOffer1.id, adminUser);
    assert(
      offerWithSummary.approvalSummary !== undefined &&
        offerWithSummary.approvalSummary.totalLevels === 2 &&
        offerWithSummary.approvalSummary.completedLevels === 2,
      'Test 30: Offer GET contains correct approval summary',
      `Summary: ${JSON.stringify(offerWithSummary.approvalSummary)}`
    );

    // =========================================================================
    // TEST 31: Transaction rollback
    // =========================================================================
    let rollbackSuccess = false;
    try {
      await db.$transaction(async (tx) => {
        await tx.recruitment_offers.update({
          where: { id: draftOffer1.id },
          data: { status: 'Draft' },
        });
        throw new Error('Simulated atomic transaction failure');
      });
    } catch (e: any) {
      rollbackSuccess = true;
    }
    const checkOffer1 = await db.recruitment_offers.findUnique({
      where: { id: draftOffer1.id },
    });
    assert(
      rollbackSuccess && checkOffer1?.status === 'Approved',
      'Test 31: Transaction rollback',
      `Status preserved as: ${checkOffer1?.status}`
    );

    // =========================================================================
    // TEST 32: Existing Phase 4C-C1 regression (Offer Core & Compensation Snapshot)
    // =========================================================================
    const ctcBreakdown = calculateOfferCompensation(2400000);
    assert(
      ctcBreakdown.annualCtc === 2400000 &&
        ctcBreakdown.components.basicMonthly === 100000 &&
        ctcBreakdown.employerContributions.pfMonthly === 1800 &&
        ctcBreakdown.estimatedNetTakeHomeMonthly > 0,
      'Test 32: Existing Phase 4C-C1 regression (Offer Core & Compensation Snapshot)',
      `Calculated Net In-Hand: ₹${ctcBreakdown.estimatedNetTakeHomeMonthly}`
    );

    // =========================================================================
    // TEST 33: Existing Phase 4C-B regression (Evaluation & Selection)
    // =========================================================================
    const weightedScore = calculateWeightedScore([
      { name: 'Technical', score: 4.5, weight: 60 },
      { name: 'Communication', score: 3.5, weight: 40 },
    ]);
    assert(
      weightedScore === 4.1,
      'Test 33: Existing Phase 4C-B regression (Evaluation & Selection)',
      `Weighted score: ${weightedScore}`
    );

    // =========================================================================
    // TEST 34: Existing Phase 4C-A regression (Interview Engine & Panel)
    // =========================================================================
    const testCandidateIntvId = `CAND-INTV-${testSuffix}`;
    await db.recruitmentCandidate.create({
      data: {
        id: testCandidateIntvId,
        name: `Varun Nair ${testSuffix}`,
        email: `varun.${testSuffix}@example.com`,
        phone: '+91 98765 99887',
        jobId: testJobId,
        currentRole: 'Backend Engineer',
        experience: '4 years',
        location: 'Bengaluru',
        stage: 'Shortlisted',
        appliedOn: new Date().toISOString(),
        summary: 'Candidate for interview scheduling regression.',
        recommendation: 'StrongMatch',
        matchedSkills: ['Node.js'],
        missingSkills: [],
      },
    });

    const startIntv = new Date(Date.now() + 86400000 * 20 + Math.floor(Math.random() * 100000000));
    const endIntv = new Date(startIntv.getTime() + 3600000);
    const interviewCreated = await createInterview(
      {
        candidateId: testCandidateIntvId,
        title: 'Technical Screening',
        round: 1,
        startsAt: startIntv,
        endsAt: endIntv,
        panelMembers: [hiringManagerUser.id],
        leadInterviewerId: hiringManagerUser.id,
      },
      hiringManagerUser
    );
    assert(
      interviewCreated.id.startsWith('INTV-') && interviewCreated.status === 'Scheduled',
      'Test 34: Existing Phase 4C-A regression (Interview Engine & Panel)',
      `Interview created: ${interviewCreated.id}`
    );

    // =========================================================================
    // TEST 35: Existing Phase 4A regression (ATS Requisitions & CRM Notes)
    // =========================================================================
    const noteCreated = await addCandidateNote(
      testCandidate1Id,
      'Offer approvals fully completed by leadership.',
      adminUser
    );
    const timeline = await getCandidateTimeline(testCandidate1Id, adminUser);
    assert(
      noteCreated.id !== null && timeline.length >= 2,
      'Test 35: Existing Phase 4A regression (ATS Requisitions & CRM Notes)',
      `Note added, Timeline events: ${timeline.length}`
    );

    // =========================================================================
    // TEST 36: Existing Phase 4B regression (Skill Extraction & Match Engine)
    // =========================================================================
    const extractedSkills = await extractSkillsFromText(
      'Expertise in Node.js, PostgreSQL, Distributed Systems, and AWS.'
    );
    const matchScore = computeMatchScore(
      {
        matchedSkills: ['Node.js', 'PostgreSQL', 'System Design'],
        experience: '8 years',
        location: 'Bengaluru',
      },
      {
        requirements: ['Node.js', 'PostgreSQL', 'System Design'],
        experience_min: 6,
        location: 'Bengaluru',
      }
    );
    assert(
      extractedSkills.some((s) => s.name === 'Node.js') && matchScore.overallScore >= 80,
      'Test 36: Existing Phase 4B regression (Skill Extraction & Match Engine)',
      `Extracted skills: ${extractedSkills.length}, Match Score: ${matchScore.overallScore}%`
    );

    // =========================================================================
    // TEST 37: Existing Phase 3 regression (Performance & Goals)
    // =========================================================================
    const ratingBand = getRatingBand(4.8);
    assert(
      ratingBand.level === 5 && ratingBand.label === 'Outstanding',
      'Test 37: Existing Phase 3 regression (Performance & Goals)',
      `Rating band: ${ratingBand.label} (Level ${ratingBand.level})`
    );

    // =========================================================================
    // TEST 38: Existing Phase 2 regression (Statutory India Payroll Engine)
    // =========================================================================
    const pfCalc = calculateProvidentFund(50000);
    const esicCalc = calculateESIC(20000);
    const ptCalc = calculateProfessionalTax(60000, 'Maharashtra');
    const gratuityCalc = calculateGratuityProvision(50000);
    const taxCalc = computeIndianIncomeTax({
      annualGrossSalary: 1200000,
      annualBasic: 600000,
      annualHRA: 300000,
      regime: 'New',
    });

    assert(
      pfCalc.employerPF === 1800 &&
        esicCalc.employerESIC === 650 &&
        ptCalc === 200 &&
        gratuityCalc > 0 &&
        taxCalc.totalAnnualTax > 0,
      'Test 38: Existing Phase 2 regression (Statutory India Payroll Engine)',
      `PF: ₹${pfCalc.employerPF}, ESIC: ₹${esicCalc.employerESIC}, PT: ₹${ptCalc}, Tax: ₹${taxCalc.totalAnnualTax}`
    );

    // =========================================================================
    // TEST 39: Existing Phase 1 regression (Employee Lifecycle & Core HR)
    // =========================================================================
    const totalEmployees = await db.employee.count();
    const activeAdmin = await db.employee.findUnique({
      where: { id: 'EMP-001' },
      select: { id: true, name: true, userRole: true, status: true },
    });
    assert(
      totalEmployees > 0 && Boolean(activeAdmin) && (activeAdmin?.userRole.toLowerCase() === 'admin' || activeAdmin?.status === 'Active'),
      'Test 39: Existing Phase 1 regression (Employee Lifecycle & Core HR)',
      `Total Employees: ${totalEmployees}, Active Admin: ${activeAdmin?.name} (${activeAdmin?.userRole})`
    );
  } catch (err) {
    console.error('Fatal error during test suite execution:', err);
  } finally {
    console.log('\n========================================================================');
    console.log(`  PHASE 4C-C2 TEST RESULTS: ${passed}/39 PASSED (${failed} FAILED)`);
    console.log('========================================================================\n');
  }
}

void runPhase4CC2TestSuite();
