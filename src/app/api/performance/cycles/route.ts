import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  getCurrentEmployee,
  isAuthAccessError,
  requireEmployee,
  requireRole,
} from '@/lib/auth-session';
import { calculateEmployeePerformanceScore } from '@/lib/performance/score-engine';

export async function GET(request: Request) {
  try {
    const user = await requireEmployee();
    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId') || user.id;
    const cycleId = url.searchParams.get('cycleId');

    const [cycles, assignments, feedbackList, recommendations] = await Promise.all([
      db.performance_review_cycles.findMany({
        where: cycleId ? { id: cycleId } : {},
        include: {
          performance_calibration_sessions: true,
          performance_review_assignments: {
            include: {
              employees_performance_review_assignments_employee_idToemployees: {
                select: { id: true, name: true, employeeCode: true, department: true, roleTitle: true, avatarUrl: true },
              },
              employees_performance_review_assignments_reviewer_idToemployees: {
                select: { id: true, name: true, employeeCode: true, roleTitle: true },
              },
            },
          },
        },
        orderBy: { start_date: 'desc' },
      }),
      db.performance_review_assignments.findMany({
        where: user.userRole === 'admin'
          ? {}
          : user.userRole === 'manager'
          ? {
              OR: [
                { reviewer_id: user.id },
                { employee_id: user.id },
                { employees_performance_review_assignments_employee_idToemployees: { managerId: user.id } },
              ],
            }
          : { employee_id: user.id },
        include: {
          performance_review_cycles: true,
          employees_performance_review_assignments_employee_idToemployees: {
            select: { id: true, name: true, employeeCode: true, department: true, roleTitle: true, avatarUrl: true },
          },
          employees_performance_review_assignments_reviewer_idToemployees: {
            select: { id: true, name: true, employeeCode: true, roleTitle: true },
          },
        },
      }),
      db.performance_feedback.findMany({
        where: user.userRole === 'admin'
          ? {}
          : user.userRole === 'manager'
          ? {
              OR: [
                { recipient_id: employeeId },
                { author_id: user.id },
              ],
            }
          : { recipient_id: user.id },
        include: {
          employees_performance_feedback_author_idToemployees: {
            select: { id: true, name: true, employeeCode: true, roleTitle: true },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      db.performance_recommendations.findMany({
        where: user.userRole === 'admin'
          ? {}
          : user.userRole === 'manager'
          ? {
              OR: [
                { recommender_id: user.id },
                { employees_performance_recommendations_employee_idToemployees: { managerId: user.id } },
              ],
            }
          : { employee_id: user.id },
        include: {
          employees_performance_recommendations_employee_idToemployees: {
            select: { id: true, name: true, employeeCode: true, department: true, roleTitle: true },
          },
          employees_performance_recommendations_recommender_idToemployees: {
            select: { id: true, name: true, employeeCode: true },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    // SERVER-SIDE ANONYMITY ENFORCEMENT:
    // If feedback is anonymous and the viewer is the recipient (employee), redact author identity
    const sanitizedFeedback = feedbackList.map((fb) => {
      if (fb.is_anonymous && user.userRole !== 'admin' && fb.author_id !== user.id) {
        return {
          ...fb,
          author_id: 'ANONYMOUS_REVIEWER',
          employees_performance_feedback_author_idToemployees: {
            id: 'ANONYMOUS',
            name: 'Anonymous Colleague',
            employeeCode: 'ANON',
            roleTitle: 'Peer Reviewer',
          },
        };
      }
      return fb;
    });

    return NextResponse.json({
      success: true,
      data: {
        cycles,
        assignments,
        feedback: sanitizedFeedback,
        recommendations,
      },
    });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching performance cycle data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch performance cycles' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireEmployee();
    const body = await request.json();
    const { action } = body;

    // 1. CREATE PERFORMANCE CYCLE (Admin only)
    if (action === 'create_cycle') {
      await requireRole('admin');
      const {
        name,
        description,
        reviewPeriod = 'Quarterly',
        startDate,
        endDate,
        goalSettingDeadline,
        selfReviewDeadline,
        managerReviewDeadline,
        calibrationDate,
        scoringWeights,
      } = body;

      const org = await db.organizations.findFirst({ select: { id: true } });
      const orgId = org?.id || 'org_default';

      const cycleId = `CYCLE-${Date.now().toString(36).toUpperCase()}`;

      const newCycle = await db.performance_review_cycles.create({
        data: {
          id: cycleId,
          organization_id: orgId,
          name,
          description: description || `${reviewPeriod} Performance Assessment & Growth Cycle`,
          review_period: reviewPeriod,
          start_date: new Date(startDate || new Date()),
          end_date: new Date(endDate || new Date(Date.now() + 90 * 86400000)),
          goal_setting_deadline: goalSettingDeadline ? new Date(goalSettingDeadline) : null,
          self_review_deadline: selfReviewDeadline ? new Date(selfReviewDeadline) : null,
          manager_review_deadline: managerReviewDeadline ? new Date(managerReviewDeadline) : null,
          calibration_date: calibrationDate ? new Date(calibrationDate) : null,
          status: 'Draft',
          scoring_weights: scoringWeights || { goals: 40, kpis: 30, competencies: 20, feedback: 10 },
          created_by_id: user.id,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Auto-assign Self and Manager review assignments for all active employees
      const allActiveEmployees = await db.employee.findMany({
        where: { status: 'Active' },
        select: { id: true, managerId: true },
      });

      for (const emp of allActiveEmployees) {
        // Self Review assignment
        await db.performance_review_assignments.upsert({
          where: {
            cycle_id_employee_id_reviewer_id_review_type: {
              cycle_id: cycleId,
              employee_id: emp.id,
              reviewer_id: emp.id,
              review_type: 'Self',
            },
          },
          update: {},
          create: {
            id: `ASGN-SELF-${emp.id}-${Date.now().toString(36)}`,
            cycle_id: cycleId,
            employee_id: emp.id,
            reviewer_id: emp.id,
            review_type: 'Self',
            status: 'Pending',
          },
        });

        // Manager Review assignment if reporting manager exists
        if (emp.managerId) {
          await db.performance_review_assignments.upsert({
            where: {
              cycle_id_employee_id_reviewer_id_review_type: {
                cycle_id: cycleId,
                employee_id: emp.id,
                reviewer_id: emp.managerId,
                review_type: 'Manager',
              },
            },
            update: {},
            create: {
              id: `ASGN-MGR-${emp.id}-${Date.now().toString(36)}`,
              cycle_id: cycleId,
              employee_id: emp.id,
              reviewer_id: emp.managerId,
              review_type: 'Manager',
              status: 'Pending',
            },
          });
        }
      }

      await db.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'CREATE',
          module: 'PerformanceCycle',
          employeeId: user.id,
          details: JSON.stringify({ cycleId, name, reviewPeriod }),
        },
      });

      return NextResponse.json({ success: true, data: newCycle }, { status: 201 });
    }

    // 2. UPDATE CYCLE STAGE / STATUS (Admin only)
    if (action === 'update_cycle_status') {
      await requireRole('admin');
      const { cycleId, status, isLocked } = body;

      const cycle = await db.performance_review_cycles.findUnique({ where: { id: cycleId } });
      if (!cycle) return NextResponse.json({ success: false, error: 'Cycle not found' }, { status: 404 });

      // If already closed, records are immutable unless administrative override is explicitly requested
      if (cycle.status === 'Completed' && cycle.is_locked && status !== 'Draft') {
        return NextResponse.json(
          { success: false, error: 'Performance cycle is closed and locked. Historical reviews are immutable.' },
          { status: 400 }
        );
      }

      const updatedCycle = await db.performance_review_cycles.update({
        where: { id: cycleId },
        data: {
          status: status || cycle.status,
          is_locked: isLocked !== undefined ? Boolean(isLocked) : cycle.is_locked,
          updated_at: new Date(),
        },
      });

      await db.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'UPDATE',
          module: 'PerformanceCycle',
          employeeId: user.id,
          details: JSON.stringify({ cycleId, previousStatus: cycle.status, newStatus: status }),
        },
      });

      return NextResponse.json({ success: true, data: updatedCycle });
    }

    // 3. SUBMIT EMPLOYEE SELF-ASSESSMENT
    if (action === 'submit_self_assessment') {
      const {
        cycleId,
        accomplishments,
        challenges,
        goalProgressSummary,
        strengths,
        improvementAreas,
        trainingNeeds,
        careerAspirations,
        selfRating,
      } = body;

      const cycle = await db.performance_review_cycles.findUnique({ where: { id: cycleId } });
      if (cycle?.is_locked) {
        return NextResponse.json({ success: false, error: 'Cycle is locked. Submissions disabled.' }, { status: 403 });
      }

      const assignment = await db.performance_review_assignments.findFirst({
        where: {
          cycle_id: cycleId,
          employee_id: user.id,
          review_type: 'Self',
        },
      });

      if (assignment?.is_locked) {
        return NextResponse.json({ success: false, error: 'Self-assessment has already been locked.' }, { status: 400 });
      }

      const selfData = {
        accomplishments,
        challenges,
        goalProgressSummary,
        strengths,
        improvementAreas,
        trainingNeeds,
        careerAspirations,
        selfRating: Number(selfRating) || 3.5,
      };

      const updated = await db.performance_review_assignments.upsert({
        where: {
          cycle_id_employee_id_reviewer_id_review_type: {
            cycle_id: cycleId,
            employee_id: user.id,
            reviewer_id: user.id,
            review_type: 'Self',
          },
        },
        update: {
          status: 'Completed',
          rating: Number(selfRating) || 3.5,
          comments: accomplishments,
          self_review_data: selfData,
          is_locked: true,
          submitted_at: new Date(),
          updated_at: new Date(),
        },
        create: {
          id: `ASGN-SELF-${user.id}-${Date.now().toString(36)}`,
          cycle_id: cycleId,
          employee_id: user.id,
          reviewer_id: user.id,
          review_type: 'Self',
          status: 'Completed',
          rating: Number(selfRating) || 3.5,
          comments: accomplishments,
          self_review_data: selfData,
          is_locked: true,
          submitted_at: new Date(),
        },
      });

      await db.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'SUBMIT_SELF_ASSESSMENT',
          module: 'PerformanceReview',
          employeeId: user.id,
          details: JSON.stringify({ cycleId, rating: selfRating }),
        },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    // 4. SUBMIT MANAGER REVIEW
    if (action === 'submit_manager_review') {
      const {
        cycleId,
        employeeId,
        managerRating,
        managerComments,
        strengths,
        developmentAreas,
        goalAssessment,
        kpiAssessment,
        promotionRecommended,
        incrementRecommended,
        recommendedIncrementPct,
        justification,
      } = body;

      // Validate manager permissions
      const targetEmployee = await db.employee.findUnique({ where: { id: employeeId } });
      if (!targetEmployee) return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });

      if (user.userRole !== 'admin' && targetEmployee.managerId !== user.id) {
        return NextResponse.json({ success: false, error: 'Unauthorized. You can only review direct reports.' }, { status: 403 });
      }

      const cycle = await db.performance_review_cycles.findUnique({ where: { id: cycleId } });
      if (cycle?.is_locked) {
        return NextResponse.json({ success: false, error: 'Cycle is locked. Reviews are immutable.' }, { status: 403 });
      }

      // Calculate composite score
      const scoreResult = await calculateEmployeePerformanceScore(employeeId, cycleId);

      const managerData = {
        managerRating: Number(managerRating) || 3.5,
        managerComments,
        strengths,
        developmentAreas,
        goalAssessment,
        kpiAssessment,
        promotionRecommended: Boolean(promotionRecommended),
        incrementRecommended: Boolean(incrementRecommended),
        recommendedIncrementPct: Number(recommendedIncrementPct) || 0,
      };

      const updated = await db.performance_review_assignments.upsert({
        where: {
          cycle_id_employee_id_reviewer_id_review_type: {
            cycle_id: cycleId,
            employee_id: employeeId,
            reviewer_id: user.id,
            review_type: 'Manager',
          },
        },
        update: {
          status: 'Completed',
          rating: Number(managerRating) || 3.5,
          comments: managerComments,
          manager_review_data: managerData,
          calculated_score: scoreResult.finalRating5,
          score_breakdown: scoreResult as any,
          is_locked: true,
          submitted_at: new Date(),
          updated_at: new Date(),
        },
        create: {
          id: `ASGN-MGR-${employeeId}-${Date.now().toString(36)}`,
          cycle_id: cycleId,
          employee_id: employeeId,
          reviewer_id: user.id,
          review_type: 'Manager',
          status: 'Completed',
          rating: Number(managerRating) || 3.5,
          comments: managerComments,
          manager_review_data: managerData,
          calculated_score: scoreResult.finalRating5,
          score_breakdown: scoreResult as any,
          is_locked: true,
          submitted_at: new Date(),
        },
      });

      // Auto-create promotion / increment recommendations if flagged by manager
      if (promotionRecommended) {
        await db.performance_recommendations.create({
          data: {
            id: `REC-PROMO-${Date.now().toString(36)}`,
            employee_id: employeeId,
            recommender_id: user.id,
            cycle_id: cycleId,
            type: 'Promotion',
            status: 'Submitted',
            justification: justification || managerComments || 'Manager recommends promotion based on cycle evaluation.',
            proposed_value: { recommendedRole: `Senior ${targetEmployee.roleTitle}` },
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      }

      if (incrementRecommended) {
        await db.performance_recommendations.create({
          data: {
            id: `REC-INCR-${Date.now().toString(36)}`,
            employee_id: employeeId,
            recommender_id: user.id,
            cycle_id: cycleId,
            type: 'Increment',
            status: 'Submitted',
            justification: justification || managerComments || 'Manager recommends merit salary revision.',
            proposed_value: { incrementPercentage: Number(recommendedIncrementPct) || 10 },
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      }

      await db.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'SUBMIT_MANAGER_REVIEW',
          module: 'PerformanceReview',
          employeeId,
          details: JSON.stringify({ reviewerId: user.id, cycleId, rating: managerRating }),
        },
      });

      return NextResponse.json({ success: true, data: updated, scoreResult });
    }

    // 5. SUBMIT 360 / PEER FEEDBACK (With optional true anonymity)
    if (action === 'submit_feedback') {
      const { recipientId, cycleId, content, rating, categories, isAnonymous, isPrivate } = body;

      const fb = await db.performance_feedback.create({
        data: {
          id: `FB-${Date.now().toString(36)}`,
          author_id: user.id,
          recipient_id: recipientId,
          cycle_id: cycleId || null,
          review_type: 'Peer',
          content: content || 'Provides strong team support and cross-functional collaboration.',
          rating: rating ? Number(rating) : 4.0,
          categories: categories || { collaboration: 4, technical: 4, communication: 4 },
          is_anonymous: Boolean(isAnonymous),
          private: Boolean(isPrivate),
          created_at: new Date(),
        },
      });

      await db.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'SUBMIT_PEER_FEEDBACK',
          module: 'PerformanceFeedback',
          employeeId: recipientId,
          details: JSON.stringify({ isAnonymous: Boolean(isAnonymous), cycleId }),
        },
      });

      return NextResponse.json({ success: true, data: fb }, { status: 201 });
    }

    return NextResponse.json({ success: false, error: 'Invalid cycle action' }, { status: 400 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error processing performance cycle action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process cycle request' },
      { status: 500 }
    );
  }
}
