import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const employees = await db.employee.findMany({
      orderBy: { id: 'asc' },
    });
    return NextResponse.json({ success: true, data: employees });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const count = await db.employee.count();
    const newId = `EMP-${String(count + 1).padStart(3, '0')}`;
    const randomCode = `EMP-2026-${Math.floor(100 + Math.random() * 900)}`;

    const newEmployee = await db.employee.create({
      data: {
        id: body.id || newId,
        employeeCode: body.employeeCode || randomCode,
        name: body.name,
        email: body.email,
        roleTitle: body.role || body.roleTitle,
        userRole: body.userRole || 'employee',
        department: body.department,
        phone: body.phone,
        avatarUrl: body.avatar || body.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        status: body.status || 'Active',
        joinDate: body.joinDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        location: body.location || 'Bengaluru, Karnataka',
        salary: Number(body.salary) || 0,
        managerId: body.managerId || null,
      },
    });

    return NextResponse.json({ success: true, data: newEmployee });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ success: false, error: 'Failed to create employee' }, { status: 500 });
  }
}
