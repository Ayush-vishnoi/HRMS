import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
} from '@/lib/auth-session';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId');

    const [courses, enrollments] = await Promise.all([
      db.lmsCourse.findMany({
        include: { modules: { orderBy: { orderIndex: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      }),
      db.employeeCourseEnrollment.findMany({
        where: employeeId ? { employeeId } : {},
        include: { course: { include: { modules: true } } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { courses, enrollments },
    });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching LMS data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch LMS data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body; // action: 'enroll' | 'progress' | 'create_course'

    if (action === 'enroll') {
      const { employeeId, courseId, dueDate } = body;
      const enrollment = await db.employeeCourseEnrollment.upsert({
        where: {
          employeeId_courseId: {
            employeeId,
            courseId,
          },
        },
        update: {
          dueDate: dueDate || '2026-09-30',
        },
        create: {
          id: `ENR-${Date.now().toString(36)}`,
          employeeId,
          courseId,
          dueDate: dueDate || '2026-09-30',
          progressPercentage: 0,
          status: 'Enrolled',
        },
        include: { course: true },
      });
      return NextResponse.json({ success: true, data: enrollment }, { status: 201 });
    }

    if (action === 'progress') {
      const { employeeId, courseId, progressPercentage, scorePercentage } = body;
      const isCompleted = Number(progressPercentage) >= 100;

      const updated = await db.employeeCourseEnrollment.update({
        where: {
          employeeId_courseId: {
            employeeId,
            courseId,
          },
        },
        data: {
          progressPercentage: Math.min(100, Number(progressPercentage)),
          scorePercentage: scorePercentage ? Number(scorePercentage) : undefined,
          status: isCompleted ? 'Completed' : 'InProgress',
          completionDate: isCompleted ? new Date().toISOString().split('T')[0] : null,
          certificateUrl: isCompleted ? `/certificates/cert-${courseId}-${employeeId}.pdf` : null,
        },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: 'Invalid LMS action' }, { status: 400 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error updating LMS data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update LMS data' },
      { status: 500 }
    );
  }
}
