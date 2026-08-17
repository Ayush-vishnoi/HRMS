/**
 * Server-Side PDF Generation Engine for HRMS (Phase 4C-C3)
 * Generates standard, valid PDF-1.4 binary documents without external binaries.
 */

import { type DocumentContextData, formatCurrencyINR } from './template-variables';

export interface GeneratePdfOptions {
  title: string;
  documentType: string;
  context: DocumentContextData;
  renderedHtml?: string;
}

/**
 * Escapes characters for PDF literal strings (e.g. \(, \), \\)
 */
function escapePdfText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\r\n]+/g, ' ');
}

/**
 * Wraps long text into lines of maximum character length
 */
function wrapTextLines(text: string, maxCharsPerLine: number = 85): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (!word) continue;
    if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Builds standard compliant PDF-1.4 binary buffer for Offer / Appointment / NDA documents
 */
export function generateServerSidePdfBuffer(options: GeneratePdfOptions): Buffer {
  const { title, documentType, context } = options;
  const comp = context.compensation;
  const company = context.company;
  const candidate = context.candidate;
  const offer = context.offer;
  const job = context.job;

  // Stream commands collector
  const streamOps: string[] = [];

  // A4 dimensions: 595.28 x 841.89 points
  // Margins: Left = 45, Right = 550, Top = 800, Bottom = 50

  // 1. Corporate Header Band (Top)
  streamOps.push('0.09 0.19 0.29 rg'); // Corporate Navy #17324A
  streamOps.push('45 790 505 3 re f'); // Top accent bar

  // Company Name
  streamOps.push('BT');
  streamOps.push('/F2 16 Tf'); // Helvetica-Bold 16pt
  streamOps.push('0.09 0.19 0.29 rg');
  streamOps.push(`45 765 Td (${escapePdfText(company.name)}) Tj`);
  streamOps.push('ET');

  // Company Address & Contact
  streamOps.push('BT');
  streamOps.push('/F1 8 Tf'); // Helvetica 8pt
  streamOps.push('0.39 0.45 0.55 rg'); // Slate grey
  streamOps.push(`45 750 Td (${escapePdfText(company.address)}) Tj`);
  streamOps.push(`0 -11 Td (Tel: ${escapePdfText(company.phone)}  |  Email: ${escapePdfText(company.email)}  |  ${escapePdfText(company.website)}) Tj`);
  streamOps.push('ET');

  // Document Badge / Date (Top Right)
  streamOps.push('BT');
  streamOps.push('/F2 9 Tf');
  streamOps.push('0.09 0.19 0.29 rg');
  streamOps.push(`400 765 Td (OFFICIAL HR DOCUMENT) Tj`);
  streamOps.push('/F1 8.5 Tf');
  streamOps.push('0.39 0.45 0.55 rg');
  streamOps.push(`0 -13 Td (Date: ${escapePdfText(context.generatedDate || new Date().toLocaleDateString('en-US'))}) Tj`);
  streamOps.push(`0 -11 Td (Ref: OFF-v${offer.version}-${candidate.id.slice(-6)}) Tj`);
  streamOps.push('ET');

  // Separator Line
  streamOps.push('0.85 0.89 0.93 RG'); // Border #CBD5E1
  streamOps.push('1 w');
  streamOps.push('45 725 m 550 725 l S');

  // Document Title
  streamOps.push('BT');
  streamOps.push('/F2 13 Tf');
  streamOps.push('0.06 0.09 0.16 rg');
  streamOps.push(`45 700 Td (${escapePdfText(title.toUpperCase())}) Tj`);
  streamOps.push('ET');

  // Candidate Salutation
  streamOps.push('BT');
  streamOps.push('/F1 9.5 Tf');
  streamOps.push('0.12 0.16 0.23 rg');
  streamOps.push(`45 675 Td (Dear ${escapePdfText(candidate.fullName)},) Tj`);
  streamOps.push('ET');

  // Opening Paragraph
  const openingText =
    documentType === 'NDA'
      ? `This Non-Disclosure and Confidentiality Agreement is entered into between ${company.name} and ${candidate.fullName}. The Employee agrees to maintain strict confidentiality of all proprietary source code, algorithms, and business strategies.`
      : documentType === 'Appointment_Letter'
      ? `Subsequent to your offer acceptance, the Management is pleased to formally appoint you as ${offer.offeredTitle} with ${company.name} effective from your date of joining ${offer.proposedJoinDate}.`
      : `We are pleased to extend this formal offer of employment for the position of ${offer.offeredTitle} with ${company.name} in the ${job.department} department. Your proposed date of commencement will be ${offer.proposedJoinDate}.`;

  const openingLines = wrapTextLines(openingText, 88);
  let currentY = 655;

  streamOps.push('BT');
  streamOps.push('/F1 9 Tf');
  streamOps.push('0.20 0.25 0.33 rg');
  streamOps.push(`45 ${currentY} Td`);
  openingLines.forEach((line, idx) => {
    if (idx > 0) streamOps.push('0 -13 Td');
    streamOps.push(`(${escapePdfText(line)}) Tj`);
  });
  streamOps.push('ET');
  currentY -= openingLines.length * 13 + 12;

  // Key Terms Grid / Summary
  streamOps.push('BT');
  streamOps.push('/F2 10 Tf');
  streamOps.push('0.09 0.19 0.29 rg');
  streamOps.push(`45 ${currentY} Td (1. Position & Employment Terms) Tj`);
  streamOps.push('ET');
  currentY -= 15;

  // Box Background
  streamOps.push('0.97 0.98 0.99 rg');
  streamOps.push(`45 ${currentY - 45} 505 52 re f`);
  streamOps.push('0.85 0.89 0.93 RG');
  streamOps.push(`45 ${currentY - 45} 505 52 re S`);

  streamOps.push('BT');
  streamOps.push('/F1 8.5 Tf');
  streamOps.push('0.20 0.25 0.33 rg');
  streamOps.push(`55 ${currentY - 12} Td (Designation: ) Tj`);
  streamOps.push('/F2 8.5 Tf');
  streamOps.push(`(${escapePdfText(offer.offeredTitle)}) Tj`);
  streamOps.push('/F1 8.5 Tf');
  streamOps.push(`  |  Department: ) Tj`);
  streamOps.push('/F2 8.5 Tf');
  streamOps.push(`(${escapePdfText(job.department)}) Tj`);
  streamOps.push(`0 -14 Td`);
  streamOps.push('/F1 8.5 Tf');
  streamOps.push(`(Location: ) Tj`);
  streamOps.push('/F2 8.5 Tf');
  streamOps.push(`(${escapePdfText(job.location)}) Tj`);
  streamOps.push('/F1 8.5 Tf');
  streamOps.push(`  |  Reporting To: ) Tj`);
  streamOps.push('/F2 8.5 Tf');
  streamOps.push(`(${escapePdfText(job.hiringManagerName || 'Hiring Manager')}) Tj`);
  streamOps.push(`0 -14 Td`);
  streamOps.push('/F1 8.5 Tf');
  streamOps.push(`(Joining Date: ) Tj`);
  streamOps.push('/F2 8.5 Tf');
  streamOps.push(`(${escapePdfText(offer.proposedJoinDate || 'TBD')}) Tj`);
  streamOps.push('/F1 8.5 Tf');
  streamOps.push(`  |  Notice Period: ) Tj`);
  streamOps.push('/F2 8.5 Tf');
  streamOps.push(`(${escapePdfText(context.employment.noticePeriod)}) Tj`);
  streamOps.push('ET');

  currentY -= 65;

  // Compensation Table Section (Only for Offer & Appointment)
  if (documentType === 'Offer_Letter' || documentType === 'Appointment_Letter') {
    streamOps.push('BT');
    streamOps.push('/F2 10 Tf');
    streamOps.push('0.09 0.19 0.29 rg');
    streamOps.push(`45 ${currentY} Td (2. Annexure-A: Compensation Structure) Tj`);
    streamOps.push('ET');
    currentY -= 15;

    // Table Header
    streamOps.push('0.09 0.19 0.29 rg');
    streamOps.push(`45 ${currentY - 14} 505 16 re f`);

    streamOps.push('BT');
    streamOps.push('/F2 8 Tf');
    streamOps.push('1 1 1 rg'); // White text
    streamOps.push(`55 ${currentY - 10} Td (SALARY COMPONENT) Tj`);
    streamOps.push(`270 0 Td (MONTHLY (INR)) Tj`);
    streamOps.push(`110 0 Td (ANNUAL (INR)) Tj`);
    streamOps.push('ET');
    currentY -= 14;

    const salaryRows = [
      { name: 'Basic Pay', monthly: comp.basicMonthly, annual: comp.basicAnnual, bg: true },
      { name: 'House Rent Allowance (HRA)', monthly: comp.hraMonthly, annual: comp.hraAnnual, bg: false },
      { name: 'Conveyance Allowance', monthly: comp.conveyanceMonthly, annual: comp.conveyanceMonthly * 12, bg: true },
      { name: 'Medical Allowance', monthly: comp.medicalAllowanceMonthly, annual: comp.medicalAllowanceMonthly * 12, bg: false },
      { name: 'Special Allowance', monthly: comp.specialAllowanceMonthly, annual: comp.specialAllowanceAnnual, bg: true },
      { name: 'Gross Salary (A)', monthly: comp.monthlyGross, annual: comp.monthlyGross * 12, bg: false, bold: true },
      { name: 'Employer PF & Gratuity Benefits (B)', monthly: comp.pfEmployerMonthly + comp.gratuityMonthly, annual: (comp.pfEmployerMonthly + comp.gratuityMonthly) * 12, bg: true },
    ];

    salaryRows.forEach((row) => {
      const rowHeight = 13;
      if (row.bg) {
        streamOps.push('0.97 0.98 0.99 rg');
        streamOps.push(`45 ${currentY - rowHeight} 505 ${rowHeight} re f`);
      }
      streamOps.push('0.85 0.89 0.93 RG');
      streamOps.push(`45 ${currentY - rowHeight} 505 ${rowHeight} re S`);

      streamOps.push('BT');
      streamOps.push(row.bold ? '/F2 7.5 Tf' : '/F1 7.5 Tf');
      streamOps.push('0.15 0.20 0.28 rg');
      streamOps.push(`55 ${currentY - 9.5} Td (${escapePdfText(row.name)}) Tj`);
      streamOps.push(`270 0 Td (${escapePdfText(row.monthly.toLocaleString('en-IN'))}) Tj`);
      streamOps.push(`110 0 Td (${escapePdfText(row.annual.toLocaleString('en-IN'))}) Tj`);
      streamOps.push('ET');

      currentY -= rowHeight;
    });

    // Total CTC Row
    streamOps.push('0.09 0.19 0.29 rg');
    streamOps.push(`45 ${currentY - 16} 505 16 re f`);
    streamOps.push('BT');
    streamOps.push('/F2 8.5 Tf');
    streamOps.push('1 1 1 rg');
    streamOps.push(`55 ${currentY - 11} Td (TOTAL COST TO COMPANY (CTC)) Tj`);
    streamOps.push(`270 0 Td (${escapePdfText(formatCurrencyINR(Math.round(comp.annualCtc / 12)))}) Tj`);
    streamOps.push(`110 0 Td (${escapePdfText(formatCurrencyINR(comp.annualCtc))}) Tj`);
    streamOps.push('ET');
    currentY -= 28;
  }

  // 3. Terms & Confidentiality Note
  streamOps.push('BT');
  streamOps.push('/F1 7.5 Tf');
  streamOps.push('0.39 0.45 0.55 rg');
  streamOps.push(`45 ${currentY} Td (* Standard statutory taxes, TDS, and employee PF will be deducted at source.) Tj`);
  streamOps.push(`0 -10 Td (* Probation period: ${escapePdfText(context.employment.probationPeriod)}. Confirmation contingent on satisfactory review.) Tj`);
  streamOps.push('ET');
  currentY -= 35;

  // 4. Dual Signatures Section (Bottom)
  streamOps.push('0.85 0.89 0.93 RG');
  streamOps.push(`45 ${currentY} m 240 ${currentY} l S`); // Left line
  streamOps.push(`355 ${currentY} m 550 ${currentY} l S`); // Right line

  streamOps.push('BT');
  streamOps.push('/F2 8 Tf');
  streamOps.push('0.09 0.19 0.29 rg');
  streamOps.push(`45 ${currentY - 12} Td (${escapePdfText(company.hrSignatoryName)}) Tj`);
  streamOps.push('/F1 7.5 Tf');
  streamOps.push('0.39 0.45 0.55 rg');
  streamOps.push(`0 -10 Td (${escapePdfText(company.hrSignatoryTitle)}) Tj`);
  streamOps.push(`0 -9 Td (${escapePdfText(company.name)}) Tj`);
  streamOps.push('ET');

  streamOps.push('BT');
  streamOps.push('/F2 8 Tf');
  streamOps.push('0.09 0.19 0.29 rg');
  streamOps.push(`355 ${currentY - 12} Td (Candidate Acceptance Placeholder) Tj`);
  streamOps.push('/F1 7.5 Tf');
  streamOps.push('0.39 0.45 0.55 rg');
  streamOps.push(`0 -10 Td (Name: ${escapePdfText(candidate.fullName)}) Tj`);
  streamOps.push(`0 -9 Td (Date: _____________________) Tj`);
  streamOps.push('ET');

  // Bottom Confidentiality Footer
  streamOps.push('BT');
  streamOps.push('/F1 7 Tf');
  streamOps.push('0.60 0.65 0.72 rg');
  streamOps.push(`160 30 Td (Confidential - ${escapePdfText(company.name)} Enterprise Human Resources Management System) Tj`);
  streamOps.push('ET');

  // Join stream content
  const contentStream = streamOps.join('\n');
  const streamLength = Buffer.byteLength(contentStream, 'utf-8');

  // Assemble PDF Objects
  const objects: string[] = [];

  // Object 1: Catalog
  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`);

  // Object 2: Pages
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`);

  // Object 3: Page (A4)
  objects.push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj`
  );

  // Object 4: Font F1 (Helvetica)
  objects.push(`4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`);

  // Object 5: Font F2 (Helvetica-Bold)
  objects.push(`5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj`);

  // Object 6: Contents Stream
  objects.push(`6 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream\nendobj`);

  // Build binary buffer with byte offsets table
  let pdfOutput = `%PDF-1.4\n%âãÏÓ\n`;
  const offsets: number[] = [0];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdfOutput, 'utf-8'));
    pdfOutput += `${objects[i]}\n`;
  }

  const startXref = Buffer.byteLength(pdfOutput, 'utf-8');
  pdfOutput += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (let i = 1; i <= objects.length; i++) {
    const offStr = String(offsets[i]).padStart(10, '0');
    pdfOutput += `${offStr} 00000 n \n`;
  }

  pdfOutput += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  return Buffer.from(pdfOutput, 'utf-8');
}
