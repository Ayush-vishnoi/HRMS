import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
  requireEmployeeAccess,
  requireRole,
} from '@/lib/auth-session';
import { syncEmployeeKpis } from '@/lib/performance/kpi-engine';

export async function GET(request: Request) {
  try {
    const user = await requireEmployee();
    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId') || user.id;
    const scope = url.searchParams.get('scope');
    const type = url.searchParams.get('type');
    const cycleId = url.searchParams.get('cycleId');

    const [goals, kpis, kras] = await Promise.all([
      db.performanceGoal.findMany({
        where: {
          ...(scope ? { scope: scope as any } : {}),
          ...(type ? { type: type as any } : {}),
          ...(cycleId ? { cycle_id: cycleId } : {}),
          ...(user.userRole === 'admin'
            ? {}
            : user.userRole === 'manager'
            ? {
                OR: [
                  { owner_employee_id: employeeId },
                  { owner_employee_id: user.id },
                  { created_by_id: user.id },
                  { scope: 'Organization' },
                  { scope: 'Team' },
                ],
              }
            : {
                OR: [
                  { owner_employee_id: user.id },
                  { scope: 'Organization' },
                  { scope: 'Team' },
                ],
              }),
        },
        include: {
          key_results: true,
          other_performance_goals: {
            include: { key_results: true },
          },
          employees_performance_goals_owner_employee_idToemployees: {
            select: { id: true, name: true, employeeCode: true, department: true, roleTitle: true, avatarUrl: true },
          },
          employees_performance_goals_created_by_idToemployees: {
            select: { id: true, name: true, employeeCode: true, roleTitle: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.performance_kpis.findMany({
        where: {
          ...(cycleId ? { cycle_id: cycleId } : {}),
          ...(user.userRole === 'admin'
            ? {}
            : user.userRole === 'manager'
            ? {
                OR: [
                  { employee_id: employeeId },
                  { employee_id: user.id },
                ],
              }
            : { employee_id: user.id }),
        },
        include: {
          employee: {
            select: { id: true, name: true, employeeCode: true, department: true, roleTitle: true },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      db.performanceKra.findMany({
        where: user.userRole === 'admin'
          ? {}
          : user.userRole === 'manager'
          ? {
              OR: [
                { assignedToId: employeeId },
                { assignedById: user.id },
                { assignedToId: user.id },
              ],
            }
          : { assignedToId: user.id },
        include: {
          assignedTo: { select: { id: true, name: true, roleTitle: true, department: true } },
          assignedBy: { select: { id: true, name: true, roleTitle: true, department: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { goals, kpis, kras },
    });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching goals:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch goals' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireEmployee();
    const body = await request.json();
    const { action } = body;

    const org = await db.organizations.findFirst({ select: { id: true } });
    const orgId = org?.id || 'org_default';

    // 1. CREATE GOAL / OBJECTIVE (OKR / KPI / Standard Goal)
    if (action === 'create_goal' || !action) {
      const {
        title,
        description,
        type = 'OKR',
        scope = 'Individual',
        ownerId = user.id,
        parentGoalId,
        departmentId,
        teamId,
        metric,
        targetValue,
        currentValue,
        weightage = 20,
        startDate,
        dueDate,
        cycleId,
        keyResults = [],
      } = body;

      // RBAC check: Only admins can create Org-level goals; Managers/Admins create Team goals
      if (scope === 'Organization' && user.userRole !== 'admin') {
        return NextResponse.json({ success: false, error: 'Only HR Admins can create company-wide objectives.' }, { status: 403 });
      }

      if (ownerId !== user.id) {
        await requireEmployeeAccess(ownerId);
      }

      const goal = await db.performanceGoal.create({
        data: {
          id: `GOAL-${Date.now().toString(36).toUpperCase()}`,
          organization_id: orgId,
          department_id: departmentId || null,
          team_id: teamId || null,
          owner_employee_id: ownerId,
          parentGoalId: parentGoalId || null,
          created_by_id: user.id,
          type: type as any,
          scope: scope as any,
          title,
          description: description || null,
          metric: metric || null,
          targetValue: targetValue ? Number(targetValue) : null,
          currentValue: currentValue ? Number(currentValue) : null,
          progress: 0,
          weightage: Number(weightage) || 20,
          cycle_id: cycleId || null,
          start_date: new Date(startDate || new Date()),
          due_date: new Date(dueDate || new Date(Date.now() + 90 * 86400000)),
          status: 'Active',
        },
      });

      // Create Key Results if provided
      if (Array.isArray(keyResults) && keyResults.length > 0) {
        for (const kr of keyResults) {
          await db.performance_key_results.create({
            data: {
              goal_id: goal.id,
              title: kr.title,
              metric: kr.metric || 'Metric Target',
              target_value: kr.targetValue ? Number(kr.targetValue) : 100,
              current_value: kr.currentValue ? Number(kr.currentValue) : 0,
              unit: kr.unit || '%',
              weightage: Number(kr.weightage) || 25,
              progress: Number(kr.progress) || 0,
              status: 'Active',
            },
          });
        }
      }

      await db.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'CREATE_GOAL',
          module: 'GoalsAndOKRs',
          employeeId: ownerId,
          details: JSON.stringify({ title, type, scope, parentGoalId }),
        },
      });

      const fullGoal = await db.performanceGoal.findUnique({
        where: { id: goal.id },
        include: { key_results: true },
      });

      return NextResponse.json({ success: true, data: fullGoal }, { status: 201 });
    }

    // 2. CASCADE GOAL (Create child goal under parent)
    if (action === 'cascade_goal') {
      const { parentGoalId, title, ownerId, scope = 'Individual', weightage = 20, dueDate } = body;

      const parent = await db.performanceGoal.findUnique({ where: { id: parentGoalId } });
      if (!parent) return NextResponse.json({ success: false, error: 'Parent goal not found' }, { status: 404 });

      await requireEmployeeAccess(ownerId);

      const cascaded = await db.performanceGoal.create({
        data: {
          id: `GOAL-CASC-${Date.now().toString(36).toUpperCase()}`,
          organization_id: parent.organization_id,
          department_id: parent.department_id,
          team_id: parent.team_id,
          owner_employee_id: ownerId,
          parentGoalId: parent.id,
          created_by_id: user.id,
          type: parent.type,
          scope: scope as any,
          title,
          description: `Cascaded from parent goal: "${parent.title}"`,
          weightage: Number(weightage) || 20,
          cycle_id: parent.cycle_id,
          start_date: parent.start_date,
          due_date: dueDate ? new Date(dueDate) : parent.due_date,
          status: 'Active',
        },
        include: { key_results: true },
      });

      await db.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'CASCADE_GOAL',
          module: 'GoalsAndOKRs',
          employeeId: ownerId,
          details: JSON.stringify({ parentId: parent.id, cascadedId: cascaded.id, title }),
        },
      });

      return NextResponse.json({ success: true, data: cascaded }, { status: 201 });
    }

    // 3. ADD KEY RESULT TO OBJECTIVE
    if (action === 'add_key_result') {
      const { goalId, title, metric, targetValue, unit = '%', weightage = 25 } = body;
      const goal = await db.performanceGoal.findUnique({ where: { id: goalId } });
      if (!goal) return NextResponse.json({ success: false, error: 'Goal not found' }, { status: 404 });

      if (goal.owner_employee_id) {
        await requireEmployeeAccess(goal.owner_employee_id);
      }

      const kr = await db.performance_key_results.create({
        data: {
          goal_id: goalId,
          title,
          metric: metric || 'Completion rate',
          target_value: Number(targetValue) || 100,
          current_value: 0,
          unit,
          weightage: Number(weightage) || 25,
          progress: 0,
          status: 'Active',
        },
      });

      return NextResponse.json({ success: true, data: kr }, { status: 201 });
    }

    // 4. SYNC DATA-DRIVEN KPIS (Attendance, Leaves, LMS, Timesheets)
    if (action === 'sync_kpis') {
      const targetEmpId = body.employeeId || user.id;
      const synced = await syncEmployeeKpis(orgId, targetEmpId, body.cycleId);
      return NextResponse.json({ success: true, data: synced });
    }

    // 5. CREATE MANUAL KPI
    if (action === 'create_kpi') {
      const { employeeId = user.id, name, description, metric, target, unit = '%', weightage = 20, frequency = 'Quarterly' } = body;
      await requireEmployeeAccess(employeeId);

      const kpi = await db.performance_kpis.create({
        data: {
          id: `KPI-${Date.now().toString(36)}`,
          organization_id: orgId,
          employee_id: employeeId,
          cycle_id: body.cycleId || null,
          name,
          description: description || metric,
          metric,
          target: Number(target) || 100,
          actual: 0,
          unit,
          weightage: Number(weightage) || 20,
          frequency,
          source_module: 'Manual',
          is_system_calculated: false,
        },
      });

      return NextResponse.json({ success: true, data: kpi }, { status: 201 });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error creating goal/kpi:', error);
    return NextResponse.json({ success: false, error: 'Failed to process goal request' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireEmployee();
    const body = await request.json();
    const { goalId, keyResultId, kpiId, progress, currentValue, actualValue, status } = body;

    // 1. Update Key Result Progress
    if (keyResultId) {
      const kr = await db.performance_key_results.findUnique({
        where: { id: keyResultId },
        include: { goal: true },
      });
      if (!kr) return NextResponse.json({ success: false, error: 'Key Result not found' }, { status: 404 });

      if (kr.goal.owner_employee_id) {
        await requireEmployeeAccess(kr.goal.owner_employee_id);
      }

      const targetVal = Number(kr.target_value) || 100;
      const curVal = currentValue !== undefined ? Number(currentValue) : Number(kr.current_value);
      const computedProgress = Math.min(100, Math.round((curVal / targetVal) * 100));

      const updatedKr = await db.performance_key_results.update({
        where: { id: keyResultId },
        data: {
          current_value: curVal,
          progress: progress !== undefined ? Number(progress) : computedProgress,
          status: status || kr.status,
          updated_at: new Date(),
        },
      });

      // Recalculate Parent Goal Progress
      const allKrs = await db.performance_key_results.findMany({ where: { goal_id: kr.goal_id } });
      const totalWeight = allKrs.reduce((acc, item) => acc + (item.weightage || 25), 0);
      const weightedProg = allKrs.reduce((acc, item) => acc + (item.progress * (item.weightage || 25)), 0);
      const avgProg = totalWeight > 0 ? Math.round(weightedProg / totalWeight) : 0;

      await db.performanceGoal.update({
        where: { id: kr.goal_id },
        data: { progress: avgProg, updatedAt: new Date() },
      });

      return NextResponse.json({ success: true, data: updatedKr });
    }

    // 2. Update Goal Progress / Status
    if (goalId) {
      const goal = await db.performanceGoal.findUnique({ where: { id: goalId } });
      if (!goal) return NextResponse.json({ success: false, error: 'Goal not found' }, { status: 404 });

      if (goal.owner_employee_id) {
        await requireEmployeeAccess(goal.owner_employee_id);
      }

      const updated = await db.performanceGoal.update({
        where: { id: goalId },
        data: {
          ...(progress !== undefined ? { progress: Number(progress) } : {}),
          ...(currentValue !== undefined ? { currentValue: Number(currentValue) } : {}),
          ...(status ? { status: status as any } : {}),
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    // 3. Update KPI actual value
    if (kpiId) {
      const kpi = await db.performance_kpis.findUnique({ where: { id: kpiId } });
      if (!kpi) return NextResponse.json({ success: false, error: 'KPI not found' }, { status: 404 });

      await requireEmployeeAccess(kpi.employee_id);

      const updatedKpi = await db.performance_kpis.update({
        where: { id: kpiId },
        data: {
          actual: actualValue !== undefined ? Number(actualValue) : kpi.actual,
          updated_at: new Date(),
        },
      });

      return NextResponse.json({ success: true, data: updatedKpi });
    }

    return NextResponse.json({ success: false, error: 'No valid target identifier provided' }, { status: 400 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error updating goal:', error);
    return NextResponse.json({ success: false, error: 'Failed to update goal' }, { status: 500 });
  }
}
