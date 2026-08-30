import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import {
  invalidateDashboardAnalytics,
  invalidateEmployeeDirectory,
} from '@/lib/redis';
import {
  authAccessErrorResponse,
  getCurrentEmployee,
  isAuthAccessError,
} from '@/lib/auth-session';
import {
  findExistingExitLetter,
  generateExitLetter,
  type ExitLetterEmployee,
  type ExitLetterOrganization,
  type ExitLetterRequest,
  type ExitLetterType,
} from '@/lib/documents/exit-document-service';

/** Statuses that no longer count as an "active" resignation (FIX 1). */
const INACTIVE_EXIT_STATUSES = ['Completed', 'Cancelled', 'Withdrawn', 'Rejected'];

/** Stages at which official letters may be generated (FIX 5). */
const LETTER_ELIGIBLE_STAGES = ['Settled', 'Exited'];
const LETTER_ELIGIBLE_STATUSES = ['Settled', 'Completed'];

async function notifyUser(userId: string, title: string, message: string) {
  try {
    await db.userNotification.create({
      data: { userId, title, message, type: 'Exit', linkUrl: '/exit' },
    });
  } catch (error) {
    console.error('Failed to create exit notification:', error);
  }
}

async function auditExit(employeeId: string, actionName: string, details: Record<string, unknown>) {
  try {
    await db.auditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        action: actionName,
        module: 'Exit',
        employeeId,
        details: JSON.stringify(details),
      },
    });
  } catch (error) {
    console.error('Failed to create exit audit log:', error);
  }
}

/**
 * Returns the download URL for an exit letter, reusing an already-archived
 * EmployeeDocument when present and generating a fresh one otherwise.
 */
async function ensureExitLetter(
  employee: ExitLetterEmployee,
  organization: ExitLetterOrganization | null,
  exitRequest: ExitLetterRequest,
  letterType: ExitLetterType,
): Promise<{ downloadUrl: string | null; created: boolean }> {
  const existing = await findExistingExitLetter(employee.id, letterType);
  if (existing) {
    return { downloadUrl: `/api/documents/${encodeURIComponent(existing.id)}`, created: false };
  }
  try {
    const generated = await generateExitLetter({ employee, organization, exitRequest, letterType });
    return { downloadUrl: generated.downloadUrl, created: true };
  } catch (error) {
    console.error(`Failed to generate ${letterType}:`, error);
    return { downloadUrl: null, created: false };
  }
}

