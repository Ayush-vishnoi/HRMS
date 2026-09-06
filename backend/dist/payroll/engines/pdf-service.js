"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderPayslipHtml = renderPayslipHtml;
exports.renderForm16Html = renderForm16Html;
function renderPayslipHtml(data) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Payslip - ${data.employee.name} (${data.monthYear})</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 0; padding: 24px; font-size: 13px; background: #fff; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
    .company h1 { margin: 0 0 4px 0; font-size: 20px; color: #0f172a; }
    .company p { margin: 2px 0; font-size: 11px; color: #64748b; }
    .badge { display: inline-block; background: #ecfdf5; color: #059669; font-weight: bold; padding: 4px 10px; border-radius: 9999px; font-size: 11px; border: 1px solid #a7f3d0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; }
    .box-title { font-weight: bold; font-size: 12px; margin-bottom: 8px; color: #334155; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
    .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .row dt { color: #64748b; }
    .row dd { font-weight: 600; color: #0f172a; margin: 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f1f5f9; padding: 8px 12px; font-size: 12px; font-weight: bold; text-align: left; border: 1px solid #e2e8f0; color: #334155; }
    td { padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 12px; }
    .total-row td { font-weight: bold; background: #f8fafc; font-size: 13px; }
    .net-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
    .net-title { font-size: 14px; font-weight: bold; color: #166534; }
    .net-amount { font-size: 22px; font-weight: 800; color: #15803d; }
    .footer { text-align: center; margin-top: 32px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="company">
      <h1>${data.companyName}</h1>
      <p>${data.companyAddress}</p>
      <p>${data.companyPanTan}</p>
    </div>
    <div style="text-align: right;">
      <span class="badge">${data.status}</span>
      <p style="margin-top: 8px; font-weight: bold;">Pay Period: ${data.monthYear}</p>
      <p style="color: #64748b; font-size: 11px;">Payment Date: ${data.paymentDate}</p>
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <div class="box-title">Employee Information</div>
      <div class="row"><dt>Name:</dt><dd>${data.employee.name}</dd></div>
      <div class="row"><dt>Employee Code:</dt><dd>${data.employee.code}</dd></div>
      <div class="row"><dt>Designation:</dt><dd>${data.employee.designation}</dd></div>
      <div class="row"><dt>Department:</dt><dd>${data.employee.department}</dd></div>
      <div class="row"><dt>PAN:</dt><dd>${data.employee.pan}</dd></div>
    </div>
    <div class="box">
      <div class="box-title">Attendance & Banking</div>
      <div class="row"><dt>Bank Name:</dt><dd>${data.employee.bankName}</dd></div>
      <div class="row"><dt>Account Number:</dt><dd>${data.employee.accountNo}</dd></div>
      <div class="row"><dt>IFSC Code:</dt><dd>${data.employee.ifsc}</dd></div>
      <div class="row"><dt>Payable Days:</dt><dd>${data.employee.payableDays} Days</dd></div>
      <div class="row"><dt>Loss of Pay Days:</dt><dd>${data.employee.lossOfPayDays} Days</dd></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 50%;">Earnings</th>
        <th style="text-align: right; width: 15%;">Amount (₹)</th>
        <th style="width: 50%; border-left: 2px solid #cbd5e1;">Deductions</th>
        <th style="text-align: right; width: 15%;">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Basic Salary</td>
        <td style="text-align: right;">₹${data.earnings.basic.toLocaleString('en-IN')}</td>
        <td style="border-left: 2px solid #cbd5e1;">Provident Fund (Employee)</td>
        <td style="text-align: right;">₹${data.deductions.pfEmployee.toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td>House Rent Allowance (HRA)</td>
        <td style="text-align: right;">₹${data.earnings.hra.toLocaleString('en-IN')}</td>
        <td style="border-left: 2px solid #cbd5e1;">ESIC (Employee)</td>
        <td style="text-align: right;">₹${data.deductions.esicEmployee.toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td>Conveyance Allowance</td>
        <td style="text-align: right;">₹${data.earnings.conveyance.toLocaleString('en-IN')}</td>
        <td style="border-left: 2px solid #cbd5e1;">Professional Tax (PT)</td>
        <td style="text-align: right;">₹${data.deductions.pt.toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td>Special Allowance</td>
        <td style="text-align: right;">₹${data.earnings.specialAllowance.toLocaleString('en-IN')}</td>
        <td style="border-left: 2px solid #cbd5e1;">Income Tax (TDS)</td>
        <td style="text-align: right;">₹${data.deductions.tds.toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td>Medical Allowance</td>
        <td style="text-align: right;">₹${data.earnings.medicalAllowance.toLocaleString('en-IN')}</td>
        <td style="border-left: 2px solid #cbd5e1;">Labour Welfare Fund (LWF)</td>
        <td style="text-align: right;">₹${data.deductions.lwf.toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td>Bonus / Incentives / OT</td>
        <td style="text-align: right;">₹${(data.earnings.bonus + data.earnings.overtimePay).toLocaleString('en-IN')}</td>
        <td style="border-left: 2px solid #cbd5e1;">Loan EMI Deduction</td>
        <td style="text-align: right;">₹${data.deductions.loanDeduction.toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td>Reimbursements</td>
        <td style="text-align: right;">₹${data.earnings.reimbursements.toLocaleString('en-IN')}</td>
        <td style="border-left: 2px solid #cbd5e1;">Loss of Pay Deduction</td>
        <td style="text-align: right;">₹${data.deductions.lossOfPayDeduction.toLocaleString('en-IN')}</td>
      </tr>
      <tr class="total-row">
        <td>Total Gross Earnings</td>
        <td style="text-align: right; color: #166534;">₹${data.earnings.grossEarnings.toLocaleString('en-IN')}</td>
        <td style="border-left: 2px solid #cbd5e1;">Total Deductions</td>
        <td style="text-align: right; color: #991b1b;">₹${data.deductions.totalDeductions.toLocaleString('en-IN')}</td>
      </tr>
    </tbody>
  </table>

  <div class="net-box">
    <div>
      <div class="net-title">NET TAKE-HOME PAYABLE</div>
      <div style="font-size: 11px; color: #166534;">Directly deposited to registered bank account</div>
    </div>
    <div class="net-amount">₹${data.netPayable.toLocaleString('en-IN')}</div>
  </div>

  ${data.ytd
        ? `
  <div style="margin-top: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px;">
    <div class="box-title">Year-to-Date (YTD) Financial Summary</div>
    <div style="display: flex; justify-content: space-around; font-size: 12px;">
      <div>YTD Gross: <strong>₹${data.ytd.ytdGross.toLocaleString('en-IN')}</strong></div>
      <div>YTD Tax (TDS): <strong>₹${data.ytd.ytdTax.toLocaleString('en-IN')}</strong></div>
      <div>YTD PF: <strong>₹${data.ytd.ytdPf.toLocaleString('en-IN')}</strong></div>
    </div>
  </div>`
        : ''}

  <div class="footer">
    <p>This is a computer-generated official payslip. No physical signature is required.</p>
    <p>Confidential & Proprietary — Generated by MYLOTIC Enterprise HRMS</p>
  </div>
</body>
</html>`;
}
function renderForm16Html(data) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Annual Tax Statement / Form 16 Preparation Sheet - ${data.employee.name}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 24px; font-size: 12px; background: #fff; }
    h1, h2, h3 { margin: 0 0 6px 0; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .tag { display: inline-block; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; margin-top: 4px; }
    .section-title { background: #1e293b; color: #fff; padding: 6px 10px; font-weight: bold; font-size: 13px; margin: 16px 0 8px 0; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 11px; }
    th { background: #f1f5f9; text-align: left; font-weight: bold; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .highlight { background: #f8fafc; font-weight: bold; }
    .footer { margin-top: 24px; border-top: 1px solid #cbd5e1; padding-top: 12px; font-size: 10px; color: #64748b; }
  </style>
</head>
<body>
  <div class="header">
    <h2>${data.employer.name}</h2>
    <p style="margin: 2px 0; color: #475569;">${data.employer.address}</p>
    <h1>INTERNAL ANNUAL TAX STATEMENT / FORM 16 SUMMARY</h1>
    <div class="tag">Financial Year: ${data.financialYear} | Assessment Year: ${data.assessmentYear}</div>
  </div>

  <table style="margin-bottom: 16px;">
    <tr>
      <th>Employer PAN:</th><td>${data.employer.pan}</td>
      <th>Employer TAN:</th><td>${data.employer.tan}</td>
    </tr>
    <tr>
      <th>Employee Name:</th><td class="bold">${data.employee.name}</td>
      <th>Employee Code:</th><td>${data.employee.code}</td>
    </tr>
    <tr>
      <th>Employee PAN:</th><td class="bold">${data.employee.pan}</td>
      <th>Selected Tax Regime:</th><td class="bold" style="color: #2563eb;">${data.partB.regimeSelected} Tax Regime</td>
    </tr>
  </table>

  <div class="section-title">PART A — QUARTERLY TDS SUMMARY</div>
  <table>
    <thead>
      <tr>
        <th>Quarter</th>
        <th>Challan / Receipt Reference</th>
        <th class="text-right">Amount Paid (₹)</th>
        <th class="text-right">Tax Deducted (₹)</th>
        <th class="text-right">Tax Deposited (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${data.partA.quarterlyTds
        .map((q) => `<tr>
        <td>${q.quarter}</td>
        <td>${q.receiptNumbers}</td>
        <td class="text-right">₹${q.amountPaid.toLocaleString('en-IN')}</td>
        <td class="text-right">₹${q.taxDeducted.toLocaleString('en-IN')}</td>
        <td class="text-right">₹${q.taxDeposited.toLocaleString('en-IN')}</td>
      </tr>`)
        .join('')}
      <tr class="highlight">
        <td colspan="2">Total for Financial Year</td>
        <td class="text-right">₹${data.partB.grossSalary.totalGross.toLocaleString('en-IN')}</td>
        <td class="text-right">₹${data.partA.totalTaxDeducted.toLocaleString('en-IN')}</td>
        <td class="text-right">₹${data.partA.totalTaxDeposited.toLocaleString('en-IN')}</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">PART B — DETAILS OF SALARY PAID AND DEDUCTIONS</div>
  <table>
    <tbody>
      <tr>
        <td>1. Gross Salary (as per Section 17(1))</td>
        <td class="text-right bold">₹${data.partB.grossSalary.salaryAsPerSection17_1.toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td>2. Less: Allowances Exempt under Section 10 (HRA / PT / Standard Deduction)</td>
        <td class="text-right bold" style="color: #166534;">₹${data.partB.exemptionsUnderSection10.totalExemptions.toLocaleString('en-IN')}</td>
      </tr>
      <tr class="highlight">
        <td>3. Total Salary after Exemptions (1 - 2)</td>
        <td class="text-right">₹${data.partB.totalSalaryAfterExemptions.toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td>4. Less: Deductions under Chapter VI-A (80C, 80D, 80CCD, 80G, etc.)</td>
        <td class="text-right bold" style="color: #166534;">₹${data.partB.deductionsUnderChapterVIA.totalDeductions.toLocaleString('en-IN')}</td>
      </tr>
      <tr class="highlight" style="background: #f1f5f9;">
        <td><strong>5. TOTAL TAXABLE INCOME</strong></td>
        <td class="text-right bold" style="font-size: 13px;">₹${data.partB.totalTaxableIncome.toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td>6. Tax on Total Income</td>
        <td class="text-right">₹${data.partB.taxOnTotalIncome.toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td>7. Less: Tax Rebate under Section 87A</td>
        <td class="text-right">₹${data.partB.rebateUnder87A.toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td>8. Health and Education Cess (4%)</td>
        <td class="text-right">₹${data.partB.healthAndEducationCess.toLocaleString('en-IN')}</td>
      </tr>
      <tr class="highlight">
        <td><strong>9. NET TAX PAYABLE FOR YEAR</strong></td>
        <td class="text-right bold" style="color: #991b1b; font-size: 13px;">₹${data.partB.netTaxPayable.toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td>10. Total Tax Deducted at Source (TDS Deposited)</td>
        <td class="text-right bold">₹${data.partB.taxDeductedAtSource.toLocaleString('en-IN')}</td>
      </tr>
      <tr class="highlight">
        <td><strong>11. BALANCE TAX PAYABLE / REFUND DUE</strong></td>
        <td class="text-right bold">₹${data.partB.refundOrPayableDue.toLocaleString('en-IN')}</td>
      </tr>
    </tbody>
  </table>

  <div style="display: flex; justify-content: space-between; margin-top: 30px;">
    <div>
      <p>Place: <strong>${data.verification.place}</strong></p>
      <p>Date: <strong>${data.verification.date}</strong></p>
    </div>
    <div style="text-align: right;">
      <p><strong>${data.verification.signatoryName}</strong></p>
      <p style="color: #64748b;">${data.verification.signatoryCapacity}</p>
      <p style="color: #64748b; font-size: 10px;">${data.employer.name}</p>
    </div>
  </div>

  <div class="footer">
    <p><strong>Disclaimer:</strong> This is a structured internal annual tax computation summary generated by the enterprise payroll engine. Official TRACES Form 16 certificates require digital signature integration with government compliance servers.</p>
  </div>
</body>
</html>`;
}
//# sourceMappingURL=pdf-service.js.map