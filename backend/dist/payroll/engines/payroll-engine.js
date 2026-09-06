"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateEmployeeMonthlyPayroll = calculateEmployeeMonthlyPayroll;
const statutory_engine_1 = require("./statutory-engine");
const india_tax_engine_1 = require("./india-tax-engine");
function calculateEmployeeMonthlyPayroll(input, monthIndex = 1) {
    const totalCalendarDays = Math.max(1, input.attendance.totalCalendarDays || 30);
    const lossOfPayDays = Math.max(0, input.attendance.lossOfPayDays || 0);
    const payableDays = Math.max(0, totalCalendarDays - lossOfPayDays);
    let basic = 0;
    let hra = 0;
    let conveyance = 0;
    let special = 0;
    let medical = 0;
    let lta = 0;
    if (input.salaryRevisionsInMonth && input.salaryRevisionsInMonth.length > 0) {
        const rev = input.salaryRevisionsInMonth[0];
        const effectiveDay = Number.parseInt(rev.effectiveDate.split('-')[2] || '15', 10);
        const daysBefore = Math.max(0, Math.min(totalCalendarDays, effectiveDay - 1));
        const daysAfter = Math.max(0, totalCalendarDays - daysBefore);
        const oldRatio = daysBefore / totalCalendarDays;
        const newRatio = daysAfter / totalCalendarDays;
        const oldBasic = input.activeSalaryStructure.basicMonthly;
        const newBasic = rev.newBasicMonthly;
        basic = (oldBasic * oldRatio + newBasic * newRatio) * (payableDays / totalCalendarDays);
        const oldHra = input.activeSalaryStructure.hraMonthly;
        const newHra = rev.newHraMonthly;
        hra = (oldHra * oldRatio + newHra * newRatio) * (payableDays / totalCalendarDays);
        const oldSpecial = input.activeSalaryStructure.specialAllowanceMonthly;
        const newSpecial = rev.newSpecialMonthly;
        special = (oldSpecial * oldRatio + newSpecial * newRatio) * (payableDays / totalCalendarDays);
        conveyance = input.activeSalaryStructure.conveyanceMonthly * (payableDays / totalCalendarDays);
        medical = input.activeSalaryStructure.medicalAllowanceMonthly * (payableDays / totalCalendarDays);
        lta = (input.activeSalaryStructure.ltaMonthly || 0) * (payableDays / totalCalendarDays);
    }
    else {
        const prorationRatio = payableDays / totalCalendarDays;
        basic = input.activeSalaryStructure.basicMonthly * prorationRatio;
        hra = input.activeSalaryStructure.hraMonthly * prorationRatio;
        conveyance = input.activeSalaryStructure.conveyanceMonthly * prorationRatio;
        special = input.activeSalaryStructure.specialAllowanceMonthly * prorationRatio;
        medical = input.activeSalaryStructure.medicalAllowanceMonthly * prorationRatio;
        lta = (input.activeSalaryStructure.ltaMonthly || 0) * prorationRatio;
    }
    const roundedBasic = Math.round(basic);
    const roundedHra = Math.round(hra);
    const roundedConveyance = Math.round(conveyance);
    const roundedSpecial = Math.round(special);
    const roundedMedical = Math.round(medical);
    const roundedLta = Math.round(lta);
    const nominalMonthlyGross = input.activeSalaryStructure.basicMonthly +
        input.activeSalaryStructure.hraMonthly +
        input.activeSalaryStructure.conveyanceMonthly +
        input.activeSalaryStructure.specialAllowanceMonthly +
        input.activeSalaryStructure.medicalAllowanceMonthly +
        (input.activeSalaryStructure.ltaMonthly || 0);
    const proratedCoreEarnings = roundedBasic + roundedHra + roundedConveyance + roundedSpecial + roundedMedical + roundedLta;
    const lossOfPayDeduction = Math.max(0, nominalMonthlyGross - proratedCoreEarnings);
    let overtimePay = 0;
    if (input.overtime && input.overtime.approvedMinutes > 0) {
        const defaultHourlyRate = ((roundedBasic + roundedSpecial) / (totalCalendarDays * 8)) * 1.5;
        const hourlyRate = input.overtime.hourlyRate || defaultHourlyRate;
        overtimePay = Math.round((input.overtime.approvedMinutes / 60) * hourlyRate);
    }
    const bonus = Math.round(input.variablePay?.bonus || 0);
    const incentives = Math.round(input.variablePay?.incentives || 0);
    const arrears = Math.round(input.variablePay?.arrears || 0);
    const reimbursements = Math.round(input.expenseClaims?.approvedReimbursements || 0);
    const grossEarnings = roundedBasic +
        roundedHra +
        roundedConveyance +
        roundedSpecial +
        roundedMedical +
        roundedLta +
        overtimePay +
        bonus +
        incentives +
        arrears +
        reimbursements;
    const pfResult = (0, statutory_engine_1.calculateProvidentFund)(roundedBasic);
    const pfEmployee = pfResult.employeePF;
    const pfEmployer = pfResult.employerPF;
    const esicGross = Math.max(0, grossEarnings - reimbursements);
    const esicResult = (0, statutory_engine_1.calculateESIC)(esicGross);
    const esicEmployee = esicResult.employeeESIC;
    const esicEmployer = esicResult.employerESIC;
    const state = input.locationState || 'Karnataka';
    const pt = (0, statutory_engine_1.calculateProfessionalTax)(esicGross, state, monthIndex);
    const lwfResult = (0, statutory_engine_1.calculateLWF)(state, monthIndex);
    const lwf = lwfResult.employeeLWF;
    const gratuityProvision = (0, statutory_engine_1.calculateGratuityProvision)(roundedBasic);
    let loanDeduction = 0;
    if (input.activeLoans && input.activeLoans.length > 0) {
        for (const loan of input.activeLoans) {
            if (!loan.isPaused && loan.remainingBalance > 0) {
                const emiToDeduct = Math.min(loan.monthlyEmi, loan.remainingBalance);
                loanDeduction += emiToDeduct;
            }
        }
    }
    loanDeduction = Math.round(loanDeduction);
    const annualGrossProjected = esicGross * 12 + bonus;
    const annualBasicProjected = roundedBasic * 12;
    const annualHraProjected = roundedHra * 12;
    const taxResult = (0, india_tax_engine_1.computeIndianIncomeTax)({
        regime: input.taxDeclaration?.regime || 'New',
        annualGrossSalary: annualGrossProjected,
        annualBasic: annualBasicProjected,
        annualHRA: annualHraProjected,
        annualPT: pt * 12,
        declarations: input.taxDeclaration,
        priorTdsDeductedInYear: input.priorTdsDeductedInYear || 0,
        priorMonthsElapsedInFY: input.priorMonthsElapsedInFY || 0,
    });
    const tds = taxResult.monthlyTdsProjected;
    const otherDeductions = 0;
    const totalDeductions = pfEmployee + esicEmployee + pt + lwf + tds + loanDeduction + otherDeductions;
    const netPayable = Math.max(0, grossEarnings - totalDeductions);
    const snapshotData = {
        calculatedAt: new Date().toISOString(),
        employee: {
            id: input.employeeId,
            code: input.employeeCode,
            name: input.employeeName,
            department: input.department,
            locationState: state,
        },
        attendance: {
            totalCalendarDays,
            payableDays,
            lossOfPayDays,
            lossOfPayDeduction,
        },
        earnings: {
            basic: roundedBasic,
            hra: roundedHra,
            conveyance: roundedConveyance,
            specialAllowance: roundedSpecial,
            medicalAllowance: roundedMedical,
            lta: roundedLta,
            overtimePay,
            bonus,
            incentives,
            arrears,
            reimbursements,
            grossEarnings,
        },
        deductions: {
            pfEmployee,
            esicEmployee,
            pt,
            lwf,
            tds,
            loanDeduction,
            otherDeductions,
            totalDeductions,
        },
        employerContributions: {
            pfEmployer,
            employerEPS: pfResult.employerEPS,
            employerEPF: pfResult.employerEPF,
            esicEmployer,
            employerLWF: lwfResult.employerLWF,
            gratuityProvision,
        },
        taxComputation: taxResult,
        netPayable,
    };
    return {
        employeeId: input.employeeId,
        employeeCode: input.employeeCode,
        employeeName: input.employeeName,
        department: input.department,
        payableDays,
        lossOfPayDays,
        lossOfPayDeduction,
        basic: roundedBasic,
        hra: roundedHra,
        conveyance: roundedConveyance,
        specialAllowance: roundedSpecial,
        medicalAllowance: roundedMedical,
        lta: roundedLta,
        bonus,
        incentives,
        overtimePay,
        arrears,
        reimbursements,
        grossEarnings,
        pfEmployee,
        pfEmployer,
        esicEmployee,
        esicEmployer,
        pt,
        tds,
        lwf,
        loanDeduction,
        otherDeductions,
        gratuityProvision,
        totalDeductions,
        netPayable,
        taxRegime: taxResult.regime,
        bankAccountMasked: input.bankAccountMasked,
        bankIfsc: input.bankIfsc,
        panNumber: input.panNumber,
        calculationSnapshotJson: JSON.stringify(snapshotData),
    };
}
//# sourceMappingURL=payroll-engine.js.map