async function resolveOrganization(organizationId?: string | null) {
  if (organizationId) {
    const org = await db.organizations.findUnique({ where: { id: organizationId } });
    if (org) return org;
  }
  return db.organizations.findFirst();
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId');

    const [exitRequests, alumniRecords, assignedAssets] = await Promise.all([
      db.exitRequest.findMany({
        where: employeeId ? { employeeId } : {},
        include: {
          clearances: true,
          interview: true,
          settlement: true,
          ktTasks: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.alumniRecord.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      employeeId
        ? db.asset.findMany({
            where: { assignedToId: employeeId },
            select: { id: true, assetTag: true, name: true, serialNumber: true, category: true, status: true },
          })
        : [],
    ]);

    // ExitRequest has no employee relation — attach employee context separately
    // so the UI can render names and evaluate manager-level actions.
    const employeeIds = Array.from(new Set(exitRequests.map((req) => req.employeeId)));
    const employees = employeeIds.length
      ? await db.employee.findMany({
          where: { id: { in: employeeIds } },
          select: {
            id: true,
            name: true,
            employeeCode: true,
            department: true,
            roleTitle: true,
            email: true,
            managerId: true,
            avatarUrl: true,
          },
        })
      : [];

    return NextResponse.json({
      success: true,
      data: { exitRequests, alumniRecords, assignedAssets, employees },
    });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching exit data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch exit data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = (await getCurrentEmployee()) || { id: 'EMP-006', userRole: 'admin' };
    const body = await request.json();
    const { action } = body;

    const isAdmin = user.userRole === 'admin';
    const isManager = user.userRole === 'manager';

    // 1. SUBMIT RESIGNATION NOTICE (FIX 1: single active resignation per employee)
    if (action === 'submit_resignation') {
      const { employeeId, requestedRelievingDate, reasonCategory, reasonDetails, noticePeriodDays = 60 } = body;
      const targetEmployeeId = employeeId || user.id;
      const todayStr = new Date().toISOString().split('T')[0];

      // Only the employee themselves (or an admin on their behalf) may submit.
      if (!isAdmin && targetEmployeeId !== user.id) {
        return NextResponse.json(
          { success: false, error: 'You can only submit your own resignation.' },
          { status: 403 }
        );
      }

      const employee = await db.employee.findUnique({
        where: { id: targetEmployeeId },
        select: { id: true, status: true },
      });
      if (!employee) {
        return NextResponse.json(
          { success: false, error: 'Employee not found.' },
          { status: 404 }
        );
      }
      if (['Exited', 'Offboarded'].includes(employee.status)) {
        return NextResponse.json(
          { success: false, error: 'This employee has already exited the organisation.' },
          { status: 400 }
        );
      }

      // FIX 1: block a second active resignation.
      const activeRequest = await db.exitRequest.findFirst({
        where: {
          employeeId: targetEmployeeId,
          status: { notIn: INACTIVE_EXIT_STATUSES },
        },
        select: { id: true },
      });
      if (activeRequest) {
        return NextResponse.json(
          {
            success: false,
            error: 'You already have a pending resignation. Only one active resignation request is allowed per employee.',
          },
          { status: 409 }
        );
      }

      const exitReq = await db.exitRequest.create({
        data: {
          id: `EXIT-${Date.now().toString(36)}`,
          employeeId: targetEmployeeId,
          resignationDate: todayStr,
          requestedRelievingDate,
          reasonCategory,
          reasonDetails,
          noticePeriodDays: Number(noticePeriodDays),
          status: 'Submitted',
          managerApproval: 'Pending',
          hrApproval: 'Pending',
          workflowStage: 'Pending Manager Approval',
          clearances: {
            create: [
              { employeeId: targetEmployeeId, department: 'IT', status: 'Pending' },
              { employeeId: targetEmployeeId, department: 'Finance', status: 'Pending' },
              { employeeId: targetEmployeeId, department: 'HR', status: 'Pending' },
              { employeeId: targetEmployeeId, department: 'Manager', status: 'Pending' },
              { employeeId: targetEmployeeId, department: 'Admin', status: 'Pending' },
            ],
          },
        },
        include: { clearances: true, ktTasks: true },
      });

      await auditExit(targetEmployeeId, 'CREATE', {
        action: 'submit_resignation',
        reasonCategory,
        requestedRelievingDate,
        noticePeriodDays,
        exitRequestId: exitReq.id,
      });

      return NextResponse.json({ success: true, data: exitReq }, { status: 201 });
    }

    // 2. WORKFLOW APPROVALS (FIX 2: Manager → HR → Notice Period)
    if (action === 'manager_approve' || action === 'manager_reject') {
      const { exitRequestId, remarks } = body;
      const exitRequest = await db.exitRequest.findUnique({ where: { id: exitRequestId } });
      if (!exitRequest) {
        return NextResponse.json({ success: false, error: 'Exit request not found.' }, { status: 404 });
      }

      // Admins, or the employee's reporting manager.
      if (!isAdmin) {
        if (!isManager) {
          return NextResponse.json(
            { success: false, error: 'Only the reporting manager or HR can perform this action.' },
            { status: 403 }
          );
        }
        const employee = await db.employee.findUnique({
          where: { id: exitRequest.employeeId },
          select: { managerId: true },
        });
        if (employee?.managerId !== user.id) {
          return NextResponse.json(
            { success: false, error: 'Only the reporting manager or HR can approve this resignation.' },
            { status: 403 }
          );
        }
      }

      if (exitRequest.workflowStage !== 'Pending Manager Approval') {
        return NextResponse.json(
          { success: false, error: 'Manager approval has already been processed for this request.' },
          { status: 400 }
        );
      }

      const approved = action === 'manager_approve';
      const updated = await db.exitRequest.update({
        where: { id: exitRequestId },
        data: approved
          ? {
              managerApproval: 'Approved',
              managerApprovedAt: new Date(),
              workflowStage: 'Pending HR Approval',
              status: 'Manager Approved',
            }
          : {
              managerApproval: 'Rejected',
              rejectionReason: remarks || 'Rejected by reporting manager.',
              workflowStage: 'Rejected',
              status: 'Rejected',
            },
      });

      // The manager's NOC in the 5-department clearance matrix is satisfied
      // the moment the reporting manager approves the resignation.
      if (approved) {
        await db.exitDepartmentClearance.updateMany({
          where: { exitRequestId, department: 'Manager', status: { not: 'Cleared' } },
          data: {
            status: 'Cleared',
            clearedById: user.id,
            clearedAt: new Date(),
            remarks: 'Auto-cleared by manager approval.',
          },
        });
      }

      await notifyUser(
        exitRequest.employeeId,
        approved ? 'Resignation Approved by Manager' : 'Resignation Rejected by Manager',
        approved
          ? 'Your resignation has been approved by your reporting manager and is now pending HR approval.'
          : `Your resignation has been rejected by your reporting manager. ${remarks || ''}`.trim(),
      );
      await auditExit(exitRequest.employeeId, action, { exitRequestId, remarks });

      return NextResponse.json({ success: true, data: updated });
    }

    if (action === 'hr_approve' || action === 'hr_reject') {
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Only HR can perform this action.' },
          { status: 403 }
        );
      }

      const { exitRequestId, approvedRelievingDate, remarks } = body;
      const exitRequest = await db.exitRequest.findUnique({ where: { id: exitRequestId } });
      if (!exitRequest) {
        return NextResponse.json({ success: false, error: 'Exit request not found.' }, { status: 404 });
      }

      if (exitRequest.workflowStage !== 'Pending HR Approval') {
        return NextResponse.json(
          { success: false, error: 'HR approval is not pending for this request.' },
          { status: 400 }
        );
      }

      const approved = action === 'hr_approve';
      const updated = await db.exitRequest.update({
        where: { id: exitRequestId },
        data: approved
          ? {
              hrApproval: 'Approved',
              hrApprovedAt: new Date(),
              approvedRelievingDate: approvedRelievingDate || exitRequest.requestedRelievingDate,
              workflowStage: 'In Notice Period',
              status: 'Approved',
            }
          : {
              hrApproval: 'Rejected',
              rejectionReason: remarks || 'Rejected by HR.',
              workflowStage: 'Rejected',
              status: 'Rejected',
            },
      });

      // HR approval finalises the resignation: along with the HR NOC, the
      // IT, Finance and Admin NOCs are auto-cleared so the 5-department
      // clearance matrix completes (Manager NOC was cleared at manager
      // approval). Any NOC already cleared manually is left untouched.
      if (approved) {
        await db.exitDepartmentClearance.updateMany({
          where: { exitRequestId, status: { not: 'Cleared' } },
          data: {
            status: 'Cleared',
            clearedById: user.id,
            clearedAt: new Date(),
            remarks: 'Auto-cleared by HR approval.',
          },
        });
      }

      await notifyUser(
        exitRequest.employeeId,
        approved ? 'Resignation Approved by HR' : 'Resignation Rejected by HR',
        approved
          ? `Your resignation has been approved by HR. Your notice period is in effect until ${(approvedRelievingDate || exitRequest.requestedRelievingDate)}.`
          : `Your resignation has been rejected by HR. ${remarks || ''}`.trim(),
      );
      await auditExit(exitRequest.employeeId, action, { exitRequestId, remarks });

      return NextResponse.json({ success: true, data: updated });
    }

    // 3. WITHDRAW RESIGNATION (employee's own, only while pending approval)
    if (action === 'withdraw_resignation') {
      const { exitRequestId } = body;
      const exitRequest = await db.exitRequest.findUnique({ where: { id: exitRequestId } });
      if (!exitRequest) {
        return NextResponse.json({ success: false, error: 'Exit request not found.' }, { status: 404 });
      }

      if (!isAdmin && exitRequest.employeeId !== user.id) {
        return NextResponse.json(
          { success: false, error: 'You can only withdraw your own resignation.' },
          { status: 403 }
        );
      }

      if (!['Pending Manager Approval', 'Pending HR Approval'].includes(exitRequest.workflowStage)) {
        return NextResponse.json(
          { success: false, error: 'Resignation can only be withdrawn while it is pending approval.' },
          { status: 400 }
        );
      }

      const updated = await db.exitRequest.update({
        where: { id: exitRequestId },
        data: {
          status: 'Withdrawn',
          workflowStage: 'Withdrawn',
          rejectionReason: 'Withdrawn by employee.',
        },
      });

      await auditExit(exitRequest.employeeId, 'withdraw_resignation', { exitRequestId });
      return NextResponse.json({ success: true, data: updated });
    }

    // 4. EXIT INTERVIEW SUBMISSION (FIX 2: structured interview form)
    if (action === 'interview_submit') {
      const {
        exitRequestId,
        feedbackText,
        primaryReason,
        ratingCompany = 4,
        ratingManager = 4,
        ratingCulture = 4,
        wouldRecommend = true,
      } = body;

      const exitRequest = await db.exitRequest.findUnique({ where: { id: exitRequestId } });
      if (!exitRequest) {
        return NextResponse.json({ success: false, error: 'Exit request not found.' }, { status: 404 });
      }

      if (!isAdmin && exitRequest.employeeId !== user.id) {
        return NextResponse.json(
          { success: false, error: 'You can only submit your own exit interview.' },
          { status: 403 }
        );
      }

      if (!feedbackText || !String(feedbackText).trim()) {
        return NextResponse.json(
          { success: false, error: 'Interview feedback is required.' },
          { status: 400 }
        );
      }

      const interview = await db.exitInterview.upsert({
        where: { exitRequestId },
        update: {
          feedbackText: String(feedbackText).trim(),
          primaryReason: primaryReason || exitRequest.reasonCategory,
          ratingCompany: Number(ratingCompany),
          ratingManager: Number(ratingManager),
          ratingCulture: Number(ratingCulture),
          wouldRecommend: Boolean(wouldRecommend),
          conductedAt: new Date(),
        },
        create: {
          exitRequestId,
          employeeId: exitRequest.employeeId,
          feedbackText: String(feedbackText).trim(),
          primaryReason: primaryReason || exitRequest.reasonCategory,
          ratingCompany: Number(ratingCompany),
          ratingManager: Number(ratingManager),
          ratingCulture: Number(ratingCulture),
          wouldRecommend: Boolean(wouldRecommend),
        },
      });

      await auditExit(exitRequest.employeeId, 'interview_submit', { exitRequestId });
      return NextResponse.json({ success: true, data: interview }, { status: 201 });
    }

    // 5. KNOWLEDGE TRANSFER (KT) TASK CREATION & PROGRESS
    if (action === 'kt_task_create') {
      if (!isAdmin && !isManager) {
        return NextResponse.json(
          { success: false, error: 'Only HR or the manager can create knowledge transfer tasks.' },
          { status: 403 }
        );
      }

      const { exitRequestId, title, description, recipientEmployeeId, recipientName, dueDate } = body;
      const kt = await db.knowledgeTransferTask.create({
        data: {
          exitRequestId,
          title,
          description,
          recipientEmployeeId,
          recipientName: recipientName || 'Designated Colleague',
          status: 'Pending',
          dueDate: dueDate || new Date().toISOString().split('T')[0],
        },
      });
      return NextResponse.json({ success: true, data: kt }, { status: 201 });
    }

    if (action === 'kt_task_update') {
      const { taskId, status, notes } = body;
      const task = await db.knowledgeTransferTask.findUnique({ where: { id: taskId } });
      if (!task) {
        return NextResponse.json({ success: false, error: 'Knowledge transfer task not found.' }, { status: 404 });
      }

      const isRecipient = task.recipientEmployeeId === user.id;
      if (!isAdmin && !isManager && !isRecipient) {
        return NextResponse.json(
          { success: false, error: 'Not authorized to update this knowledge transfer task.' },
          { status: 403 }
        );
      }
      if (status === 'Verified' && !isAdmin && !isManager) {
        return NextResponse.json(
          { success: false, error: 'Only HR or the manager can verify knowledge transfer tasks.' },
          { status: 403 }
        );
      }

      const updated = await db.knowledgeTransferTask.update({
        where: { id: taskId },
        data: {
          status,
          notes: notes || undefined,
          completedAt: status === 'Completed' || status === 'Verified' ? new Date() : null,
          verifiedById: status === 'Verified' ? user.id : undefined,
          verifiedAt: status === 'Verified' ? new Date() : undefined,
        },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    // 6. DEPARTMENT NOC CLEARANCE UPDATE (FIX 3: advances workflow stage)
    if (action === 'clearance_update') {
      if (!isAdmin && !isManager) {
        return NextResponse.json(
          { success: false, error: 'Only HR or the manager can update department clearances.' },
          { status: 403 }
        );
      }

      const { clearanceId, status, remarks, assetReturnedCount, duesPendingAmount } = body;
      const updated = await db.exitDepartmentClearance.update({
        where: { id: clearanceId },
        data: {
          status,
          clearedById: user.id,
          clearedAt: status === 'Cleared' ? new Date() : null,
          remarks: remarks || undefined,
          assetReturnedCount: assetReturnedCount !== undefined ? Number(assetReturnedCount) : undefined,
          duesPendingAmount: duesPendingAmount !== undefined ? Number(duesPendingAmount) : undefined,
        },
      });

      // Advance the overall workflow once the notice period is behind us.
      const exitRequest = await db.exitRequest.findUnique({
        where: { id: updated.exitRequestId },
        select: { id: true, workflowStage: true },
      });
      if (
        exitRequest &&
        ['In Notice Period', 'Clearance In Progress'].includes(exitRequest.workflowStage)
      ) {
        await db.exitRequest.update({
          where: { id: exitRequest.id },
          data: { workflowStage: 'Clearance In Progress' },
        });
      }

      return NextResponse.json({ success: true, data: updated });
    }

    // 7. FULL & FINAL (F&F) SETTLEMENT CALCULATION (FIX 3: marks stage Settled)
    if (action === 'calculate_ff') {
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Only HR can calculate the Full & Final settlement.' },
          { status: 403 }
        );
      }

      const {
        exitRequestId,
        employeeId,
        totalPayableDays,
        basicPay,
        leaveEncashmentAmount = 0,
        gratuityAmount = 0,
        bonusPayable = 0,
        pendingDuesDeduction = 0,
        taxDeduction = 0,
      } = body;

      const totalEarnings = Number(basicPay) + Number(leaveEncashmentAmount) + Number(gratuityAmount) + Number(bonusPayable);
      const totalDeductions = Number(pendingDuesDeduction) + Number(taxDeduction);
      const netSettlement = totalEarnings - totalDeductions;

      const settlement = await db.fullAndFinalSettlement.upsert({
        where: { exitRequestId },
        update: {
          totalPayableDays: Number(totalPayableDays),
          basicPay: Number(basicPay),
          leaveEncashmentAmount: Number(leaveEncashmentAmount),
          gratuityAmount: Number(gratuityAmount),
          bonusPayable: Number(bonusPayable),
          pendingDuesDeduction: Number(pendingDuesDeduction),
          taxDeduction: Number(taxDeduction),
          netSettlementAmount: netSettlement,
          status: 'Calculated',
        },
        create: {
          id: `FF-${Date.now().toString(36)}`,
          exitRequestId,
          employeeId,
          totalPayableDays: Number(totalPayableDays),
          basicPay: Number(basicPay),
          leaveEncashmentAmount: Number(leaveEncashmentAmount),
          gratuityAmount: Number(gratuityAmount),
          bonusPayable: Number(bonusPayable),
          pendingDuesDeduction: Number(pendingDuesDeduction),
          taxDeduction: Number(taxDeduction),
          netSettlementAmount: netSettlement,
          status: 'Calculated',
        },
      });

      // FIX 3 + FIX 5: settlement complete → letters become available.
      await db.exitRequest.update({
        where: { id: exitRequestId },
        data: { workflowStage: 'Settled', status: 'Settled' },
      });

      await notifyUser(
        employeeId,
        'Full & Final Settlement Calculated',
        `Your Full & Final settlement of ₹${netSettlement.toLocaleString('en-IN')} has been calculated and is ready for review.`,
      );
      await auditExit(employeeId, 'calculate_ff', { exitRequestId, netSettlement });

      return NextResponse.json({ success: true, data: settlement });
    }

    // 8. GENERATE OFFICIAL LETTER (FIX 5: Relieving / Experience via DocumentTemplate system)
    if (action === 'generate_letter') {
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Only HR can generate official letters.' },
          { status: 403 }
        );
      }

      const { exitRequestId, letterType } = body;
      if (letterType !== 'Relieving_Letter' && letterType !== 'Experience_Letter') {
        return NextResponse.json(
          { success: false, error: 'Invalid letter type. Expected Relieving_Letter or Experience_Letter.' },
          { status: 400 }
        );
      }

      const exitRequest = await db.exitRequest.findUnique({ where: { id: exitRequestId } });
      if (!exitRequest) {
        return NextResponse.json({ success: false, error: 'Exit request not found.' }, { status: 404 });
      }

      const eligible =
        LETTER_ELIGIBLE_STAGES.includes(exitRequest.workflowStage) ||
        LETTER_ELIGIBLE_STATUSES.includes(exitRequest.status);
      if (!eligible) {
        return NextResponse.json(
          { success: false, error: 'Letters can only be generated once the Full & Final settlement is complete (Settled).' },
          { status: 400 }
        );
      }

      const employee = await db.employee.findUnique({ where: { id: exitRequest.employeeId } });
      if (!employee) {
        return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 });
      }

      const organization = await resolveOrganization(employee.organization_id);
      const result = await ensureExitLetter(employee, organization, exitRequest, letterType);
      if (!result.downloadUrl) {
        return NextResponse.json(
          { success: false, error: 'Failed to generate the letter. Please try again.' },
          { status: 500 }
        );
      }

      const letterUnlockDate = (exitRequest.approvedRelievingDate || exitRequest.requestedRelievingDate).slice(0, 10);
      await notifyUser(
        employee.id,
        `${letterType === 'Relieving_Letter' ? 'Relieving Letter' : 'Experience Letter'} Generated`,
        `Your official letter has been generated and added to the Documents section. It is locked until your notice period ends (${letterUnlockDate}) and can be downloaded once, after which account access is revoked.`,
      );
      await auditExit(employee.id, 'generate_letter', { exitRequestId, letterType, documentUrl: result.downloadUrl });

      return NextResponse.json({
        success: true,
        data: { downloadUrl: result.downloadUrl, created: result.created, letterType },
      });
    }

    // 9. COMPLETE EXIT, ACCOUNT DEACTIVATION & ALUMNI ARCHIVE (FIX 5)
    if (action === 'complete_exit') {
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Only HR can complete the exit process.' },
          { status: 403 }
        );
      }

      const { exitRequestId, employeeId } = body;

      const employee = await db.employee.findUnique({ where: { id: employeeId } });
      const exitRequest = await db.exitRequest.findUnique({ where: { id: exitRequestId } });
      if (!employee || !exitRequest) {
        return NextResponse.json(
          { success: false, error: 'Employee or exit request not found.' },
          { status: 404 }
        );
      }

      // FIX 5: generate real letters server-side through the DocumentTemplate
      // system (reusing archived ones when already generated).
      const organization = await resolveOrganization(employee.organization_id);
      const [relieving, experience] = await Promise.all([
        ensureExitLetter(employee, organization, exitRequest, 'Relieving_Letter'),
        ensureExitLetter(employee, organization, exitRequest, 'Experience_Letter'),
      ]);

      // Relieving date = notice period end = letter unlock day.
      const relievingDateStr = exitRequest.approvedRelievingDate || exitRequest.requestedRelievingDate;
      const unlockDate = relievingDateStr.slice(0, 10);
      const lockedUntil = new Date(`${unlockDate}T00:00:00.000Z`);

      // Safe Transactional Offboarding
      await db.$transaction(async (tx) => {
        // 1. Mark employee Exited (FIX 5: not deleted, not Offboarded).
        //    Sessions are intentionally NOT revoked here: the employee must
        //    stay able to log in and download the exit letters, which stay
        //    locked until the notice period ends. Full access is revoked
        //    automatically once both letters are downloaded.
        await tx.employee.update({
          where: { id: employeeId },
          data: {
            status: 'Exited',
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        });

        // 2. Mark employment profile exit date
        await tx.employee_employment_profiles.updateMany({
          where: { employee_id: employeeId },
          data: {
            lifecycle_status: 'Exited',
            exit_date: new Date(),
            updated_at: new Date(),
          },
        });

        // 4. Create immutable Alumni Record with real letter URLs
        await tx.alumniRecord.upsert({
          where: { employeeId },
          update: {
            exitDate: new Date().toISOString().split('T')[0],
            relievingLetterUrl: relieving.downloadUrl,
            experienceLetterUrl: experience.downloadUrl,
          },
          create: {
            id: `ALUM-${Date.now().toString(36)}`,
            employeeId,
            employeeCode: employee.employeeCode,
            name: employee.name,
            personalEmail: employee.email,
            phone: employee.phone,
            department: employee.department,
            lastDesignation: employee.roleTitle,
            joinDate: employee.joinDate,
            exitDate: new Date().toISOString().split('T')[0],
            relievingLetterUrl: relieving.downloadUrl,
            experienceLetterUrl: experience.downloadUrl,
          },
        });

        // 5. Update ExitRequest to Completed / Exited
        await tx.exitRequest.update({
          where: { id: exitRequestId },
          data: { status: 'Completed', workflowStage: 'Exited' },
        });

        // 5b. Backfill the lock on any exit letters generated before this
        // workflow existed (they have no locked_until set yet).
        if (!Number.isNaN(lockedUntil.getTime())) {
          await tx.employeeDocument.updateMany({
            where: {
              employeeId,
              name: { in: ['Relieving Letter', 'Experience Letter'] },
              storage_key: { not: null },
              locked_until: null,
              downloaded_at: null,
            },
            data: { locked_until: lockedUntil },
          });
        }

        // 6. Audit Log
        await tx.auditLog.create({
          data: {
            id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            action: 'UPDATE',
            module: 'Exit',
            employeeId,
            details: JSON.stringify({
              action: 'Exited',
              exitRequestId,
              relievingLetterUrl: relieving.downloadUrl,
              experienceLetterUrl: experience.downloadUrl,
              lettersLockedUntil: unlockDate,
              accessRevocation: 'deferred until both letters downloaded',
            }),
          },
        });
      });

      // 7. Notify the employee: letters are in Documents, locked until the
      //    notice period ends, and access is revoked after download.
      await notifyUser(
        employeeId,
        'Exit Completed — Letters Pending Unlock',
        `Your Relieving Letter and Experience Letter have been added to your Documents section. They are locked until your notice period ends (${unlockDate}), after which you can download them. Please download both letters once unlocked — your account access will be revoked after the downloads.`
      );

      await invalidateDashboardAnalytics();
      await invalidateEmployeeDirectory();

      return NextResponse.json({
        success: true,
        message: `Employee exit completed and archived to Alumni. Letters are locked in the employee's Documents until the notice period ends (${unlockDate}); account access will be revoked after both letters are downloaded.`,
        data: {
          relievingLetterUrl: relieving.downloadUrl,
          experienceLetterUrl: experience.downloadUrl,
          lettersLockedUntil: unlockDate,
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid exit action' }, { status: 400 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error handling exit action:', error);
    const message = error instanceof Error ? error.message : 'Failed to process exit action';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
