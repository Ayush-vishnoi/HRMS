/**
 * Offer document generation utilities (Phase 4C-C3).
 *
 * Self-contained: no external PDF library — we hand-roll a minimal PDF 1.4
 * byte generator so offer/appointment/NDA letters can be streamed as
 * application/pdf downloads.
 *
 * Contents:
 *  1. Compensation calculator (legacy-verified formulas)
 *  2. Indian currency formatter
 *  3. {{variable}} template renderer (HTML-escaped, XSS-rejecting)
 *  4. Built-in fallback templates (DocumentTemplate table is not seeded)
 *  5. Minimal PDF 1.4 generator
 */

/* ============================================================
   1. COMPENSATION CALCULATOR
   Verified against legacy tests (scratch/test-phase4c-c1-offer-core.ts):
   - monthlyGross = (annualCtc - variablePayAnnual) / 12
   - basicMonthly = round(monthlyGross * 0.5)
   - hraMonthly   = round(basicMonthly * 0.5)
   - conveyance   = 1600
   - medical      = 1250
   - special      = monthlyGross - (basic + hra + conv + med)
   - PF employer  = min(round(basic * 0.12), 1800)
   - gratuityMonthly = round(basic * 15 / (26 * 12))
   - totalEmployerCostAnnual = annualCtc
   ============================================================ */

export interface OfferCompensation {
  annualCtc: number;
  currency: string;
  variablePayAnnual: number;
  joiningBonus: number;
  monthlyGross: number;
  components: {
    basicMonthly: number;
    hraMonthly: number;
    conveyanceMonthly: number;
    medicalMonthly: number;
    specialAllowanceMonthly: number;
  };
  employerContributions: {
    pfEmployerMonthly: number;
    gratuityMonthly: number;
    totalEmployerMonthly: number;
    totalEmployerAnnual: number;
  };
  estimatedNetTakeHomeMonthly: number;
  totalEmployerCostAnnual: number;
}

export function calculateOfferCompensation(
  annualCtc: number,
  variablePayAnnual = 0,
  joiningBonus = 0,
  currency = 'INR',
): OfferCompensation {
  const safeAnnual = Number.isFinite(annualCtc) && annualCtc > 0 ? annualCtc : 0;
  const safeVariable =
    Number.isFinite(variablePayAnnual) && variablePayAnnual > 0 ? variablePayAnnual : 0;
  const safeJoining =
    Number.isFinite(joiningBonus) && joiningBonus > 0 ? joiningBonus : 0;

  const monthlyGross = Math.round((safeAnnual - safeVariable) / 12);
  const basicMonthly = Math.round(monthlyGross * 0.5);
  const hraMonthly = Math.round(basicMonthly * 0.5);
  const conveyanceMonthly = 1600;
  const medicalMonthly = 1250;
  const specialAllowanceMonthly = Math.max(
    0,
    monthlyGross - (basicMonthly + hraMonthly + conveyanceMonthly + medicalMonthly),
  );

  const pfEmployeeMonthly = Math.min(Math.round(basicMonthly * 0.12), 1800);
  const pfEmployerMonthly = pfEmployeeMonthly;
  const gratuityMonthly = Math.round((basicMonthly * 15) / (26 * 12));
  const totalEmployerMonthly = pfEmployerMonthly + gratuityMonthly;
  const totalEmployerAnnual = totalEmployerMonthly * 12;

  // Professional tax (Karnataka-style slab) + simple new-regime tax estimate
  const professionalTaxMonthly = monthlyGross > 25000 ? 200 : 150;
  const annualTaxable = Math.max(0, monthlyGross * 12 - 50000); // std deduction
  let taxAnnual = 0;
  if (annualTaxable <= 300000) taxAnnual = 0;
  else if (annualTaxable <= 700000)
    taxAnnual = (annualTaxable - 300000) * 0.05;
  else if (annualTaxable <= 1000000)
    taxAnnual = 20000 + (annualTaxable - 700000) * 0.1;
  else if (annualTaxable <= 1200000)
    taxAnnual = 50000 + (annualTaxable - 1000000) * 0.15;
  else if (annualTaxable <= 1500000)
    taxAnnual = 80000 + (annualTaxable - 1200000) * 0.2;
  else taxAnnual = 140000 + (annualTaxable - 1500000) * 0.3;
  const taxMonthly = Math.round(taxAnnual / 12);

  const estimatedNetTakeHomeMonthly = Math.max(
    0,
    monthlyGross -
      pfEmployeeMonthly -
      professionalTaxMonthly -
      taxMonthly +
      Math.round(safeJoining / 12),
  );

  return {
    annualCtc: safeAnnual,
    currency: currency || 'INR',
    variablePayAnnual: safeVariable,
    joiningBonus: safeJoining,
    monthlyGross,
    components: {
      basicMonthly,
      hraMonthly,
      conveyanceMonthly,
      medicalMonthly,
      specialAllowanceMonthly,
    },
    employerContributions: {
      pfEmployerMonthly,
      gratuityMonthly,
      totalEmployerMonthly,
      totalEmployerAnnual,
    },
    estimatedNetTakeHomeMonthly,
    totalEmployerCostAnnual: safeAnnual,
  };
}

