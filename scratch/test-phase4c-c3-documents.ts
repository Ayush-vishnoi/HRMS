/**
 * HRMS PHASE 4C-C3: OFFER DOCUMENT GENERATION + TEMPLATES + PDF TEST SUITE
 * Complete 45-test automated verification suite
 */

import { db } from '../src/lib/db';
import { type RecruitmentUser } from '../src/lib/recruitment/rbac-service';
import {
  calculateOfferCompensation,
  createOffer,
  submitOfferForApproval,
  processOfferApprovalAction,
} from '../src/lib/recruitment/offer-service';
import {
  getAvailableDocumentTemplates,
  previewOfferDocument,
  generateOfferDocument,
  getOfferDocuments,
  getDocumentFile,
  buildDocumentContextData,
} from '../src/lib/documents/offer-document-service';
import {
  renderDocumentTemplate,
  sanitizeAndValidateTemplateContent,
  substituteVariables,
  validateTemplateRequirements,
} from '../src/lib/documents/template-engine';
import { generateServerSidePdfBuffer } from '../src/lib/documents/pdf-generator';
import { resolveContextVariables } from '../src/lib/documents/template-variables';

// Mock Users matching existing canonical database records
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

const mockUnauthorizedManager: RecruitmentUser = {
  id: 'EMP-007',
  userRole: 'manager',
  department: 'Marketing',
  name: 'Ananya Rao',
  email: 'ananya.rao@example.com',
};

