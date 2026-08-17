import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  getCurrentEmployee,
  isAuthAccessError,
  requireEmployee,
} from '@/lib/auth-session';
import { DEFAULT_STATUTORY_CONFIG } from '@/lib/payroll/statutory-engine';
import { DEFAULT_SALARY_COMPONENTS } from '@/lib/payroll/salary-components';

export async function GET(request: Request) {
  try {
    await requireEmployee();

    // Check if custom statutory rules exist in database
    const dbRules = await db.statutoryRule.findMany({
      where: { isActive: true },
      orderBy: { effectiveFrom: 'desc' },
    });

    const dbComponents = await db.salaryComponent.findMany({
      where: { isActive: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        config: DEFAULT_STATUTORY_CONFIG,
        customRules: dbRules,
        salaryComponents: dbComponents.length > 0 ? dbComponents : DEFAULT_SALARY_COMPONENTS,
      },
    });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching statutory rules:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch statutory rules' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireEmployee();
    if (user.userRole !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only admins can modify statutory rules.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      ruleType,
      country = 'IN',
      state = 'ALL',
      financialYear = '2026-27',
      effectiveFrom = new Date().toISOString().split('T')[0],
      effectiveTo,
      rateEmployee = 0,
      rateEmployer = 0,
      ceilingLimit,
      slabsJson = '[]',
      configJson = '{}',
    } = body;

    if (!ruleType || !effectiveFrom) {
      return NextResponse.json({ success: false, error: 'Missing required statutory rule fields.' }, { status: 400 });
    }

    const rule = await db.statutoryRule.create({
      data: {
        id: `stat-${ruleType.toLowerCase()}-${Date.now().toString(36)}`,
        ruleType,
        country,
        state,
        financialYear,
        effectiveFrom,
        effectiveTo,
        rateEmployee: Number(rateEmployee),
        rateEmployer: Number(rateEmployer),
        ceilingLimit: ceilingLimit !== undefined ? Number(ceilingLimit) : null,
        slabsJson: typeof slabsJson === 'string' ? slabsJson : JSON.stringify(slabsJson),
        configJson: typeof configJson === 'string' ? configJson : JSON.stringify(configJson),
        isActive: true,
      },
    });

    // Audit Log
    await db.auditLog.create({
      data: {
        id: `audit-${Date.now()}`,
        action: 'CREATE_STATUTORY_RULE',
        module: 'Payroll',
        employeeId: user.id,
        details: JSON.stringify({ ruleType, state, financialYear, effectiveFrom }),
      },
    });

    return NextResponse.json({ success: true, data: rule }, { status: 201 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error creating statutory rule:', error);
    return NextResponse.json({ success: false, error: 'Failed to create statutory rule' }, { status: 500 });
  }
}