/* ============================================================
   2. INDIAN CURRENCY FORMATTER
   '₹36,00,000' via toLocaleString('en-IN')
   ============================================================ */

export function formatIndianCurrency(amount: number, currency = 'INR'): string {
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : `${currency} `;
  return `${symbol}${Math.round(Number(amount) || 0).toLocaleString('en-IN')}`;
}

/* ============================================================
   3. TEMPLATE RENDERER
   Replaces {{variable}} placeholders. Values are HTML-escaped.
   Rejects <script> / event-handler / javascript: injection.
   ============================================================ */

export function escapeHtml(value: string): string {
  // AMP is written as a unicode escape ('&' escaped) so literal HTML
  // entities never appear in this source file.
  const AMP = '\u0026';
  return value
    .replace(/&/g, AMP + 'amp;')
    .replace(/</g, AMP + 'lt;')
    .replace(/>/g, AMP + 'gt;')
    .replace(/"/g, AMP + 'quot;')
    .replace(/'/g, AMP + '#39;');
}

const XSS_PATTERN = /<script|javascript:|onerror\s*=|onload\s*=|on\w+\s*=/i;

export function assertNoXss(text: string, label = 'Content'): void {
  if (XSS_PATTERN.test(text)) {
    throw new Error(`${label} contains disallowed markup (XSS rejected).`);
  }
}

export function renderTemplate(
  template: string,
  variables: Record<string, unknown>,
): string {
  assertNoXss(template, 'Template');
  return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_match, key: string) => {
    const value = variables[key];
    if (value === undefined || value === null) return '';
    if (typeof value === 'number') return String(value);
    return escapeHtml(String(value));
  });
}

/* ============================================================
   4. BUILT-IN FALLBACK TEMPLATES
   DocumentTemplates are not seeded — use these when the DB table
   has no active row for the requested type.
   Company branding: MYLOTIC GROUP.
   ============================================================ */

export const DOC_TYPES = ['Offer_Letter', 'Appointment_Letter', 'NDA'] as const;
export type DocType = (typeof DOC_TYPES)[number];

export interface BuiltInTemplate {
  id: string;
  name: string;
  type: DocType;
  content: string;
}