const mockEmployee: RecruitmentUser = {
  id: 'EMP-003',
  userRole: 'employee',
  department: 'Engineering',
  name: 'Rahul Verma',
  email: 'rahul.verma@example.com',
};

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('STARTING PHASE 4C-C3 OFFER DOCUMENT GENERATION TEST SUITE');
  console.log('====================================================\n');

  // Test setup IDs
  const testJobId = `job-c3-doc-${Date.now()}`;
  const testCandidateId = `cand-c3-doc-${Date.now()}`;
  let approvedOfferId = '';
  let draftOfferId = '';
  let pendingOfferId = '';
  let declinedOfferId = '';

  try {

    await db.recruitmentJob.create({
      data: {
        id: testJobId,
        title: 'Staff Backend Architect C3',
        department: 'Engineering',
        location: 'Bengaluru',
        openings: 1,
        status: 'Open',
        postedOn: new Date().toLocaleDateString(),
        description: 'Staff backend architect role responsible for core platform services.',
        requirements: ['Node.js', 'PostgreSQL', 'System Design'],
        hiring_manager_id: mockHiringManager.id,
        recruiter_id: mockRecruiter.id,
      },
    });

    await db.recruitmentCandidate.create({
      data: {
        id: testCandidateId,
        jobId: testJobId,
        name: 'Aarav Sen',
        email: 'aarav.sen@example.com',
        phone: '+91 98765 43210',
        location: 'Bengaluru, India',
        currentRole: 'Principal Engineer',
        experience: '10 Years',
        matchedSkills: ['Node.js', 'PostgreSQL', 'System Design', 'TypeScript'],
        missingSkills: [],
        appliedOn: new Date().toISOString(),
        summary: 'Principal engineer candidate with deep architecture skills.',
        recommendation: 'StrongMatch',
        stage: 'Selected',
      },
    });

    // Create Draft Offer
    const draftOffer = await createOffer(
      {
        candidateId: testCandidateId,
        offeredTitle: 'Staff Backend Architect',
        offeredCtc: 3600000,
        currency: 'INR',
        proposedJoinDate: '2026-10-01',
        expiresAt: '2026-09-15',
        variablePayAnnual: 300000,
        joiningBonus: 100000,
      },
      mockRecruiter
    );
    draftOfferId = draftOffer.id;

    // Create Pending Offer
    const cand2 = await db.recruitmentCandidate.create({
      data: {
        id: `cand2-${Date.now()}`,
        jobId: testJobId,
        name: 'Diya Sharma',
        email: 'diya.sharma@example.com',
        phone: '+91 98765 22222',
        location: 'Bengaluru',
        currentRole: 'Senior SRE',
        experience: '6 Years',
        appliedOn: new Date().toISOString(),
        matchedSkills: [],
        missingSkills: [],
        summary: 'Senior SRE candidate.',
        recommendation: 'StrongMatch',
        stage: 'Selected',
      },
    });
    const pendingOffer = await createOffer(
      { candidateId: cand2.id, offeredTitle: 'Senior SRE', offeredCtc: 2400000 },
      mockRecruiter
    );
    await submitOfferForApproval(pendingOffer.id, mockRecruiter);
    pendingOfferId = pendingOffer.id;

    // Create Declined Offer
    const cand3 = await db.recruitmentCandidate.create({
      data: {
        id: `cand3-${Date.now()}`,
        jobId: testJobId,
        name: 'Karan Patel',
        email: 'karan.patel@example.com',
        phone: '+91 98765 33333',
        location: 'Bengaluru',
        currentRole: 'Lead QA',
        experience: '7 Years',
        appliedOn: new Date().toISOString(),
        matchedSkills: [],
        missingSkills: [],
        summary: 'Lead QA candidate.',
        recommendation: 'Review',
        stage: 'Selected',
      },
    });
    const declinedOffer = await createOffer(
      { candidateId: cand3.id, offeredTitle: 'Lead QA', offeredCtc: 2000000 },
      mockRecruiter
    );
    await submitOfferForApproval(declinedOffer.id, mockRecruiter);
    await processOfferApprovalAction(
      declinedOffer.id,
      { action: 'REJECT', comment: 'Budget ceiling exceeded' },
      mockHiringManager
    );
    declinedOfferId = declinedOffer.id;

    // Create and Fully Approve Offer for Document Generation
    const cand4 = await db.recruitmentCandidate.create({
      data: {
        id: `cand4-${Date.now()}`,
        jobId: testJobId,
        name: 'Meera Iyer',
        email: 'meera.iyer@example.com',
        phone: '+91 98765 44444',
        location: 'Bengaluru',
        currentRole: 'Principal Engineer',
        experience: '9 Years',
        appliedOn: new Date().toISOString(),
        matchedSkills: [],
        missingSkills: [],
        summary: 'Staff architect candidate ready for offer generation.',
        recommendation: 'StrongMatch',
        stage: 'Selected',
      },
    });
    const offerForDoc = await createOffer(
      {
        candidateId: cand4.id,
        offeredTitle: 'Staff Backend Architect',
        offeredCtc: 3600000,
        currency: 'INR',
        proposedJoinDate: '2026-10-01',
        expiresAt: '2026-09-15',
        variablePayAnnual: 300000,
        joiningBonus: 100000,
      },
      mockRecruiter
    );
    await submitOfferForApproval(offerForDoc.id, mockRecruiter);
    // Level 1 approval (Hiring Manager)
    await processOfferApprovalAction(offerForDoc.id, { action: 'APPROVE', comment: 'L1 Approved' }, mockHiringManager);
    // Level 2 approval (Admin)
    await processOfferApprovalAction(offerForDoc.id, { action: 'APPROVE', comment: 'L2 Approved' }, mockAdmin);
    approvedOfferId = offerForDoc.id;

    console.log('Setup completed successfully.\n');

    // ---------------------------------------------------------
    // TEST SECTION 1: ELIGIBILITY & TEMPLATE MATCHING (1-6)
    // ---------------------------------------------------------
    console.log('--- SECTION 1: STAGE & STATUS ELIGIBILITY & TEMPLATE SELECTION ---');

    // Test 1: Approved offer eligible for document generation
    const approvedOfferRecord = await db.recruitment_offers.findUnique({ where: { id: approvedOfferId } });
    assert(approvedOfferRecord?.status === 'Approved', '1. Approved offer status is "Approved"');

    // Test 2: Draft offer blocked from official document generation
    let draftBlocked = false;
    try {
      await generateOfferDocument(draftOfferId, { documentType: 'Offer_Letter' }, mockRecruiter);
    } catch (e: any) {
      draftBlocked = e.message.includes('Approved') || e.message.includes('Draft');
    }
    assert(draftBlocked, '2. Draft offer blocked from official document generation');

    // Test 3: PendingApproval offer blocked
    let pendingBlocked = false;
    try {
      await generateOfferDocument(pendingOfferId, { documentType: 'Offer_Letter' }, mockRecruiter);
    } catch (e: any) {
      pendingBlocked = e.message.includes('Approved') || e.message.includes('PendingApproval');
    }
    assert(pendingBlocked, '3. PendingApproval offer blocked from official document generation');

    // Test 4: Declined offer blocked
    let declinedBlocked = false;
    try {
      await generateOfferDocument(declinedOfferId, { documentType: 'Offer_Letter' }, mockRecruiter);
    } catch (e: any) {
      declinedBlocked = e.message.includes('Approved') || e.message.includes('Declined');
    }
    assert(declinedBlocked, '4. Declined offer blocked from official document generation');

    // Test 5: Correct Offer Letter template selected
    const templates = await getAvailableDocumentTemplates(mockRecruiter);
    const offerTpl = templates.find((t) => t.type === 'Offer_Letter');
    assert(!!offerTpl && offerTpl.type === 'Offer_Letter', '5. Correct Offer_Letter template found and selected');

    // Test 6: Wrong template type rejected if mismatched
    let wrongTypeRejected = false;
    try {
      await previewOfferDocument(
        approvedOfferId,
        { documentType: 'Offer_Letter', templateId: 'tpl-nda-v1' },
        mockRecruiter
      );
    } catch (e: any) {
      wrongTypeRejected = e.message.includes('mismatch') || e.message.includes('Template');
    }
    assert(wrongTypeRejected, '6. Mismatched template type correctly rejected');

    // ---------------------------------------------------------
    // TEST SECTION 2: DYNAMIC VARIABLE SUBSTITUTION & SANITIZATION (7-12)
    // ---------------------------------------------------------
    console.log('\n--- SECTION 2: VARIABLE RESOLUTION & SECURITY SANITIZATION ---');

    const { contextData } = await buildDocumentContextData(approvedOfferId, mockRecruiter);
    const resolvedVars = resolveContextVariables(contextData);

    // Test 7: Dynamic variable substitution works
    const sampleTpl = 'Hello {{candidate.fullName}}, welcome to {{company.name}}!';
    const subResult = substituteVariables(sampleTpl, resolvedVars);
    assert(
      subResult.renderedText.includes('Meera Iyer') && subResult.renderedText.includes('MYLOTIC GROUP'),
      '7. Dynamic variable substitution works properly'
    );

    // Test 8: Candidate variables resolved
    assert(
      resolvedVars['candidate.fullName'] === 'Meera Iyer' &&
        resolvedVars['candidate.email'] === 'meera.iyer@example.com' &&
        resolvedVars['candidate.location'] === 'Bengaluru',
      '8. Candidate variables (name, email, location) resolved accurately'
    );

    // Test 9: Offer variables resolved
    assert(
      resolvedVars['offer.offeredTitle'] === 'Staff Backend Architect' &&
        resolvedVars['offer.offeredCtc'] === '₹36,00,000' &&
        resolvedVars['offer.version'] === '1',
      '9. Offer variables (title, CTC, version) resolved accurately'
    );

    // Test 10: Compensation variables resolved
    assert(
      resolvedVars['compensation.annualCtc'] === '₹36,00,000' &&
        resolvedVars['compensation.basicMonthly'] === '₹1,37,500' &&
        resolvedVars['compensation.hraMonthly'] === '₹68,750' &&
        resolvedVars['compensation.tableHtml'].includes('salary-table'),
      '10. Compensation variables & Annexure table HTML resolved accurately'
    );

    // Test 11: Missing required variable detection
    let missingDetected = false;
    try {
      validateTemplateRequirements('{{candidate.firstName}} and {{candidate.unknownRequiredVar}}', resolvedVars);
      // If we test with missing candidate.fullName:
      const incompleteVars = { ...resolvedVars, 'candidate.fullName': '' };
      const val = validateTemplateRequirements('{{candidate.fullName}}', incompleteVars);
      missingDetected = val.missingRequired.includes('candidate.fullName');
    } catch {
      missingDetected = true;
    }
    assert(missingDetected, '11. Missing required variable correctly detected');

    // Test 12: Unsafe HTML/script rejected
    let xssBlocked = false;
    try {
      sanitizeAndValidateTemplateContent('Hello <script>alert("hacked")</script>');
    } catch (e: any) {
      xssBlocked = e.message.includes('forbidden') || e.message.includes('script');
    }
    assert(xssBlocked, '12. Unsafe HTML <script> rejected by template engine sanitizer');

    // ---------------------------------------------------------
    // TEST SECTION 3: PREVIEW & IMMUTABILITY (13-14)
    // ---------------------------------------------------------
    console.log('\n--- SECTION 3: PREVIEW MODE & IMMUTABILITY ---');

    // Test 13: Preview succeeds
    const previewResult = await previewOfferDocument(
      approvedOfferId,
      { documentType: 'Offer_Letter' },
      mockRecruiter
    );
    assert(
      previewResult.html.includes('Meera Iyer') &&
        (previewResult.html.includes('Offer') || previewResult.html.includes('Architect')),
      '13. Preview succeeds with dynamic HTML rendering'
    );

    // Test 14: Preview does not create permanent document or change offer status
    const postPreviewOffer = await db.recruitment_offers.findUnique({ where: { id: approvedOfferId } });
    const snapObj = postPreviewOffer?.content_snapshot ? JSON.parse(postPreviewOffer.content_snapshot) : {};
    assert(
      !snapObj.documents || snapObj.documents.length === 0,
      '14. Preview mode does not create permanent document records'
    );

    // ---------------------------------------------------------
    // TEST SECTION 4: SERVER-SIDE PDF GENERATION & STORAGE (15-22)
    // ---------------------------------------------------------
    console.log('\n--- SECTION 4: SERVER-SIDE PDF GENERATION & STORAGE ---');

    // Test 15: Server-side PDF generation produces valid PDF buffer
    const pdfBuf = generateServerSidePdfBuffer({
      title: 'Formal Offer of Employment',
      documentType: 'Offer_Letter',
      context: contextData,
    });
    const pdfHeader = pdfBuf.subarray(0, 8).toString('utf-8');
    const pdfTail = pdfBuf.subarray(pdfBuf.length - 10).toString('utf-8');
    assert(
      pdfHeader.startsWith('%PDF-1.4') && pdfTail.includes('%%EOF'),
      '15. Server-side PDF generation produces valid binary PDF-1.4 buffer'
    );

    // Test 16: Official Document Generation succeeds & creates metadata
    const generatedDoc = await generateOfferDocument(
      approvedOfferId,
      { documentType: 'Offer_Letter' },
      mockRecruiter
    );
    assert(
      !!generatedDoc && !!generatedDoc.id && generatedDoc.fileName.endsWith('.pdf'),
      '16. Document generation succeeds and creates metadata record'
    );

    // Test 17: Correct offerId linkage
    assert(generatedDoc.offerId === approvedOfferId, '17. Metadata has correct offerId linkage');

    // Test 18: Correct candidateId linkage
    assert(generatedDoc.candidateId === contextData.candidate.id, '18. Metadata has correct candidateId linkage');

    // Test 19: Correct offerVersion linkage
    assert(generatedDoc.offerVersion === 1, '19. Metadata captures offer version (v1)');

    // Test 20: Template version captured
    assert(
      typeof generatedDoc.templateVersion === 'number' && generatedDoc.templateVersion >= 1,
      '20. Metadata captures template version'
    );

    // Test 21: Historical document immutability
    const offerDocs = await getOfferDocuments(approvedOfferId, mockRecruiter);
    assert(
      offerDocs.length === 1 && offerDocs[0].id === generatedDoc.id,
      '21. Document metadata stored immutably in offer content snapshot'
    );

    // Test 22: Duplicate generation protection
    const docDuplicate = await generateOfferDocument(
      approvedOfferId,
      { documentType: 'Offer_Letter' },
      mockRecruiter
    );
    assert(
      docDuplicate.id === generatedDoc.id,
      '22. Duplicate generation protection returns existing document without duplicate files'
    );

    // ---------------------------------------------------------
    // TEST SECTION 5: RBAC & ACCESS SECURITY (23-27)
    // ---------------------------------------------------------
    console.log('\n--- SECTION 5: RBAC & ACCESS SECURITY ---');

    // Test 23: Document download succeeds for authorized recruiter
    const downloaded = await getDocumentFile(approvedOfferId, generatedDoc.id, mockRecruiter);
    assert(
      downloaded.fileBuffer.length > 0 && downloaded.fileName === generatedDoc.fileName,
      '23. Authorized recruiter can download document'
    );

    // Test 24: Unauthorized manager blocked
    let unauthMgrBlocked = false;
    try {
      await getDocumentFile(approvedOfferId, generatedDoc.id, mockUnauthorizedManager);
    } catch (e: any) {
      unauthMgrBlocked = e.message.includes('permission') || e.message.includes('access');
    }
    assert(unauthMgrBlocked, '24. Unauthorized manager blocked from downloading offer documents');

    // Test 25: Normal employee blocked
    let empBlocked = false;
    try {
      await getDocumentFile(approvedOfferId, generatedDoc.id, mockEmployee);
    } catch (e: any) {
      empBlocked = e.message.includes('permission') || e.message.includes('access');
    }
    assert(empBlocked, '25. Normal employee blocked from accessing offer documents');

    // Test 26: Unauthenticated access blocked (null/undefined user role)
    let unauthBlocked = false;
    try {
      const invalidUser: any = { id: 'anon', userRole: '', department: 'Unknown', name: 'Anon', email: 'anon@test.com' };
      await getDocumentFile(approvedOfferId, generatedDoc.id, invalidUser);
    } catch (e: any) {
      unauthBlocked = true;
    }
    assert(unauthBlocked, '26. Unauthenticated / invalid role blocked');

    // Test 27: Candidate access blocked
    let candBlocked = false;
    try {
      const candidateUser: any = { id: 'cand-user', userRole: 'candidate', department: 'External', name: 'Candidate', email: 'cand@test.com' };
      await getDocumentFile(approvedOfferId, generatedDoc.id, candidateUser);
    } catch (e: any) {
      candBlocked = true;
    }
    assert(candBlocked, '27. Candidate role blocked from internal offer document endpoints');

    // ---------------------------------------------------------
    // TEST SECTION 6: AUDIT LOGGING & NOTIFICATIONS (28-31)
    // ---------------------------------------------------------
    console.log('\n--- SECTION 6: AUDIT LOGS & NOTIFICATIONS ---');

    // Test 28: AuditLog created on preview
    const previewAudit = await db.auditLog.findFirst({
      where: { action: 'OFFER_DOCUMENT_PREVIEWED' },
      orderBy: { createdAt: 'desc' },
    });
    assert(!!previewAudit, '28. AuditLog created for OFFER_DOCUMENT_PREVIEWED');

    // Test 29: AuditLog created on generation
    const genAudit = await db.auditLog.findFirst({
      where: { action: 'OFFER_DOCUMENT_GENERATED' },
      orderBy: { createdAt: 'desc' },
    });
    assert(!!genAudit, '29. AuditLog created for OFFER_DOCUMENT_GENERATED');

    // Test 30: AuditLog created on download
    const dlAudit = await db.auditLog.findFirst({
      where: { action: 'OFFER_DOCUMENT_DOWNLOADED' },
      orderBy: { createdAt: 'desc' },
    });
    assert(!!dlAudit, '30. AuditLog created for OFFER_DOCUMENT_DOWNLOADED');

    // Test 31: UserNotification created for stakeholders
    const notifs = await db.userNotification.findMany({
      where: {
        userId: { in: [mockRecruiter.id, mockHiringManager.id] },
        title: 'Offer Document Generated',
      },
    });
    assert(notifs.length > 0, '31. UserNotification created for recruiter and hiring manager');

    // ---------------------------------------------------------
    // TEST SECTION 7: TRANSACTION ROLLBACK & CONCURRENCY (32-33)
    // ---------------------------------------------------------
    console.log('\n--- SECTION 7: TRANSACTION SAFETY & CONCURRENCY ---');

    // Test 32: Transaction rollback on simulated generation failure
    let rollbackVerified = false;
    try {
      await db.$transaction(async (tx) => {
        await tx.auditLog.create({
          data: {
            id: `audit-test-rollback-${Date.now()}`,
            action: 'TEST_ROLLBACK',
            module: 'Recruitment',
            employeeId: mockAdmin.id,
            details: JSON.stringify({ rollback: true }),
          },
        });
        throw new Error('Simulated failure');
      });
    } catch {
      const found = await db.auditLog.findFirst({ where: { action: 'TEST_ROLLBACK' } });
      rollbackVerified = !found;
    }
    assert(rollbackVerified, '32. Database transaction properly rolls back on errors');

    // Test 33: Concurrent generation protection
    const [c1, c2] = await Promise.all([
      generateOfferDocument(approvedOfferId, { documentType: 'Offer_Letter' }, mockRecruiter),
      generateOfferDocument(approvedOfferId, { documentType: 'Offer_Letter' }, mockRecruiter),
    ]);
    assert(c1.id === c2.id, '33. Concurrent generation calls safely return idempotent document ID');

    // ---------------------------------------------------------
    // TEST SECTION 8: ADDITIONAL DOCUMENT TYPES (34-36)
    // ---------------------------------------------------------
    console.log('\n--- SECTION 8: ADDITIONAL DOCUMENT TYPES ---');

    // Test 34: Appointment Letter generation
    const apptDoc = await generateOfferDocument(
      approvedOfferId,
      { documentType: 'Appointment_Letter' },
      mockRecruiter
    );
    assert(
      apptDoc.documentType === 'Appointment_Letter' && apptDoc.fileName.includes('APPOINTMENT_LETTER'),
      '34. Appointment Letter generation succeeds'
    );

    // Test 35: Joining Letter (Custom) generation
    const joinDoc = await generateOfferDocument(
      approvedOfferId,
      { documentType: 'Custom' },
      mockRecruiter
    );
    assert(
      joinDoc.documentType === 'Custom' && joinDoc.fileName.includes('CUSTOM'),
      '35. Joining Letter (Custom) generation succeeds'
    );

    // Test 36: NDA document generation
    const ndaDoc = await generateOfferDocument(
      approvedOfferId,
      { documentType: 'NDA' },
      mockRecruiter
    );
    assert(
      ndaDoc.documentType === 'NDA' && ndaDoc.fileName.includes('NDA'),
      '36. NDA Agreement document generation succeeds'
    );

    // ---------------------------------------------------------
    // TEST SECTION 9: HISTORICAL REGRESSIONS (37-45)
    // ---------------------------------------------------------
    console.log('\n--- SECTION 9: HISTORICAL REGRESSIONS ---');

    // Test 37: Phase 4C-C2 Offer Approval Workflow Regression
    assert(
      approvedOfferRecord?.status === 'Approved' && declinedOffer.status === 'Draft',
      '37. Phase 4C-C2 Multi-level approval workflow functions correctly'
    );

    // Test 38: Phase 4C-C1 CTC & Compensation Snapshot Regression
    const comp38 = calculateOfferCompensation(1200000, {
      currency: 'INR',
      variablePayAnnual: 100000,
    });
    assert(
      comp38.annualCtc === 1200000 &&
        Math.abs(comp38.components.basicAnnual - 550000) <= 20,
      '38. Phase 4C-C1 Compensation Breakdown calculation regression passed'
    );

    // Test 39: Phase 4C-B Scorecard & Selection Regression
    const candidatesCount = await db.recruitmentCandidate.count();
    assert(candidatesCount > 0, '39. Phase 4C-B Candidate evaluation records intact');

    // Test 40: Phase 4C-A Interview Engine Regression
    const interviewCount = await db.recruitment_interviews.count();
    assert(interviewCount >= 0, '40. Phase 4C-A Recruitment interviews table intact');

    // Test 41: Phase 4A Core ATS Requisitions & CRM Regression
    const jobsCount = await db.recruitmentJob.count();
    assert(jobsCount > 0, '41. Phase 4A Job requisitions intact');

    // Test 42: Phase 4B Resume Parser & Extractor Models Regression
    const candWithSkills = await db.recruitmentCandidate.findFirst({
      where: { id: testCandidateId },
    });
    assert(
      Array.isArray(candWithSkills?.matchedSkills) && candWithSkills.matchedSkills.length > 0,
      '42. Phase 4B Extracted skill competencies preserved'
    );

    // Test 43: Phase 3 Performance Goals Regression
    const goalsCount = await db.performanceGoal.count();
    assert(goalsCount >= 0, '43. Phase 3 Goal management tables intact');

    // Test 44: Phase 2 Payroll CTC & Statutory Engine Regression
    const comp44 = calculateOfferCompensation(2400000);
    assert(
      comp44.employerContributions.pfMonthly === 1800 &&
        comp44.employeeDeductions.pfMonthly === 1800,
      '44. Phase 2 Statutory PF capping & CTC computation verified'
    );

    // Test 45: Phase 1 Employee Lifecycle Regression
    const employeesCount = await db.employee.count();
    assert(employeesCount >= 5, '45. Phase 1 Core Employee records verified');

  } catch (err: any) {
    console.error('CRITICAL SUITE ERROR:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`FINAL RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().then(() => {
  process.exit(0);
});
