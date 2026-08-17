import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
  requireEmployeeAccess,
  requireRole,
} from '@/lib/auth-session';

export async function GET(request: Request) {
  try {
    const user = await requireEmployee();
    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId');

    const pips = await db.performance_improvement_plans.findMany({
      where: user.userRole === 'admin'
        ? (employeeId ? { employee_id: employeeId } : {})
        : user.userRole === 'manager'
        ? {
            OR: [
              { manager_id: user.id },
              { employee_id: user.id },
              ...(employeeId ? [{ employee_id: employeeId }] : []),
            ],
          }
        : { employee_id: user.id },
      include: {
        employees_performance_improvement_plans_employee_idToemployees: {
          select: { id: true, name: true, employeeCode: true, department: true, roleTitle: true, avatarUrl: true },
        },
        employees_performance_improvement_plans_manager_idToemployees: {
          select: { id: true, name: true, employeeCode: true, roleTitle: true },
        },
        performance_pip_milestones: {
          orderBy: { due_date: 'asc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ success: true, data: pips });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching PIPs:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch PIPs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireEmployee();
    const body = await request.json();
    const { action } = body;

    // 1. CREATE PIP (Managers and Admins only)
    if (action === 'create_pip' || !action) {
      if (user.userRole === 'employee') {
        return NextResponse.json({ success: false, error: 'Employees cannot initiate a PIP.' }, { status: 403 });
      }

      const { employeeId, title, reason, expectations, startDate, reviewDate, milestones = [] } = body;

      const targetEmp = await db.employee.findUnique({ where: { id: employeeId } });
      if (!targetEmp) return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });

      if (user.userRole !== 'admin' && targetEmp.managerId !== user.id) {
        return NextResponse.json({ success: false, error: 'You can only initiate PIPs for direct reports.' }, { status: 403 });
      }

      const pipId = `PIP-${Date.now().toString(36).toUpperCase()}`;

      const pip = await db.performance_improvement_plans.create({
        data: {
          id: pipId,
          employee_id: employeeId,
          manager_id: user.id,
          title: title || 'Performance Improvement Plan',
          reason,
          expectations,
          start_date: new Date(startDate || new Date()),
          review_date: new Date(reviewDate || new Date(Date.now() + 30 * 86400000)),
          status: 'Active',
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Create initial milestones if supplied
      if (Array.isArray(milestones) && milestones.length > 0) {
        for (const m of milestones) {
          await db.performance_pip_milestones.create({
            data: {
              id: `PIP-M-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
              pip_id: pip.id,
              title: m.title,
              due_date: new Date(m.dueDate || new Date(Date.now() + 14 * 86400000)),
              status: 'Pending',
              note: m.note || null,
            },
          });
        }
      }

      // Notify employee
      await db.userNotification.create({
        data: {
          id: `notif-${Date.now()}`,
          userId: employeeId,
          title: 'Performance Improvement Plan Initiated',
          message: `A structured development plan "${pip.title}" has been assigned. Please review expectations and milestones.`,
          type: 'Alert',
          linkUrl: '/performance',
        },
      });

      await db.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'CREATE_PIP',
          module: 'PIP',
          employeeId,
          details: JSON.stringify({ pipId: pip.id, managerId: user.id, title }),
        },
      });

      const fullPip = await db.performance_improvement_plans.findUnique({
        where: { id: pip.id },
        include: { performance_pip_milestones: true },
      });

      return NextResponse.json({ success: true, data: fullPip }, { status: 201 });
    }

    // 2. ADD MILESTONE TO PIP
    if (action === 'add_milestone') {
      const { pipId, title, dueDate, note } = body;
      const pip = await db.performance_improvement_plans.findUnique({ where: { id: pipId } });
      if (!pip) return NextResponse.json({ success: false, error: 'PIP not found' }, { status: 404 });

      if (user.userRole !== 'admin' && pip.manager_id !== user.id) {
        return NextResponse.json({ success: false, error: 'Unauthorized to add milestones.' }, { status: 403 });
      }

      const milestone = await db.performance_pip_milestones.create({
        data: {
          id: `PIP-M-${Date.now().toString(36)}`,
          pip_id: pipId,
          title,
          due_date: new Date(dueDate || new Date(Date.now() + 7 * 86400000)),
          status: 'Pending',
          note: note || null,
        },
      });

      return NextResponse.json({ success: true, data: milestone }, { status: 201 });
    }

    // 3. UPDATE MILESTONE (Check-in / Complete)
    if (action === 'update_milestone') {
      const { milestoneId, status, note } = body;
      const milestone = await db.performance_pip_milestones.findUnique({
        where: { id: milestoneId },
        include: { performance_improvement_plans: true },
      });

      if (!milestone) return NextResponse.json({ success: false, error: 'Milestone not found' }, { status: 404 });

      const updated = await db.performance_pip_milestones.update({
        where: { id: milestoneId },
        data: {
          status: status || milestone.status,
          note: note !== undefined ? note : milestone.note,
        },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    // 4. UPDATE PIP STATUS & OUTCOME (Pass / Fail / Cancel / Extend)
    if (action === 'update_pip_status') {
      const { pipId, status, outcome, endDate } = body;
      const pip = await db.performance_improvement_plans.findUnique({ where: { id: pipId } });
      if (!pip) return NextResponse.json({ success: false, error: 'PIP not found' }, { status: 404 });

      if (user.userRole !== 'admin' && pip.manager_id !== user.id) {
        return NextResponse.json({ success: false, error: 'Unauthorized to close or update PIP.' }, { status: 403 });
      }

      const updated = await db.performance_improvement_plans.update({
        where: { id: pipId },
        data: {
          status: status as any,
          outcome: outcome || pip.outcome,
          end_date: endDate ? new Date(endDate) : new Date(),
          updated_at: new Date(),
        },
      });

      await db.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'UPDATE_PIP_STATUS',
          module: 'PIP',
          employeeId: pip.employee_id,
          details: JSON.stringify({ pipId, status, outcome }),
        },
      });

      await db.userNotification.create({
        data: {
          id: `notif-${Date.now()}`,
          userId: pip.employee_id,
          title: `PIP Status Updated: ${status}`,
          message: `Your Performance Improvement Plan has been updated to "${status}". Outcome: ${outcome || 'Reviewed by manager'}.`,
          type: status === 'SuccessfullyCompleted' ? 'Celebration' : 'Alert',
          linkUrl: '/performance',
        },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: 'Invalid PIP action' }, { status: 400 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error handling PIP action:', error);
    return NextResponse.json({ success: false, error: 'Failed to process PIP request' }, { status: 500 });
  }
}