export const BUILTIN_TEMPLATES: BuiltInTemplate[] = [
  {
    id: 'builtin-offer-letter',
    name: 'Standard Offer Letter (v1)',
    type: 'Offer_Letter',
    content: `<div class="offer-letter">
  <p class="company-name">MYLOTIC GROUP</p>
  <h2>Offer of Employment</h2>
  <p>Dear {{candidate.fullName}},</p>
  <p>We are pleased to offer you the position of <strong>{{offer.offeredTitle}}</strong> at MYLOTIC GROUP. We were impressed with your background and believe you will be a valuable addition to our team.</p>
  <h3>Compensation Details</h3>
  {{compensation.tableHtml}}
  <p>Your proposed joining date is {{offer.proposedJoinDate}}. This offer is valid until {{offer.expiresAt}}.</p>
  <p>We look forward to welcoming you aboard.</p>
  <p>Sincerely,<br/>Human Resources<br/>MYLOTIC GROUP</p>
</div>`,
  },
  {
    id: 'builtin-appointment-letter',
    name: 'Standard Appointment Letter (v1)',
    type: 'Appointment_Letter',
    content: `<div class="appointment-letter">
  <p class="company-name">MYLOTIC GROUP</p>
  <h2>Letter of Appointment</h2>
  <p>Dear {{candidate.fullName}},</p>
  <p>This is to formally confirm your appointment as <strong>{{offer.offeredTitle}}</strong> with MYLOTIC GROUP, effective {{offer.proposedJoinDate}}.</p>
  <h3>Remuneration</h3>
  {{compensation.tableHtml}}
  <p>You will be governed by the company's policies, code of conduct, and confidentiality terms as applicable from time to time.</p>
  <p>With best wishes,<br/>Human Resources<br/>MYLOTIC GROUP</p>
</div>`,
  },
  {
    id: 'builtin-nda',
    name: 'Standard Non-Disclosure Agreement (v1)',
    type: 'NDA',
    content: `<div class="nda">
  <p class="company-name">MYLOTIC GROUP</p>
  <h2>Non-Disclosure Agreement</h2>
  <p>This Non-Disclosure Agreement is entered into between <strong>MYLOTIC GROUP</strong> ("the Company") and <strong>{{candidate.fullName}}</strong> ("the Recipient") effective {{offer.proposedJoinDate}}.</p>
  <p>The Recipient agrees to hold in strict confidence all proprietary and confidential information disclosed by the Company, including but not limited to business plans, compensation terms, client data, and technical materials.</p>
  <p>This obligation survives the termination of any employment relationship for a period of five (5) years.</p>
  <p>Signed,<br/>For MYLOTIC GROUP</p>
</div>`,
  },
];

/* ============================================================
   5. MINIMAL PDF 1.4 GENERATOR
   Produces a valid single-page PDF from plain text lines.
   ============================================================ */

function pdfEscapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/** Strip HTML tags for PDF rendering (templates are HTML-based). */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h1|h2|h3|h4|li|tr)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '  • ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u0026nbsp;/g, ' ')
    .replace(/\u0026amp;/g, '\u0026')
    .replace(/\u0026lt;/g, '<')
    .replace(/\u0026gt;/g, '>')
    .replace(/\u0026quot;/g, '"')
    .replace(/\u0026#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface PdfLine {
  text: string;
  bold?: boolean;
  size?: number;
}

/** Simple table row lines for compensation PDF rendering. */
export function compensationTableRows(comp: OfferCompensation): string[] {
  const f = (n: number) => formatIndianCurrency(n, comp.currency);
  return [
    'ANNUAL COMPENSATION (CTC): ' + f(comp.annualCtc),
    'Fixed Monthly Gross: ' + f(comp.monthlyGross),
    '  Basic: ' + f(comp.components.basicMonthly),
    '  HRA: ' + f(comp.components.hraMonthly),
    '  Conveyance: ' + f(comp.components.conveyanceMonthly),
    '  Medical: ' + f(comp.components.medicalMonthly),
    '  Special Allowance: ' + f(comp.components.specialAllowanceMonthly),
    'Variable Pay (Annual): ' + f(comp.variablePayAnnual),
    'Joining Bonus (Annual): ' + f(comp.joiningBonus),
    'Employer PF (Monthly): ' + f(comp.employerContributions.pfEmployerMonthly),
    'Employer Gratuity (Monthly): ' + f(comp.employerContributions.gratuityMonthly),
    'Estimated Net Take-Home (Monthly): ' + f(comp.estimatedNetTakeHomeMonthly),
  ];
}

/**
 * Render a one-or-multi-page PDF from text lines.
 * Uses Helvetica / Helvetica-Bold; escapes parentheses and backslashes.
 * ₹ is not in PDF-standard WinAnsi — replaced with 'Rs.'.
 */
