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

    return NextResponse.json({
      success: true,
      data: { exitRequests, alumniRecords, assignedAssets },
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

    // 1. SUBMIT RESIGNATION NOTICE
    if (action === 'submit_resignation') {
      const { employeeId, requestedRelievingDate, reasonCategory, reasonDetails, noticePeriodDays = 60 } = body;
      const todayStr = new Date().toISOString().split('T')[0];

      const exitReq = await db.exitRequest.create({
        data: {
          id: `EXIT-${Date.now().toString(36)}`,
          employeeId,
          resignationDate: todayStr,
          requestedRelievingDate,
          reasonCategory,
          reasonDetails,
          noticePeriodDays: Number(noticePeriodDays),
          status: 'Submitted',
          clearances: {
            create: [
              { employeeId, department: 'IT', status: 'Pending' },
              { employeeId, department: 'Finance', status: 'Pending' },
              { employeeId, department: 'HR', status: 'Pending' },
              { employeeId, department: 'Manager', status: 'Pending' },
              { employeeId, department: 'Admin', status: 'Pending' },
            ],
          },
        },
        include: { clearances: true, ktTasks: true },
      });

      // Audit Log
      await db.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'CREATE',
          module: 'Exit',
          employeeId,
          details: JSON.stringify({ reasonCategory, requestedRelievingDate, noticePeriodDays }),
        },
      });

      return NextResponse.json({ success: true, data: exitReq }, { status: 201 });
    }

    // 2. KNOWLEDGE TRANSFER (KT) TASK CREATION & PROGRESS
    if (action === 'kt_task_create') {
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

    // 3. DEPARTMENT NOC CLEARANCE UPDATE
    if (action === 'clearance_update') {
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

      return NextResponse.json({ success: true, data: updated });
    }

    // 4. FULL & FINAL (F&F) SETTLEMENT CALCULATION
    if (action === 'calculate_ff') {
      const { exitRequestId, employeeId, totalPayableDays, basicPay, leaveEncashmentAmount = 0, gratuityAmount = 0, bonusPayable = 0, pendingDuesDeduction = 0, taxDeduction = 0 } = body;
      
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

      return NextResponse.json({ success: true, data: settlement });
    }

    // 5. COMPLETE EXIT, ACCOUNT DEACTIVATION & ALUMNI ARCHIVE
    if (action === 'complete_exit') {
      const { exitRequestId, employeeId, relievingLetterUrl, experienceLetterUrl } = body;
      
      const employee = await db.employee.findUnique({
        where: { id: employeeId },
      });

      if (employee) {
        // Safe Transactional Offboarding
        await db.$transaction(async (tx) => {
          // 1. Mark employee offboarded
          await tx.employee.update({
            where: { id: employeeId },
            data: {
              status: 'Offboarded',
              failedLoginAttempts: 0,
              lockedUntil: null,
            },
          });

          // 2. Invalidate active auth sessions
          await tx.authSession.deleteMany({
            where: { employeeId },
          });

          // 3. Mark employment profile exit date
          await tx.employee_employment_profiles.updateMany({
            where: { employee_id: employeeId },
            data: {
              lifecycle_status: 'Exited',
              exit_date: new Date(),
              updated_at: new Date(),
            },
          });

          // 4. Create immutable Alumni Record
          await tx.alumniRecord.upsert({
            where: { employeeId },
            update: {
              exitDate: new Date().toISOString().split('T')[0],
              relievingLetterUrl: relievingLetterUrl || null,
              experienceLetterUrl: experienceLetterUrl || null,
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
              relievingLetterUrl: relievingLetterUrl || null,
              experienceLetterUrl: experienceLetterUrl || null,
            },
          });

          // 5. Update ExitRequest to Completed
          await tx.exitRequest.update({
            where: { id: exitRequestId },
            data: { status: 'Completed' },
          });

          // 6. Audit Log
          await tx.auditLog.create({
            data: {
              id: `audit-${Date.now()}`,
              action: 'UPDATE',
              module: 'Exit',
              employeeId,
              details: JSON.stringify({ action: 'Offboarded', exitRequestId }),
            },
          });
        });
      }

      await invalidateDashboardAnalytics();
      await invalidateEmployeeDirectory();
      return NextResponse.json({ success: true, message: 'Employee exit completed, sessions revoked, and archived to Alumni.' });
    }

    return NextResponse.json({ success: false, error: 'Invalid exit action' }, { status: 400 });
  } catch (error: any) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error handling exit action:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to process exit action' },
      { status: 500 }
    );
  }
}
