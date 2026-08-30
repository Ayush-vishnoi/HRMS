import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
} from '@/lib/auth-session';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params;
    let currentUser;
    try {
      currentUser = await requireEmployee();
    } catch (error) {
      // Query-parameter identity is a development-only convenience.
      // Production must always resolve identity from a real session.
      if (process.env.NODE_ENV === 'production') throw error;
      const url = new URL(request.url);
      const roleParam = url.searchParams.get('role');
      const role: 'employee' | 'manager' | 'admin' =
        roleParam === 'employee' || roleParam === 'manager' || roleParam === 'admin'
          ? roleParam
          : 'admin';
      const fallbackId = url.searchParams.get('currentUserId') || 'EMP-001';
      currentUser = { id: fallbackId, userRole: role, name: 'User' };
    }

    // Role-based access check: Employee can only see their own 360, Managers can see reports, Admins see all
    if (currentUser.userRole === 'employee' && currentUser.id !== employeeId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to view another employee profile.' },
        { status: 403 }
      );
    }

    // Warnings visibility filter
    const warningFilter = currentUser.userRole === 'employee'
      ? { employeeId, isEmployeeVisible: true }
      : { employeeId };

    const [
      employee,
      attendanceSummary,
      leaveBalances,
      leaveRequests,
      payslips,
      kras,
      assets,
      documents,
      salaryStructure,
      skills,
      courseEnrollments,
      benefitEnrollments,
      exitRequest,
      salaryRevisions,
      disciplinaryWarnings,
      employmentProfile,
      changeRequests,
      recognitions,
      goals,
      kpis,
      reviewAssignments,
      competencyAssessments,
      pips,
      careerAspirations,
      feedbackList,
    ] = await Promise.all([
      db.employee.findUnique({
        where: { id: employeeId },
        include: {
          manager: {
            select: { id: true, name: true, employeeCode: true, roleTitle: true },
          },
          directReports: {
            select: { id: true, name: true, employeeCode: true, roleTitle: true, department: true },
          },
        },
      }),
      db.attendanceRecord.findMany({
        where: { employeeId },
        orderBy: { date: 'desc' },
        take: 30,
      }),
      db.leaveBalance.findMany({
        where: { employeeId },
      }),
      db.leaveRequest.findMany({
        where: { employeeId },
        orderBy: { appliedOn: 'desc' },
        take: 10,
      }),
      db.payslip.findMany({
        where: { employeeId },
        orderBy: { paymentDate: 'desc' },
        take: 12,
      }),
      db.performanceKra.findMany({
        where: { assignedToId: employeeId },
        orderBy: { dueDate: 'asc' },
      }),
      db.asset.findMany({
        where: { assignedToId: employeeId },
      }),
      db.employeeDocument.findMany({
        where: { employeeId },
      }),
      db.salaryStructure.findUnique({
        where: { employeeId },
      }),
      db.employeeSkill.findMany({
        where: { employeeId },
        include: { skill: true },
      }),
      db.employeeCourseEnrollment.findMany({
        where: { employeeId },
        include: { course: true },
      }),
      db.employeeBenefitEnrollment.findMany({
        where: { employeeId },
        include: { plan: true, dependents: true, claims: true },
      }),
      db.exitRequest.findFirst({
        where: { employeeId },
        include: { clearances: true, interview: true, settlement: true, ktTasks: true },
      }),
      db.salaryRevisionHistory.findMany({
        where: { employeeId },
        orderBy: { effectiveDate: 'desc' },
      }),
      db.employeeWarning.findMany({
        where: warningFilter,
        orderBy: { incidentDate: 'desc' },
      }),
      db.employee_employment_profiles.findUnique({
        where: { employee_id: employeeId },
      }),
      db.employee_change_requests.findMany({
        where: { employee_id: employeeId },
        orderBy: { created_at: 'desc' },
      }),
      db.employeeRecognition.findMany({
        where: { receiverId: employeeId },
        orderBy: { createdAt: 'desc' },
      }),
      db.performanceGoal.findMany({
        where: { owner_employee_id: employeeId },
        include: { key_results: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.performance_kpis.findMany({
        where: { employee_id: employeeId },
        orderBy: { created_at: 'desc' },
      }),
      db.performance_review_assignments.findMany({
        where: { employee_id: employeeId },
        include: { performance_review_cycles: true },
        orderBy: { created_at: 'desc' },
      }),
      db.performance_competency_assessments.findMany({
        where: { employee_id: employeeId },
        include: { performance_competencies: true },
        orderBy: { assessed_at: 'desc' },
      }),
      db.performance_improvement_plans.findMany({
        where: { employee_id: employeeId },
        include: { performance_pip_milestones: true },
        orderBy: { created_at: 'desc' },
      }),
      db.career_aspirations.findUnique({
        where: { employee_id: employeeId },
      }),
      db.performance_feedback.findMany({
        where: { recipient_id: employeeId },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Anonymity sanitization
    const sanitizedFeedback = feedbackList.map((fb) => {
      if (fb.is_anonymous && currentUser.userRole !== 'admin' && fb.author_id !== currentUser.id) {
        return {
          ...fb,
          author_id: 'ANONYMOUS',
          content: fb.content,
        };
      }
      return fb;
    });

    return NextResponse.json({
      success: true,
      data: {
        employee: {
          ...employee,
          salary: Number(employee.salary),
        },
        attendanceSummary,
        leaveBalances,
        leaveRequests,
        payslips,
        kras,
        assets,
        documents,
        salaryStructure,
        skills,
        courseEnrollments,
        benefitEnrollments,
        exitRequest,
        salaryRevisions,
        disciplinaryWarnings,
        employmentProfile,
        changeRequests,
        recognitions,
        goals,
        kpis,
        reviewAssignments,
        competencyAssessments,
        pips,
        careerAspirations,
        feedback: sanitizedFeedback,
      },
    });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching employee 360 data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employee 360 data' },
      { status: 500 }
    );
  }
}
