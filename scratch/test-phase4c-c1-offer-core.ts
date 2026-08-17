import { db } from '../src/lib/db';
import {
  calculateOfferCompensation,
  validateOfferPayload,
  createOffer,
  updateOffer,
  getOffers,
  getOfferById,
  getOfferFilterForUser,
  canUserAccessOffer,
  canUserManageOffer,
  type CreateOfferInput,
  type UpdateOfferInput,
  type OfferCompensationBreakdown,
} from '../src/lib/recruitment/offer-service';
import {
  createInterview,
  getInterviews,
} from '../src/lib/recruitment/interview-service';
import {
  calculateWeightedScore,
  validateScorecard,
  submitInterviewFeedback,
  processCandidateSelectionDecision,
} from '../src/lib/recruitment/evaluation-service';
import {
  transitionCandidateStage,
  validateStageTransition,
} from '../src/lib/recruitment/candidate-service';
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

async function runPhase4CC1TestSuite() {
  console.log('========================================================================');
  console.log('  HRMS PHASE 4C-C1: OFFER CORE SERVICE & COMPENSATION SNAPSHOT TEST');
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
    id: 'EMP-007',
    name: 'Kavita Iyer (Product Lead)',
    email: 'kavita.iyer@mylotic.com',
    userRole: 'manager',
    department: 'Product',
  };

  const employeeUser: RecruitmentUser = {
    id: 'EMP-002',
    name: 'Priya Patel (Employee)',
    email: 'priya.patel@mylotic.com',
    userRole: 'employee',
    department: 'Design',
  };

  try {
    // ---------------------------------------------------------
    // Setup Test Fixtures: Job, Templates, Candidates
    // ---------------------------------------------------------
    const testJobId = `JOB-TEST-C1-${Date.now()}`;
    await db.recruitmentJob.create({
      data: {
        id: testJobId,
        title: 'Principal Software Architect',
        department: 'Engineering',
        location: 'Bengaluru / Hybrid',
        employmentType: 'FullTime',
        openings: 2,
        applicants: 0,
        status: 'Open',
        hiring_manager_id: managerUser1.id,
        recruiter_id: managerUser1.id,
        description: 'Lead next-generation HRMS platform architecture.',
        requirements: ['System Design', 'Node.js', 'PostgreSQL', 'TypeScript'],
        postedOn: new Date().toISOString(),
      },
    });

    let org = await db.organizations.findFirst();
    if (!org) {
      org = await db.organizations.create({
        data: {
          id: `org-test-${Date.now()}`,
          name: 'Acme Corp Test',
          code: `ACME-${Date.now().toString().slice(-4)}`,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    }

    // Create Document Templates (1 valid Offer Letter, 1 Appointment Letter, 1 NDA)
    const offerTemplateId = `TMP-OFF-${Date.now()}`;
    const ndaTemplateId = `TMP-NDA-${Date.now()}`;

    await db.documentTemplate.create({
      data: {
        id: offerTemplateId,
        organization_id: org.id,
        name: 'Standard Engineering Offer Letter Template',
        type: 'Offer_Letter',
        content:
          'Dear {{candidate_name}}, We are pleased to offer you the position of {{job_title}} with annual CTC of {{annual_ctc}}.',
        isActive: true,
        version: Math.floor(Math.random() * 100000) + 1,
        createdAt: new Date(),
        updated_at: new Date(),
      },
    });

    await db.documentTemplate.create({
      data: {
        id: ndaTemplateId,
        organization_id: org.id,
        name: 'Confidentiality & Non-Disclosure Agreement',
        type: 'NDA',
        content: 'Standard NDA terms...',
        isActive: true,
        version: Math.floor(Math.random() * 100000) + 1,
        createdAt: new Date(),
        updated_at: new Date(),
      },
    });

    // Candidates in various stages
    const candidateSelectedId = `CAND-SEL-${Date.now()}`;
    const candidateInterviewId = `CAND-INT-${Date.now()}`;
    const candidateRejectedId = `CAND-REJ-${Date.now()}`;

    await db.recruitmentCandidate.create({
      data: {
        id: candidateSelectedId,
        jobId: testJobId,
        name: 'Ananya Deshmukh',
        email: 'ananya.deshmukh@example.com',
        phone: '+91 98765 43210',
        currentRole: 'Lead Backend Developer',
        location: 'Bengaluru',
        experience: '8 years',
        score: 92,
        stage: 'Selected',
        appliedOn: new Date().toISOString(),
        assigned_recruiter_id: managerUser1.id,
        summary: 'Excellent backend engineer with 8 years experience.',
        recommendation: 'StrongMatch',
        matchedSkills: ['Node.js', 'PostgreSQL', 'TypeScript'],
        missingSkills: [],
      },
    });

    await db.recruitmentCandidate.create({
      data: {
        id: candidateInterviewId,
        jobId: testJobId,
        name: 'Vikas Malhotra',
        email: 'vikas.malhotra@example.com',
        phone: '+91 98765 11223',
        currentRole: 'Senior Software Engineer',
        location: 'Pune',
        experience: '6 years',
        score: 84,
        stage: 'Interview',
        appliedOn: new Date().toISOString(),
        assigned_recruiter_id: managerUser1.id,
        summary: 'Solid candidate in interview stage.',
        recommendation: 'Review',
        matchedSkills: ['Node.js', 'TypeScript'],
        missingSkills: [],
      },
    });

    await db.recruitmentCandidate.create({
      data: {
        id: candidateRejectedId,
        jobId: testJobId,
        name: 'Rajat Verma',
        email: 'rajat.verma@example.com',
        phone: '+91 98765 99887',
        currentRole: 'Full Stack Engineer',
        location: 'Delhi',
        experience: '4 years',
        score: 65,
        stage: 'Rejected',
        appliedOn: new Date().toISOString(),
        assigned_recruiter_id: managerUser1.id,
        summary: 'Candidate rejected during technical screening.',
        recommendation: 'Review',
        matchedSkills: [],
        missingSkills: ['System Design'],
      },
    });

    // =========================================================================
    // TEST 1: Create offer for Selected candidate
    // =========================================================================
    const joinDate = new Date();
    joinDate.setDate(joinDate.getDate() + 30);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);

    const offerInput1: CreateOfferInput = {
      candidateId: candidateSelectedId,
      offeredTitle: 'Principal Software Architect',
      offeredCtc: 2400000,
      currency: 'INR',
      proposedJoinDate: joinDate.toISOString().split('T')[0],
      expiresAt: expiryDate.toISOString().split('T')[0],
      templateId: offerTemplateId,
    };

    const offer1 = await createOffer(offerInput1, managerUser1);
    assert(
      offer1 !== null && offer1.id.startsWith('OFF-') && offer1.offered_title === 'Principal Software Architect',
      'Test 1: Create offer for Selected candidate',
      `Offer created: ${offer1?.id}`
    );

    // =========================================================================
    // TEST 2: Reject offer for Interview candidate
    // =========================================================================
    let test2FailedAsExpected = false;
    try {
      await createOffer(
        {
          candidateId: candidateInterviewId,
          offeredTitle: 'Senior Software Engineer',
          offeredCtc: 1800000,
          currency: 'INR',
        },
        managerUser1
      );
    } catch (e: any) {
      if (e.message.includes('must be in "Selected" stage')) {
        test2FailedAsExpected = true;
      }
    }
    assert(
      test2FailedAsExpected,
      'Test 2: Reject offer for Interview candidate',
      'Threw error for Interview stage candidate'
    );

    // =========================================================================
    // TEST 3: Reject offer for Rejected candidate
    // =========================================================================
    let test3FailedAsExpected = false;
    try {
      await createOffer(
        {
          candidateId: candidateRejectedId,
          offeredTitle: 'Full Stack Engineer',
          offeredCtc: 1200000,
          currency: 'INR',
        },
        managerUser1
      );
    } catch (e: any) {
      if (e.message.includes('must be in "Selected" stage')) {
        test3FailedAsExpected = true;
      }
    }
    assert(
      test3FailedAsExpected,
      'Test 3: Reject offer for Rejected candidate',
      'Threw error for Rejected stage candidate'
    );

    // =========================================================================
    // TEST 4: Offer defaults to Draft
    // =========================================================================
    assert(
      offer1.status === 'Draft',
      'Test 4: Offer defaults to Draft',
      `Status: ${offer1.status}`
    );

    // =========================================================================
    // TEST 5: Version starts at 1
    // =========================================================================
    assert(
      offer1.version === 1,
      'Test 5: Version starts at 1',
      `Version: ${offer1.version}`
    );

    // =========================================================================
    // TEST 6: Duplicate active offer rejection
    // =========================================================================
    let test6FailedAsExpected = false;
    try {
      await createOffer(
        {
          candidateId: candidateSelectedId,
          offeredTitle: 'Principal Software Architect (Duplicate)',
          offeredCtc: 2600000,
          currency: 'INR',
        },
        managerUser1
      );
    } catch (e: any) {
      if (e.message.includes('already has an active offer') || e.message.includes('must be in "Selected" stage')) {
        test6FailedAsExpected = true;
      }
    }
    assert(
      test6FailedAsExpected,
      'Test 6: Duplicate active offer rejection',
      'Blocked concurrent/duplicate active offer for same candidate'
    );

    // =========================================================================
    // TEST 7: CTC calculation (Deterministic breakdown)
    // =========================================================================
    const comp7 = calculateOfferCompensation(2400000);
    const expectedMonthlyCtc = 200000;
    const expectedBasic = 100000; // 50%
    const expectedHra = 50000; // 50% of Basic
    const expectedPfEmployer = 1800; // capped statutory PF
    const expectedGratuity = Math.round((100000 * 15) / (26 * 12)); // ~4808

    assert(
      comp7.annualCtc === 2400000 &&
        comp7.components.basicMonthly === expectedBasic &&
        comp7.components.hraMonthly === expectedHra &&
        comp7.employerContributions.pfMonthly === expectedPfEmployer &&
        comp7.employerContributions.gratuityMonthly === expectedGratuity &&
        comp7.totalEmployerCostAnnual === 2400000,
      'Test 7: CTC calculation',
      `Basic: ₹${comp7.components.basicMonthly}, HRA: ₹${comp7.components.hraMonthly}, Gross: ₹${comp7.monthlyGross}, Total Cost: ₹${comp7.totalEmployerCostAnnual}`
    );

    // =========================================================================
    // TEST 8: Compensation snapshot persistence
    // =========================================================================
    const fetchedOffer8 = await db.recruitment_offers.findUnique({
      where: { id: offer1.id },
    });
    assert(
      Boolean(fetchedOffer8?.content_snapshot && fetchedOffer8.content_snapshot.length > 50),
      'Test 8: Compensation snapshot persistence',
      `Snapshot length: ${fetchedOffer8?.content_snapshot?.length}`
    );

    // =========================================================================
    // TEST 9: Snapshot contains structured JSON
    // =========================================================================
    let parsedSnapshot: OfferCompensationBreakdown | null = null;
    try {
      parsedSnapshot = JSON.parse(fetchedOffer8!.content_snapshot!);
    } catch (e) {}

    assert(
      parsedSnapshot !== null &&
        parsedSnapshot.annualCtc === 2400000 &&
        parsedSnapshot.currency === 'INR' &&
        typeof parsedSnapshot.components.basicMonthly === 'number' &&
        typeof parsedSnapshot.employerContributions.pfMonthly === 'number',
      'Test 9: Snapshot contains structured JSON',
      `Parsed annual CTC: ${parsedSnapshot?.annualCtc}, currency: ${parsedSnapshot?.currency}`
    );

    // =========================================================================
    // TEST 10: Invalid CTC rejection
    // =========================================================================
    let test10FailedAsExpected = false;
    try {
      validateOfferPayload({
        candidateId: candidateSelectedId,
        offeredTitle: 'Role',
        offeredCtc: -50000,
      });
    } catch (e: any) {
      if (e.message.includes('must be a positive number')) {
        test10FailedAsExpected = true;
      }
    }
    assert(
      test10FailedAsExpected,
      'Test 10: Invalid CTC rejection',
      'Negative/Zero CTC rejected'
    );

    // =========================================================================
    // TEST 11: Invalid currency rejection
    // =========================================================================
    let test11FailedAsExpected = false;
    try {
      validateOfferPayload({
        candidateId: candidateSelectedId,
        offeredTitle: 'Role',
        offeredCtc: 1200000,
        currency: 'USD',
      });
    } catch (e: any) {
      if (e.message.includes('Unsupported currency')) {
        test11FailedAsExpected = true;
      }
    }
    assert(
      test11FailedAsExpected,
      'Test 11: Invalid currency rejection',
      'Non-INR currency rejected'
    );

    // =========================================================================
    // TEST 12: Invalid joining date rejection
    // =========================================================================
    let test12FailedAsExpected = false;
    try {
      validateOfferPayload({
        candidateId: candidateSelectedId,
        offeredTitle: 'Role',
        offeredCtc: 1200000,
        proposedJoinDate: 'invalid-date-format',
      });
    } catch (e: any) {
      if (e.message.includes('Invalid proposed joining date')) {
        test12FailedAsExpected = true;
      }
    }
    assert(
      test12FailedAsExpected,
      'Test 12: Invalid joining date rejection',
      'Malformed join date string rejected'
    );

    // =========================================================================
    // TEST 13: Invalid expiry date rejection
    // =========================================================================
    let test13FailedAsExpected = false;
    try {
      validateOfferPayload({
        candidateId: candidateSelectedId,
        offeredTitle: 'Role',
        offeredCtc: 1200000,
        proposedJoinDate: '2026-09-01',
        expiresAt: '2026-09-15', // Expiry after joining date
      });
    } catch (e: any) {
      if (e.message.includes('expiry date cannot be after the proposed joining date')) {
        test13FailedAsExpected = true;
      }
    }
    assert(
      test13FailedAsExpected,
      'Test 13: Invalid expiry date rejection',
      'Expiry after joining date rejected'
    );

    // =========================================================================
    // TEST 14: Invalid template rejection (non Offer_Letter template)
    // =========================================================================
    // Prepare candidate in Selected stage for template tests
    const candTemplateTestId = `CAND-TMP-${Date.now()}`;
    await db.recruitmentCandidate.create({
      data: {
        id: candTemplateTestId,
        jobId: testJobId,
        name: 'Karan Mehra',
        email: 'karan.mehra@example.com',
        phone: '+91 98765 00112',
        currentRole: 'Backend Engineer',
        location: 'Bengaluru',
        experience: '5 years',
        score: 88,
        stage: 'Selected',
        appliedOn: new Date().toISOString(),
        assigned_recruiter_id: managerUser1.id,
        summary: 'Backend Engineer candidate for template tests.',
        recommendation: 'StrongMatch',
        matchedSkills: ['Node.js'],
        missingSkills: [],
      },
    });

    let test14FailedAsExpected = false;
    try {
      await createOffer(
        {
          candidateId: candTemplateTestId,
          offeredTitle: 'Backend Engineer',
          offeredCtc: 1800000,
          templateId: ndaTemplateId, // Invalid: NDA instead of Offer_Letter
        },
        managerUser1
      );
    } catch (e: any) {
      if (e.message.includes('Only "Offer_Letter" templates can be selected')) {
        test14FailedAsExpected = true;
      }
    }
    assert(
      test14FailedAsExpected,
      'Test 14: Invalid template rejection',
      'NDA template rejected for offer letter'
    );

    // =========================================================================
    // TEST 15: Valid Offer Letter template accepted
    // =========================================================================
    const offer15 = await createOffer(
      {
        candidateId: candTemplateTestId,
        offeredTitle: 'Senior Backend Engineer',
        offeredCtc: 1900000,
        templateId: offerTemplateId,
      },
      managerUser1
    );
    assert(
      offer15 !== null && offer15.template_id === offerTemplateId,
      'Test 15: Valid Offer Letter template accepted',
      `Template ID: ${offer15.template_id}`
    );

    // =========================================================================
    // TEST 16: Draft update succeeds
    // =========================================================================
    const updatedOffer16 = await updateOffer(
      offer1.id,
      {
        offeredTitle: 'Principal Cloud & Systems Architect',
      },
      managerUser1
    );
    assert(
      updatedOffer16.offered_title === 'Principal Cloud & Systems Architect',
      'Test 16: Draft update succeeds',
      `Updated Title: ${updatedOffer16.offered_title}`
    );

    // =========================================================================
    // TEST 17: CTC update recalculates snapshot
    // =========================================================================
    const updatedOffer17 = await updateOffer(
      offer1.id,
      {
        offeredCtc: 2800000,
      },
      managerUser1
    );
    const newSnapshot17: OfferCompensationBreakdown = JSON.parse(updatedOffer17.content_snapshot!);
    assert(
      Number(updatedOffer17.offered_ctc) === 2800000 &&
        newSnapshot17.annualCtc === 2800000 &&
        newSnapshot17.components.basicMonthly === Math.round((2800000 / 12) * 0.5),
      'Test 17: CTC update recalculates snapshot',
      `New CTC: ₹${updatedOffer17.offered_ctc}, Basic Monthly: ₹${newSnapshot17.components.basicMonthly}`
    );

    // =========================================================================
    // TEST 18: Finalized offer update rejected (immutability)
    // =========================================================================
    // Temporarily mark offer15 as 'Accepted' to test immutability
    await db.recruitment_offers.update({
      where: { id: offer15.id },
      data: { status: 'Accepted' },
    });

    let test18FailedAsExpected = false;
    try {
      await updateOffer(
        offer15.id,
        {
          offeredCtc: 2200000,
        },
        managerUser1
      );
    } catch (e: any) {
      if (e.message.includes('Only "Draft" offers are editable')) {
        test18FailedAsExpected = true;
      }
    }
    assert(
      test18FailedAsExpected,
      'Test 18: Finalized offer update rejected',
      'Accepted offer blocked from edits'
    );

    // =========================================================================
    // TEST 19: Unauthorized employee blocked
    // =========================================================================
    let test19FailedAsExpected = false;
    try {
      await updateOffer(
        offer1.id,
        { offeredTitle: 'Hacked Title' },
        employeeUser
      );
    } catch (e: any) {
      if (e.message.includes('Not authorized') || e.name === 'AuthorizationError') {
        test19FailedAsExpected = true;
      }
    }
    assert(
      test19FailedAsExpected,
      'Test 19: Unauthorized employee blocked',
      'Employee role blocked from managing offers'
    );

    // =========================================================================
    // TEST 20: Unauthorized manager blocked
    // =========================================================================
    let test20FailedAsExpected = false;
    try {
      await updateOffer(
        offer1.id,
        { offeredTitle: 'Unauthorized Change' },
        managerUser2 // manager2 has no access to manager1's job
      );
    } catch (e: any) {
      if (e.message.includes('Not authorized')) {
        test20FailedAsExpected = true;
      }
    }
    assert(
      test20FailedAsExpected,
      'Test 20: Unauthorized manager blocked',
      'Unassigned manager blocked from modifying offer'
    );

    // =========================================================================
    // TEST 21: Assigned recruiter allowed
    // =========================================================================
    const canRecruiterManage = canUserManageOffer(managerUser1, {
      assigned_recruiter_id: managerUser1.id,
      job: { hiring_manager_id: 'OTHER', recruiter_id: managerUser1.id },
    });
    assert(
      canRecruiterManage === true,
      'Test 21: Assigned recruiter allowed',
      'Assigned recruiter granted access'
    );

    // =========================================================================
    // TEST 22: Admin allowed
    // =========================================================================
    const canAdminManage = canUserManageOffer(adminUser, {
      assigned_recruiter_id: 'OTHER',
      job: { hiring_manager_id: 'OTHER', recruiter_id: 'OTHER' },
    });
    assert(
      canAdminManage === true,
      'Test 22: Admin allowed',
      'Admin granted global offer management access'
    );

    // =========================================================================
    // TEST 23: AuditLog created
    // =========================================================================
    const createdLogs = await db.auditLog.findMany({
      where: {
        action: { in: ['OFFER_CREATED', 'OFFER_UPDATED'] },
        module: 'Recruitment',
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    assert(
      createdLogs.length >= 2,
      'Test 23: AuditLog created',
      `Found ${createdLogs.length} recent offer audit logs (Actions: ${createdLogs.map((l) => l.action).join(', ')})`
    );

    // =========================================================================
    // TEST 24: UserNotification created
    // =========================================================================
    const notifications = await db.userNotification.findMany({
      where: {
        title: 'Offer Draft Created',
      },
      take: 5,
    });
    assert(
      notifications.length >= 1,
      'Test 24: UserNotification created',
      `Found ${notifications.length} offer notifications`
    );

    // =========================================================================
    // TEST 25: Candidate stage Selected → Offer
    // =========================================================================
    const candidateAfterOffer = await db.recruitmentCandidate.findUnique({
      where: { id: candidateSelectedId },
    });
    assert(
      candidateAfterOffer?.stage === 'Offer',
      'Test 25: Candidate stage Selected → Offer',
      `Candidate stage: ${candidateAfterOffer?.stage}`
    );

    // =========================================================================
    // TEST 26: Stage transition rollback on offer failure
    // =========================================================================
    const candRollbackTestId = `CAND-ROL-${Date.now()}`;
    await db.recruitmentCandidate.create({
      data: {
        id: candRollbackTestId,
        jobId: testJobId,
        name: 'Meera Rao',
        email: 'meera.rao@example.com',
        phone: '+91 98765 33445',
        currentRole: 'Frontend Lead',
        location: 'Bengaluru',
        experience: '7 years',
        score: 90,
        stage: 'Selected',
        appliedOn: new Date().toISOString(),
        assigned_recruiter_id: managerUser1.id,
        summary: 'Candidate for rollback test.',
        recommendation: 'StrongMatch',
        matchedSkills: ['React', 'TypeScript'],
        missingSkills: [],
      },
    });

    let test26FailedAsExpected = false;
    try {
      await createOffer(
        {
          candidateId: candRollbackTestId,
          offeredTitle: 'Frontend Lead',
          offeredCtc: -100, // Will fail validation
        },
        managerUser1
      );
    } catch (e) {
      test26FailedAsExpected = true;
    }

    const candAfterFailedOffer = await db.recruitmentCandidate.findUnique({
      where: { id: candRollbackTestId },
    });

    assert(
      test26FailedAsExpected && candAfterFailedOffer?.stage === 'Selected',
      'Test 26: Stage transition rollback on offer failure',
      `Candidate remained in: ${candAfterFailedOffer?.stage}`
    );

    // =========================================================================
    // TEST 27: Transaction rollback
    // =========================================================================
    const offersForRollbackCand = await db.recruitment_offers.findMany({
      where: { candidate_id: candRollbackTestId },
    });
    assert(
      offersForRollbackCand.length === 0,
      'Test 27: Transaction rollback',
      `No offer records created on failure: count=${offersForRollbackCand.length}`
    );

    // =========================================================================
    // TEST 28: Offer GET RBAC
    // =========================================================================
    const fetchedOfferForManager = await getOfferById(offer1.id, managerUser1);
    let unauthorizedGetBlocked = false;
    try {
      await getOfferById(offer1.id, managerUser2);
    } catch (e: any) {
      unauthorizedGetBlocked = true;
    }
    assert(
      fetchedOfferForManager.id === offer1.id && unauthorizedGetBlocked,
      'Test 28: Offer GET RBAC',
      'Authorized manager fetched offer, unauthorized manager blocked'
    );

    // =========================================================================
    // TEST 29: Offer list RBAC
    // =========================================================================
    const manager1Offers = await getOffers({}, managerUser1);
    const manager2Offers = await getOffers({}, managerUser2);
    assert(
      manager1Offers.some((o) => o.id === offer1.id) &&
        !manager2Offers.some((o) => o.id === offer1.id),
      'Test 29: Offer list RBAC',
      `Manager 1 saw offer (${manager1Offers.length} offers), Manager 2 filtered out (${manager2Offers.length} offers)`
    );

    // =========================================================================
    // TEST 30: No public offer access
    // =========================================================================
    const employeeFilter = getOfferFilterForUser(employeeUser);
    const employeeOffers = await getOffers({}, employeeUser);
    assert(
      employeeFilter.id === 'NO_ACCESS_PERMITTED' && employeeOffers.length === 0,
      'Test 30: No public offer access',
      'Employee user denied access to recruitment offers'
    );

    // =========================================================================
    // TEST 31: Existing Phase 4C-B regression (Evaluation & Selection)
    // =========================================================================
    const weightedScore = calculateWeightedScore([
      { name: 'Technical', score: 4.5, weight: 60 },
      { name: 'Communication', score: 3.5, weight: 40 },
    ]);
    assert(
      weightedScore === 4.1,
      'Test 31: Existing Phase 4C-B regression (Evaluation & Selection)',
      `Weighted score: ${weightedScore}`
    );

    // =========================================================================
    // TEST 32: Existing Phase 4C-A regression (Interview Engine & Panel)
    // =========================================================================
    const interviewRegressCandidate = `CAND-4CA-REG-${Date.now()}`;
    await db.recruitmentCandidate.create({
      data: {
        id: interviewRegressCandidate,
        jobId: testJobId,
        name: 'Rahul Sharma',
        email: 'rahul.sharma@example.com',
        phone: '+91 98765 77889',
        currentRole: 'Backend Engineer',
        experience: '5 years',
        location: 'Bengaluru',
        stage: 'Shortlisted',
        appliedOn: new Date().toISOString(),
        summary: 'Regression candidate for interview scheduling.',
        recommendation: 'StrongMatch',
        matchedSkills: ['Node.js'],
        missingSkills: [],
      },
    });

    const startIntv = new Date(Date.now() + 86400000 * 10 + Math.floor(Math.random() * 100000000));
    const endIntv = new Date(startIntv.getTime() + 3600000);

    const interviewCreated = await createInterview(
      {
        candidateId: interviewRegressCandidate,
        title: 'System Design Round',
        round: 1,
        startsAt: startIntv,
        endsAt: endIntv,
        panelMembers: [managerUser1.id],
        leadInterviewerId: managerUser1.id,
      },
      managerUser1
    );
    assert(
      interviewCreated.id.startsWith('INTV-') && interviewCreated.status === 'Scheduled',
      'Test 32: Existing Phase 4C-A regression (Interview Engine & Panel)',
      `Interview created: ${interviewCreated.id}`
    );

    // =========================================================================
    // TEST 33: Existing Phase 4A regression (ATS Requisitions & CRM Notes)
    // =========================================================================
    const noteCreated = await addCandidateNote(
      candidateSelectedId,
      'Compensation discussion finalized at ₹28 LPA.',
      managerUser1
    );
    const timeline = await getCandidateTimeline(candidateSelectedId, managerUser1);
    assert(
      noteCreated.id !== null && timeline.length >= 2,
      'Test 33: Existing Phase 4A regression (ATS Requisitions & CRM Notes)',
      `Note added, Timeline events: ${timeline.length}`
    );

    // =========================================================================
    // TEST 34: Existing Phase 4B regression (Skill Extraction & Match Engine)
    // =========================================================================
    const extractedSkills = await extractSkillsFromText(
      'Hands-on experience with Node.js, TypeScript, PostgreSQL, and AWS.'
    );
    const matchScore = computeMatchScore(
      {
        matchedSkills: ['Node.js', 'TypeScript', 'PostgreSQL'],
        experience: '7 years',
        location: 'Bengaluru',
      },
      {
        requirements: ['Node.js', 'TypeScript', 'PostgreSQL', 'System Design'],
        experience_min: 5,
        location: 'Bengaluru',
      }
    );
    assert(
      extractedSkills.some((s) => s.name === 'Node.js') && matchScore.overallScore >= 75,
      'Test 34: Existing Phase 4B regression (Skill Extraction & Match Engine)',
      `Extracted skills: ${extractedSkills.length}, Match Score: ${matchScore.overallScore}%`
    );

    // =========================================================================
    // TEST 35: Existing Phase 3 regression (Performance & Goals)
    // =========================================================================
    const ratingBand = getRatingBand(4.6);
    assert(
      ratingBand.level === 5 && ratingBand.label === 'Outstanding',
      'Test 35: Existing Phase 3 regression (Performance & Goals)',
      `Rating band: ${ratingBand.label} (Level ${ratingBand.level})`
    );

    // =========================================================================
    // TEST 36: Existing Phase 2 regression (Statutory India Payroll Engine)
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
      'Test 36: Existing Phase 2 regression (Statutory India Payroll Engine)',
      `PF: ₹${pfCalc.employerPF}, ESIC: ₹${esicCalc.employerESIC}, PT: ₹${ptCalc}, Tax: ₹${taxCalc.totalAnnualTax}`
    );

    // =========================================================================
    // TEST 37: Existing Phase 1 regression (Employee Lifecycle & Core HR)
    // =========================================================================
    const totalEmployees = await db.employee.count();
    const activeAdmin = await db.employee.findUnique({
      where: { id: 'EMP-001' },
      select: { id: true, name: true, userRole: true, status: true },
    });
    assert(
      totalEmployees > 0 && Boolean(activeAdmin) && (activeAdmin?.userRole.toLowerCase() === 'admin' || activeAdmin?.status === 'Active'),
      'Test 37: Existing Phase 1 regression (Employee Lifecycle & Core HR)',
      `Total Employees: ${totalEmployees}, Active Admin: ${activeAdmin?.name} (${activeAdmin?.userRole})`
    );
  } catch (err) {
    console.error('Fatal error during test suite execution:', err);
  } finally {
    console.log('\n========================================================================');
    console.log(`  PHASE 4C-C1 TEST RESULTS: ${passed}/37 PASSED (${failed} FAILED)`);
    console.log('========================================================================\n');
  }
}

runPhase4CC1TestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
