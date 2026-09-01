import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
  requireRole,
} from '@/lib/auth-session';
import { notifyAdmins, notifyUser } from '@/lib/notifications/notify';
import {
  CACHE_TTL_SECONDS,
  cacheKeys,
  getCached,
  invalidateEmployeeDirectory,
  setCached,
} from '@/lib/redis';

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

    const cached = await getCached<unknown[]>(cacheKeys.employeesDirectory);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    const employees = await db.employee.findMany({
      select: employeeDirectorySelect,
      orderBy: { id: 'asc' },
    });
    await setCached(cacheKeys.employeesDirectory, employees, CACHE_TTL_SECONDS.employeeDirectory);
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

    await invalidateEmployeeDirectory();

    await notifyUser({
      userId: newEmployee.id,
      title: 'Welcome to MYLOTIC GROUP',
      message: `Welcome aboard, ${newEmployee.name}! Your employee account has been created. Explore your dashboard to get started.`,
      type: 'Employee',
      linkUrl: '/dashboard',
    });

    await notifyAdmins({
      title: 'New Employee Added',
      message: `${newEmployee.name} (${newEmployee.roleTitle || 'New Hire'}) joined the ${newEmployee.department || 'company'} directory.`,
      type: 'Employee',
      linkUrl: '/employees',
    });

    return NextResponse.json({ success: true, data: newEmployee });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error creating employee:', error);
    return NextResponse.json({ success: false, error: 'Failed to create employee' }, { status: 500 });
  }
}
