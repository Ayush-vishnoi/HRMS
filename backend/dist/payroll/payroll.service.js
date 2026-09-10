"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notify_service_1 = require("../common/notifications/notify.service");
const payroll_engine_1 = require("./engines/payroll-engine");
const form16_service_1 = require("./engines/form16-service");
const reconciliation_engine_1 = require("./engines/reconciliation-engine");
const reports_service_1 = require("./engines/reports-service");
const pdf_service_1 = require("./engines/pdf-service");
const statutory_engine_1 = require("./engines/statutory-engine");
const salary_components_1 = require("./salary-components");
const MONTH_NAMES = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
];
let PayrollService = class PayrollService {
    prisma;
    notify;
    constructor(prisma, notify) {
        this.prisma = prisma;
        this.notify = notify;
    }
    async getPayslips(employeeId, monthYear) {
        const where = {};
        if (employeeId)
            where.employeeId = employeeId;
        if (monthYear)
            where.monthYear = monthYear;
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
    async getCycles(status, cycleId) {
        if (cycleId) {
            return this.prisma.payrollCycle.findUnique({
                where: { id: cycleId },
                include: { items: true },
            });
        }
        const where = {};
        if (status)
            where.status = status;
        return this.prisma.payrollCycle.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { items: true },
        });
    }
    async calculateAndSaveCycle(userId, body) {
        const { monthYear, cycleStartDate, cycleEndDate, country = 'IN', currency = 'INR' } = body;
        if (!monthYear || !cycleStartDate || !cycleEndDate) {
            throw new common_1.BadRequestException('Missing required payroll cycle dates.');
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
        const revisionMap = new Map();
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
        const attendanceMap = new Map();
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
        const overtimeMap = new Map();
        for (const ot of overtimeRequests) {
            const mins = ot.approved_minutes ?? ot.requested_minutes;
            overtimeMap.set(ot.employeeId, (overtimeMap.get(ot.employeeId) || 0) + mins);
        }
        const variablePays = await this.prisma.variablePayRecord.findMany({
            where: { monthYear, status: 'Approved' },
        });
        const bonusMap = new Map();
        const incentiveMap = new Map();
        const arrearMap = new Map();
        for (const vp of variablePays) {
            if (vp.payType === 'Bonus' || vp.payType === 'PerformanceBonus') {
                bonusMap.set(vp.employeeId, (bonusMap.get(vp.employeeId) || 0) + vp.amount);
            }
            else if (vp.payType === 'SalesIncentive' || vp.payType === 'Commission') {
                incentiveMap.set(vp.employeeId, (incentiveMap.get(vp.employeeId) || 0) + vp.amount);
            }
            else if (vp.payType === 'Arrear') {
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
        const expenseMap = new Map();
        for (const exp of expenseClaims) {
            const amt = exp.approvedAmount ?? exp.amount;
            expenseMap.set(exp.employeeId, (expenseMap.get(exp.employeeId) || 0) + amt);
        }
        const loans = await this.prisma.employeeLoanAdvance.findMany({
            where: { status: 'Active' },
        });
        const loanMap = new Map();
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
            const specialAllowanceMonthly = struct?.specialAllowanceMonthly ??
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
            const payrollInput = {
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
                        regime: empTaxDecl.regime,
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
            const calculated = (0, payroll_engine_1.calculateEmployeeMonthlyPayroll)(payrollInput, monthIndex);
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
    async updateCycleStatus(userId, body) {
        const { cycleId, action } = body;
        if (!cycleId || !action) {
            throw new common_1.BadRequestException('Cycle ID and action are required.');
        }
        const cycle = await this.prisma.payrollCycle.findUnique({
            where: { id: cycleId },
            include: { items: true },
        });
        if (!cycle)
            throw new common_1.NotFoundException('Payroll cycle not found.');
        if (cycle.status === 'Locked' && action !== 'disburse') {
            throw new common_1.ForbiddenException('Locked payroll cycles are strictly immutable.');
        }
        let newStatus = cycle.status;
        let lockedAt = cycle.lockedAt;
        let disbursedAt = cycle.disbursedAt;
        let approvedById = cycle.approvedById;
        if (action === 'under_review') {
            newStatus = 'UnderReview';
        }
        else if (action === 'approve') {
            newStatus = 'Approved';
            approvedById = userId;
        }
        else if (action === 'lock') {
            newStatus = 'Locked';
            lockedAt = new Date();
        }
        else if (action === 'disburse') {
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
            const paidEmployeeIds = cycle.items.map((item) => item.employeeId);
            if (paidEmployeeIds.length > 0) {
                await this.notify.notifyUsers(paidEmployeeIds, {
                    title: 'Salary credited',
                    message: `Your salary for ${cycle.monthYear} has been credited. Your payslip is now available.`,
                    type: 'Payroll',
                    linkUrl: '/payroll',
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
    async getSalaryStructure(employeeId) {
        return this.prisma.salaryStructure.findFirst({
            where: { employeeId, isActive: true },
        });
    }
    async getLoans(employeeId) {
        const where = {};
        if (employeeId)
            where.employeeId = employeeId;
        return this.prisma.employeeLoanAdvance.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
    }
    async getTaxDeclarations(employeeId, financialYear) {
        const where = {};
        if (employeeId)
            where.employeeId = employeeId;
        if (financialYear)
            where.financialYear = financialYear;
        if (employeeId) {
            return this.prisma.employeeTaxDeclaration.findFirst({
                where,
                orderBy: { updatedAt: 'desc' },
            });
        }
        return this.prisma.employeeTaxDeclaration.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
        });
    }
    async saveTaxDeclaration(user, body) {
        const { employeeId, financialYear, regime = 'New', section80C = 0, section80D = 0, section80G = 0, section80CCD_1B = 0, section80E = 0, section80TTA = 0, hraExemptionRent = 0, homeLoanInterest = 0, otherExemptions = 0, otherDeductionsTotal = 0, proofUrls = [], } = body ?? {};
        if (!financialYear) {
            throw new common_1.BadRequestException('Financial year is required.');
        }
        if (employeeId && employeeId !== user.id && user.userRole !== 'admin' && user.userRole !== 'manager') {
            throw new common_1.ForbiddenException('You can only submit your own tax declaration.');
        }
        const targetEmployeeId = employeeId || user.id;
        const proofUrlList = Array.isArray(proofUrls)
            ? proofUrls.filter((u) => typeof u === 'string')
            : [];
        const declaration = await this.prisma.employeeTaxDeclaration.upsert({
            where: {
                employeeId_financialYear: {
                    employeeId: targetEmployeeId,
                    financialYear,
                },
            },
            update: {
                regime,
                section80C: Number(section80C),
                section80D: Number(section80D),
                section80G: Number(section80G),
                section80CCD_1B: Number(section80CCD_1B),
                section80E: Number(section80E),
                section80TTA: Number(section80TTA),
                hraExemptionRent: Number(hraExemptionRent),
                homeLoanInterest: Number(homeLoanInterest),
                otherExemptions: Number(otherExemptions),
                otherDeductionsTotal: Number(otherDeductionsTotal),
                proofUrls: proofUrlList,
                declarationStatus: 'Submitted',
                verifiedByAdminId: null,
                verificationRemarks: null,
                rejectionReason: null,
                verifiedAt: null,
            },
            create: {
                employeeId: targetEmployeeId,
                financialYear,
                regime,
                section80C: Number(section80C),
                section80D: Number(section80D),
                section80G: Number(section80G),
                section80CCD_1B: Number(section80CCD_1B),
                section80E: Number(section80E),
                section80TTA: Number(section80TTA),
                hraExemptionRent: Number(hraExemptionRent),
                homeLoanInterest: Number(homeLoanInterest),
                otherExemptions: Number(otherExemptions),
                otherDeductionsTotal: Number(otherDeductionsTotal),
                declarationStatus: 'Submitted',
                proofUrls: proofUrlList,
            },
        });
        return declaration;
    }
    async verifyTaxDeclaration(user, body) {
        const { id, declarationStatus, verificationRemarks } = body ?? {};
        if (!id) {
            throw new common_1.BadRequestException('Declaration ID is required.');
        }
        if (user.userRole !== 'admin' && user.userRole !== 'manager') {
            throw new common_1.ForbiddenException('Only admins and managers can verify tax declarations.');
        }
        if (declarationStatus !== 'Approved' && declarationStatus !== 'Rejected') {
            throw new common_1.BadRequestException('declarationStatus must be "Approved" or "Rejected".');
        }
        const existing = await this.prisma.employeeTaxDeclaration.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Tax declaration not found.');
        const updated = await this.prisma.employeeTaxDeclaration.update({
            where: { id },
            data: {
                declarationStatus,
                verificationRemarks: verificationRemarks ?? null,
                verifiedByAdminId: user.id,
                verifiedAt: new Date(),
                rejectionReason: declarationStatus === 'Rejected'
                    ? verificationRemarks || 'Declaration rejected after review.'
                    : null,
            },
        });
        await this.prisma.userNotification.create({
            data: {
                id: `notif-${Date.now()}`,
                userId: existing.employeeId,
                title: declarationStatus === 'Approved'
                    ? 'Tax Declaration Approved'
                    : 'Tax Declaration Rejected',
                message: declarationStatus === 'Approved'
                    ? `Your ${existing.financialYear} tax declaration has been approved.`
                    : `Your ${existing.financialYear} tax declaration was rejected. ${verificationRemarks || ''}`.trim(),
                type: 'Approval',
                linkUrl: '/payroll',
            },
        });
        await this.prisma.auditLog.create({
            data: {
                id: `audit-${Date.now()}`,
                action: declarationStatus === 'Approved'
                    ? 'APPROVE_TAX_DECLARATION'
                    : 'REJECT_TAX_DECLARATION',
                module: 'Payroll',
                employeeId: existing.employeeId,
                details: JSON.stringify({
                    declarationId: id,
                    financialYear: existing.financialYear,
                    verifiedBy: user.id,
                    remarks: verificationRemarks ?? null,
                }),
            },
        });
        return updated;
    }
    async getReconciliation(currentCycleId, previousCycleId) {
        const current = await this.prisma.payrollCycle.findUnique({
            where: { id: currentCycleId },
            include: { items: true },
        });
        if (!current)
            throw new common_1.NotFoundException('Current cycle not found');
        return (0, reconciliation_engine_1.runPayrollCycleReconciliation)({
            cycle: current,
            items: current.items,
        });
    }
    async runReconciliation(user, body) {
        const { cycleId, previousCycleId } = body ?? {};
        if (!cycleId) {
            throw new common_1.BadRequestException('Cycle ID is required.');
        }
        if (user.userRole !== 'admin' && user.userRole !== 'manager') {
            throw new common_1.ForbiddenException('Only admins and managers can run payroll reconciliation.');
        }
        const summary = await this.getReconciliation(cycleId, previousCycleId);
        await this.prisma.payrollReconciliationRecord.upsert({
            where: { cycleId },
            update: {
                monthYear: summary.monthYear,
                status: summary.status,
                totalEmployees: summary.totalEmployees,
                totalGross: summary.totalGross,
                totalDeductions: summary.totalDeductions,
                totalNet: summary.totalNet,
                totalDisbursed: summary.totalDisbursed,
                discrepanciesCount: summary.discrepanciesCount,
                anomaliesJson: JSON.stringify(summary.anomalies),
            },
            create: {
                cycleId,
                monthYear: summary.monthYear,
                status: summary.status,
                totalEmployees: summary.totalEmployees,
                totalGross: summary.totalGross,
                totalDeductions: summary.totalDeductions,
                totalNet: summary.totalNet,
                totalDisbursed: summary.totalDisbursed,
                discrepanciesCount: summary.discrepanciesCount,
                anomaliesJson: JSON.stringify(summary.anomalies),
            },
        });
        await this.prisma.auditLog.create({
            data: {
                id: `audit-${Date.now()}`,
                action: 'RUN_PAYROLL_RECONCILIATION',
                module: 'Payroll',
                employeeId: user.id,
                details: JSON.stringify({
                    cycleId,
                    status: summary.status,
                    discrepanciesCount: summary.discrepanciesCount,
                }),
            },
        });
        return summary;
    }
    async getReports(type, monthYear) {
        const items = await this.prisma.payrollCycleItem.findMany({
            where: monthYear ? { cycle: { monthYear } } : {},
            include: { cycle: true },
        });
        const reportType = (type || 'register').toLowerCase();
        if (reportType === 'pf_ecr')
            return (0, reports_service_1.generatePfEcrReport)(items);
        if (reportType === 'esic')
            return (0, reports_service_1.generateEsicReturnReport)(items);
        if (reportType === 'department')
            return (0, reports_service_1.generateDepartmentCostingReport)(items);
        return (0, reports_service_1.generatePayrollRegister)(items);
    }
    async getForm16(employeeId, financialYear) {
        const payslips = await this.prisma.payslip.findMany({
            where: { employeeId },
            include: { employee: true },
        });
        const taxDecl = await this.prisma.employeeTaxDeclaration.findFirst({
            where: { employeeId, financialYear },
        });
        const emp = payslips[0]?.employee || (await this.prisma.employee.findUnique({ where: { id: employeeId } }));
        if (!emp)
            throw new common_1.NotFoundException('Employee not found');
        const struct = await this.prisma.salaryStructure.findFirst({
            where: { employeeId, isActive: true },
        });
        return (0, form16_service_1.generateForm16Statement)({
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
                    regime: taxDecl.regime || 'New',
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
    async getPayrollOverview(user, view) {
        const isAllEmployeesView = view === 'all' && (user.userRole === 'admin' || user.userRole === 'manager');
        const whereClause = isAllEmployeesView ? {} : { employeeId: user.id };
        const [payslips, employee, cycleItems] = await Promise.all([
            this.prisma.payslip.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                include: {
                    employee: {
                        select: { id: true, name: true, employeeCode: true, department: true, salary: true, roleTitle: true },
                    },
                },
            }),
            this.prisma.employee.findUnique({
                where: { id: user.id },
                select: { salary: true, name: true, employeeCode: true, department: true, roleTitle: true },
            }),
            this.prisma.payrollCycleItem.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                include: {
                    cycle: { select: { monthYear: true, status: true } },
                },
            }),
        ]);
        const itemMap = new Map();
        for (const item of cycleItems) {
            itemMap.set(`${item.employeeId}_${item.cycle.monthYear}`, item);
        }
        const formattedPayslips = payslips.map((slip) => {
            const enrichedItem = itemMap.get(`${slip.employeeId}_${slip.monthYear}`);
            return {
                id: slip.id,
                employeeId: slip.employeeId,
                employeeName: slip.employee?.name || employee?.name || 'Ayush Vishnoi',
                employeeCode: slip.employee?.employeeCode || employee?.employeeCode || 'EMP-2026-089',
                department: slip.employee?.department || employee?.department || 'Engineering',
                roleTitle: slip.employee?.roleTitle || employee?.roleTitle || 'Developer',
                monthYear: slip.monthYear,
                basicSalary: Number(slip.basicSalary),
                hra: Number(slip.hra),
                conveyance: Number(slip.conveyance),
                specialAllowance: Number(slip.specialAllowance),
                medicalAllowance: enrichedItem?.medicalAllowance ?? 1250,
                lta: enrichedItem?.lta ?? 0,
                bonus: enrichedItem?.bonus ?? 0,
                incentives: enrichedItem?.incentives ?? 0,
                overtimePay: enrichedItem?.overtimePay ?? 0,
                arrears: enrichedItem?.arrears ?? 0,
                reimbursements: enrichedItem?.reimbursements ?? 0,
                pfDeduction: Number(slip.pfDeduction),
                esicDeduction: enrichedItem?.esicEmployee ?? 0,
                ptDeduction: enrichedItem?.pt ?? 200,
                taxDeduction: Number(slip.taxDeduction),
                lwfDeduction: enrichedItem?.lwf ?? 0,
                loanDeduction: enrichedItem?.loanDeduction ?? 0,
                lossOfPayDeduction: enrichedItem?.lossOfPayDeduction ?? 0,
                payableDays: enrichedItem?.payableDays ?? 30,
                lossOfPayDays: enrichedItem?.lossOfPayDays ?? 0,
                grossEarnings: Number(slip.grossEarnings),
                totalDeductions: Number(slip.totalDeductions),
                netPayable: Number(slip.netPayable),
                pfEmployer: enrichedItem?.pfEmployer ?? 1800,
                esicEmployer: enrichedItem?.esicEmployer ?? 0,
                gratuityProvision: enrichedItem?.gratuityProvision ?? 0,
                taxRegime: enrichedItem?.taxRegime ?? 'New',
                bankAccountMasked: enrichedItem?.bankAccountMasked ?? '•••• •••• 4921',
                bankIfsc: enrichedItem?.bankIfsc ?? 'HDFC0001234',
                panNumber: enrichedItem?.panNumber ?? 'ABCDE1234F',
                paymentDate: slip.paymentDate,
                status: slip.status,
            };
        });
        const userPayslips = formattedPayslips.filter((p) => p.employeeId === user.id);
        const ytdGross = userPayslips.reduce((sum, p) => sum + p.grossEarnings, 0);
        const ytdTax = userPayslips.reduce((sum, p) => sum + p.taxDeduction, 0);
        const ytdPf = userPayslips.reduce((sum, p) => sum + p.pfDeduction, 0);
        const totalDisbursed = formattedPayslips.reduce((sum, p) => sum + p.netPayable, 0);
        return {
            payslips: formattedPayslips,
            annualCtc: employee ? Number(employee.salary) : 550000,
            totalDisbursed,
            ytd: { ytdGross, ytdTax, ytdPf },
            recordCount: formattedPayslips.length,
        };
    }
    async getSalaryStructures(employeeId) {
        if (employeeId) {
            const [structure, revisions] = await Promise.all([
                this.prisma.salaryStructure.findUnique({ where: { employeeId } }),
                this.prisma.salaryRevisionHistory.findMany({
                    where: { employeeId },
                    orderBy: { effectiveDate: 'desc' },
                }),
            ]);
            return { structure, revisions };
        }
        const [structures, employees, revisions] = await Promise.all([
            this.prisma.salaryStructure.findMany(),
            this.prisma.employee.findMany({
                where: { status: { not: 'Offboarded' } },
                select: {
                    id: true,
                    name: true,
                    employeeCode: true,
                    department: true,
                    roleTitle: true,
                    salary: true,
                },
            }),
            this.prisma.salaryRevisionHistory.findMany({
                orderBy: { effectiveDate: 'desc' },
                take: 100,
            }),
        ]);
        const structureMap = new Map(structures.map((s) => [s.employeeId, s]));
        const merged = employees.map((emp) => {
            const s = structureMap.get(emp.id);
            const ctcAnnual = s?.ctcAnnual ?? Number(emp.salary);
            const monthly = ctcAnnual / 12;
            const basic = s?.basicMonthly ?? Math.round(monthly * 0.5);
            const hra = s?.hraMonthly ?? Math.round(monthly * 0.25);
            const conv = s?.conveyanceMonthly ?? 1600;
            const med = s?.medicalAllowanceMonthly ?? 1250;
            const special = s?.specialAllowanceMonthly ?? Math.max(0, Math.round(monthly - basic - hra - conv - med));
            const pf = s?.pfEmployeeMonthly ?? 1800;
            const pt = s?.ptMonthly ?? 200;
            return {
                id: s?.id ?? `sal-${emp.id}`,
                employeeId: emp.id,
                employeeName: emp.name,
                employeeCode: emp.employeeCode,
                department: emp.department,
                roleTitle: emp.roleTitle,
                ctcAnnual,
                basicMonthly: basic,
                hraMonthly: hra,
                conveyanceMonthly: conv,
                specialAllowanceMonthly: special,
                medicalAllowanceMonthly: med,
                pfEmployeeMonthly: pf,
                ptMonthly: pt,
                effectiveFrom: s?.effectiveFrom ?? '2026-04-01',
                isActive: s?.isActive ?? true,
            };
        });
        return { success: true, data: merged, revisions };
    }
    async saveSalaryStructure(user, body) {
        const { employeeId, ctcAnnual, basicMonthly, hraMonthly, conveyanceMonthly = 1600, specialAllowanceMonthly, medicalAllowanceMonthly = 1250, pfEmployeeMonthly = 1800, ptMonthly = 200, effectiveFrom = new Date().toISOString().split('T')[0], revisionType = 'MarketAdjustment', reason = 'Salary structure adjustment and CTC revision', source = 'CompensationEngine', } = body ?? {};
        if (!employeeId || !ctcAnnual) {
            throw new common_1.BadRequestException('Employee ID and annual CTC are required.');
        }
        const previousStructure = await this.prisma.salaryStructure.findUnique({
            where: { employeeId },
        });
        const previousCtc = previousStructure?.ctcAnnual ?? 0;
        const previousBasic = previousStructure?.basicMonthly ?? 0;
        const previousHra = previousStructure?.hraMonthly ?? 0;
        const previousSpecial = previousStructure?.specialAllowanceMonthly ?? 0;
        const result = await this.prisma.$transaction(async (tx) => {
            const structure = await tx.salaryStructure.upsert({
                where: { employeeId },
                update: {
                    ctcAnnual: Number(ctcAnnual),
                    basicMonthly: Number(basicMonthly),
                    hraMonthly: Number(hraMonthly),
                    conveyanceMonthly: Number(conveyanceMonthly),
                    specialAllowanceMonthly: Number(specialAllowanceMonthly),
                    medicalAllowanceMonthly: Number(medicalAllowanceMonthly),
                    pfEmployeeMonthly: Number(pfEmployeeMonthly),
                    ptMonthly: Number(ptMonthly),
                    effectiveFrom,
                    isActive: true,
                },
                create: {
                    employeeId,
                    ctcAnnual: Number(ctcAnnual),
                    basicMonthly: Number(basicMonthly),
                    hraMonthly: Number(hraMonthly),
                    conveyanceMonthly: Number(conveyanceMonthly),
                    specialAllowanceMonthly: Number(specialAllowanceMonthly),
                    medicalAllowanceMonthly: Number(medicalAllowanceMonthly),
                    pfEmployeeMonthly: Number(pfEmployeeMonthly),
                    ptMonthly: Number(ptMonthly),
                    effectiveFrom,
                    isActive: true,
                },
            });
            await tx.employee.update({
                where: { id: employeeId },
                data: { salary: Number(ctcAnnual) },
            });
            const revision = await tx.salaryRevisionHistory.create({
                data: {
                    id: `rev-${Date.now().toString(36)}`,
                    employeeId,
                    previousCtcAnnual: Number(previousCtc),
                    newCtcAnnual: Number(ctcAnnual),
                    previousBasicMonthly: Number(previousBasic),
                    newBasicMonthly: Number(basicMonthly),
                    previousHraMonthly: Number(previousHra),
                    newHraMonthly: Number(hraMonthly),
                    previousSpecialMonthly: Number(previousSpecial),
                    newSpecialMonthly: Number(specialAllowanceMonthly),
                    effectiveDate: effectiveFrom,
                    revisionType,
                    reason,
                    source,
                    approvedById: user.id,
                    approvedAt: new Date(),
                },
            });
            await tx.auditLog.create({
                data: {
                    id: `audit-${Date.now()}`,
                    action: 'UPDATE',
                    module: 'Compensation',
                    employeeId,
                    details: JSON.stringify({
                        previousCtc,
                        newCtc: ctcAnnual,
                        revisionType,
                        reason,
                    }),
                },
            });
            await tx.userNotification.create({
                data: {
                    id: `notif-${Date.now()}`,
                    userId: employeeId,
                    title: 'Salary Structure Revised',
                    message: `Your annual CTC has been revised to ₹${Number(ctcAnnual).toLocaleString('en-IN')} effective from ${effectiveFrom}.`,
                    type: 'Approval',
                    linkUrl: '/payroll',
                },
            });
            return { structure, revision };
        });
        return { success: true, data: result.structure, revision: result.revision };
    }
    async getVariablePayRecords(user, employeeId, monthYear, view) {
        const viewAll = view === 'all' && (user.userRole === 'admin' || user.userRole === 'manager');
        const where = {};
        if (!viewAll) {
            where.employeeId = user.id;
        }
        else if (employeeId) {
            where.employeeId = employeeId;
        }
        if (monthYear && monthYear !== 'All') {
            where.monthYear = monthYear;
        }
        return this.prisma.variablePayRecord.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
    }
    async createVariablePayRecord(user, body) {
        if (user.userRole !== 'admin' && user.userRole !== 'manager') {
            throw new common_1.ForbiddenException('Unauthorized to add variable pay.');
        }
        const { employeeId, payType = 'PerformanceBonus', amount, monthYear, reason, isTaxable = true, status = 'Approved', } = body ?? {};
        if (!employeeId || !amount || !monthYear || !reason) {
            throw new common_1.BadRequestException('Missing required variable pay fields.');
        }
        const record = await this.prisma.variablePayRecord.create({
            data: {
                id: `vp-${Date.now().toString(36)}`,
                employeeId,
                payType,
                amount: Number(amount),
                monthYear,
                reason,
                isTaxable: Boolean(isTaxable),
                status,
                approvedById: user.id,
                approvedAt: new Date(),
            },
        });
        await this.prisma.auditLog.create({
            data: {
                id: `audit-${Date.now()}`,
                action: `CREATE_${String(payType).toUpperCase()}`,
                module: 'Payroll',
                employeeId,
                details: JSON.stringify({ payType, amount, monthYear, reason, approvedBy: user.id }),
            },
        });
        await this.notify.notifyUser({
            userId: employeeId,
            title: 'Variable pay added',
            message: `A ${String(payType)} of ₹${Number(amount)} for ${monthYear} has been added to your payroll. Reason: ${reason}`,
            type: 'Payroll',
            linkUrl: '/payroll',
        });
        return record;
    }
    async getStatutoryRules() {
        const [dbRules, dbComponents] = await Promise.all([
            this.prisma.statutoryRule.findMany({
                where: { isActive: true },
                orderBy: { effectiveFrom: 'desc' },
            }),
            this.prisma.salaryComponent.findMany({
                where: { isActive: true },
            }),
        ]);
        return {
            config: statutory_engine_1.DEFAULT_STATUTORY_CONFIG,
            customRules: dbRules,
            salaryComponents: dbComponents.length > 0 ? dbComponents : salary_components_1.DEFAULT_SALARY_COMPONENTS,
        };
    }
    async createStatutoryRule(user, body) {
        if (user.userRole !== 'admin') {
            throw new common_1.ForbiddenException('Only admins can modify statutory rules.');
        }
        const { ruleType, country = 'IN', state = 'ALL', financialYear = '2026-27', effectiveFrom = new Date().toISOString().split('T')[0], effectiveTo, rateEmployee = 0, rateEmployer = 0, ceilingLimit, slabsJson = '[]', configJson = '{}', } = body ?? {};
        if (!ruleType || !effectiveFrom) {
            throw new common_1.BadRequestException('Missing required statutory rule fields.');
        }
        const rule = await this.prisma.statutoryRule.create({
            data: {
                id: `stat-${String(ruleType).toLowerCase()}-${Date.now().toString(36)}`,
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
        await this.prisma.auditLog.create({
            data: {
                id: `audit-${Date.now()}`,
                action: 'CREATE_STATUTORY_RULE',
                module: 'Payroll',
                employeeId: user.id,
                details: JSON.stringify({ ruleType, state, financialYear, effectiveFrom }),
            },
        });
        return rule;
    }
    async generatePdfDocument(user, body) {
        const { documentType } = body ?? {};
        if (!documentType) {
            throw new common_1.BadRequestException('documentType is required ("payslip" or "form16").');
        }
        if (documentType === 'payslip') {
            return this.renderPayslipPdf(user, body);
        }
        if (documentType === 'form16') {
            return this.renderForm16Pdf(user, body);
        }
        throw new common_1.BadRequestException('Unsupported documentType. Use "payslip" or "form16".');
    }
    async renderPayslipPdf(user, body) {
        const { payslipId } = body ?? {};
        if (!payslipId) {
            throw new common_1.BadRequestException('payslipId is required for payslip documents.');
        }
        const payslip = await this.prisma.payslip.findUnique({
            where: { id: payslipId },
            include: { employee: true },
        });
        if (!payslip)
            throw new common_1.NotFoundException('Payslip not found.');
        const isPrivileged = user.userRole === 'admin' || user.userRole === 'manager';
        if (payslip.employeeId !== user.id && !isPrivileged) {
            throw new common_1.ForbiddenException('You can only access your own payslips.');
        }
        const cycleItem = await this.prisma.payrollCycleItem.findFirst({
            where: {
                employeeId: payslip.employeeId,
                cycle: { monthYear: payslip.monthYear },
            },
        });
        const allSlips = await this.prisma.payslip.findMany({
            where: { employeeId: payslip.employeeId },
        });
        const fy = this.financialYearOfMonthYear(payslip.monthYear);
        const fySlips = allSlips.filter((s) => this.financialYearOfMonthYear(s.monthYear) === fy);
        const ytdGross = fySlips.reduce((sum, s) => sum + Number(s.grossEarnings), 0);
        const ytdTax = fySlips.reduce((sum, s) => sum + Number(s.taxDeduction), 0);
        const ytdPf = fySlips.reduce((sum, s) => sum + Number(s.pfDeduction), 0);
        const emp = payslip.employee;
        const pdfData = {
            companyName: 'M360 HRMS',
            companyAddress: 'M360 Technologies, Bengaluru, Karnataka 560001',
            companyPanTan: 'PAN: AABCM9876E',
            monthYear: payslip.monthYear,
            paymentDate: payslip.paymentDate,
            status: String(payslip.status),
            employee: {
                name: emp?.name || 'Employee',
                code: emp?.employeeCode || '—',
                designation: emp?.roleTitle || 'Associate',
                department: emp?.department || 'General',
                pan: cycleItem?.panNumber || 'ABCDE1234F',
                bankName: 'HDFC Bank',
                accountNo: cycleItem?.bankAccountMasked || '•••• •••• 4921',
                ifsc: cycleItem?.bankIfsc || 'HDFC0001234',
                uan: `UAN-${emp?.employeeCode || '000000'}`,
                payableDays: cycleItem?.payableDays ?? 30,
                lossOfPayDays: cycleItem?.lossOfPayDays ?? 0,
            },
            earnings: {
                basic: Number(payslip.basicSalary),
                hra: Number(payslip.hra),
                conveyance: Number(payslip.conveyance),
                specialAllowance: Number(payslip.specialAllowance),
                medicalAllowance: cycleItem?.medicalAllowance ?? 1250,
                lta: cycleItem?.lta ?? 0,
                bonus: cycleItem?.bonus ?? 0,
                overtimePay: cycleItem?.overtimePay ?? 0,
                arrears: cycleItem?.arrears ?? 0,
                reimbursements: cycleItem?.reimbursements ?? 0,
                grossEarnings: Number(payslip.grossEarnings),
            },
            deductions: {
                pfEmployee: Number(payslip.pfDeduction),
                esicEmployee: cycleItem?.esicEmployee ?? 0,
                pt: cycleItem?.pt ?? 200,
                tds: Number(payslip.taxDeduction),
                lwf: cycleItem?.lwf ?? 0,
                loanDeduction: cycleItem?.loanDeduction ?? 0,
                lossOfPayDeduction: cycleItem?.lossOfPayDeduction ?? 0,
                totalDeductions: Number(payslip.totalDeductions),
            },
            employerContributions: {
                pfEmployer: cycleItem?.pfEmployer ?? 1800,
                esicEmployer: cycleItem?.esicEmployer ?? 0,
                gratuityProvision: cycleItem?.gratuityProvision ?? 0,
            },
            netPayable: Number(payslip.netPayable),
            ytd: { ytdGross, ytdTax, ytdPf },
        };
        return (0, pdf_service_1.renderPayslipHtml)(pdfData);
    }
    async renderForm16Pdf(user, body) {
        const { employeeId, financialYear } = body ?? {};
        const targetEmployeeId = employeeId || user.id;
        const isPrivileged = user.userRole === 'admin' || user.userRole === 'manager';
        if (targetEmployeeId !== user.id && !isPrivileged) {
            throw new common_1.ForbiddenException('You can only access your own Form 16.');
        }
        const statement = await this.getForm16(targetEmployeeId, financialYear || '2026-27');
        return (0, pdf_service_1.renderForm16Html)(statement);
    }
    financialYearOfMonthYear(monthYear) {
        const parts = String(monthYear || '').trim().split(/\s+/);
        const monthName = (parts[0] || '').toLowerCase();
        const year = Number(parts[1]) || new Date().getFullYear();
        const monthIndex = MONTH_NAMES.indexOf(monthName) + 1;
        return monthIndex >= 4
            ? `${year}-${String(year + 1).slice(2)}`
            : `${year - 1}-${String(year).slice(2)}`;
    }
};
exports.PayrollService = PayrollService;
exports.PayrollService = PayrollService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notify_service_1.NotifyService])
], PayrollService);
//# sourceMappingURL=payroll.service.js.map