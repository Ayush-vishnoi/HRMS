import { randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireRole,
} from '@/lib/auth-session';
import { hashCredentialPassword } from '@/lib/credentials';
import { db } from '@/lib/db';

const DEFAULT_AVATAR_URL =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

const onboardSchema = z.object({
  action: z.literal('onboard'),
  candidateId: z.string().trim().min(1).max(100),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(30).optional().nullable(),
  avatarUrl: z.string().trim().url().max(2048).optional().nullable(),
  roleTitle: z.string().trim().min(2).max(100),
  department: z.string().trim().min(2).max(80),
  location: z.string().trim().min(2).max(120),
  joinDate: z.string().trim().min(1).max(30),
  salary: z.coerce.number().finite().min(0).max(1_000_000_000).default(0),
  managerId: z.string().trim().min(1).max(100).optional().nullable(),
  userRole: z.enum(['employee', 'manager']).default('employee'),
});

const offboardSchema = z.object({
  action: z.literal('offboard'),
  employeeId: z.string().trim().min(1).max(100),
  reason: z.string().trim().min(5).max(2000),
});

const mutationSchema = z.discriminatedUnion('action', [onboardSchema, offboardSchema]);

const lifecycleEmployeeSelect = {
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
  salary: true,
  managerId: true,
} as const;

type PrismaErrorLike = {
  code: string;
  meta?: unknown;
};

function isPrismaErrorLike(error: unknown): error is PrismaErrorLike {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  );
}

function getPrismaConflictTargets(error: PrismaErrorLike): string[] {
  if (typeof error.meta !== 'object' || error.meta === null || !('target' in error.meta)) {
    return [];
  }

  const target = error.meta.target;
  return Array.isArray(target) ? target.map(String) : [String(target ?? '')];
}

function generateEmployeeCode() {
  const year = new Date().getUTCFullYear();
  return `EMP-${year}-${randomBytes(5).toString('hex').toUpperCase()}`;
}

function generateTemporaryPassword() {
  const suffix = randomBytes(12).toString('base64url');
  return `Hr!${suffix}9a`;
}

function conflictResponse(error: unknown) {
  if (!isPrismaErrorLike(error) || error.code !== 'P2002') {
    return null;
  }

  const target: string[] = getPrismaConflictTargets(error);

  if (target.some((value) => value.includes('candidate_id'))) {
    return NextResponse.json(
      { success: false, error: 'This candidate has already been onboarded.' },
      { status: 409 },
    );
  }

  if (target.some((value) => value.includes('employee_id'))) {
    return NextResponse.json(
      { success: false, error: 'This employee already has a lifecycle record.' },
      { status: 409 },
    );
  }

  if (target.some((value) => value.includes('email'))) {
    return NextResponse.json(
      { success: false, error: 'An employee with this work email already exists.' },
      { status: 409 },
    );
  }

  return NextResponse.json(
    { success: false, error: 'A duplicate employee record prevented this action.' },
    { status: 409 },
  );
}

