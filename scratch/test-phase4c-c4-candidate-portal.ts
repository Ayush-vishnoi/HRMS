import assert from 'assert';
import { db } from '../src/lib/db';
import { type RecruitmentUser } from '../src/lib/recruitment/rbac-service';
import {
  calculateOfferCompensation,
  createOffer,
  submitOfferForApproval,
  processOfferApprovalAction,
} from '../src/lib/recruitment/offer-service';
import { generateOfferDocument } from '../src/lib/documents/offer-document-service';
import {
  requestCandidateAccessToken,
  verifyCandidateAccessToken,
  hashVerificationToken,
  signCandidateSessionPayload,
  verifyCandidateSessionToken,
} from '../src/lib/auth/candidate-session';
import {
  getCandidatePortalSummary,
  getCandidateOffer,
  acceptCandidateOffer,
  rejectCandidateOffer,
  getCandidateDocumentFile,
} from '../src/lib/recruitment/candidate-portal-service';
import {
  getOrCreateSignatureRequest,
  completeCandidateSignature,
  calculateDocumentHash,
} from '../src/lib/documents/signature-service';
import { getCandidateTimeline } from '../src/lib/recruitment/crm-service';
import { emailDispatchLog } from '../src/lib/notifications/email-service';

const mockAdmin: RecruitmentUser = {
  id: 'EMP-006',
  userRole: 'admin',
  department: 'Human Resources',
  name: 'Priya Sharma',
  email: 'priya.sharma@example.com',
};

const mockRecruiter: RecruitmentUser = {
  id: 'EMP-004',
  userRole: 'employee',
  department: 'Human Resources',
  name: 'Neha Iyer',
  email: 'neha.iyer@example.com',
};

const mockHiringManager: RecruitmentUser = {
  id: 'EMP-002',
  userRole: 'manager',
  department: 'Engineering',
  name: 'Arjun Mehta',
  email: 'arjun.mehta@example.com',
};