export function generatePdf(lines: PdfLine[]): Buffer {
  const PAGE_W = 595.28; // A4
  const PAGE_H = 841.89;
  const MARGIN = 56;
  const LINE_H = 16;
  const MAX_Y = PAGE_H - MARGIN;

  // paginate
  const pages: PdfLine[][] = [];
  let current: PdfLine[] = [];
  let y = MARGIN;
  for (const line of lines) {
    if (y + LINE_H > PAGE_H - MARGIN) {
      pages.push(current);
      current = [];
      y = MARGIN;
    }
    current.push(line);
    y += LINE_H;
  }
  if (current.length > 0) pages.push(current);
  if (pages.length === 0) pages.push([]);

  const objects: string[] = [];
  const pageObjStart = 3; // 1 catalog, 2 pages, content+fonts after
  const fontRegular = 3;
  const fontBold = 4;
  // page object numbering: 5..(4+pages.length)

  // Build content streams
  const contentStreams: string[] = [];
  for (const page of pages) {
    let stream = '';
    let py = PAGE_H - MARGIN;
    for (const line of page) {
      const size = line.size ?? 10;
      const font = line.bold ? '/F2' : '/F1';
      const text = pdfEscapeText(line.text.replace(/₹/g, 'Rs.'));
      stream += `BT ${font} ${size} Tf 1 0 0 1 ${MARGIN} ${py.toFixed(2)} Tm (${text}) Tj ET\n`;
      py -= LINE_H;
    }
    contentStreams.push(stream);
  }

  // Object 1: catalog
  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  // Object 2: pages tree
  const pageRefs = pages.map((_, i) => `${5 + i} 0 R`).join(' ');
  objects[2] = `<< /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >>`;
  // Object 3: Helvetica
  objects[fontRegular] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;
  // Object 4: Helvetica-Bold
  objects[fontBold] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`;

  // Page objects + content objects
  let nextObj = 5;
  const contentObjIds: number[] = [];
  for (let i = 0; i < pages.length; i++) {
    const pageId = nextObj++;
    const contentId = nextObj++;
    contentObjIds.push(contentId);
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> ` +
      `/Contents ${contentId} 0 R >>`;
    const stream = contentStreams[i];
    objects[contentId] = `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}endstream`;
  }

  // Serialize with xref table
  const parts: Buffer[] = [];
  const offsets: number[] = [];
  let position = 0;
  const header = '%PDF-1.4\n';
  parts.push(Buffer.from(header, 'latin1'));
  position += header.length;

  for (let i = 1; i < objects.length; i++) {
    const obj = objects[i];
    if (!obj) continue;
    const chunk = `${i} 0 obj\n${obj}\nendobj\n`;
    offsets[i] = position;
    parts.push(Buffer.from(chunk, 'latin1'));
    position += chunk.length;
  }

  const xrefStart = position;
  const maxObj = objects.length; // objects[maxObj-1] may be undefined if skipped — compute properly
  let highest = 1;
  for (let i = 1; i < objects.length; i++) if (objects[i]) highest = i;
  const totalObjects = highest + 0;
  const xref: string[] = [];
  xref.push(`xref\n0 ${totalObjects + 1}\n`);
  xref.push('0000000000 65535 f \n');
  for (let i = 1; i <= totalObjects; i++) {
    const off = offsets[i] ?? 0;
    xref.push(`${String(off).padStart(10, '0')} 00000 ${off ? 'n' : 'f'} \n`);
  }
  const trailer =
    `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  parts.push(Buffer.from(xref.join(''), 'latin1'));
  parts.push(Buffer.from(trailer, 'latin1'));

  return Buffer.concat(parts);
}

/** Build the offer-document PDF for a rendered template. */
export function buildOfferLetterPdf(
  title: string,
  renderedHtml: string,
  comp: OfferCompensation,
): Buffer {
  const text = htmlToText(renderedHtml);
  const lines: PdfLine[] = [
    { text: 'MYLOTIC GROUP', bold: true, size: 14 },
    { text: title, bold: true, size: 12 },
    { text: '' },
    ...text.split('\n').map((l) => ({ text: l })),
  ];
  return generatePdf(lines);
}
