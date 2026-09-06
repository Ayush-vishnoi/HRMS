"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePayrollRegister = generatePayrollRegister;
exports.generatePfEcrReport = generatePfEcrReport;
exports.generateEsicReturnReport = generateEsicReturnReport;
exports.generateDepartmentCostingReport = generateDepartmentCostingReport;
function generatePayrollRegister(items) {
    return items.map((item) => {
        const pfEmployer = item.pfEmployer || 0;
        const esicEmployer = item.esicEmployer || 0;
        const gratuity = item.gratuityProvision || 0;
        const totalCost = item.grossEarnings + pfEmployer + esicEmployer + gratuity;
        return {
            employeeCode: item.employeeCode,
            employeeName: item.employeeName,
            department: item.department,
            basic: item.basic || 0,
            hra: item.hra || 0,
            conveyance: item.conveyance || 0,
            specialAllowance: item.specialAllowance || 0,
            medicalAllowance: item.medicalAllowance || 0,
            bonus: item.bonus || 0,
            incentives: item.incentives || 0,
            overtimePay: item.overtimePay || 0,
            arrears: item.arrears || 0,
            reimbursements: item.reimbursements || 0,
            grossEarnings: item.grossEarnings || 0,
            pfEmployee: item.pfEmployee || 0,
            esicEmployee: item.esicEmployee || 0,
            pt: item.pt || 0,
            tds: item.tds || 0,
            lwf: item.lwf || 0,
            loanDeduction: item.loanDeduction || 0,
            totalDeductions: item.totalDeductions || 0,
            netPayable: item.netPayable || 0,
            pfEmployer,
            esicEmployer,
            gratuityProvision: gratuity,
            totalEmployerCost: totalCost,
            taxRegime: item.taxRegime || 'New',
            paymentStatus: item.paymentStatus || 'Pending',
        };
    });
}
function generatePfEcrReport(items) {
    return items.map((item) => {
        const basic = item.basic || 0;
        const pfWage = Math.min(basic, 15000);
        const eeShare = item.pfEmployee || 0;
        const epsShare = Math.min(1250, Math.round(pfWage * 0.0833));
        const epfShare = Math.max(0, eeShare - epsShare);
        return {
            UAN: item.uan || `UAN-${item.employeeCode}`,
            MemberName: item.employeeName,
            GrossWages: item.grossEarnings,
            EPFWages: pfWage,
            EPSWages: pfWage,
            EDLIWages: pfWage,
            EE_Share_12Pct: eeShare,
            EPS_Share_8_33Pct: epsShare,
            ER_EPF_Share: epfShare,
            NCPDays: item.lossOfPayDays || 0,
            RefundOfAdvances: 0,
        };
    });
}
function generateEsicReturnReport(items) {
    return items
        .filter((item) => item.grossEarnings <= 21000 || item.esicEmployee > 0)
        .map((item) => ({
        IPNumber: item.ipNumber || `IP-${item.employeeCode}`,
        IPName: item.employeeName,
        NoOfDaysWorked: item.payableDays || 30,
        TotalMonthlyWages: item.grossEarnings,
        IPContribution_0_75Pct: item.esicEmployee,
        EmployerContribution_3_25Pct: item.esicEmployer || Math.round(item.grossEarnings * 0.0325),
        TotalContribution: (item.esicEmployee || 0) + (item.esicEmployer || 0),
    }));
}
function generateDepartmentCostingReport(items) {
    const map = new Map();
    for (const item of items) {
        const dept = item.department || 'General';
        const entry = map.get(dept) || { count: 0, gross: 0, statutory: 0, totalCost: 0 };
        const stat = (item.pfEmployer || 0) + (item.esicEmployer || 0) + (item.gratuityProvision || 0);
        entry.count += 1;
        entry.gross += item.grossEarnings || 0;
        entry.statutory += stat;
        entry.totalCost += (item.grossEarnings || 0) + stat;
        map.set(dept, entry);
    }
    return Array.from(map.entries()).map(([department, data]) => ({
        department,
        headcount: data.count,
        grossSalaryCost: data.gross,
        employerStatutoryCost: data.statutory,
        totalPayrollCost: data.totalCost,
        averageCostPerEmployee: data.count > 0 ? Math.round(data.totalCost / data.count) : 0,
    }));
}
//# sourceMappingURL=reports-service.js.map