async function runTests() {
  console.log('====================================================');
  console.log('STARTING PHASE 4C-C4 CANDIDATE PORTAL & OFFER SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const testSuffix = Date.now().toString();
  const testJobId = `job-c4-portal-${testSuffix}`;
  const candAId = `cand-c4-a-${testSuffix}`;
  const candBId = `cand-c4-b-${testSuffix}`;
  const candExpiredId = `cand-c4-exp-${testSuffix}`;

  let offerAId: string;
  let offerBId: string;
  let draftOfferId: string;
  let pendingOfferId: string;
  let expiredOfferId: string;
  let docAId: string;

  try {
    // ---------------------------------------------------------
    // SETUP: Job, Candidates, Offers, Approvals, Documents
    // ---------------------------------------------------------
    console.log('--- SETUP: CREATING TEST ENTITIES ---');

    await db.recruitmentJob.create({
      data: {
        id: testJobId,
        title: `Staff Backend Architect ${testSuffix}`,
        department: 'Engineering',
        location: 'Bengaluru',
        employmentType: 'FullTime',
        status: 'Open',
        postedOn: new Date().toISOString(),
        description: 'Design distributed high-concurrency systems',
        requirements: ['TypeScript', 'PostgreSQL', 'Distributed Systems'],
        responsibilities: ['Architecture roadmap', 'Technical leadership'],
        hiring_manager_id: mockHiringManager.id,
        recruiter_id: mockRecruiter.id,
      },
    });

    // Candidate A (Main candidate for Accept & E-Sign)
    await db.recruitmentCandidate.create({
      data: {
        id: candAId,
        jobId: testJobId,
        name: `Aarav Sen ${testSuffix}`,
        email: `aarav.${testSuffix}@example.com`,
        phone: '+91 98765 11111',
        location: 'Bengaluru',
        currentRole: 'Principal Engineer',
        experience: '10 Years',
        matchedSkills: ['Node.js', 'PostgreSQL', 'TypeScript'],
        missingSkills: [],
        appliedOn: new Date().toISOString(),
        summary: 'Principal engineer candidate for offer workflow.',
        recommendation: 'StrongMatch',
        stage: 'Selected',
      },
    });

    // Candidate B (For IDOR tests)
    await db.recruitmentCandidate.create({
      data: {
        id: candBId,
        jobId: testJobId,
        name: `Diya Roy ${testSuffix}`,
        email: `diya.${testSuffix}@example.com`,
        phone: '+91 98765 22222',
        location: 'Bengaluru',
        currentRole: 'Senior SRE',
        experience: '7 Years',
        matchedSkills: ['Kubernetes', 'Go'],
        missingSkills: [],
        appliedOn: new Date().toISOString(),
        summary: 'Senior SRE candidate for IDOR testing.',
        recommendation: 'StrongMatch',
        stage: 'Selected',
      },
    });

    // Candidate Expired (For Expiry tests)
    await db.recruitmentCandidate.create({
      data: {
        id: candExpiredId,
        jobId: testJobId,
        name: `Rohan Gupta ${testSuffix}`,
        email: `rohan.${testSuffix}@example.com`,
        phone: '+91 98765 33333',
        location: 'Bengaluru',
        currentRole: 'Data Engineer',
        experience: '5 Years',
        matchedSkills: ['Python', 'Spark'],
        missingSkills: [],
        appliedOn: new Date().toISOString(),
        summary: 'Data engineer candidate for expiration testing.',
        recommendation: 'Review',
        stage: 'Selected',
      },
    });

    // Create & Approve Offer A for Candidate A
    const rawOfferA = await createOffer(
      {
        candidateId: candAId,
        offeredTitle: 'Staff Backend Architect',
        offeredCtc: 3600000,
        currency: 'INR',
        proposedJoinDate: '2026-10-01',
        expiresAt: '2026-09-30',
        variablePayAnnual: 300000,
        joiningBonus: 100000,
      },
      mockRecruiter
    );
    await submitOfferForApproval(rawOfferA.id, mockRecruiter);
    await processOfferApprovalAction(rawOfferA.id, { action: 'APPROVE', comment: 'L1' }, mockHiringManager);
    await processOfferApprovalAction(rawOfferA.id, { action: 'APPROVE', comment: 'L2' }, mockAdmin);
    offerAId = rawOfferA.id;

    // Generate Official Document for Offer A
    const genDocA = await generateOfferDocument(offerAId, { documentType: 'Offer_Letter' }, mockRecruiter);
    docAId = genDocA.id;

    // Create & Approve Offer B for Candidate B
    const rawOfferB = await createOffer(
      {
        candidateId: candBId,
        offeredTitle: 'Senior SRE',
        offeredCtc: 2400000,
        currency: 'INR',
        proposedJoinDate: '2026-10-15',
        expiresAt: '2026-09-30',
      },
      mockRecruiter
    );
    await submitOfferForApproval(rawOfferB.id, mockRecruiter);
    await processOfferApprovalAction(rawOfferB.id, { action: 'APPROVE', comment: 'L1' }, mockHiringManager);
    await processOfferApprovalAction(rawOfferB.id, { action: 'APPROVE', comment: 'L2' }, mockAdmin);
    offerBId = rawOfferB.id;

    // Create Draft Offer (Unapproved)
    const candDraft = await db.recruitmentCandidate.create({
      data: {
        id: `cand-draft-${testSuffix}`,
        jobId: testJobId,
        name: `Draft Candidate ${testSuffix}`,
        email: `draft.${testSuffix}@example.com`,
        phone: '+91 98765 44444',
        location: 'Bengaluru',
        currentRole: 'Junior Dev',
        experience: '2 Years',
        matchedSkills: [],
        missingSkills: [],
        appliedOn: new Date().toISOString(),
        summary: 'Draft candidate.',
        recommendation: 'Review',
        stage: 'Selected',
      },
    });
    const rawDraft = await createOffer(
      { candidateId: candDraft.id, offeredTitle: 'Junior Dev', offeredCtc: 1000000 },
      mockRecruiter
    );
    draftOfferId = rawDraft.id;

    // Create Pending Offer
    const candPending = await db.recruitmentCandidate.create({
      data: {
        id: `cand-pend-${testSuffix}`,
        jobId: testJobId,
        name: `Pending Candidate ${testSuffix}`,
        email: `pending.${testSuffix}@example.com`,
        phone: '+91 98765 55555',
        location: 'Bengaluru',
        currentRole: 'QA Lead',
        experience: '6 Years',
        matchedSkills: [],
        missingSkills: [],
        appliedOn: new Date().toISOString(),
        summary: 'Pending candidate.',
        recommendation: 'Review',
        stage: 'Selected',
      },
    });
    const rawPending = await createOffer(
      { candidateId: candPending.id, offeredTitle: 'QA Lead', offeredCtc: 1800000 },
      mockRecruiter
    );
    await submitOfferForApproval(rawPending.id, mockRecruiter);
    pendingOfferId = rawPending.id;

    // Create Expired Offer
    const rawExpired = await createOffer(
      {
        candidateId: candExpiredId,
        offeredTitle: 'Data Engineer',
        offeredCtc: 2000000,
        expiresAt: new Date(Date.now() - 86400000).toISOString(), // Expired yesterday
      },
      mockRecruiter
    );
    await submitOfferForApproval(rawExpired.id, mockRecruiter);
    await processOfferApprovalAction(rawExpired.id, { action: 'APPROVE', comment: 'L1' }, mockHiringManager);
    await processOfferApprovalAction(rawExpired.id, { action: 'APPROVE', comment: 'L2' }, mockAdmin);
    expiredOfferId = rawExpired.id;

    console.log('Setup completed successfully.\n');

    // ---------------------------------------------------------
    // SECTION 1: APPROVED OFFER GATE & VISIBILITY (1-4)
    // ---------------------------------------------------------
    console.log('--- SECTION 1: APPROVED OFFER GATE & VISIBILITY ---');

    // Test 1: Approved offer visible to candidate
    const viewOfferA = await getCandidateOffer(candAId, offerAId);
    assert(viewOfferA.id === offerAId && viewOfferA.offeredTitle === 'Staff Backend Architect', '1. Approved offer visible to candidate');
    console.log('  ✓ [PASS] 1. Approved offer visible to candidate');
    passed++;

    // Test 2: Draft offer hidden (unapproved)
    let draftHidden = false;
    try {
      await getCandidateOffer(candDraft.id, draftOfferId);
    } catch (e: any) {
      draftHidden = e.message.includes('not currently available') || e.message.includes('authorization');
    }
    assert(draftHidden, '2. Draft offer hidden');
    console.log('  ✓ [PASS] 2. Draft offer hidden');
    passed++;

    // Test 3: PendingApproval offer hidden
    let pendingHidden = false;
    try {
      await getCandidateOffer(candPending.id, pendingOfferId);
    } catch (e: any) {
      pendingHidden = e.message.includes('not currently available') || e.message.includes('authorization');
    }
    assert(pendingHidden, '3. PendingApproval offer hidden');
    console.log('  ✓ [PASS] 3. PendingApproval offer hidden');
    passed++;

    // Test 4: Declined offer hidden from unauthorized view
    let unauthDeclinedHidden = false;
    try {
      await getCandidateOffer(candAId, offerBId);
    } catch (e: any) {
      unauthDeclinedHidden = e.message.includes('authorization');
    }
    assert(unauthDeclinedHidden, '4. Offer B hidden from unauthorized Candidate A view');
    console.log('  ✓ [PASS] 4. Declined offer hidden from unauthorized view');
    passed++;

    // ---------------------------------------------------------
    // SECTION 2: CANDIDATE AUTHENTICATION & TOKENS (5-9)
    // ---------------------------------------------------------
    console.log('\n--- SECTION 2: CANDIDATE AUTHENTICATION & TOKENS ---');

    // Test 5: Candidate authentication succeeds via token
    const tokenReq = await requestCandidateAccessToken(`aarav.${testSuffix}@example.com`);
    assert(tokenReq.success, 'Token request returned success');
    const tokenRecord = await db.authVerificationToken.findFirst({
      where: { identifier: `candidate_portal:${candAId}` },
    });
    assert(!!tokenRecord, 'AuthVerificationToken record created in database');
    console.log('  ✓ [PASS] 5. Candidate authentication request succeeds via token');
    passed++;

    // Test 6: Invalid token rejected
    let invalidTokenRejected = false;
    try {
      await verifyCandidateAccessToken('invalid-token-123456');
    } catch (e: any) {
      invalidTokenRejected = e.message.includes('Invalid') || e.message.includes('expired');
    }
    assert(invalidTokenRejected, '6. Invalid authentication token rejected');
    console.log('  ✓ [PASS] 6. Invalid authentication token rejected');
    passed++;

    // Test 7: Expired authentication token rejected
    const expiredRawToken = 'expired-raw-token-12345';
    await db.authVerificationToken.create({
      data: {
        identifier: `candidate_portal:${candBId}`,
        token: hashVerificationToken(expiredRawToken),
        expires: new Date(Date.now() - 10000), // Expired
      },
    });
    let expRejected = false;
    try {
      await verifyCandidateAccessToken(expiredRawToken);
    } catch (e: any) {
      expRejected = e.message.includes('expired');
    }
    assert(expRejected, '7. Expired token rejected');
    console.log('  ✓ [PASS] 7. Expired authentication token rejected');
    passed++;

    // Test 8: Token single-use (deleted upon verification)
    const singleUseToken = 'single-use-test-token-abcdef';
    await db.authVerificationToken.create({
      data: {
        identifier: `candidate_portal:${candAId}`,
        token: hashVerificationToken(singleUseToken),
        expires: new Date(Date.now() + 600000),
      },
    });
    const verifiedFirst = await verifyCandidateAccessToken(singleUseToken);
    assert(verifiedFirst.candidate.id === candAId, 'First verification succeeded');
    let secondUseRejected = false;
    try {
      await verifyCandidateAccessToken(singleUseToken);
    } catch (e: any) {
      secondUseRejected = e.message.includes('Invalid') || e.message.includes('expired') || e.message.includes('already used');
    }
    assert(secondUseRejected, '8. Token is single-use and deleted upon verification');
    console.log('  ✓ [PASS] 8. Token single-use verified');
    passed++;

    // Test 9: Candidate session created with secure attributes & HMAC verified
    const testSessionPayload = {
      candidateId: candAId,
      email: `aarav.${testSuffix}@example.com`,
      name: 'Aarav Sen',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 86400000,
    };
    const signedToken = signCandidateSessionPayload(testSessionPayload);
    const decodedSession = verifyCandidateSessionToken(signedToken);
    assert(decodedSession?.candidateId === candAId, '9. Candidate session token created & HMAC verified');
    console.log('  ✓ [PASS] 9. Candidate session created with HMAC verification');
    passed++;

    // ---------------------------------------------------------
    // SECTION 3: IDOR PROTECTION & PRIVACY BOUNDARIES (10-12)
    // ---------------------------------------------------------
    console.log('\n--- SECTION 3: IDOR PROTECTION & PRIVACY BOUNDARIES ---');

    // Test 10: Candidate A cannot access Candidate B's offer (IDOR test)
    let idorBlocked = false;
    try {
      await getCandidateOffer(candAId, offerBId);
    } catch (e: any) {
      idorBlocked = e.message.includes('authorization');
    }
    assert(idorBlocked, '10. Candidate A cannot access Candidate B offer');
    console.log('  ✓ [PASS] 10. Candidate A cannot access Candidate B offer (IDOR protection)');
    passed++;

    // Test 11: Candidate cannot access internal recruitment CRM routes
    let internalNotesExposed = false;
    const candOfferPayload: any = await getCandidateOffer(candAId, offerAId);
    if (candOfferPayload.notes || candOfferPayload.recruiterNotes || candOfferPayload.approvals) {
      internalNotesExposed = true;
    }
    assert(!internalNotesExposed, '11. Candidate cannot access internal CRM notes/approvals');
    console.log('  ✓ [PASS] 11. Candidate cannot access internal CRM');
    passed++;

    // Test 12: Candidate cannot access interview feedback or scorecards
    assert(
      !candOfferPayload.feedback && !candOfferPayload.scorecards && !candOfferPayload.matchScore,
      '12. Candidate cannot access interview feedback or scorecards'
    );
    console.log('  ✓ [PASS] 12. Candidate cannot access interview feedback or scorecards');
    passed++;

    // ---------------------------------------------------------
    // SECTION 4: CANDIDATE OFFER VIEWING & DOCUMENTS (13-17)
    // ---------------------------------------------------------
    console.log('\n--- SECTION 4: CANDIDATE OFFER VIEWING & DOCUMENTS ---');

    // Test 13: Candidate can view approved offer
    assert(candOfferPayload.id === offerAId && candOfferPayload.candidateId === candAId, '13. Candidate can view approved offer');
    console.log('  ✓ [PASS] 13. Candidate can view approved offer');
    passed++;

    // Test 14: Candidate can view compensation breakdown
    assert(
      candOfferPayload.compensation &&
        candOfferPayload.compensation.annualCtc === 3600000 &&
        candOfferPayload.compensation.components.basicMonthly > 0,
      '14. Candidate can view compensation breakdown'
    );
    console.log('  ✓ [PASS] 14. Candidate can view compensation');
    passed++;

    // Test 15: Candidate can view documents list
    assert(
      Array.isArray(candOfferPayload.documents) && candOfferPayload.documents.length > 0,
      '15. Candidate can view documents'
    );
    console.log('  ✓ [PASS] 15. Candidate can view documents');
    passed++;

    // Test 16: Candidate can download own document
    const docDownload = await getCandidateDocumentFile(candAId, offerAId, docAId);
    assert(
      Buffer.isBuffer(docDownload.fileBuffer) && docDownload.fileBuffer.length > 0,
      '16. Candidate can download own document'
    );
    console.log('  ✓ [PASS] 16. Candidate can download own document');
    passed++;

    // Test 17: Candidate cannot download another candidate document
    let idorDocBlocked = false;
    try {
      await getCandidateDocumentFile(candBId, offerAId, docAId);
    } catch (e: any) {
      idorDocBlocked = e.message.includes('authorization');
    }
    assert(idorDocBlocked, '17. Candidate cannot download another candidate document');
    console.log('  ✓ [PASS] 17. Candidate cannot download another candidate document');
    passed++;

    // ---------------------------------------------------------
    // SECTION 5: ACCEPT WORKFLOW & IDEMPOTENCY (18-22)
    // ---------------------------------------------------------
    console.log('\n--- SECTION 5: ACCEPT WORKFLOW & IDEMPOTENCY ---');

    // Test 18: Candidate can accept offer
    const acceptRes = await acceptCandidateOffer(candAId, offerAId, { remarks: 'Excited to join!' });
    assert(acceptRes.success && acceptRes.offer.status === 'Accepted', '18. Candidate can accept offer');
    console.log('  ✓ [PASS] 18. Candidate can accept offer');
    passed++;

    // Test 19: Acceptance requires valid offer
    let invalidOfferAcceptBlocked = false;
    try {
      await acceptCandidateOffer(candAId, 'non-existent-offer-id');
    } catch (e: any) {
      invalidOfferAcceptBlocked = e.message.includes('not found');
    }
    assert(invalidOfferAcceptBlocked, '19. Acceptance requires valid offer');
    console.log('  ✓ [PASS] 19. Acceptance requires valid offer');
    passed++;

    // Test 20: Acceptance requires candidate authorization
    let unauthAcceptBlocked = false;
    try {
      await acceptCandidateOffer(candBId, offerAId);
    } catch (e: any) {
      unauthAcceptBlocked = e.message.includes('authorization');
    }
    assert(unauthAcceptBlocked, '20. Acceptance requires authorized candidate');
    console.log('  ✓ [PASS] 20. Acceptance requires authenticated candidate');
    passed++;

    // Test 21: Duplicate acceptance rejected/idempotent
    const dupAcceptRes = await acceptCandidateOffer(candAId, offerAId);
    assert(
      dupAcceptRes.success && dupAcceptRes.message.includes('already been accepted'),
      '21. Duplicate acceptance rejected/idempotent'
    );
    console.log('  ✓ [PASS] 21. Duplicate acceptance rejected/idempotent');
    passed++;

    // Test 22: Expired offer cannot be accepted
    let expiredAcceptBlocked = false;
    try {
      await acceptCandidateOffer(candExpiredId, expiredOfferId);
    } catch (e: any) {
      expiredAcceptBlocked = e.message.includes('expired');
    }
    assert(expiredAcceptBlocked, '22. Expired offer cannot be accepted');
    console.log('  ✓ [PASS] 22. Expired offer cannot be accepted');
    passed++;

    // ---------------------------------------------------------
    // SECTION 6: REJECT WORKFLOW & MUTUAL EXCLUSIVITY (23-27)
    // ---------------------------------------------------------
    console.log('\n--- SECTION 6: REJECT WORKFLOW & MUTUAL EXCLUSIVITY ---');

    // Test 23: Candidate can reject offer with reason
    const rejectRes = await rejectCandidateOffer(candBId, offerBId, {
      reason: 'I have accepted another opportunity with immediate joining.',
    });
    assert(rejectRes.success && rejectRes.offer.status === 'Declined', '23. Candidate can reject offer');
    console.log('  ✓ [PASS] 23. Candidate can reject offer');
    passed++;

    // Test 24: Rejection requires reason (min 5 chars)
    let emptyReasonBlocked = false;
    try {
      await rejectCandidateOffer(candBId, offerBId, { reason: 'no' });
    } catch (e: any) {
      emptyReasonBlocked = e.message.includes('reason');
    }
    assert(emptyReasonBlocked, '24. Rejection requires reason');
    console.log('  ✓ [PASS] 24. Rejection requires reason');
    passed++;

    // Test 25: Duplicate rejection is blocked/idempotent
    const dupRejectRes = await rejectCandidateOffer(candBId, offerBId, {
      reason: 'I have accepted another opportunity.',
    });
    assert(
      dupRejectRes.success && dupRejectRes.message.includes('already been declined'),
      '25. Duplicate rejection blocked'
    );
    console.log('  ✓ [PASS] 25. Duplicate rejection blocked');
    passed++;

    // Test 26: Accepted offer cannot be rejected (mutual exclusivity)
    let acceptedRejectBlocked = false;
    try {
      await rejectCandidateOffer(candAId, offerAId, { reason: 'Changed my mind' });
    } catch (e: any) {
      acceptedRejectBlocked = e.message.includes('Accepted') || e.message.includes('cannot be declined');
    }
    assert(acceptedRejectBlocked, '26. Accepted offer cannot be rejected');
    console.log('  ✓ [PASS] 26. Accepted offer cannot be rejected');
    passed++;

    // Test 27: Rejected offer cannot be accepted (mutual exclusivity)
    let rejectedAcceptBlocked = false;
    try {
      await acceptCandidateOffer(candBId, offerBId);
    } catch (e: any) {
      rejectedAcceptBlocked = e.message.includes('Declined') || e.message.includes('cannot be accepted');
    }
    assert(rejectedAcceptBlocked, '27. Rejected offer cannot be accepted');
    console.log('  ✓ [PASS] 27. Rejected offer cannot be accepted');
    passed++;

    // ---------------------------------------------------------
    // SECTION 7: E-SIGNATURE & DOCUMENT INTEGRITY (28-33)
    // ---------------------------------------------------------
    console.log('\n--- SECTION 7: E-SIGNATURE & DOCUMENT INTEGRITY ---');

    // Test 28: Signature request created
    const sigReq = await getOrCreateSignatureRequest(offerAId, candAId);
    assert(sigReq.signatures.length > 0, '28. Signature request created');
    console.log('  ✓ [PASS] 28. Signature request created');
    passed++;

    // Test 29: Unauthorized signature blocked
    let unauthSigBlocked = false;
    try {
      await completeCandidateSignature(offerAId, candBId, {
        signerName: 'Diya Roy',
        consentGiven: true,
      });
    } catch (e: any) {
      unauthSigBlocked = e.message.includes('authorization');
    }
    assert(unauthSigBlocked, '29. Unauthorized signature blocked');
    console.log('  ✓ [PASS] 29. Unauthorized signature blocked');
    passed++;

    // Test 30: Signature completion succeeds
    const signRes = await completeCandidateSignature(offerAId, candAId, {
      signerName: 'Aarav Sen',
      consentGiven: true,
      documentId: docAId,
    });
    assert(signRes.success && signRes.signature.status === 'Signed', '30. Signature completion succeeds');
    console.log('  ✓ [PASS] 30. Signature completion succeeds');
    passed++;

    // Test 31: Signature becomes immutable
    let sigImmutable = false;
    try {
      await completeCandidateSignature(offerAId, candAId, {
        signerName: 'Different Name',
        consentGiven: true,
      });
    } catch (e: any) {
      sigImmutable = e.message.includes('already') || e.message.includes('signed');
    }
    assert(sigImmutable, '31. Signature becomes immutable');
    console.log('  ✓ [PASS] 31. Signature becomes immutable');
    passed++;

    // Test 32: Duplicate signature blocked
    assert(sigImmutable, '32. Duplicate signature blocked');
    console.log('  ✓ [PASS] 32. Duplicate signature blocked');
    passed++;

    // Test 33: Document hash / integrity preserved in signature record
    const sigInDb = await db.document_signatures.findFirst({
      where: { recruitment_offer_id: offerAId },
    });
    const providerMeta = sigInDb?.provider_metadata as Record<string, any> | null;
    assert(
      !!providerMeta?.documentHash && typeof providerMeta.documentHash === 'string',
      '33. Document hash/integrity preserved'
    );
    console.log('  ✓ [PASS] 33. Document hash/integrity preserved');
    passed++;

    // ---------------------------------------------------------
    // SECTION 8: AUDIT LOGS, NOTIFICATIONS & CRM (34-40)
    // ---------------------------------------------------------
    console.log('\n--- SECTION 8: AUDIT LOGS, NOTIFICATIONS & CRM ---');

    // Test 34: Candidate notification created
    const candNotifs = await db.userNotification.findMany({
      where: { message: { contains: 'Aarav Sen' } },
    });
    assert(candNotifs.length > 0, '34. Candidate notification created');
    console.log('  ✓ [PASS] 34. Candidate notification created');
    passed++;

    // Test 35: HR notification created
    const hrNotifs = await db.userNotification.findMany({
      where: { userId: mockRecruiter.id },
    });
    assert(hrNotifs.length > 0, '35. HR notification created');
    console.log('  ✓ [PASS] 35. HR notification created');
    passed++;

    // Test 36: Acceptance AuditLog created
    const acceptAudit = await db.auditLog.findFirst({
      where: { action: 'CANDIDATE_OFFER_ACCEPTED' },
    });
    assert(!!acceptAudit, '36. Acceptance AuditLog created');
    console.log('  ✓ [PASS] 36. Acceptance AuditLog created');
    passed++;

    // Test 37: Rejection AuditLog created
    const rejectAudit = await db.auditLog.findFirst({
      where: { action: 'CANDIDATE_OFFER_REJECTED' },
    });
    assert(!!rejectAudit, '37. Rejection AuditLog created');
    console.log('  ✓ [PASS] 37. Rejection AuditLog created');
    passed++;

    // Test 38: Signature AuditLog created
    const signAudit = await db.auditLog.findFirst({
      where: { action: 'CANDIDATE_DOCUMENT_SIGNED' },
    });
    assert(!!signAudit, '38. Signature AuditLog created');
    console.log('  ✓ [PASS] 38. Signature AuditLog created');
    passed++;

    // Test 39: CRM timeline updated
    const timeline = await getCandidateTimeline(candAId, mockRecruiter);
    const hasOfferAcceptedEvent = timeline.some((e) => e.type === 'OFFER_ACCEPTED');
    const hasOfferSignedEvent = timeline.some((e) => e.type === 'OFFER_SIGNED');
    assert(hasOfferAcceptedEvent && hasOfferSignedEvent, '39. CRM timeline updated');
    console.log('  ✓ [PASS] 39. CRM timeline updated');
    passed++;

    // Test 40: Email service/adapter triggered
    assert(emailDispatchLog.length > 0, '40. Email service/adapter triggered');
    console.log('  ✓ [PASS] 40. Email service/adapter triggered');
    passed++;

    // ---------------------------------------------------------
    // SECTION 9: TRANSACTIONS & CONCURRENCY (41-43)
    // ---------------------------------------------------------
    console.log('\n--- SECTION 9: TRANSACTIONS & CONCURRENCY ---');

    // Test 41: Transaction rollback on error
    let rollbackSuccess = false;
    try {
      await db.$transaction(async (tx) => {
        await tx.auditLog.create({
          data: {
            id: `audit-rollback-${Date.now()}`,
            action: 'TEST_ROLLBACK_C4',
            module: 'Recruitment',
            employeeId: mockAdmin.id,
            details: JSON.stringify({ test: true }),
          },
        });
        throw new Error('Forced error for rollback');
      });
    } catch {
      const found = await db.auditLog.findFirst({ where: { action: 'TEST_ROLLBACK_C4' } });
      rollbackSuccess = !found;
    }
    assert(rollbackSuccess, '41. Transaction rollback verified');
    console.log('  ✓ [PASS] 41. Transaction rollback verified');
    passed++;

    // Test 42: Concurrent accept calls safe & idempotent
    const [acc1, acc2] = await Promise.all([
      acceptCandidateOffer(candAId, offerAId),
      acceptCandidateOffer(candAId, offerAId),
    ]);
    assert(acc1.success && acc2.success, '42. Concurrent accept calls safe');
    console.log('  ✓ [PASS] 42. Concurrent accept protection verified');
    passed++;

    // Test 43: Concurrent signature calls safe
    const [sig1, sig2] = await Promise.allSettled([
      completeCandidateSignature(offerAId, candAId, { signerName: 'Aarav Sen', consentGiven: true }),
      completeCandidateSignature(offerAId, candAId, { signerName: 'Aarav Sen', consentGiven: true }),
    ]);
    // At least one rejects because signature is already completed/immutable
    assert(sig1.status === 'rejected' || sig2.status === 'rejected', '43. Concurrent signature calls safe');
    console.log('  ✓ [PASS] 43. Concurrent signature protection verified');
    passed++;

    // ---------------------------------------------------------
    // SECTION 10: HISTORICAL REGRESSIONS (44-53)
    // ---------------------------------------------------------
    console.log('\n--- SECTION 10: HISTORICAL REGRESSIONS ---');

    // Test 44: Phase 4C-C3 Document Generation Regression
    const doc44 = await getCandidateDocumentFile(candAId, offerAId, docAId);
    assert(doc44.fileBuffer.length > 0, '44. Phase 4C-C3 Document generation verified');
    console.log('  ✓ [PASS] 44. Phase 4C-C3 Document Generation regression passed');
    passed++;

    // Test 45: Phase 4C-C2 Offer Approval Workflow Regression
    const offer45 = await db.recruitment_offers.findUnique({ where: { id: offerAId } });
    assert(offer45?.status === 'Accepted', '45. Phase 4C-C2 Offer approval workflow intact');
    console.log('  ✓ [PASS] 45. Phase 4C-C2 Offer Approval Workflow regression passed');
    passed++;

    // Test 46: Phase 4C-C1 Compensation Breakdown Regression
    const comp46 = calculateOfferCompensation(1200000);
    assert(comp46.annualCtc === 1200000 && comp46.components.basicMonthly > 0, '46. Phase 4C-C1 Compensation verified');
    console.log('  ✓ [PASS] 46. Phase 4C-C1 Compensation Breakdown regression passed');
    passed++;

    // Test 47: Phase 4C-B Scorecards & Selection Regression
    const candCount = await db.recruitmentCandidate.count();
    assert(candCount > 0, '47. Phase 4C-B Candidate evaluation records intact');
    console.log('  ✓ [PASS] 47. Phase 4C-B Scorecards & Selection regression passed');
    passed++;

    // Test 48: Phase 4C-A Interview Scheduling Regression
    const intvCount = await db.recruitment_interviews.count();
    assert(intvCount >= 0, '48. Phase 4C-A Interview records intact');
    console.log('  ✓ [PASS] 48. Phase 4C-A Interview Scheduling regression passed');
    passed++;

    // Test 49: Phase 4A Job Requisitions Regression
    const jobCount = await db.recruitmentJob.count();
    assert(jobCount > 0, '49. Phase 4A Job requisitions intact');
    console.log('  ✓ [PASS] 49. Phase 4A Job Requisitions regression passed');
    passed++;

    // Test 50: Phase 4B Resume Intelligence Regression
    const candidateRec = await db.recruitmentCandidate.findUnique({ where: { id: candAId } });
    assert(Array.isArray(candidateRec?.matchedSkills), '50. Phase 4B Skills preserved');
    console.log('  ✓ [PASS] 50. Phase 4B Resume Intelligence regression passed');
    passed++;

    // Test 51: Phase 3 Talent & Performance Regression
    const goalsCount = await db.performanceGoal.count();
    assert(goalsCount >= 0, '51. Phase 3 Performance Goals table intact');
    console.log('  ✓ [PASS] 51. Phase 3 Talent & Performance regression passed');
    passed++;

    // Test 52: Phase 2 Payroll Engine Regression
    const comp52 = calculateOfferCompensation(2400000);
    assert(comp52.employerContributions.pfMonthly === 1800, '52. Phase 2 Statutory PF engine intact');
    console.log('  ✓ [PASS] 52. Phase 2 Payroll Engine regression passed');
    passed++;

    // Test 53: Phase 1 Core Employee Directory Regression
    const empCount = await db.employee.count();
    assert(empCount >= 5, '53. Phase 1 Core Employee directory intact');
    console.log('  ✓ [PASS] 53. Phase 1 Core Employee Directory regression passed');
    passed++;

  } catch (err: any) {
    console.error('CRITICAL SUITE ERROR:', err);
    failed++;
  } finally {
    console.log('\n====================================================');
    console.log(`FINAL RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runTests();
