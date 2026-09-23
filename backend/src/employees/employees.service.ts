import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotifyService } from '../common/notifications/notify.service';
import { AuditService } from '../common/audit/audit.service';
import { PermissionsService } from '../permissions/permissions.service';
import { defaultLeaveBalanceRows } from '../leaves/default-balances';

@Injectable()
export class EmployeesService {
  constructor(
    private prisma: PrismaService,
    private notify: NotifyService,
    private audit: AuditService,
    private permissions: PermissionsService,
  ) {}

  async findAll(query: { department?: string; status?: string; search?: string }) {
    const where: any = {};
    if (query.department) where.department = query.department;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { employeeCode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.employee.findMany({
      where,
      select: {
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
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        manager: {
          select: { id: true, name: true, roleTitle: true, avatarUrl: true },
        },
        directReports: {
          select: { id: true, name: true, roleTitle: true, avatarUrl: true },
        },
        leaveBalances: true,
        assignedAssets: true,
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async create(data: any) {
    const count = await this.prisma.employee.count();
    const employeeCode = data.employeeCode || `EMP-${new Date().getUTCFullYear()}-${String(count + 1).padStart(3, '0')}`;

    const created = await this.prisma.employee.create({
      data: {
        id: data.id || undefined,
        employeeCode,
        name: data.name,
        email: data.email,
        roleTitle: data.role || data.roleTitle || 'Employee',
        userRole: data.userRole || 'employee',
        department: data.department || 'General',
        phone: data.phone || null,
        avatarUrl: data.avatar || data.avatarUrl || null,
        status: data.status || 'Active',
        joinDate: data.joinDate || new Date().toISOString().slice(0, 10),
        location: data.location || 'Bengaluru, Karnataka',
        salary: Number(data.salary) || 0,
        managerId: data.managerId || null,
      },
      select: {
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
      },
    });

    // Grant the default annual leave allocation so the new employee's Leave
    // Management page starts with real, zero-used balances.
    await this.prisma.leaveBalance.createMany({
      data: defaultLeaveBalanceRows(created.id, new Date().getUTCFullYear()),
      skipDuplicates: true,
    });

    await this.notify.notifyUser({
      userId: created.id,
      title: 'Welcome to the team! 🎉',
      message: `Welcome aboard, ${created.name}! Your employee ID is ${created.employeeCode}. We are glad to have you join the ${created.department} department as ${created.roleTitle}.`,
      type: 'Onboarding',
      linkUrl: '/dashboard',
    });
    if (created.managerId) {
      await this.notify.notifyUser({
        userId: created.managerId,
        title: 'New team member',
        message: `${created.name} has joined as ${created.roleTitle} in ${created.department} and reports to you.`,
        type: 'Onboarding',
        linkUrl: '/employees',
      });
    }

    return created;
  }

  async update(id: string, data: any) {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException('Employee not found');
    return this.prisma.employee.update({ where: { id }, data });
  }

  /**
   * Feature 3 — Immediate Termination (CEO-only, delegable).
   *
   * Instantly cuts an employee's access and bypasses the normal Exit workflow
   * while still leaving a completed Exit record behind so Finance can run F&F.
   * Gated by hasCeoPermission(actor, 'IMMEDIATE_TERMINATION') — the raw CEO role
   * always passes; an HR Admin passes only while holding an active delegation.
   *
   * In one transaction we: (1) validate the typed name matches server-side,
   * (2) flip status→Terminated + lockedUntil=now (JwtStrategy then 401s the
   * live session on its next request), (3) write a pre-approved, Completed
   * ExitRequest tagged "Terminated", (4) raise Return asset-recovery requests
   * for every assigned asset, (5) record the offboarding + a high-severity
   * audit row flagging CEO-direct vs delegated. Notifications fire after commit.
   */
  async terminate(
    actorId: string,
    employeeId: string,
    body: { reason?: string; confirmationName?: string },
  ) {
    const check = await this.permissions.assertCeoPermission(actorId, 'IMMEDIATE_TERMINATION');

    const reason = (body?.reason ?? '').trim();
    if (!reason) throw new BadRequestException('A termination reason is required.');

    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');

    if (employee.status === 'Terminated' || employee.status === 'Exited') {
      throw new BadRequestException(`${employee.name} is already ${employee.status.toLowerCase()}.`);
    }
    if ((employee.userRole ?? '') === 'ceo') {
      throw new BadRequestException('The CEO account cannot be terminated.');
    }
    if (employeeId === actorId) {
      throw new BadRequestException('You cannot terminate your own account.');
    }

    const typed = (body?.confirmationName ?? '').trim().toLowerCase();
    if (typed !== employee.name.trim().toLowerCase()) {
      throw new BadRequestException('Confirmation name does not match the employee name.');
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const onBehalfOfId = check.viaDelegation ? check.delegatorId ?? null : null;

    await this.prisma.$transaction(async (tx) => {
      // (2) Immediate lockout. A past lockedUntil + Terminated status makes the
      // next authenticated request fail in JwtStrategy (force-logout).
      await tx.employee.update({
        where: { id: employeeId },
        data: { status: 'Terminated', lockedUntil: now },
      });

      // (3) Pre-populated, already-approved Exit record so F&F can proceed
      // without walking the normal notice/approval branches.
      const existingExit = await tx.exitRequest.findFirst({
        where: { employeeId, status: { not: 'Completed' } },
      });
      if (!existingExit) {
        await tx.exitRequest.create({
          data: {
            employeeId,
            resignationDate: today,
            requestedRelievingDate: today,
            approvedRelievingDate: today,
            reasonCategory: 'Terminated',
            reasonDetails: reason,
            managerApproval: 'Approved',
            hrApproval: 'Approved',
            managerApprovedAt: now,
            hrApprovedAt: now,
            noticePeriodDays: 0,
            workflowStage: 'Exited',
            status: 'Completed',
          },
        });
      }

      // (4) Asset recovery — one Return request per currently-assigned asset,
      // processed by IT through the existing reviewAssetRequest flow.
      const assets = await tx.asset.findMany({ where: { assignedToId: employeeId } });
      if (assets.length) {
        let seq = (await tx.assetRequest.count()) + 1;
        for (const asset of assets) {
          let arId = `AR-${String(seq).padStart(3, '0')}`;
          while (await tx.assetRequest.findUnique({ where: { id: arId } })) {
            seq += 1;
            arId = `AR-${String(seq).padStart(3, '0')}`;
          }
          await tx.assetRequest.create({
            data: {
              id: arId,
              type: 'Return',
              status: 'Pending',
              requestedById: employeeId,
              assetId: asset.id,
              category: asset.category,
              reason: `Asset recovery — immediate termination of ${employee.name}`,
              updatedAt: now,
            },
          });
          seq += 1;
        }
      }

      // (5) Offboarding audit-table row (upsert-safe: employeeId is unique).
      await tx.employeeOffboarding.upsert({
        where: { employeeId },
        create: { employeeId, reason, offboardedById: actorId, offboardedAt: now },
        update: { reason, offboardedById: actorId, offboardedAt: now },
      });
    });

    // (5) High-severity audit — flags CEO-direct vs delegated for the trail.
    await this.audit.record({
      action: 'IMMEDIATE_TERMINATION',
      module: 'Employees',
      employeeId,
      actorId,
      onBehalfOfId,
      severity: 'high',
      details: {
        employeeName: employee.name,
        reason,
        viaDelegation: check.viaDelegation,
      },
    });

    // (6) Notifications — manager, the terminated employee, and IT.
    await this.notify.notifyManagerOf(employeeId, {
      title: 'Employee terminated',
      message: `${employee.name} has been terminated with immediate effect. Reason: ${reason}`,
      type: 'Alert',
      linkUrl: `/employees/${employeeId}`,
    });
    await this.notify.notifyUser({
      userId: employeeId,
      title: 'Employment terminated',
      message: 'Your employment has been terminated with immediate effect. Please contact HR for the exit settlement.',
      type: 'Alert',
    });
    await this.notify.notifyDepartment('IT', {
      title: 'Asset recovery required',
      message: `${employee.name} has been terminated. Please recover assigned assets and revoke system access.`,
      type: 'Alert',
      linkUrl: '/assets',
    });

    return { success: true, status: 'Terminated', viaDelegation: check.viaDelegation };
  }

  /**
   * GET /api/employees/:id/360?role=&currentUserId=
   * Aggregated 360° profile consumed by the employee detail page.
   * Access: self, manager, admin.
   */
  async get360(id: string, access?: { role?: string; currentUserId?: string }) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, name: true, roleTitle: true, avatarUrl: true } },
        directReports: { select: { id: true, name: true, roleTitle: true, avatarUrl: true } },
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    if (access && access.role !== 'admin' && access.currentUserId !== id && employee.managerId !== access.currentUserId) {
      throw new ForbiddenException('You do not have permission to view this employee profile');
    }

    const [
      attendanceSummary,
      leaveBalances,
      leaveRequests,
      payslips,
      kras,
      assignedAssets,
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
      feedback,
    ] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where: { employeeId: id },
        orderBy: { date: 'desc' },
        take: 30,
      }),
      this.prisma.leaveBalance.findMany({ where: { employeeId: id } }),
      this.prisma.leaveRequest.findMany({
        where: { employeeId: id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payslip.findMany({
        where: { employeeId: id },
        orderBy: { monthYear: 'desc' },
      }),
      this.prisma.performanceKra.findMany({
        where: { assignedToId: id },
        include: {
          assignedTo: { select: { id: true, name: true } },
          assignedBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.asset.findMany({ where: { assignedToId: id } }),
      this.prisma.employeeDocument.findMany({ where: { employeeId: id } }),
      this.prisma.salaryStructure.findFirst({ where: { employeeId: id, isActive: true } }),
      this.prisma.employeeSkill.findMany({
        where: { employeeId: id },
        include: { skill: true },
      }),
      this.prisma.employeeCourseEnrollment.findMany({
        where: { employeeId: id },
        include: { course: true },
      }),
      this.prisma.employeeBenefitEnrollment.findMany({
        where: { employeeId: id },
        include: { plan: true },
      }),
      this.prisma.exitRequest.findFirst({ where: { employeeId: id } }),
      this.prisma.salaryRevisionHistory.findMany({
        where: { employeeId: id },
        orderBy: { effectiveDate: 'desc' },
      }),
      this.prisma.employeeWarning.findMany({
        where: { employeeId: id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.employee_employment_profiles.findFirst({ where: { employee_id: id } }),
      this.prisma.employee_change_requests.findMany({
        where: { employee_id: id },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.employeeRecognition.findMany({
        where: { receiverId: id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.performanceGoal.findMany({
        where: { owner_employee_id: id },
      }),
      this.prisma.performance_kpis.findMany({ where: { employee_id: id } }),
      this.prisma.performance_review_assignments.findMany({
        where: { employee_id: id },
      }),
      this.prisma.performance_competency_assessments.findMany({
        where: { employee_id: id },
      }),
      this.prisma.performance_improvement_plans.findMany({
        where: { employee_id: id },
      }),
      this.prisma.career_aspirations.findFirst({ where: { employee_id: id } }),
      this.prisma.performance_feedback.findMany({
        where: { recipient_id: id },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    return {
      employee,
      attendanceSummary,
      leaveBalances,
      leaveRequests,
      payslips,
      kras,
      assets: assignedAssets,
      documents,
      salaryStructure: salaryStructure ?? null,
      skills,
      courseEnrollments,
      benefitEnrollments,
      exitRequest: exitRequest ?? null,
      salaryRevisions,
      disciplinaryWarnings,
      employmentProfile: employmentProfile ?? null,
      changeRequests,
      recognitions,
      goals,
      kpis,
      reviewAssignments,
      competencyAssessments,
      pips,
      careerAspirations: careerAspirations ?? null,
      feedback,
    };
  }
}
