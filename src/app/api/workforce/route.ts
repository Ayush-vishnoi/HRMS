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

    const [timesheetRecords, attendanceRecords, projects] = await Promise.all([
      db.timesheets.findMany({
        where: employeeId ? { employee_id: employeeId } : {},
        orderBy: { work_date: 'desc' },
        take: 30,
      }),
      db.attendanceRecord.findMany({
        where: employeeId ? { employeeId } : {},
        orderBy: { date: 'desc' },
        take: 30,
      }),
      db.workforce_projects.findMany({
        where: { is_active: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        timesheets: timesheetRecords,
        attendance: attendanceRecords,
        projects,
      },
    });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching workforce data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workforce data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body; // 'log_time'

    if (action === 'log_time') {
      const { employeeId, date, description, loggedMinutes = 480, billableMinutes = 480, projectId } = body;
      const timesheet = await db.timesheets.create({
        data: {
          id: `TS-${Date.now().toString(36)}`,
          employee_id: employeeId,
          work_date: date ? new Date(date) : new Date(),
          logged_minutes: Number(loggedMinutes),
          billable_minutes: Number(billableMinutes),
          description: description || 'General feature development',
          project_id: projectId || null,
          status: 'Approved',
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
      return NextResponse.json({ success: true, data: timesheet }, { status: 201 });
    }

    return NextResponse.json({ success: false, error: 'Invalid workforce action' }, { status: 400 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error in workforce action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process workforce request' },
      { status: 500 }
    );
  }
}