export async function GET() {
  try {
    await requireRole('admin');

    const [candidates, employees, onboardingHistory, offboardingHistory] =
      await Promise.all([
        db.recruitmentCandidate.findMany({
          where: {
            stage: 'Shortlisted',
            onboarding: null,
          },
          include: {
            job: {
              select: {
                id: true,
                title: true,
                department: true,
                location: true,
                employmentType: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        }),
        db.employee.findMany({
          where: { status: { not: 'Offboarded' } },
          select: lifecycleEmployeeSelect,
          orderBy: { name: 'asc' },
        }),
        db.employeeOnboarding.findMany({
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                name: true,
                email: true,
                roleTitle: true,
                department: true,
              },
            },
            candidate: {
              select: { id: true, name: true, email: true },
            },
            onboardedBy: {
              select: { id: true, name: true, employeeCode: true },
            },
          },
          orderBy: { onboardedAt: 'desc' },
          take: 50,
        }),
        db.employeeOffboarding.findMany({
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                name: true,
                email: true,
                roleTitle: true,
                department: true,
              },
            },
            offboardedBy: {
              select: { id: true, name: true, employeeCode: true },
            },
          },
          orderBy: { offboardedAt: 'desc' },
          take: 50,
        }),
      ]);

    return NextResponse.json({
      success: true,
      data: { candidates, employees, onboardingHistory, offboardingHistory },
    });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching employee lifecycle data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employee lifecycle data.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const administrator = await requireRole('admin');
    const body = await request.json().catch(() => null);
    const parsed = mutationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid lifecycle request.',
          details: z.treeifyError(parsed.error),
        },
        { status: 400 },
      );
    }

    const input = parsed.data;

    if (input.action === 'offboard') {
      if (input.employeeId === administrator.id) {
        return NextResponse.json(
          { success: false, error: 'You cannot offboard your own account.' },
          { status: 400 },
        );
      }

      const result = await db.$transaction(
        async (transaction: Prisma.TransactionClient) => {
          const employee = await transaction.employee.findUnique({
            where: { id: input.employeeId },
            select: { id: true, status: true, name: true, employeeCode: true },
          });

          if (!employee) return { state: 'missing' as const };
          if (employee.status === 'Offboarded') return { state: 'offboarded' as const };

          const offboarding = await transaction.employeeOffboarding.create({
            data: {
              employeeId: employee.id,
              offboardedById: administrator.id,
              reason: input.reason,
            },
          });

          await transaction.employee.update({
            where: { id: employee.id },
            data: {
              status: 'Offboarded',
              failedLoginAttempts: 0,
              lockedUntil: null,
            },
          });

          const revoked = await transaction.authSession.deleteMany({
            where: { employeeId: employee.id },
          });

          return {
            state: 'ok' as const,
            employee,
            offboarding,
            revokedSessions: revoked.count,
          };
        },
        { isolationLevel: 'Serializable' },
      );

      if (result.state === 'missing') {
        return NextResponse.json(
          { success: false, error: 'Employee not found.' },
          { status: 404 },
        );
      }

      if (result.state === 'offboarded') {
        return NextResponse.json(
          { success: false, error: 'Employee is already offboarded.' },
          { status: 409 },
        );
      }

      return NextResponse.json({ success: true, data: result });
    }

    const normalizedEmail = input.email.toLowerCase();
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashCredentialPassword(temporaryPassword);
    const employeeCode = generateEmployeeCode();

    const result = await db.$transaction(
      async (transaction: Prisma.TransactionClient) => {
        const candidate = await transaction.recruitmentCandidate.findUnique({
          where: { id: input.candidateId },
          select: {
            id: true,
            stage: true,
            onboarding: { select: { id: true } },
          },
        });

        if (!candidate) return { state: 'missing' as const };
        if (candidate.stage !== 'Shortlisted') return { state: 'not-shortlisted' as const };
        if (candidate.onboarding) return { state: 'onboarded' as const };

        if (input.managerId) {
          const manager = await transaction.employee.findFirst({
            where: {
              id: input.managerId,
              status: { not: 'Offboarded' },
              userRole: { in: ['manager', 'admin'] },
            },
            select: { id: true },
          });

          if (!manager) return { state: 'invalid-manager' as const };
        }

        const employee = await transaction.employee.create({
          data: {
            employeeCode,
            name: input.name,
            email: normalizedEmail,
            passwordHash,
            roleTitle: input.roleTitle,
            userRole: input.userRole,
            department: input.department,
            phone: input.phone || null,
            avatarUrl: input.avatarUrl || DEFAULT_AVATAR_URL,
            status: 'Active',
            joinDate: input.joinDate,
            location: input.location,
            salary: input.salary,
            managerId: input.managerId || null,
          },
          select: lifecycleEmployeeSelect,
        });

        const onboarding = await transaction.employeeOnboarding.create({
          data: {
            candidateId: candidate.id,
            employeeId: employee.id,
            onboardedById: administrator.id,
          },
        });

        return { state: 'ok' as const, employee, onboarding };
      },
      { isolationLevel: 'Serializable' },
    );

    if (result.state === 'missing') {
      return NextResponse.json(
        { success: false, error: 'Candidate not found.' },
        { status: 404 },
      );
    }

    if (result.state === 'not-shortlisted') {
      return NextResponse.json(
        { success: false, error: 'Only shortlisted candidates can be onboarded.' },
        { status: 409 },
      );
    }

    if (result.state === 'onboarded') {
      return NextResponse.json(
        { success: false, error: 'This candidate has already been onboarded.' },
        { status: 409 },
      );
    }

    if (result.state === 'invalid-manager') {
      return NextResponse.json(
        { success: false, error: 'Selected manager is not available.' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          employee: result.employee,
          onboarding: result.onboarding,
          credentials: {
            employeeCode: result.employee.employeeCode,
            temporaryPassword,
          },
        },
      },
      {
        status: 201,
        headers: {
          'Cache-Control': 'no-store, private',
        },
      },
    );
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);

    const conflict = conflictResponse(error);
    if (conflict) return conflict;

    if (
      isPrismaErrorLike(error) &&
      (error.code === 'P2034' || error.code === 'P2028')
    ) {
      return NextResponse.json(
        { success: false, error: 'The record changed during this action. Please retry.' },
        { status: 409 },
      );
    }

    console.error('Employee lifecycle action failed:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to complete the lifecycle action.' },
      { status: 500 },
    );
  }
}
