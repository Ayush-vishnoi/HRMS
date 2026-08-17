import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
  requireRole,
} from '@/lib/auth-session';

export async function GET(request: Request) {
  try {
    const user = await requireEmployee();
    const url = new URL(request.url);
    const cycleId = url.searchParams.get('cycleId');
    const departmentId = url.searchParams.get('departmentId');

    // Only HR Admins and Managers have calibration access
    if (user.userRole === 'employee') {
      return NextResponse.json({ success: false, error: 'Access restricted to HR & Reviewers' }, { status: 403 });
    }

    const [sessions, departments, reviewAssignments] = await Promise.all([
      db.performance_calibration_sessions.findMany({
        where: {
          ...(cycleId ? { cycle_id: cycleId } : {}),
          ...(departmentId ? { department_id: departmentId } : {}),
        },
        include: {
          performance_calibration_ratings: {
            include: {
              employees: {
                select: { id: true, name: true, employeeCode: true, department: true, roleTitle: true, avatarUrl: true },
              },
            },
          },
          performance_review_cycles: true,
          departments: true,
        },
        orderBy: { scheduled_at: 'desc' },
      }),
      db.departments.findMany(),
      db.performance_review_assignments.findMany({
        where: {
          review_type: 'Manager',
          ...(cycleId ? { cycle_id: cycleId } : {}),
        },
        include: {
          employees_performance_review_assignments_employee_idToemployees: {
            select: { id: true, name: true, employeeCode: true, department: true, roleTitle: true },
          },
        },
      }),
    ]);

    // Calculate rating distribution stats (1 to 5)
    const ratings = reviewAssignments.map((a) => Number(a.rating || 3.0));
    const distribution = {
      level5: ratings.filter((r) => r >= 4.5).length,
      level4: ratings.filter((r) => r >= 3.8 && r < 4.5).length,
      level3: ratings.filter((r) => r >= 2.8 && r < 3.8).length,
      level2: ratings.filter((r) => r >= 2.0 && r < 2.8).length,
      level1: ratings.filter((r) => r < 2.0).length,
      total: ratings.length,
      average: ratings.length > 0 ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100 : 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        sessions,
        departments,
        distribution,
        assignments: reviewAssignments,
      },
    });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching calibration data:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch calibration sessions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireEmployee();
    await requireRole('admin');
    const body = await request.json();
    const { action } = body;

    const org = await db.organizations.findFirst({ select: { id: true } });
    const orgId = org?.id || 'org_default';

    // 1. CREATE CALIBRATION SESSION
    if (action === 'create_session') {
      const { name, cycleId, departmentId, scheduledAt } = body;

      const sessionId = `CALIB-${Date.now().toString(36).toUpperCase()}`;

      const session = await db.performance_calibration_sessions.create({
        data: {
          id: sessionId,
          organization_id: orgId,
          department_id: departmentId || null,
          cycle_id: cycleId,
          name: name || 'Department Performance Calibration',
          scheduled_at: new Date(scheduledAt || new Date()),
          status: 'Active',
          created_at: new Date(),
        },
      });

      // Populate initial candidate ratings from Manager reviews
      const mgrReviews = await db.performance_review_assignments.findMany({
        where: {
          cycle_id: cycleId,
          review_type: 'Manager',
        },
      });

      for (const rev of mgrReviews) {
        await db.performance_calibration_ratings.upsert({
          where: {
            session_id_employee_id: {
              session_id: session.id,
              employee_id: rev.employee_id,
            },
          },
          update: {},
          create: {
            id: `CALIB-R-${session.id}-${rev.employee_id}`,
            session_id: session.id,
            employee_id: rev.employee_id,
            original_rating: rev.rating || 3.5,
            calibrated_rating: rev.rating || 3.5,
            rationale: 'Initial manager assessment score',
          },
        });
      }

      await db.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'CREATE_CALIBRATION_SESSION',
          module: 'PerformanceCalibration',
          employeeId: user.id,
          details: JSON.stringify({ sessionId: session.id, name, cycleId }),
        },
      });

      return NextResponse.json({ success: true, data: session }, { status: 201 });
    }

    // 2. ADJUST CALIBRATED RATING
    if (action === 'update_calibrated_rating') {
      const { sessionId, employeeId, calibratedRating, rationale } = body;

      const updated = await db.performance_calibration_ratings.upsert({
        where: {
          session_id_employee_id: {
            session_id: sessionId,
            employee_id: employeeId,
          },
        },
        update: {
          calibrated_rating: Number(calibratedRating),
          rationale: rationale || 'Calibrated during committee review',
        },
        create: {
          id: `CALIB-R-${sessionId}-${employeeId}`,
          session_id: sessionId,
          employee_id: employeeId,
          original_rating: Number(calibratedRating),
          calibrated_rating: Number(calibratedRating),
          rationale: rationale || 'Calibrated during committee review',
        },
      });

      // Update corresponding review assignment calibrated rating if session is active
      const session = await db.performance_calibration_sessions.findUnique({ where: { id: sessionId } });
      if (session) {
        await db.performance_review_assignments.updateMany({
          where: {
            cycle_id: session.cycle_id,
            employee_id: employeeId,
            review_type: 'Manager',
          },
          data: {
            rating: Number(calibratedRating),
            updated_at: new Date(),
          },
        });
      }

      await db.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'UPDATE_CALIBRATED_RATING',
          module: 'PerformanceCalibration',
          employeeId,
          details: JSON.stringify({ sessionId, calibratedRating, rationale }),
        },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error handling calibration action:', error);
    return NextResponse.json({ success: false, error: 'Failed to process calibration request' }, { status: 500 });
  }
}
