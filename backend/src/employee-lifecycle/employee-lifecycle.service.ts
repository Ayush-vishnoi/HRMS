import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

@Injectable()
export class EmployeeLifecycleService {
  constructor(private prisma: PrismaService) {}

  async findAll(employeeId?: string) {
    const [candidates, employees, onboardingHistory, offboardingHistory, employmentProfiles, changeRequests, salaryRevisions, bgvRecords, onboardingTasks] =
      await Promise.all([
        this.prisma.recruitmentCandidate.findMany({
          where: { stage: { in: ['Shortlisted', 'Selected', 'Offer'] }, onboarding: null },
          include: { job: { select: { id: true, title: true, department: true, location: true } }, recruitment_offers: { orderBy: { version: 'desc' }, take: 1, include: { document_signatures: true } } },
          orderBy: { updatedAt: 'desc' },
        }),
        this.prisma.employee.findMany({
          select: { id: true, employeeCode: true, name: true, email: true, roleTitle: true, userRole: true, department: true, phone: true, avatarUrl: true, status: true, joinDate: true, location: true, salary: true, managerId: true, manager: { select: { id: true, name: true, employeeCode: true } } },
          orderBy: { name: 'asc' },
        }),
        this.prisma.employeeOnboarding.findMany({
          include: { candidate: { select: { id: true, name: true, email: true, currentRole: true } }, employee: { select: { id: true, employeeCode: true, name: true, email: true, roleTitle: true, department: true } }, onboardedBy: { select: { id: true, name: true, employeeCode: true } }, onboarding_tasks: true, background_verifications: true },
          orderBy: { onboardedAt: 'desc' }, take: 50,
        }),
        this.prisma.employeeOffboarding.findMany({
          include: { employee: { select: { id: true, employeeCode: true, name: true, email: true, roleTitle: true, department: true } }, offboardedBy: { select: { id: true, name: true, employeeCode: true } } },
          orderBy: { offboardedAt: 'desc' }, take: 50,
        }),
        this.prisma.employee_employment_profiles.findMany({ where: employeeId ? { employee_id: employeeId } : {}, orderBy: { created_at: 'desc' } }),
        this.prisma.employee_change_requests.findMany({
          where: employeeId ? { employee_id: employeeId } : {},
          include: { employees_employee_change_requests_employee_idToemployees: { select: { id: true, name: true, employeeCode: true, department: true, roleTitle: true } } },
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.salaryRevisionHistory.findMany({ where: employeeId ? { employeeId } : {}, orderBy: { effectiveDate: 'desc' } }),
        this.prisma.backgroundVerification.findMany({ orderBy: { createdAt: 'desc' } }),
        this.prisma.onboardingTask.findMany({ orderBy: { created_at: 'desc' } }),
      ]);
    return { candidates, employees, onboardingHistory, offboardingHistory, employmentProfiles, changeRequests, salaryRevisions, bgvRecords, onboardingTasks };
  }

  async onboard(user: any, body: any) {
    const { candidateId, name, email, phone, avatarUrl, roleTitle, department, location, joinDate, salary = 0, managerId, userRole = 'employee', probationMonths = 6 } = body;
    const employeeCode = `EMP-${new Date().getUTCFullYear()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const plainPassword = `Hr!${randomBytes(6).toString('base64url')}9a`;
    const passwordHash = await argon2.hash(plainPassword);

    return this.prisma.$transaction(async (tx) => {
      const candidate = await tx.recruitmentCandidate.findUnique({ where: { id: candidateId }, include: { onboarding: true } });
      if (!candidate) throw new Error('Candidate not found.');
      if (candidate.onboarding) throw new Error('Candidate already onboarded.');

      const employee = await tx.employee.create({
        data: { employeeCode, name, email, passwordHash, phone: phone || null, avatarUrl: avatarUrl || DEFAULT_AVATAR, roleTitle, userRole, department, joinDate, location, salary: Number(salary), managerId: managerId || null, status: 'Active' },
      });

      const onboarding = await tx.employeeOnboarding.create({
        data: { candidateId: candidate.id, employeeId: employee.id, onboardedById: user.id, updated_at: new Date() },
      });

      const joinDateTime = new Date(joinDate || new Date());
      const probationEnd = new Date(joinDateTime);
      probationEnd.setMonth(probationEnd.getMonth() + Number(probationMonths));

      await tx.employee_employment_profiles.create({
        data: { id: `emp-prof-${employee.id}`, employee_id: employee.id, date_of_joining: joinDateTime, probation_end_date: probationEnd, lifecycle_status: 'Probation', employment_type: 'Full_Time', work_mode: 'Office', notice_period_days: 60, updated_at: new Date() },
      });

      const defaultTasks = [
        { title: 'Verify Aadhaar / PAN / Identity Documents', owner: 'HR' },
        { title: 'Initiate Education & Employment BGV Check', owner: 'HR' },
        { title: 'Assign Team Buddy & Schedule 1-on-1 Introduction', owner: 'Manager' },
        { title: 'Provision Corporate Laptop, Email & VPN Access', owner: 'IT' },
        { title: 'Bank Account & Statutory Payroll Tax Setup', owner: 'Finance' },
        { title: 'Complete POSH Compliance & Information Security Training', owner: 'Onboarding' },
      ];
      for (const t of defaultTasks) {
        await tx.onboardingTask.create({ data: { onboarding_id: onboarding.id, title: t.title, owner: t.owner as any, status: 'Pending', updated_at: new Date() } });
      }

      const basic = Math.round(Number(salary) * 0.5 / 12);
      const hra = Math.round(Number(salary) * 0.25 / 12);
      const special = Math.max(0, Math.round(Number(salary) / 12) - basic - hra - 1600 - 1250);
      await tx.salaryStructure.upsert({
        where: { employeeId: employee.id },
        update: { ctcAnnual: Number(salary), basicMonthly: basic, hraMonthly: hra, specialAllowanceMonthly: special },
        create: { id: `sal-${employee.id}`, employeeId: employee.id, ctcAnnual: Number(salary), basicMonthly: basic, hraMonthly: hra, conveyanceMonthly: 1600, specialAllowanceMonthly: special, medicalAllowanceMonthly: 1250, pfEmployerMonthly: 1800, pfEmployeeMonthly: 1800, ptMonthly: 200, effectiveFrom: joinDate || new Date().toISOString().split('T')[0] },
      });

      await tx.auditLog.create({ data: { id: `audit-${Date.now()}`, action: 'CREATE', module: 'Onboarding', employeeId: employee.id, details: JSON.stringify({ name: employee.name, code: employee.employeeCode }) } });
      await tx.userNotification.create({ data: { id: `notif-${Date.now()}`, userId: employee.id, title: 'Welcome to the Organization!', message: 'Your employee onboarding profile has been created.', type: 'Celebration', linkUrl: '/employee-lifecycle' } });

      return { employee, onboarding, temporaryPassword: plainPassword };
    });
  }

  async updateTask(taskId: string, status: string) {
    return this.prisma.onboardingTask.update({
      where: { id: taskId },
      data: { status: status as any, completedAt: status === 'Completed' ? new Date() : null, updated_at: new Date() },
    });
  }

  async updateBgv(bgvId: string, status: string, vendorNotes?: string) {
    return this.prisma.backgroundVerification.update({
      where: { id: bgvId },
      data: { status: status as any, vendor_notes: vendorNotes || null, completed_at: status === 'Verified' ? new Date() : null, updated_at: new Date() },
    });
  }

  async probationAction(body: any) {
    const { employeeId, decision, notes, extensionMonths } = body;
    const profile = await this.prisma.employee_employment_profiles.findUnique({ where: { employee_id: employeeId } });
    if (!profile) throw new Error('Employment profile not found');
    const now = new Date();

    if (decision === 'Confirm') {
      const updated = await this.prisma.employee_employment_profiles.update({ where: { employee_id: employeeId }, data: { lifecycle_status: 'Active', confirmation_date: now, updated_at: now } });
      await this.prisma.userNotification.create({ data: { id: `notif-${Date.now()}`, userId: employeeId, title: 'Congratulations on Probation Confirmation!', message: 'Your employment has been confirmed successfully.', type: 'Celebration', linkUrl: '/employees/' + employeeId } });
      return updated;
    }

    if (decision === 'Extend') {
      const currentEnd = profile.probation_end_date ? new Date(profile.probation_end_date) : now;
      const newEnd = new Date(currentEnd);
      newEnd.setMonth(newEnd.getMonth() + Number(extensionMonths || 3));
      const updated = await this.prisma.employee_employment_profiles.update({ where: { employee_id: employeeId }, data: { lifecycle_status: 'Probation', probation_end_date: newEnd, updated_at: now } });
      await this.prisma.userNotification.create({ data: { id: `notif-${Date.now()}`, userId: employeeId, title: 'Probation Period Extended', message: `Your probation has been extended. Reason: ${notes || 'Performance review'}`, type: 'Reminder', linkUrl: '/employee-lifecycle' } });
      return updated;
    }
  }

  async transferRequest(user: any, body: any) {
    const { employeeId, toDepartment, toLocation, toManagerId, effectiveDate, reason } = body;
    const emp = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!emp) throw new Error('Employee not found');

    const changeReq = await this.prisma.employee_change_requests.create({
      data: { id: `CHG-${Date.now().toString(36)}`, employee_id: employeeId, requested_by_id: user.id, type: 'Transfer', status: 'Approved', effective_date: effectiveDate ? new Date(effectiveDate) : new Date(), reason: reason || 'Departmental reorganization', updated_at: new Date() },
    });
    await this.prisma.employee.update({ where: { id: employeeId }, data: { department: toDepartment || emp.department, location: toLocation || emp.location, managerId: toManagerId || emp.managerId } });
    await this.prisma.auditLog.create({ data: { id: `audit-${Date.now()}`, action: 'UPDATE', module: 'Transfer', employeeId, details: JSON.stringify({ fromDept: emp.department, toDept: toDepartment, reason }) } });
    await this.prisma.userNotification.create({ data: { id: `notif-${Date.now()}`, userId: employeeId, title: 'Department / Location Transfer Approved', message: `Your transfer to ${toDepartment || emp.department} is effective from ${effectiveDate}.`, type: 'Approval', linkUrl: '/employees/' + employeeId } });
    return changeReq;
  }

  async promotionRequest(user: any, body: any) {
    const { employeeId, newDesignation, newCtcAnnual, effectiveDate = new Date().toISOString().split('T')[0], reason, source = 'PromotionWorkflow' } = body;
    const emp = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!emp) throw new Error('Employee not found');

    const currentStructure = await this.prisma.salaryStructure.findUnique({ where: { employeeId } });
    const previousCtc = currentStructure?.ctcAnnual ?? Number(emp.salary ?? 0);
    const newCtc = Number(newCtcAnnual) || previousCtc;
    const newBasic = Math.round(newCtc * 0.5 / 12);
    const newHra = Math.round(newCtc * 0.25 / 12);
    const newSpecial = Math.max(0, Math.round(newCtc / 12) - newBasic - newHra - 1600 - 1250);

    return this.prisma.$transaction(async (tx) => {
      await tx.employee.update({ where: { id: employeeId }, data: { roleTitle: newDesignation || emp.roleTitle, salary: newCtc } });
      await tx.salaryStructure.upsert({
        where: { employeeId },
        update: { ctcAnnual: newCtc, basicMonthly: newBasic, hraMonthly: newHra, specialAllowanceMonthly: newSpecial, effectiveFrom: effectiveDate },
        create: { id: `sal-${employeeId}`, employeeId, ctcAnnual: newCtc, basicMonthly: newBasic, hraMonthly: newHra, conveyanceMonthly: 1600, specialAllowanceMonthly: newSpecial, medicalAllowanceMonthly: 1250, pfEmployerMonthly: 1800, pfEmployeeMonthly: 1800, ptMonthly: 200, effectiveFrom: effectiveDate },
      });
      const revision = await tx.salaryRevisionHistory.create({
        data: { id: `rev-${Date.now().toString(36)}`, employeeId, previousCtcAnnual: Number(previousCtc), newCtcAnnual: Number(newCtc), previousBasicMonthly: Number(currentStructure?.basicMonthly ?? 0), newBasicMonthly: newBasic, previousHraMonthly: Number(currentStructure?.hraMonthly ?? 0), newHraMonthly: newHra, previousSpecialMonthly: Number(currentStructure?.specialAllowanceMonthly ?? 0), newSpecialMonthly: newSpecial, effectiveDate, revisionType: 'Promotion', reason: reason || `Promoted to ${newDesignation}`, source, approvedById: user.id, approvedAt: new Date() },
      });
      await tx.auditLog.create({ data: { id: `audit-${Date.now()}`, action: 'UPDATE', module: 'Promotion', employeeId, details: JSON.stringify({ previousRole: emp.roleTitle, newRole: newDesignation, previousCtc, newCtc }) } });
      await tx.userNotification.create({ data: { id: `notif-${Date.now()}`, userId: employeeId, title: 'Congratulations on Your Promotion!', message: `You have been promoted to ${newDesignation}.`, type: 'Celebration', linkUrl: '/employees/' + employeeId } });
      return revision;
    });
  }
}
