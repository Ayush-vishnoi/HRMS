import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateEmployeeMonthlyPayroll } from './engines/payroll-engine';
import { generateForm16Statement } from './engines/form16-service';
import { runPayrollCycleReconciliation } from './engines/reconciliation-engine';
import { generatePayrollRegister } from './engines/reports-service';
import { renderPayslipHtml, renderForm16Html } from './engines/pdf-service';
import type { EmployeePayrollInput, TaxRegime, Form16StatementData } from './engines/types';

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  async getPayslips(employeeId?: string, monthYear?: string) {
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (monthYear) where.monthYear = monthYear;

    return this.prisma.payslip.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            name: true,
            department: true,
            roleTitle: true,
            location: true,
          },
        },
      },
    });
  }

  async getCycles(status?: string, cycleId?: string) {
    if (cycleId) {
      return this.prisma.payrollCycle.findUnique({
        where: { id: cycleId },
        include: { items: true },
      });
    }

    const where: any = {};
    if (status) where.status = status;

    return this.prisma.payrollCycle.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }

  async calculateAndSaveCycle(userId: string, body: any) {
    const { monthYear, cycleStartDate, cycleEndDate, country = 'IN', currency = 'INR' } = body;

    if (!monthYear || !cycleStartDate || !cycleEndDate) {
      throw new BadRequestException('Missing required payroll cycle dates.');
    }

    const startDateObj = new Date(cycleStartDate);
    const monthIndex = startDateObj.getMonth() + 1;
    const year = startDateObj.getFullYear();
    const financialYear = monthIndex >= 4 ? `${year}-${String(year + 1).slice(2)}` : `${year - 1}-${String(year).slice(2)}`;

    const employees = await this.prisma.employee.findMany({
      where: { status: { not: 'Offboarded' } },
      select: {
        id: true,
        employeeCode: true,
        name: true,
        department: true,
        roleTitle: true,
        location: true,
        salary: true,
        joinDate: true,
      },
    });

    const salaryStructures = await this.prisma.salaryStructure.findMany({
      where: { isActive: true },
    });
    const salaryMap = new Map(salaryStructures.map((s) => [s.employeeId, s]));

    const revisions = await this.prisma.salaryRevisionHistory.findMany({
      where: {
        effectiveDate: {
          gte: cycleStartDate,
          lte: cycleEndDate,
        },
      },
    });
    const revisionMap = new Map<string, typeof revisions>();
    for (const r of revisions) {
      const list = revisionMap.get(r.employeeId) || [];
      list.push(r);
      revisionMap.set(r.employeeId, list);
    }

    const attendanceRecords = await this.prisma.attendanceRecord.findMany({
      where: {
        date: {
          gte: cycleStartDate,
          lte: cycleEndDate,
        },
      },
    });
    const attendanceMap = new Map<string, typeof attendanceRecords>();
    for (const att of attendanceRecords) {
      const list = attendanceMap.get(att.employeeId) || [];
      list.push(att);
      attendanceMap.set(att.employeeId, list);
    }

    const overtimeRequests = await this.prisma.overtimeRequest.findMany({
      where: {
        status: 'Approved',
        date: {
          gte: new Date(cycleStartDate),
          lte: new Date(cycleEndDate),
        },
      },
    });
    const overtimeMap = new Map<string, number>();
    for (const ot of overtimeRequests) {
      const mins = ot.approved_minutes ?? ot.requested_minutes;
      overtimeMap.set(ot.employeeId, (overtimeMap.get(ot.employeeId) || 0) + mins);
    }

    const variablePays = await this.prisma.variablePayRecord.findMany({
      where: { monthYear, status: 'Approved' },
    });
    const bonusMap = new Map<string, number>();
    const incentiveMap = new Map<string, number>();
    const arrearMap = new Map<string, number>();
    for (const vp of variablePays) {
      if (vp.payType === 'Bonus' || vp.payType === 'PerformanceBonus') {
        bonusMap.set(vp.employeeId, (bonusMap.get(vp.employeeId) || 0) + vp.amount);
      } else if (vp.payType === 'SalesIncentive' || vp.payType === 'Commission') {
        incentiveMap.set(vp.employeeId, (incentiveMap.get(vp.employeeId) || 0) + vp.amount);
      } else if (vp.payType === 'Arrear') {
        arrearMap.set(vp.employeeId, (arrearMap.get(vp.employeeId) || 0) + vp.amount);
      }
    }

    const expenseClaims = await this.prisma.expenseClaim.findMany({
      where: {
        managerStatus: 'Approved',
        financeStatus: 'Approved',
        paymentStatus: 'Pending',
      },
    });
    const expenseMap = new Map<string, number>();
    for (const exp of expenseClaims) {
      const amt = exp.approvedAmount ?? exp.amount;
      expenseMap.set(exp.employeeId, (expenseMap.get(exp.employeeId) || 0) + amt);
    }

    const loans = await this.prisma.employeeLoanAdvance.findMany({
      where: { status: 'Active' },
    });
    const loanMap = new Map<string, typeof loans>();
    for (const l of loans) {
      const list = loanMap.get(l.employeeId) || [];
      list.push(l);
      loanMap.set(l.employeeId, list);
    }

    const taxDeclarations = await this.prisma.employeeTaxDeclaration.findMany({
      where: { financialYear },
    });
    const taxMap = new Map(taxDeclarations.map((t) => [t.employeeId, t]));

    const startDay = new Date(cycleStartDate);
    const endDay = new Date(cycleEndDate);
    const totalCalendarDays = Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    const itemsToCreate = employees.map((emp) => {
      const struct = salaryMap.get(emp.id);
      const annualCtc = struct ? struct.ctcAnnual : Number(emp.salary) || 600000;
      const monthly = annualCtc / 12;

      const basicMonthly = struct?.basicMonthly ?? Math.round(monthly * 0.5);
      const hraMonthly = struct?.hraMonthly ?? Math.round(monthly * 0.25);
      const conveyanceMonthly = struct?.conveyanceMonthly ?? 1600;
      const medicalAllowanceMonthly = struct?.medicalAllowanceMonthly ?? 1250;
      const ltaMonthly = struct?.ltaMonthly ?? 0;
      const statutoryBonusMonthly = struct?.statutoryBonusMonthly ?? 0;
      const specialAllowanceMonthly =
        struct?.specialAllowanceMonthly ??
        Math.max(0, Math.round(monthly - basicMonthly - hraMonthly - conveyanceMonthly - medicalAllowanceMonthly));

      const empAtt = attendanceMap.get(emp.id) || [];
      const absentCount = empAtt.filter((a) => a.status === 'Absent').length;
      const lossOfPayDays = absentCount;
      const presentDays = Math.max(0, totalCalendarDays - lossOfPayDays);

      const empRevs = (revisionMap.get(emp.id) || []).map((r) => ({
        effectiveDate: r.effectiveDate,
        newCtcAnnual: r.newCtcAnnual,
        newBasicMonthly: r.newBasicMonthly,
        newHraMonthly: r.newHraMonthly,
        newSpecialMonthly: r.newSpecialMonthly,
      }));

      const empLoans = (loanMap.get(emp.id) || []).map((l) => ({
        loanId: l.id,
        monthlyEmi: l.monthlyEmi,
        remainingBalance: l.remainingBalance,
        isPaused: l.pausedMonths.includes(monthYear),
      }));

      const empTaxDecl = taxMap.get(emp.id);

      const payrollInput: EmployeePayrollInput = {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: emp.name,
        department: emp.department,
        designation: emp.roleTitle,
        locationState: emp.location?.includes('Karnataka') ? 'Karnataka' : emp.location?.includes('Maharashtra') ? 'Maharashtra' : 'Karnataka',
        isMetro: true,
        joinDate: emp.joinDate,
        panNumber: 'ABCDE1234F',
        bankAccountMasked: '•••• •••• 4921',
        bankIfsc: 'HDFC0001234',
        activeSalaryStructure: {
          ctcAnnual: annualCtc,
          basicMonthly,
          hraMonthly,
          conveyanceMonthly,
          specialAllowanceMonthly,
          medicalAllowanceMonthly,
          ltaMonthly,
          statutoryBonusMonthly,
          pfEmployerMonthly: struct?.pfEmployerMonthly ?? 1800,
          pfEmployeeMonthly: struct?.pfEmployeeMonthly ?? 1800,
          esicEmployerMonthly: struct?.esicEmployerMonthly ?? 0,
          esicEmployeeMonthly: struct?.esicEmployeeMonthly ?? 0,
          ptMonthly: struct?.ptMonthly ?? 200,
          gratuityMonthly: struct?.gratuityMonthly ?? 0,
          effectiveFrom: struct?.effectiveFrom ?? '2026-04-01',
        },
        salaryRevisionsInMonth: empRevs,
        attendance: {
          totalCalendarDays,
          presentDays,
          approvedLeaveDays: 0,
          lossOfPayDays,
        },
        overtime: {
          approvedMinutes: overtimeMap.get(emp.id) || 0,
        },
        variablePay: {
          bonus: bonusMap.get(emp.id) || 0,
          incentives: incentiveMap.get(emp.id) || 0,
          arrears: arrearMap.get(emp.id) || 0,
        },
        expenseClaims: {
          approvedReimbursements: expenseMap.get(emp.id) || 0,
        },
        activeLoans: empLoans,
        taxDeclaration: empTaxDecl
          ? {
              regime: empTaxDecl.regime as 'Old' | 'New',
              financialYear: empTaxDecl.financialYear,
              section80C: empTaxDecl.section80C,
              section80D: empTaxDecl.section80D,
              section80G: empTaxDecl.section80G,
              section80CCD_1B: empTaxDecl.section80CCD_1B,
              section80E: empTaxDecl.section80E,
              section80TTA: empTaxDecl.section80TTA,
              hraExemptionRent: empTaxDecl.hraExemptionRent,
              homeLoanInterest: empTaxDecl.homeLoanInterest,
              otherExemptions: empTaxDecl.otherExemptions,
              declarationStatus: empTaxDecl.declarationStatus,
              isMetroCity: true,
            }
          : undefined,
      };

      const calculated = calculateEmployeeMonthlyPayroll(payrollInput, monthIndex);

      totalGross += calculated.grossEarnings;
      totalDeductions += calculated.totalDeductions;
      totalNet += calculated.netPayable;

      return {
        id: `item-${emp.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: emp.name,
        department: emp.department,
        basic: calculated.basic,
        hra: calculated.hra,
        conveyance: calculated.conveyance,
        specialAllowance: calculated.specialAllowance,
        medicalAllowance: calculated.medicalAllowance,
        lta: calculated.lta,
        bonus: calculated.bonus,
        incentives: calculated.incentives,
        overtimePay: calculated.overtimePay,
        arrears: calculated.arrears,
        reimbursements: calculated.reimbursements,
        grossEarnings: calculated.grossEarnings,
        pfEmployee: calculated.pfEmployee,
        pfEmployer: calculated.pfEmployer,
        esicEmployee: calculated.esicEmployee,
        esicEmployer: calculated.esicEmployer,
        pt: calculated.pt,
        tds: calculated.tds,
        lwf: calculated.lwf,
        loanDeduction: calculated.loanDeduction,
        gratuityProvision: calculated.gratuityProvision,
        taxRegime: calculated.taxRegime,
        payableDays: calculated.payableDays,
        lossOfPayDays: calculated.lossOfPayDays,
        lossOfPayDeduction: calculated.lossOfPayDeduction,
        otherDeductions: calculated.otherDeductions,
        totalDeductions: calculated.totalDeductions,
        netPayable: calculated.netPayable,
        calculationSnapshotJson: calculated.calculationSnapshotJson,
        bankAccountMasked: calculated.bankAccountMasked,
        bankIfsc: calculated.bankIfsc,
        panNumber: calculated.panNumber,
        paymentStatus: 'Pending',
      };
    });

    const cycle = await this.prisma.payrollCycle.upsert({
      where: { monthYear },
      update: {
        cycleStartDate,
        cycleEndDate,
        totalEmployees: employees.length,
        totalGross: Math.round(totalGross),
        totalDeductions: Math.round(totalDeductions),
        totalNetPayable: Math.round(totalNet),
        status: 'Calculated',
        country,
        currency,
        processedById: userId,
        items: {
          deleteMany: {},
          create: itemsToCreate,
        },
      },
      create: {
        id: `cycle-${Date.now().toString(36)}`,
        monthYear,
        cycleStartDate,
        cycleEndDate,
        totalEmployees: employees.length,
        totalGross: Math.round(totalGross),
        totalDeductions: Math.round(totalDeductions),
        totalNetPayable: Math.round(totalNet),
        status: 'Calculated',
        country,
        currency,
        processedById: userId,
        items: {
          create: itemsToCreate,
        },
      },
      include: { items: true },
    });

    return cycle;
  }

  async updateCycleStatus(userId: string, body: any) {
    const { cycleId, action } = body;
    if (!cycleId || !action) {
      throw new BadRequestException('Cycle ID and action are required.');
    }

    const cycle = await this.prisma.payrollCycle.findUnique({
      where: { id: cycleId },
      include: { items: true },
    });

    if (!cycle) throw new NotFoundException('Payroll cycle not found.');

    if (cycle.status === 'Locked' && action !== 'disburse') {
      throw new ForbiddenException('Locked payroll cycles are strictly immutable.');
    }

    let newStatus = cycle.status;
    let lockedAt = cycle.lockedAt;
    let disbursedAt = cycle.disbursedAt;
    let approvedById = cycle.approvedById;

    if (action === 'under_review') {
      newStatus = 'UnderReview';
    } else if (action === 'approve') {
      newStatus = 'Approved';
      approvedById = userId;
    } else if (action === 'lock') {
      newStatus = 'Locked';
      lockedAt = new Date();
    } else if (action === 'disburse') {
      newStatus = 'Disbursed';
      disbursedAt = new Date();

      const paymentDateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      for (const item of cycle.items) {
        await this.prisma.payslip.upsert({
          where: {
            employeeId_monthYear: {
              employeeId: item.employeeId,
              monthYear: cycle.monthYear,
            },
          },
          update: {
            basicSalary: item.basic,
            hra: item.hra,
            conveyance: item.conveyance,
            specialAllowance: item.specialAllowance,
            pfDeduction: item.pfEmployee,
            taxDeduction: item.tds,
            grossEarnings: item.grossEarnings,
            totalDeductions: item.totalDeductions,
            netPayable: item.netPayable,
            paymentDate: paymentDateStr,
            status: 'Paid',
          },
          create: {
            id: `PS-${item.employeeCode}-${Date.now().toString(36)}`,
            employeeId: item.employeeId,
            monthYear: cycle.monthYear,
            basicSalary: item.basic,
            hra: item.hra,
            conveyance: item.conveyance,
            specialAllowance: item.specialAllowance,
            pfDeduction: item.pfEmployee,
            taxDeduction: item.tds,
            grossEarnings: item.grossEarnings,
            totalDeductions: item.totalDeductions,
            netPayable: item.netPayable,
            paymentDate: paymentDateStr,
            status: 'Paid',
          },
        });
      }
    }

    return this.prisma.payrollCycle.update({
      where: { id: cycleId },
      data: {
        status: newStatus,
        lockedAt,
        disbursedAt,
        approvedById,
      },
      include: { items: true },
    });
  }

  async getSalaryStructure(employeeId: string) {
    return this.prisma.salaryStructure.findFirst({
      where: { employeeId, isActive: true },
    });
  }

  async getLoans(employeeId?: string) {
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    return this.prisma.employeeLoanAdvance.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTaxDeclarations(employeeId?: string, financialYear?: string) {
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (financialYear) where.financialYear = financialYear;
    return this.prisma.employeeTaxDeclaration.findMany({
      where,
    });
  }

  async getReconciliation(currentCycleId: string, previousCycleId?: string) {
    const current = await this.prisma.payrollCycle.findUnique({
      where: { id: currentCycleId },
      include: { items: true },
    });
    if (!current) throw new NotFoundException('Current cycle not found');

    return runPayrollCycleReconciliation({
      cycle: current as any,
      items: current.items as any,
    });
  }

  async getReports(monthYear?: string) {
    const items = await this.prisma.payrollCycleItem.findMany({
      where: monthYear ? { cycle: { monthYear } } : {},
      include: { cycle: true },
    });
    return generatePayrollRegister(items as any);
  }

  async getForm16(employeeId: string, financialYear: string) {
    const payslips = await this.prisma.payslip.findMany({
      where: { employeeId },
      include: { employee: true },
    });
    const taxDecl = await this.prisma.employeeTaxDeclaration.findFirst({
      where: { employeeId, financialYear },
    });

    const emp = payslips[0]?.employee || (await this.prisma.employee.findUnique({ where: { id: employeeId } }));
    if (!emp) throw new NotFoundException('Employee not found');

    const struct = await this.prisma.salaryStructure.findFirst({
      where: { employeeId, isActive: true },
    });

    return generateForm16Statement({
      employee: {
        id: emp.id,
        employeeCode: emp.employeeCode,
        name: emp.name,
        department: emp.department,
        roleTitle: emp.roleTitle,
        email: emp.email,
        pan: 'ABCDE1234F',
      },
      financialYear,
      annualSalaryStructure: {
        ctcAnnual: struct?.ctcAnnual ?? (Number(emp.salary) || 600000),
        basicMonthly: struct?.basicMonthly ?? 25000,
        hraMonthly: struct?.hraMonthly ?? 12500,
        conveyanceMonthly: struct?.conveyanceMonthly ?? 1600,
        specialAllowanceMonthly: struct?.specialAllowanceMonthly ?? 10000,
        medicalAllowanceMonthly: struct?.medicalAllowanceMonthly ?? 1250,
        ltaMonthly: struct?.ltaMonthly ?? 0,
      },
      monthlyPayrollItems: payslips.map((p) => ({
        monthYear: p.monthYear,
        grossEarnings: Number(p.grossEarnings),
        basic: Number(p.basicSalary),
        hra: Number(p.hra),
        tds: Number(p.taxDeduction),
        pfEmployee: Number(p.pfDeduction),
        pt: 200,
      })),
      taxDeclaration: taxDecl
        ? {
            regime: (taxDecl.regime as TaxRegime) || 'New',
            section80C: taxDecl.section80C,
            section80D: taxDecl.section80D,
            section80G: taxDecl.section80G,
            section80CCD_1B: taxDecl.section80CCD_1B,
            section80E: taxDecl.section80E,
            section80TTA: taxDecl.section80TTA,
            hraExemptionRent: taxDecl.hraExemptionRent,
            homeLoanInterest: taxDecl.homeLoanInterest,
            otherExemptions: taxDecl.otherExemptions,
          }
        : undefined,
    });
  }
}
