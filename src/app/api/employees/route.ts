import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
  requireRole,
} from '@/lib/auth-session';

const employeeDirectorySelect = {
  id: true,
  employeeCode: true,
  name: true,
  email: true,
  roleTitle: true,
  userRole: true,
  department: true,
  phone: true,
  avatarUrl: true,
  status: true,
  joinDate: true,
  location: true,
  managerId: true,
} as const;

export async function GET() {
  try {
    await requireEmployee();
    const employees = await db.employee.findMany({
      select: employeeDirectorySelect,
      orderBy: { id: 'asc' },
    });
    return NextResponse.json({ success: true, data: employees });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching employees:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireRole('admin');
    const body = await request.json();
    const count = await db.employee.count();
    const newId = `EMP-${String(count + 1).padStart(3, '0')}`;
    const randomCode = `EMP-2026-${Math.floor(100 + Math.random() * 900)}`;

    const newEmployee = await db.employee.create({
      omit: { passwordHash: true },
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
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error creating employee:', error);
    return NextResponse.json({ success: false, error: 'Failed to create employee' }, { status: 500 });
  }
}
