import crypto from 'crypto';
import { db } from '@/lib/db';
import { type RecruitmentUser } from '@/lib/recruitment/rbac-service';
import { hashCredentialPassword } from '@/lib/credentials';
import { sendEmail } from '@/lib/notifications/email-service';

/* ==========================================================================
   CANDIDATE TO EMPLOYEE CONVERSION SERVICE
   Phase 4C-C5: Final Recruitment → HR Onboarding Handoff
========================================================================== */

const DEFAULT_AVATAR_URL =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

export interface ConversionEligibility {
  isEligible: boolean;
  blockers: string[];
  candidate: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    stage: string;
    jobId: string;
    jobTitle: string;
    department: string;
    location: string;
    hiringManagerId: string | null;
    hiringManagerName?: string;
    recruiterId: string | null;
    recruiterName?: string;
  };
  offer: {
    id: string;
    status: string;
    version: number;
    offeredTitle: string;
    offeredCtc: number;
    currency: string;
    proposedJoinDate: string | null;
    expiresAt: string | null;
    isExpired: boolean;
    respondedAt: string | null;
    isAccepted: boolean;
  } | null;
  signature: {
    status: 'Signed' | 'Pending' | 'None';
    signedAt: string | null;
    signerName: string | null;
    documentCount: number;
  };
  alreadyConverted: boolean;
  existingEmployeeId?: string;
  existingEmployeeCode?: string;
}

export interface ConversionResult {
  success: boolean;
  isExisting: boolean;
  message: string;
  employee: {
    id: string;
    employeeCode: string;
    name: string;
    email: string;
    roleTitle: string;
    department: string;
    location: string;
    joinDate: string;
    status: string;
  };
  onboarding: {
    id: string;
    stage: string;
    status: string;
    taskCount: number;
    bgvCount: number;
  };
  joiningDate: string;
}

/**
 * Generates a unique, standardized Employee ID
 */
export async function generateUniqueEmployeeCode(): Promise<string> {
  const currentYear = new Date().getUTCFullYear();
  for (let i = 0; i < 10; i++) {
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const candidateCode = `EMP-${currentYear}-${randomHex}`;

    const existing = await db.employee.findUnique({
      where: { employeeCode: candidateCode },
      select: { id: true },
    });

    if (!existing) {
      return candidateCode;
    }
  }
  return `EMP-${currentYear}-${Date.now().toString().slice(-6)}`;
}

/**
 * Verifies candidate eligibility for conversion to employee
 */
