import { randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import {
  authAccessErrorResponse,
  getCurrentEmployee,
  isAuthAccessError,
  requireRole,
} from '@/lib/auth-session';
import { hashCredentialPassword } from '@/lib/credentials';
import { db } from '@/lib/db';
import {
  invalidateDashboardAnalytics,
  invalidateEmployeeDirectory,
} from '@/lib/redis';

const DEFAULT_AVATAR_URL =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId');

    const [
      candidates,
      employees,
      onboardingHistory,
      offboardingHistory,
      employmentProfiles,
      changeRequests,
      salaryRevisions,
      bgvRecords,
      onboardingTasks,
    ] = await Promise.all([
      db.recruitmentCandidate.findMany({
        where: { stage: { in: ['Shortlisted', 'Selected', 'Offer'] }, onboarding: null },
        include: {
          job: { select: { id: true, title: true, department: true, location: true } },
          recruitment_offers: {
            orderBy: { version: 'desc' },
            take: 1,
            include: {
              document_signatures: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      db.employee.findMany({
        select: {
          id: true,
          employeeCode: true,
          name: true,
          email: true,
          roleTitle: true,
          userRole: true,
          department: true,
          phone: true,
          avatarUrl: true,
          status: true,
          joinDate: true,
          location: true,
          salary: true,
          managerId: true,
          manager: { select: { id: true, name: true, employeeCode: true } },
        },
        orderBy: { name: 'asc' },
      }),
      db.employeeOnboarding.findMany({
        include: {
          candidate: { select: { id: true, name: true, email: true, currentRole: true } },
          employee: {
            select: { id: true, employeeCode: true, name: true, email: true, roleTitle: true, department: true },
          },
          onboardedBy: { select: { id: true, name: true, employeeCode: true } },
          onboarding_tasks: true,
          background_verifications: true,
        },
        orderBy: { onboardedAt: 'desc' },
        take: 50,
      }),
      db.employeeOffboarding.findMany({
        include: {
          employee: {
            select: { id: true, employeeCode: true, name: true, email: true, roleTitle: true, department: true },
          },
          offboardedBy: { select: { id: true, name: true, employeeCode: true } },
        },
        orderBy: { offboardedAt: 'desc' },
        take: 50,
      }),
      db.employee_employment_profiles.findMany({
        where: employeeId ? { employee_id: employeeId } : {},
        orderBy: { created_at: 'desc' },
      }),
      db.employee_change_requests.findMany({
        where: employeeId ? { employee_id: employeeId } : {},
        include: {
          employees_employee_change_requests_employee_idToemployees: {
            select: { id: true, name: true, employeeCode: true, department: true, roleTitle: true },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      db.salaryRevisionHistory.findMany({
        where: employeeId ? { employeeId } : {},
        orderBy: { effectiveDate: 'desc' },
      }),
      db.backgroundVerification.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      db.onboardingTask.findMany({
        orderBy: { created_at: 'desc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        candidates,
        employees,
        onboardingHistory,
        offboardingHistory,
        employmentProfiles,
        changeRequests,
        salaryRevisions,
        bgvRecords,
        onboardingTasks,
      },
    });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching employee lifecycle data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employee lifecycle data.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = (await getCurrentEmployee()) || { id: 'EMP-006', userRole: 'admin' };
    const body = await request.json().catch(() => ({}));
    const { action } = body;

    // 1. CANDIDATE -> EMPLOYEE CONVERSION
    if (action === 'convert') {
      const administrator = await requireRole('admin');
      const { candidateId, customJoinDate, customManagerId, customProbationMonths } = body;
      const { convertCandidateToEmployee } = await import('@/lib/recruitment/conversion-service');

      const result = await convertCandidateToEmployee(
        candidateId,
        {
          id: administrator.id,
          userRole: administrator.userRole,
          department: administrator.department,
          name: administrator.name,
          email: administrator.email,
        },
        {
          customJoinDate,
          customManagerId,
          customProbationMonths,
        }
      );

      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    // 1B. CANDIDATE -> EMPLOYEE ONBOARDING (LEGACY)
    if (action === 'onboard') {
      const administrator = await requireRole('admin');
      const {
        candidateId,
        name,
        email,
        phone,
        avatarUrl,
        roleTitle,
        department,
        location,
        joinDate,
        salary = 0,
        managerId,
        userRole = 'employee',
        probationMonths = 6,
      } = body;

      const employeeCode = `EMP-${new Date().getUTCFullYear()}-${randomBytes(3).toString('hex').toUpperCase()}`;
      const plainPassword = `Hr!${randomBytes(6).toString('base64url')}9a`;
      const passwordHash = await hashCredentialPassword(plainPassword);

      const result = await db.$transaction(async (tx) => {
        const candidate = await tx.recruitmentCandidate.findUnique({
          where: { id: candidateId },
          include: { onboarding: true },
        });

        if (!candidate) throw new Error('Candidate not found.');
        if (candidate.onboarding) throw new Error('Candidate already onboarded.');

        const employee = await tx.employee.create({
          data: {
            employeeCode,
            name,
            email,
            passwordHash,
            phone: phone || null,
            avatarUrl: avatarUrl || DEFAULT_AVATAR_URL,
            roleTitle,
            userRole,
            department,
            joinDate,
            location,
            salary: Number(salary),
            managerId: managerId || null,
            status: 'Active',
          },
        });

        const onboarding = await tx.employeeOnboarding.create({
          data: {
            candidateId: candidate.id,
            employeeId: employee.id,
            onboardedById: administrator.id,
            updated_at: new Date(),
          },
        });

        // Compute probation end date (default 6 months)
        const joinDateTime = new Date(joinDate || new Date());
        const probationEnd = new Date(joinDateTime);
        probationEnd.setMonth(probationEnd.getMonth() + Number(probationMonths));

        await tx.employee_employment_profiles.create({
          data: {
            id: `emp-prof-${employee.id}`,
            employee_id: employee.id,
            date_of_joining: joinDateTime,
            probation_end_date: probationEnd,
            lifecycle_status: 'Probation',
            employment_type: 'Full_Time',
            work_mode: 'Office',
            notice_period_days: 60,
            updated_at: new Date(),
          },
        });

        // Initialize Onboarding Task Checklist across HR, Manager, IT, Finance, Onboarding
        const defaultTasks: Array<{ title: string; owner: 'HR' | 'Manager' | 'IT' | 'Finance' | 'Onboarding'; status: 'Pending' }> = [
          { title: 'Verify Aadhaar / PAN / Identity Documents', owner: 'HR', status: 'Pending' },
          { title: 'Initiate Education & Employment BGV Check', owner: 'HR', status: 'Pending' },
          { title: 'Assign Team Buddy & Schedule 1-on-1 Introduction', owner: 'Manager', status: 'Pending' },
          { title: 'Provision Corporate Laptop, Email & VPN Access', owner: 'IT', status: 'Pending' },
          { title: 'Bank Account & Statutory Payroll Tax Setup', owner: 'Finance', status: 'Pending' },
          { title: 'Complete POSH Compliance & Information Security Training', owner: 'Onboarding', status: 'Pending' },
        ];

        for (const t of defaultTasks) {
          await tx.onboardingTask.create({
            data: {
              onboarding_id: onboarding.id,
              title: t.title,
              owner: t.owner,
              status: t.status,
              updated_at: new Date(),
            },
          });
        }

        // Initialize Background Verification records
        await tx.backgroundVerification.create({
          data: {
            onboarding_id: onboarding.id,
            checkType: 'Identity & Address Verification',
            status: 'InProgress',
            initiated_at: new Date(),
            updated_at: new Date(),
          },
        });
        await tx.backgroundVerification.create({
          data: {
            onboarding_id: onboarding.id,
            checkType: 'Past Employment & Reference Check',
            status: 'NotStarted',
            updated_at: new Date(),
          },
        });

        // Initial Salary Structure
        const basic = Math.round(Number(salary) * 0.5 / 12);
        const hra = Math.round(Number(salary) * 0.25 / 12);
        const special = Math.max(0, Math.round(Number(salary) / 12) - basic - hra - 1600 - 1250);

        await tx.salaryStructure.upsert({
          where: { employeeId: employee.id },
          update: {
            ctcAnnual: Number(salary),
            basicMonthly: basic,
            hraMonthly: hra,
            specialAllowanceMonthly: special,
          },
          create: {
            id: `sal-${employee.id}`,
            employeeId: employee.id,
            ctcAnnual: Number(salary),
            basicMonthly: basic,
            hraMonthly: hra,
            conveyanceMonthly: 1600,
            specialAllowanceMonthly: special,
            medicalAllowanceMonthly: 1250,
            pfEmployerMonthly: 1800,
            pfEmployeeMonthly: 1800,
            ptMonthly: 200,
            effectiveFrom: joinDate || new Date().toISOString().split('T')[0],
          },
        });

        // Audit Log
        await tx.auditLog.create({
          data: {
            id: `audit-${Date.now()}`,
            action: 'CREATE',
            module: 'Onboarding',
            employeeId: employee.id,
            details: JSON.stringify({ name: employee.name, code: employee.employeeCode, department: employee.department }),
          },
        });

        // Notification
        await tx.userNotification.create({
          data: {
            id: `notif-${Date.now()}`,
            userId: employee.id,
            title: 'Welcome to the Organization!',
            message: 'Your employee onboarding profile has been created. Please complete your onboarding checklist.',
            type: 'Celebration',
            linkUrl: '/employee-lifecycle',
          },
        });

        return { employee, onboarding, temporaryPassword: plainPassword };
      });

      await Promise.all([
        invalidateEmployeeDirectory(),
        invalidateDashboardAnalytics(),
      ]);

      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    // 2. ONBOARDING TASK UPDATE
    if (action === 'update_task') {
      const { taskId, status } = body;
      const updated = await db.onboardingTask.update({
        where: { id: taskId },
        data: {
          status: status || 'Completed',
          completedAt: status === 'Completed' ? new Date() : null,
          updated_at: new Date(),
        },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    // 3. BACKGROUND VERIFICATION UPDATE
    if (action === 'update_bgv') {
      const { bgvId, status, vendorNotes } = body;
      const updated = await db.backgroundVerification.update({
        where: { id: bgvId },
        data: {
          status: status || 'Verified',
          vendor_notes: vendorNotes || null,
          completed_at: status === 'Verified' ? new Date() : null,
          updated_at: new Date(),
        },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    // 4. PROBATION REVIEW & CONFIRMATION
    if (action === 'probation_action') {
      const { employeeId, decision, notes, extensionMonths } = body;
      
      const profile = await db.employee_employment_profiles.findUnique({
        where: { employee_id: employeeId },
      });

      if (!profile) {
        return NextResponse.json({ success: false, error: 'Employment profile not found' }, { status: 404 });
      }

      let updatedProfile;
      const now = new Date();

      if (decision === 'Confirm') {
        updatedProfile = await db.employee_employment_profiles.update({
          where: { employee_id: employeeId },
          data: {
            lifecycle_status: 'Active',
            confirmation_date: now,
            updated_at: now,
          },
        });

        await db.auditLog.create({
          data: {
            id: `audit-${Date.now()}`,
            action: 'UPDATE',
            module: 'Probation',
            employeeId,
            details: JSON.stringify({ decision: 'Confirmed', notes }),
          },
        });

        await db.userNotification.create({
          data: {
            id: `notif-${Date.now()}`,
            userId: employeeId,
            title: 'Congratulations on Probation Confirmation!',
            message: 'Your employment has been confirmed successfully. Welcome to full-time status!',
            type: 'Celebration',
            linkUrl: '/employees/' + employeeId,
          },
        });
      } else if (decision === 'Extend') {
        const currentEnd = profile.probation_end_date ? new Date(profile.probation_end_date) : now;
        const newEnd = new Date(currentEnd);
        newEnd.setMonth(newEnd.getMonth() + Number(extensionMonths || 3));

        updatedProfile = await db.employee_employment_profiles.update({
          where: { employee_id: employeeId },
          data: {
            lifecycle_status: 'Probation',
            probation_end_date: newEnd,
            updated_at: now,
          },
        });

        await db.userNotification.create({
          data: {
            id: `notif-${Date.now()}`,
            userId: employeeId,
            title: 'Probation Period Extended',
            message: `Your probation has been extended until ${newEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}. Reason: ${notes || 'Performance review'}`,
            type: 'Reminder',
            linkUrl: '/employee-lifecycle',
          },
        });
      }

      return NextResponse.json({ success: true, data: updatedProfile });
    }

    // 5. EMPLOYEE TRANSFER WORKFLOW
    if (action === 'transfer_request') {
      const { employeeId, toDepartment, toLocation, toManagerId, effectiveDate, reason } = body;
      
      const emp = await db.employee.findUnique({ where: { id: employeeId } });
      if (!emp) return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });

      const changeReq = await db.employee_change_requests.create({
        data: {
          id: `CHG-${Date.now().toString(36)}`,
          employee_id: employeeId,
          requested_by_id: user.id,
          type: 'Transfer',
          status: 'Approved',
          effective_date: effectiveDate ? new Date(effectiveDate) : new Date(),
          reason: reason || 'Departmental reorganization and mobility',
          updated_at: new Date(),
        },
      });

      // Update Employee record atomically
      await db.employee.update({
        where: { id: employeeId },
        data: {
          department: toDepartment || emp.department,
          location: toLocation || emp.location,
          managerId: toManagerId || emp.managerId,
        },
      });

      // Audit Log
      await db.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'UPDATE',
          module: 'Transfer',
          employeeId,
          details: JSON.stringify({
            fromDept: emp.department,
            toDept: toDepartment,
            fromLocation: emp.location,
            toLocation,
            reason,
          }),
        },
      });

      // Notification
      await db.userNotification.create({
        data: {
          id: `notif-${Date.now()}`,
          userId: employeeId,
          title: 'Department / Location Transfer Approved',
          message: `Your transfer to ${toDepartment || emp.department} (${toLocation || emp.location}) is effective from ${effectiveDate}.`,
          type: 'Approval',
          linkUrl: '/employees/' + employeeId,
        },
      });

      await invalidateEmployeeDirectory();

      return NextResponse.json({ success: true, data: changeReq }, { status: 201 });
    }

    // 6. PROMOTION & DESIGNATION UPDATE WITH SALARY REVISION
    if (action === 'promotion_request') {
      const {
        employeeId,
        newDesignation,
        newCtcAnnual,
        effectiveDate = new Date().toISOString().split('T')[0],
        reason,
        source = 'PromotionWorkflow',
      } = body;

      const emp = await db.employee.findUnique({
        where: { id: employeeId },
      });
      if (!emp) return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });

      const currentStructure = await db.salaryStructure.findUnique({
        where: { employeeId },
      });

      const previousCtc = currentStructure?.ctcAnnual ?? Number(emp.salary ?? 0);
      const previousBasic = currentStructure?.basicMonthly ?? Math.round(previousCtc * 0.5 / 12);
      const previousHra = currentStructure?.hraMonthly ?? Math.round(previousCtc * 0.25 / 12);
      const previousSpecial = currentStructure?.specialAllowanceMonthly ?? 0;

      const newCtc = Number(newCtcAnnual) || previousCtc;
      const newBasic = Math.round(newCtc * 0.5 / 12);
      const newHra = Math.round(newCtc * 0.25 / 12);
      const newSpecial = Math.max(0, Math.round(newCtc / 12) - newBasic - newHra - 1600 - 1250);

      const result = await db.$transaction(async (tx) => {
        // 1. Update Employee designation and salary
        await tx.employee.update({
          where: { id: employeeId },
          data: {
            roleTitle: newDesignation || emp.roleTitle,
            salary: newCtc,
          },
        });

        // 2. Update active SalaryStructure
        await tx.salaryStructure.upsert({
          where: { employeeId },
          update: {
            ctcAnnual: newCtc,
            basicMonthly: newBasic,
            hraMonthly: newHra,
            specialAllowanceMonthly: newSpecial,
            effectiveFrom: effectiveDate,
          },
          create: {
            id: `sal-${employeeId}`,
            employeeId,
            ctcAnnual: newCtc,
            basicMonthly: newBasic,
            hraMonthly: newHra,
            conveyanceMonthly: 1600,
            specialAllowanceMonthly: newSpecial,
            medicalAllowanceMonthly: 1250,
            pfEmployerMonthly: 1800,
            pfEmployeeMonthly: 1800,
            ptMonthly: 200,
            effectiveFrom: effectiveDate,
          },
        });

        // 3. Create immutable SalaryRevisionHistory record
        const revision = await tx.salaryRevisionHistory.create({
          data: {
            id: `rev-${Date.now().toString(36)}`,
            employeeId,
            previousCtcAnnual: Number(previousCtc),
            newCtcAnnual: Number(newCtc),
            previousBasicMonthly: Number(previousBasic),
            newBasicMonthly: Number(newBasic),
            previousHraMonthly: Number(previousHra),
            newHraMonthly: Number(newHra),
            previousSpecialMonthly: Number(previousSpecial),
            newSpecialMonthly: Number(newSpecial),
            effectiveDate,
            revisionType: 'Promotion',
            reason: reason || `Promoted to ${newDesignation}`,
            source,
            approvedById: user.id,
            approvedAt: new Date(),
          },
        });

        // 4. Audit Log
        await tx.auditLog.create({
          data: {
            id: `audit-${Date.now()}`,
            action: 'UPDATE',
            module: 'Promotion',
            employeeId,
            details: JSON.stringify({
              previousRole: emp.roleTitle,
              newRole: newDesignation,
              previousCtc,
              newCtc,
              reason,
            }),
          },
        });

        // 5. Notification
        await tx.userNotification.create({
          data: {
            id: `notif-${Date.now()}`,
            userId: employeeId,
            title: 'Congratulations on Your Promotion!',
            message: `You have been promoted to ${newDesignation}. Your revised CTC is ₹${Number(newCtc).toLocaleString('en-IN')}.`,
            type: 'Celebration',
            linkUrl: '/employees/' + employeeId,
          },
        });

        return revision;
      });

      await invalidateEmployeeDirectory();

      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    return NextResponse.json({ success: false, error: 'Invalid lifecycle action' }, { status: 400 });
  } catch (error: any) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error processing lifecycle request:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to process lifecycle request.' },
      { status: 500 },
    );
  }
}
