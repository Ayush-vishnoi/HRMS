import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invalidateEmployeeDirectory } from '@/lib/redis';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
  requireEmployeeAccess,
  requireRole,
} from '@/lib/auth-session';
import { calculateEmployeeSkillGap } from '@/lib/performance/skills-gap-engine';

export async function GET(request: Request) {
  try {
    const user = await requireEmployee();
    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId') || user.id;
    const targetRole = url.searchParams.get('targetRole');

    // 1. Skill Gap Analysis
    const skillGap = await calculateEmployeeSkillGap(employeeId, targetRole || undefined);

    // 2. Career Paths
    const careerPaths = await db.career_paths.findMany({
      where: { is_active: true },
      orderBy: { level_order: 'asc' },
    });

    // 3. Employee Career Aspirations
    const aspiration = await db.career_aspirations.findUnique({
      where: { employee_id: employeeId },
    });

    // 4. Role Skill Benchmarks
    const benchmarks = await db.role_skill_benchmarks.findMany({
      include: { skill: true },
    });

    // 5. Talent Pools (Confidential - HR Admin only)
    let talentPools = null;
    let successionPlans = null;

    if (user.userRole === 'admin') {
      talentPools = await db.talent_pools.findMany({
        include: {
          members: {
            include: {
              employee: {
                select: { id: true, name: true, employeeCode: true, department: true, roleTitle: true, avatarUrl: true },
              },
            },
          },
        },
      });

      successionPlans = await db.succession_plans.findMany({
        include: {
          incumbent: {
            select: { id: true, name: true, employeeCode: true, roleTitle: true, department: true },
          },
          emergencySuccessor: {
            select: { id: true, name: true, employeeCode: true, roleTitle: true },
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        skillGap,
        careerPaths,
        aspiration,
        benchmarks,
        talentPools,
        successionPlans,
      },
    });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching talent data:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch talent data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireEmployee();
    const body = await request.json();
    const { action } = body;

    const org = await db.organizations.findFirst({ select: { id: true } });
    const orgId = org?.id || 'org_default';

    // 1. UPDATE CAREER ASPIRATIONS
    if (action === 'save_aspirations' || action === 'update_aspirations') {
      const { employeeId = user.id, targetRole, targetDepartment, targetTimeline, skillsToDevelop, managerNotes, hrNotes } = body;

      if (employeeId !== user.id) {
        await requireEmployeeAccess(employeeId);
      }

      const aspiration = await db.career_aspirations.upsert({
        where: { employee_id: employeeId },
        update: {
          target_role: targetRole,
          target_department: targetDepartment || null,
          target_timeline: targetTimeline || '1-2 Years',
          skills_to_develop: Array.isArray(skillsToDevelop) ? skillsToDevelop : [],
          manager_notes: managerNotes !== undefined ? managerNotes : undefined,
          hr_notes: hrNotes !== undefined && user.userRole === 'admin' ? hrNotes : undefined,
          last_discussed_at: new Date(),
          updated_at: new Date(),
        },
        create: {
          id: `ASP-${employeeId}-${Date.now().toString(36)}`,
          employee_id: employeeId,
          target_role: targetRole,
          target_department: targetDepartment || null,
          target_timeline: targetTimeline || '1-2 Years',
          skills_to_develop: Array.isArray(skillsToDevelop) ? skillsToDevelop : [],
          manager_notes: managerNotes || null,
          hr_notes: hrNotes && user.userRole === 'admin' ? hrNotes : null,
          last_discussed_at: new Date(),
        },
      });

      await db.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'UPDATE_CAREER_ASPIRATIONS',
          module: 'CareerPath',
          employeeId,
          details: JSON.stringify({ targetRole, targetTimeline }),
        },
      });

      return NextResponse.json({ success: true, data: aspiration });
    }

    // 2. CREATE CAREER PATH (Admin only)
    if (action === 'create_career_path') {
      await requireRole('admin');
      const {
        department,
        currentRoleTitle,
        nextRoleTitle,
        levelOrder,
        minExperienceYears,
        requiredSkillsSummary,
        competenciesSummary,
        performanceExpectation,
        recommendedTrainingIds = [],
      } = body;

      const path = await db.career_paths.create({
        data: {
          organization_id: orgId,
          department,
          current_role_title: currentRoleTitle,
          next_role_title: nextRoleTitle,
          level_order: Number(levelOrder) || 1,
          min_experience_years: Number(minExperienceYears) || 2.0,
          required_skills_summary: requiredSkillsSummary,
          competencies_summary: competenciesSummary,
          performance_expectation: performanceExpectation,
          recommended_training_ids: recommendedTrainingIds,
          is_active: true,
        },
      });

      return NextResponse.json({ success: true, data: path }, { status: 201 });
    }

    // 3. APPLY FOR INTERNAL MOBILITY / TRANSFER (Links to existing Phase 1 Transfer Workflow)
    if (action === 'apply_internal_mobility') {
      const { targetDepartment, targetRole, targetLocation, reason } = body;

      const employee = await db.employee.findUnique({ where: { id: user.id } });
      if (!employee) return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });

      // Create lifecycle change request (Transfer)
      const changeRequest = await db.employee_change_requests.create({
        data: {
          id: `ECR-XFER-${Date.now().toString(36).toUpperCase()}`,
          employee_id: user.id,
          requested_by_id: user.id,
          type: 'Transfer',
          effective_date: new Date(Date.now() + 30 * 86400000),
          status: 'PendingApproval',
          reason: reason || 'Internal career mobility application',
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      await db.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'APPLY_INTERNAL_MOBILITY',
          module: 'Transfer',
          employeeId: user.id,
          details: JSON.stringify({ requestId: changeRequest.id, targetDepartment, targetRole }),
        },
      });

      return NextResponse.json({ success: true, data: changeRequest }, { status: 201 });
    }

    // 4. MANAGE TALENT POOL (HR Admin only)
    if (action === 'create_talent_pool') {
      await requireRole('admin');
      const { name, category, description, isConfidential = true } = body;

      const pool = await db.talent_pools.create({
        data: {
          organization_id: orgId,
          name,
          category: category || 'HighPotential',
          description,
          is_confidential: Boolean(isConfidential),
          created_by_id: user.id,
        },
      });

      return NextResponse.json({ success: true, data: pool }, { status: 201 });
    }

    if (action === 'add_talent_pool_member') {
      await requireRole('admin');
      const { poolId, employeeId, notes } = body;

      const member = await db.talent_pool_members.upsert({
        where: {
          pool_id_employee_id: {
            pool_id: poolId,
            employee_id: employeeId,
          },
        },
        update: { notes },
        create: {
          id: `TPM-${Date.now().toString(36)}`,
          pool_id: poolId,
          employee_id: employeeId,
          added_by_id: user.id,
          notes: notes || 'Nominated to talent pool based on sustained high performance',
        },
      });

      await db.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'ADD_TALENT_POOL_MEMBER',
          module: 'TalentPool',
          employeeId,
          details: JSON.stringify({ poolId, addedById: user.id }),
        },
      });

      return NextResponse.json({ success: true, data: member }, { status: 201 });
    }

    // 5. MANAGE SUCCESSION PLAN (HR Admin only)
    if (action === 'save_succession_plan') {
      await requireRole('admin');
      const { criticalRoleTitle, department, incumbentId, emergencySuccessorId, successors, riskLevel } = body;

      const existing = await db.succession_plans.findFirst({
        where: { critical_role_title: criticalRoleTitle, department },
      });

      let plan;
      if (existing) {
        plan = await db.succession_plans.update({
          where: { id: existing.id },
          data: {
            incumbent_employee_id: incumbentId || existing.incumbent_employee_id,
            emergency_successor_id: emergencySuccessorId || existing.emergency_successor_id,
            successors_json: JSON.stringify(successors || []),
            risk_level: riskLevel || existing.risk_level,
            last_reviewed_at: new Date(),
            updated_at: new Date(),
          },
        });
      } else {
        plan = await db.succession_plans.create({
          data: {
            organization_id: orgId,
            critical_role_title: criticalRoleTitle,
            department,
            incumbent_employee_id: incumbentId || null,
            emergency_successor_id: emergencySuccessorId || null,
            successors_json: JSON.stringify(successors || []),
            risk_level: riskLevel || 'Medium',
            last_reviewed_at: new Date(),
          },
        });
      }

      await db.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'SAVE_SUCCESSION_PLAN',
          module: 'SuccessionPlanning',
          employeeId: user.id,
          details: JSON.stringify({ criticalRoleTitle, riskLevel }),
        },
      });

      return NextResponse.json({ success: true, data: plan });
    }

    // 6. APPROVE PROMOTION RECOMMENDATION (Integrates directly with Phase 1 Promotion Workflow)
    if (action === 'approve_promotion_recommendation') {
      await requireRole('admin');
      const { recommendationId, newRoleTitle, newSalaryAnnual, effectiveDate } = body;

      const rec = await db.performance_recommendations.findUnique({
        where: { id: recommendationId },
        include: {
          employees_performance_recommendations_employee_idToemployees: true,
        },
      });

      if (!rec) return NextResponse.json({ success: false, error: 'Recommendation not found' }, { status: 404 });

      const emp = rec.employees_performance_recommendations_employee_idToemployees;
      const proposedRole = newRoleTitle || (rec.proposed_value as any)?.recommendedRole || `Senior ${emp.roleTitle}`;

      // Update employee role title
      await db.employee.update({
        where: { id: emp.id },
        data: { roleTitle: proposedRole },
      });

      // Update recommendation status
      await db.performance_recommendations.update({
        where: { id: recommendationId },
        data: { status: 'Approved', updated_at: new Date() },
      });

      // If salary revision provided, invoke existing Phase 1 & 2 salary revision workflow
      if (newSalaryAnnual) {
        const currentSalary = await db.salaryStructure.findUnique({ where: { employeeId: emp.id } });
        const oldCtc = currentSalary ? Number(currentSalary.ctcAnnual) : 2400000;
        const newCtc = Number(newSalaryAnnual);

        await db.salaryRevisionHistory.create({
          data: {
            id: `SRH-PROMO-${Date.now().toString(36)}`,
            employeeId: emp.id,
            previousCtcAnnual: oldCtc,
            newCtcAnnual: newCtc,
            previousBasicMonthly: Math.round(oldCtc / 24),
            newBasicMonthly: Math.round(newCtc / 24),
            previousHraMonthly: Math.round(oldCtc / 48),
            newHraMonthly: Math.round(newCtc / 48),
            previousSpecialMonthly: Math.round(oldCtc / 48),
            newSpecialMonthly: Math.round(newCtc / 48),
            effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
            revisionType: 'Promotion',
            reason: `Performance promotion to ${proposedRole}`,
            source: 'PerformanceCycle',
            approvedById: user.id,
            approvedAt: new Date(),
          },
        });
      }

      // Notify employee
      await db.userNotification.create({
        data: {
          id: `notif-${Date.now()}`,
          userId: emp.id,
          title: 'Congratulations on Your Promotion!',
          message: `Your promotion to ${proposedRole} has been approved based on your outstanding performance cycle evaluation.`,
          type: 'Celebration',
          linkUrl: `/employees/${emp.id}`,
        },
      });

      await db.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'APPROVE_PROMOTION_RECOMMENDATION',
          module: 'Promotion',
          employeeId: emp.id,
          details: JSON.stringify({ recommendationId, newRoleTitle: proposedRole }),
        },
      });

      await invalidateEmployeeDirectory();

      return NextResponse.json({ success: true, message: 'Promotion approved and applied successfully' });
    }

    return NextResponse.json({ success: false, error: 'Invalid talent action' }, { status: 400 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error handling talent action:', error);
    return NextResponse.json({ success: false, error: 'Failed to process talent request' }, { status: 500 });
  }
}