export async function verifyCandidateConversionEligibility(
  candidateId: string
): Promise<ConversionEligibility> {
  if (!candidateId || typeof candidateId !== 'string') {
    throw new Error('Valid candidate ID is required.');
  }

  const candidate = await db.recruitmentCandidate.findUnique({
    where: { id: candidateId },
    include: {
      job: {
        include: {
          hiringManager: { select: { id: true, name: true, email: true } },
          recruiter: { select: { id: true, name: true, email: true } },
        },
      },
      onboarding: {
        include: {
          employee: { select: { id: true, employeeCode: true, name: true } },
        },
      },
      recruitment_offers: {
        orderBy: { version: 'desc' },
        include: {
          document_signatures: true,
        },
      },
    },
  });

  if (!candidate) {
    throw new Error('Candidate not found.');
  }

  const blockers: string[] = [];

  // Check if candidate already converted
  if (candidate.onboarding?.employee) {
    return {
      isEligible: false,
      blockers: ['Candidate has already been converted to an active employee.'],
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        stage: candidate.stage,
        jobId: candidate.job.id,
        jobTitle: candidate.job.title,
        department: candidate.job.department,
        location: candidate.job.location,
        hiringManagerId: candidate.job.hiring_manager_id,
        hiringManagerName: candidate.job.hiringManager?.name,
        recruiterId: candidate.job.recruiter_id,
        recruiterName: candidate.job.recruiter?.name,
      },
      offer: null,
      signature: { status: 'Signed', signedAt: null, signerName: null, documentCount: 0 },
      alreadyConverted: true,
      existingEmployeeId: candidate.onboarding.employee.id,
      existingEmployeeCode: candidate.onboarding.employee.employeeCode,
    };
  }

  const latestOffer = candidate.recruitment_offers[0] || null;

  // 1. Offer Existence Check
  if (!latestOffer) {
    blockers.push('No offer has been generated for this candidate.');
  } else {
    // 2. Offer Approval Status Check
    if (latestOffer.status === 'Draft') {
      blockers.push('Offer is still in Draft state and has not been approved.');
    } else if (latestOffer.status === 'PendingApproval') {
      blockers.push('Offer is currently pending leadership approval.');
    } else if (latestOffer.status === 'Declined') {
      blockers.push('Candidate has declined the employment offer.');
    } else if (latestOffer.status === 'Withdrawn') {
      blockers.push('Employment offer has been withdrawn.');
    }

    // 3. Expiration Check
    if (latestOffer.expires_at && new Date(latestOffer.expires_at).getTime() < Date.now()) {
      if (latestOffer.status !== 'Accepted') {
        blockers.push('Employment offer has expired.');
      }
    }

    // 4. Candidate Acceptance Check
    if (latestOffer.status !== 'Accepted') {
      blockers.push('Candidate has not yet accepted the employment offer.');
    }
  }

  // 5. Signature Verification Check
  let sigStatus: 'Signed' | 'Pending' | 'None' = 'None';
  let signedAtStr: string | null = null;
  let signerNameStr: string | null = null;
  const sigs = latestOffer?.document_signatures || [];

  if (sigs.length > 0) {
    const allSigned = sigs.every((s) => s.status === 'Signed');
    if (allSigned) {
      sigStatus = 'Signed';
      const signedSig = sigs.find((s) => s.status === 'Signed');
      signedAtStr = signedSig?.signed_at ? signedSig.signed_at.toISOString() : null;
      signerNameStr = signedSig?.signer_name || null;
    } else {
      sigStatus = 'Pending';
      blockers.push('Candidate has not completed electronic signature for required offer documents.');
    }
  } else {
    if (latestOffer && latestOffer.status === 'Accepted') {
      blockers.push('Required electronic signature records have not been submitted.');
    }
  }

  const isEligible = blockers.length === 0;

  return {
    isEligible,
    blockers,
    candidate: {
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      stage: candidate.stage,
      jobId: candidate.job.id,
      jobTitle: candidate.job.title,
      department: candidate.job.department,
      location: candidate.job.location,
      hiringManagerId: candidate.job.hiring_manager_id,
      hiringManagerName: candidate.job.hiringManager?.name,
      recruiterId: candidate.job.recruiter_id,
      recruiterName: candidate.job.recruiter?.name,
    },
    offer: latestOffer
      ? {
          id: latestOffer.id,
          status: latestOffer.status,
          version: latestOffer.version,
          offeredTitle: latestOffer.offered_title,
          offeredCtc: Number(latestOffer.offered_ctc || 0),
          currency: latestOffer.currency,
          proposedJoinDate: latestOffer.proposed_join_date ? latestOffer.proposed_join_date.toISOString() : null,
          expiresAt: latestOffer.expires_at ? latestOffer.expires_at.toISOString() : null,
          isExpired: latestOffer.expires_at ? new Date(latestOffer.expires_at).getTime() < Date.now() : false,
          respondedAt: latestOffer.responded_at ? latestOffer.responded_at.toISOString() : null,
          isAccepted: latestOffer.status === 'Accepted',
        }
      : null,
    signature: {
      status: sigStatus,
      signedAt: signedAtStr,
      signerName: signerNameStr,
      documentCount: sigs.length,
    },
    alreadyConverted: false,
  };
}

