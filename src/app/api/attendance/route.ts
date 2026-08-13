import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    const records = await db.attendanceRecord.findMany({
      where: employeeId ? { employeeId } : undefined,
      orderBy: { date: 'desc' },
      include: {
        employee: {
          select: { name: true, employeeCode: true, department: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch attendance records' }, { status: 500 });
  }
}

const mapAttendanceStatus = (status?: string): 'OnTime' | 'Late' | 'HalfDay' | 'Absent' | 'OnLeave' => {
  if (!status) return 'OnTime';
  const clean = status.replace(/\s+/g, '').toLowerCase();
  if (clean === 'ontime') return 'OnTime';
  if (clean === 'late') return 'Late';
  if (clean === 'halfday') return 'HalfDay';
  if (clean === 'absent') return 'Absent';
  if (clean === 'onleave') return 'OnLeave';
  return 'OnTime';
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newRecord = await db.attendanceRecord.create({
      data: {
        id: body.id || `ATT-${Date.now()}`,
        employeeId: body.employeeId,
        date: body.date || new Date().toISOString().split('T')[0],
        checkIn: body.checkIn,
        checkOut: body.checkOut || 'In Progress',
        hoursWorked: body.hoursWorked || '0h 0m',
        status: mapAttendanceStatus(body.status),
        location: body.location || 'Office - HQ',
      },
    });

    return NextResponse.json({ success: true, data: newRecord });
  } catch (error) {
    console.error('Error creating attendance record:', error);
    return NextResponse.json({ success: false, error: 'Failed to create attendance record' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, checkOut, hoursWorked, status } = body;

    const updated = await db.attendanceRecord.update({
      where: { id },
      data: {
        ...(checkOut ? { checkOut } : {}),
        ...(hoursWorked ? { hoursWorked } : {}),
        ...(status ? { status: mapAttendanceStatus(status) } : {}),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating attendance record:', error);
    return NextResponse.json({ success: false, error: 'Failed to update attendance record' }, { status: 500 });
  }
}