/**
 * Converts an eligible accepted & signed candidate to an active Employee and initiates Onboarding
 * Executes as an atomic transaction with idempotency and RBAC protection
 */
export async function convertCandidateToEmployee(
  candidateId: string,
  actor: RecruitmentUser,
  customOverrides?: {
    customJoinDate?: string;
    customManagerId?: string;
    customProbationMonths?: number;
    customNoticePeriodDays?: number;
  }
): Promise<ConversionResult> {
  // 1. RBAC Check: Only HR / Admin can finalize employee creation
  if (actor.userRole !== 'admin') {
    throw new Error('Only HR Administrators are authorized to convert candidates to employees.');
  }

  // 2. Fetch candidate with relations
  const candidate = await db.recruitmentCandidate.findUnique({
    where: { id: candidateId },
    include: {
      job: {
        include: {
          hiringManager: { select: { id: true, name: true, email: true } },
          recruiter: { select: { id: true, name: true, email: true } },
        },
      },
      onboarding: {
        include: {
          employee: true,
          onboarding_tasks: true,
          background_verifications: true,
        },
      },
      recruitment_offers: {
        orderBy: { version: 'desc' },
        include: {
          document_signatures: true,
        },
      },
    },
  });

  if (!candidate) {
    throw new Error('Candidate not found.');
  }

  // 3. IDEMPOTENCY: If candidate already has an Employee record, return existing data cleanly
  if (candidate.onboarding?.employee) {
    const emp = candidate.onboarding.employee;
    return {
      success: true,
      isExisting: true,
      message: `Candidate is already converted as Employee ${emp.employeeCode}.`,
      employee: {
        id: emp.id,
        employeeCode: emp.employeeCode,
        name: emp.name,
        email: emp.email,
        roleTitle: emp.roleTitle,
        department: emp.department,
        location: emp.location,
        joinDate: emp.joinDate,
        status: emp.status,
      },
      onboarding: {
        id: candidate.onboarding.id,
        stage: candidate.onboarding.stage,
        status: candidate.onboarding.status,
        taskCount: candidate.onboarding.onboarding_tasks?.length || 0,
        bgvCount: candidate.onboarding.background_verifications?.length || 0,
      },
      joiningDate: emp.joinDate,
    };
  }

  // Also check if an employee with candidate's email already exists
  const existingEmpByEmail = await db.employee.findUnique({
    where: { email: candidate.email },
  });
  if (existingEmpByEmail) {
    throw new Error(`An employee with email "${candidate.email}" already exists (${existingEmpByEmail.employeeCode}).`);
  }

  // 4. Verify conversion prerequisites
  const latestOffer = candidate.recruitment_offers[0];
  if (!latestOffer) {
    throw new Error('Candidate does not have an employment offer.');
  }

  if (latestOffer.status === 'Draft') {
    throw new Error('Cannot convert candidate with draft offer.');
  }
  if (latestOffer.status === 'PendingApproval') {
    throw new Error('Cannot convert candidate with pending approval offer.');
  }
  if (latestOffer.status === 'Declined') {
    throw new Error('Cannot convert candidate who has declined the offer.');
  }
  if (latestOffer.status !== 'Accepted') {
    throw new Error('Candidate has not accepted the employment offer.');
  }

  // Signature check
  const sigs = latestOffer.document_signatures || [];
  const allSigned = sigs.length > 0 && sigs.every((s) => s.status === 'Signed');
  if (!allSigned) {
    throw new Error('Candidate has not completed required electronic signatures.');
  }

  // Determine joining date & parameters
  const joinDateStr =
    customOverrides?.customJoinDate ||
    (latestOffer.proposed_join_date
      ? latestOffer.proposed_join_date.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]);

  const joinDateTime = new Date(joinDateStr);
  const probationMonths = customOverrides?.customProbationMonths || 6;
  const probationEnd = new Date(joinDateTime);
  probationEnd.setMonth(probationEnd.getMonth() + probationMonths);

  const managerId = customOverrides?.customManagerId || candidate.job.hiring_manager_id || null;
  const noticePeriodDays = customOverrides?.customNoticePeriodDays || 60;
  const employeeCode = await generateUniqueEmployeeCode();

  // Generate initial secure random password for standard Employee login
  const plainPassword = `Emp!${crypto.randomBytes(6).toString('base64url')}#26`;
  const passwordHash = await hashCredentialPassword(plainPassword);

  // Parse approved compensation breakdown from snapshot
  let compSnapshot: any = {};
  let docsSnapshot: any[] = [];
  try {
    const raw = latestOffer.content_snapshot ? JSON.parse(latestOffer.content_snapshot) : null;
    compSnapshot = raw?.compensation || raw || {};
    docsSnapshot = raw?.documents || [];
  } catch {
    compSnapshot = {};
    docsSnapshot = [];
  }

  const annualCtc = Number(latestOffer.offered_ctc || 0);
  const basicMonthly = compSnapshot.components?.basicMonthly || Math.round((annualCtc * 0.5) / 12);
  const hraMonthly = compSnapshot.components?.hraMonthly || Math.round((annualCtc * 0.25) / 12);
  const conveyanceMonthly = compSnapshot.components?.conveyanceMonthly || 1600;
  const medicalAllowanceMonthly = compSnapshot.components?.medicalAllowanceMonthly || 1250;
  const specialAllowanceMonthly =
    compSnapshot.components?.specialAllowanceMonthly ||
    Math.max(0, Math.round(annualCtc / 12) - basicMonthly - hraMonthly - conveyanceMonthly - medicalAllowanceMonthly);
  const pfMonthly = compSnapshot.employerContributions?.pfMonthly || 1800;

  // 5. ATOMIC TRANSACTION: Convert candidate, create employee, employment profile, onboarding, tasks, salary, documents, audit
  const result = await db.$transaction(
    async (tx) => {
      const now = new Date();

      // A. Create Employee record
      const newEmployee = await tx.employee.create({
        data: {
          employeeCode,
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone,
          roleTitle: latestOffer.offered_title || candidate.job.title,
          userRole: 'employee',
          department: candidate.job.department,
          location: candidate.job.location,
          joinDate: joinDateStr,
          salary: annualCtc,
          managerId,
          status: 'Active',
          avatarUrl: DEFAULT_AVATAR_URL,
          passwordHash,
          createdAt: now,
          updatedAt: now,
        },
      });

      // B. Create Employment Profile (employee_employment_profiles)
      await tx.employee_employment_profiles.create({
        data: {
          id: `emp-prof-${newEmployee.id}`,
          employee_id: newEmployee.id,
          date_of_joining: joinDateTime,
          probation_end_date: probationEnd,
          lifecycle_status: 'Probation',
          employment_type: 'Full_Time',
          work_mode: 'Office',
          notice_period_days: noticePeriodDays,
          created_at: now,
          updated_at: now,
        },
      });

      // C. Create EmployeeOnboarding Record
      const onboardingId = `onb-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const newOnboarding = await tx.employeeOnboarding.create({
        data: {
          id: onboardingId,
          candidateId: candidate.id,
          employeeId: newEmployee.id,
          offer_id: latestOffer.id,
          onboardedById: actor.id,
          onboardedAt: now,
          expected_joining_date: latestOffer.proposed_join_date,
          actual_joining_date: joinDateTime,
          manager_employee_id: managerId,
          stage: 'Joining',
          status: 'Active',
          updated_at: now,
        },
      });

      // D. Initialize Onboarding Tasks across HR, Manager, IT, Finance, Onboarding
      const standardTasks: Array<{
        title: string;
        owner: 'HR' | 'Manager' | 'IT' | 'Finance' | 'Onboarding';
        description: string;
        dueDays: number;
      }> = [
        {
          title: 'Verify Aadhaar, PAN, Identity & Address Proofs',
          owner: 'HR',
          description: 'Verify government identity documents uploaded by candidate during onboarding.',
          dueDays: 3,
        },
        {
          title: 'Complete HR Induction & Personal Details Verification',
          owner: 'HR',
          description: 'Review statutory emergency contact, nominee and qualification details.',
          dueDays: 5,
        },
        {
          title: 'Initiate Background Verification (BGV) Checks',
          owner: 'HR',
          description: 'Initiate third-party reference checks and educational credential verification.',
          dueDays: 7,
        },
        {
          title: 'Assign Team Buddy & Schedule 1-on-1 Introduction',
          owner: 'Manager',
          description: 'Assign buddy within team and schedule welcoming introductory session.',
          dueDays: 2,
        },
        {
          title: 'Define Team Structure & 30-Day Onboarding Goals',
          owner: 'Manager',
          description: 'Walk new joiner through engineering team architecture and key milestones.',
          dueDays: 7,
        },
        {
          title: 'Prepare Corporate Laptop & Security Tokens',
          owner: 'IT',
          description: 'Prepare assigned workstation, install security agents, and issue credentials.',
          dueDays: 1,
        },
        {
          title: 'Provision Corporate Email, Slack & VPN Access',
          owner: 'IT',
          description: 'Grant necessary repository, directory, and communication tool permissions.',
          dueDays: 1,
        },
        {
          title: 'Verify Bank Account Details & Cancelled Cheque',
          owner: 'Finance',
          description: 'Confirm direct bank deposit information for monthly salary disbursement.',
          dueDays: 5,
        },
        {
          title: 'Configure Statutory Payroll & Provident Fund Setup',
          owner: 'Finance',
          description: 'Register UAN / PF member ID and configure income tax withholding profile.',
          dueDays: 7,
        },
        {
          title: 'Conduct Company Welcome & Values Orientation',
          owner: 'Onboarding',
          description: 'Deliver organizational culture, hierarchy, and operating principles overview.',
          dueDays: 1,
        },
        {
          title: 'Complete POSH Compliance & Information Security Training',
          owner: 'Onboarding',
          description: 'Ensure statutory prevention of sexual harassment and data security acknowledgements.',
          dueDays: 14,
        },
      ];

      await tx.onboardingTask.createMany({
        data: standardTasks.map((t, idx) => ({
          id: `task-${Date.now()}-${idx}-${crypto.randomBytes(3).toString('hex')}`,
          onboarding_id: newOnboarding.id,
          title: t.title,
          description: t.description,
          owner: t.owner,
          status: 'Pending',
          due_at: new Date(Date.now() + t.dueDays * 24 * 60 * 60 * 1000),
          created_at: now,
          updated_at: now,
        })),
      });

      // E. Initialize Background Verification records
      await tx.backgroundVerification.createMany({
        data: [
          {
            id: `bgv-${Date.now()}-1-${crypto.randomBytes(3).toString('hex')}`,
            onboarding_id: newOnboarding.id,
            checkType: 'Identity & Address Verification',
            status: 'InProgress',
            initiated_at: now,
            createdAt: now,
            updated_at: now,
          },
          {
            id: `bgv-${Date.now()}-2-${crypto.randomBytes(3).toString('hex')}`,
            onboarding_id: newOnboarding.id,
            checkType: 'Past Employment & Education Reference Check',
            status: 'NotStarted',
            createdAt: now,
            updated_at: now,
          },
        ],
      });

      // F. Populate Salary Structure from approved offer snapshot
      await tx.salaryStructure.upsert({
        where: { employeeId: newEmployee.id },
        create: {
          id: `sal-${newEmployee.id}`,
          employeeId: newEmployee.id,
          ctcAnnual: annualCtc,
          basicMonthly,
          hraMonthly,
          conveyanceMonthly,
          medicalAllowanceMonthly,
          specialAllowanceMonthly,
          pfEmployerMonthly: pfMonthly,
          pfEmployeeMonthly: pfMonthly,
          ptMonthly: 200,
          effectiveFrom: joinDateStr,
        },
        update: {
          ctcAnnual: annualCtc,
          basicMonthly,
          hraMonthly,
          conveyanceMonthly,
          medicalAllowanceMonthly,
          specialAllowanceMonthly,
          pfEmployerMonthly: pfMonthly,
          pfEmployeeMonthly: pfMonthly,
          ptMonthly: 200,
          effectiveFrom: joinDateStr,
        },
      });

      // G. Handoff signed offer documents into EmployeeDocument for Employee 360 view
      if (docsSnapshot.length > 0) {
        await tx.employeeDocument.createMany({
          data: docsSnapshot.map((doc, idx) => ({
            id: `doc-emp-${Date.now()}-${idx}-${crypto.randomBytes(3).toString('hex')}`,
            employeeId: newEmployee.id,
            name: doc.templateName || `${newEmployee.roleTitle} - Offer Letter`,
            type: doc.documentType || 'Offer_Letter',
            fileUrl: `/api/recruitment/offers/${latestOffer.id}/documents/${doc.id}`,
            size: `${Math.round((doc.fileSizeBytes || 25000) / 1024)} KB`,
            status: 'Verified',
            uploadedOn: joinDateStr,
            signature_status: 'Signed',
            signed_at: sigs[0]?.signed_at || now,
            note: `Signed offer document from recruitment phase (Offer v${latestOffer.version})`,
            createdAt: now,
            updatedAt: now,
          })),
        });
      }

    // H. Transition Candidate Stage to 'Joined'
    await tx.recruitmentCandidate.update({
      where: { id: candidate.id },
      data: {
        stage: 'Joined',
        updatedAt: now,
      },
    });

    // I. Record candidate stage history
    await tx.candidate_stage_history.create({
      data: {
        id: `csh-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        candidate_id: candidate.id,
        from_stage: candidate.stage,
        to_stage: 'Joined',
        note: `Candidate formally converted to Employee "${newEmployee.name}" (${employeeCode}). Onboarding initialized.`,
        changed_by_id: actor.id,
        changed_at: now,
      },
    });

    // J. Create AuditLog records
    await tx.auditLog.create({
      data: {
        id: `audit-${Date.now()}-c5-1`,
        action: 'CANDIDATE_CONVERSION_STARTED',
        module: 'Recruitment',
        employeeId: actor.id,
        details: JSON.stringify({
          candidateId: candidate.id,
          candidateName: candidate.name,
          offerId: latestOffer.id,
          actorId: actor.id,
          timestamp: now.toISOString(),
        }),
      },
    });

    await tx.auditLog.create({
      data: {
        id: `audit-${Date.now()}-c5-2`,
        action: 'CANDIDATE_CONVERTED_TO_EMPLOYEE',
        module: 'Onboarding',
        employeeId: actor.id,
        details: JSON.stringify({
          candidateId: candidate.id,
          employeeId: newEmployee.id,
          employeeCode,
          name: newEmployee.name,
          department: newEmployee.department,
          roleTitle: newEmployee.roleTitle,
          joiningDate: joinDateStr,
          annualCtc,
        }),
      },
    });

    await tx.auditLog.create({
      data: {
        id: `audit-${Date.now()}-c5-3`,
        action: 'ONBOARDING_CREATED_FROM_OFFER',
        module: 'Onboarding',
        employeeId: actor.id,
        details: JSON.stringify({
          onboardingId: newOnboarding.id,
          employeeId: newEmployee.id,
          tasksCount: standardTasks.length,
        }),
      },
    });

    // K. Create UserNotifications for Stakeholders
    const recruiterId = candidate.job.recruiter_id;
    const hiringManagerId = candidate.job.hiring_manager_id;

    // Notification for Admin / Actor
    await tx.userNotification.create({
      data: {
        id: `notif-${Date.now()}-adm`,
        userId: actor.id,
        title: 'Candidate Converted to Employee',
        message: `${candidate.name} has been converted to employee ${employeeCode} (${newEmployee.roleTitle}).`,
        type: 'TaskAssignment',
        isRead: false,
        linkUrl: `/employees/${newEmployee.id}`,
        createdAt: now,
      },
    });

    // Notification for Hiring Manager
    if (hiringManagerId && hiringManagerId !== actor.id) {
      await tx.userNotification.create({
        data: {
          id: `notif-${Date.now()}-mgr`,
          userId: hiringManagerId,
          title: 'New Team Member Onboarding Initiated',
          message: `${candidate.name} has joined as ${newEmployee.roleTitle}. Please review your manager onboarding checklist.`,
          type: 'TaskAssignment',
          isRead: false,
          linkUrl: `/employee-lifecycle`,
          createdAt: now,
        },
      });
    }

    // Notification for Recruiter
    if (recruiterId && recruiterId !== actor.id) {
      await tx.userNotification.create({
        data: {
          id: `notif-${Date.now()}-rec`,
          userId: recruiterId,
          title: 'Candidate Successfully Joined',
          message: `${candidate.name} has formally completed offer signing and employee onboarding creation.`,
          type: 'TaskAssignment',
          isRead: false,
          linkUrl: `/recruitment?candidateId=${candidate.id}`,
          createdAt: now,
        },
      });
    }

    return {
      newEmployee,
      newOnboarding,
      taskCount: standardTasks.length,
      bgvCount: 2,
    };
  }, { maxWait: 15000, timeout: 30000 });

  // 6. Dispatch Welcome Email to new employee via Email Adapter
  await sendEmail({
    to: candidate.email,
    subject: `Welcome to Mylotic Group, ${candidate.name}! (Employee ID: ${result.newEmployee.employeeCode})`,
    text: `Dear ${candidate.name},\n\nWelcome to the team! Your employee profile (${result.newEmployee.employeeCode}) has been created with joining date ${joinDateStr}.\n\nBest regards,\nPeople Operations Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #059669;">Welcome to Mylotic Group!</h2>
        <p>Dear <strong>${candidate.name}</strong>,</p>
        <p>We are thrilled to welcome you as <strong>${result.newEmployee.roleTitle}</strong> in the <strong>${result.newEmployee.department}</strong> department.</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; margin: 16px 0;">
          <p style="margin: 0; color: #334155;"><strong>Employee ID:</strong> ${result.newEmployee.employeeCode}</p>
          <p style="margin: 4px 0 0 0; color: #334155;"><strong>Official Joining Date:</strong> ${joinDateStr}</p>
        </div>
        <p>Our People Operations and IT teams will assist you through your first-week onboarding checklist.</p>
      </div>
    `,
    eventType: 'EMPLOYEE_ONBOARDING_WELCOME',
    metadata: {
      employeeId: result.newEmployee.id,
      employeeCode: result.newEmployee.employeeCode,
    },
  }).catch(() => null);

  return {
    success: true,
    isExisting: false,
    message: `Candidate ${candidate.name} successfully converted to Employee ${result.newEmployee.employeeCode}.`,
    employee: {
      id: result.newEmployee.id,
      employeeCode: result.newEmployee.employeeCode,
      name: result.newEmployee.name,
      email: result.newEmployee.email,
      roleTitle: result.newEmployee.roleTitle,
      department: result.newEmployee.department,
      location: result.newEmployee.location,
      joinDate: result.newEmployee.joinDate,
      status: result.newEmployee.status,
    },
    onboarding: {
      id: result.newOnboarding.id,
      stage: result.newOnboarding.stage,
      status: result.newOnboarding.status,
      taskCount: result.taskCount,
      bgvCount: result.bgvCount,
    },
    joiningDate: joinDateStr,
  };
}
