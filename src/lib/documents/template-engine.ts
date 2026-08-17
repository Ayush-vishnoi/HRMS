import {
  type DocumentContextData,
  resolveContextVariables,
  TEMPLATE_VARIABLE_CATALOG,
} from './template-variables';
import { type DocumentTemplateType } from '@prisma/client';

export interface RenderedDocumentResult {
  html: string;
  documentTitle: string;
  templateId: string;
  templateType: DocumentTemplateType;
  templateVersion: number;
  unresolvedVariables: string[];
  resolvedVariables: Record<string, string>;
  generatedAt: string;
}

/**
 * Validates raw template content for potential XSS or unsafe script tags
 */
export function sanitizeAndValidateTemplateContent(rawContent: string): void {
  if (!rawContent || typeof rawContent !== 'string') {
    throw new Error('Template content cannot be empty.');
  }

  // Detect script tags
  if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(rawContent)) {
    throw new Error('Unsafe template content detected: <script> tags are strictly forbidden.');
  }

  // Detect javascript: pseudo-protocols
  if (/javascript\s*:/gi.test(rawContent)) {
    throw new Error('Unsafe template content detected: "javascript:" protocol is strictly forbidden.');
  }

  // Detect iframe tags
  if (/<iframe\b/gi.test(rawContent)) {
    throw new Error('Unsafe template content detected: <iframe> tags are strictly forbidden.');
  }

  // Detect inline event handlers (e.g. onload=, onclick=, onerror=)
  if (/\son[a-zA-Z]+\s*=/gi.test(rawContent)) {
    throw new Error('Unsafe template content detected: inline HTML event handlers are strictly forbidden.');
  }
}

/**
 * Extracts all {{variableName}} placeholders from template text
 */
export function extractVariablesFromTemplate(templateText: string): string[] {
  const matches = templateText.match(/\{\{([a-zA-Z0-9_.]+)\}\}/g) || [];
  return Array.from(new Set(matches.map((m) => m.replace(/[\{\}]/g, '').trim())));
}

/**
 * Validates that all required placeholders in the template can be resolved
 */
export function validateTemplateRequirements(
  templateText: string,
  contextVariables: Record<string, string>
): { missingRequired: string[]; allExtracted: string[] } {
  const extracted = extractVariablesFromTemplate(templateText);
  const missingRequired: string[] = [];

  for (const key of extracted) {
    const catalogItem = TEMPLATE_VARIABLE_CATALOG[key];
    const isRequired = catalogItem?.required || false;
    const value = contextVariables[key];

    if (isRequired && (value === undefined || value === null || value === '')) {
      missingRequired.push(key);
    }
  }

  return { missingRequired, allExtracted: extracted };
}

/**
 * Substitute variables in template content
 */
export function substituteVariables(
  templateText: string,
  variables: Record<string, string>
): { renderedText: string; unresolved: string[] } {
  const unresolved: string[] = [];

  const renderedText = templateText.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    if (Object.prototype.hasOwnProperty.call(variables, trimmedKey)) {
      return variables[trimmedKey];
    }
    unresolved.push(trimmedKey);
    return ''; // Replace unsupported/empty variables with empty string
  });

  return { renderedText, unresolved: Array.from(new Set(unresolved)) };
}

/**
 * Wraps inner document content with executive A4 printable styling, header, and footer
 */
export function wrapDocumentInPrintableLayout(
  bodyHtml: string,
  title: string,
  company: DocumentContextData['company'],
  dateString: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 18mm 22mm 18mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1e293b;
      line-height: 1.6;
      font-size: 13px;
      margin: 0;
      padding: 32px 40px;
      background-color: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .document-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #17324a;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .company-branding h1 {
      margin: 0 0 4px 0;
      font-size: 20px;
      font-weight: 800;
      color: #17324a;
      letter-spacing: -0.5px;
    }
    .company-branding p {
      margin: 2px 0;
      font-size: 11px;
      color: #64748b;
    }
    .document-meta {
      text-align: right;
      font-size: 11px;
      color: #475569;
    }
    .document-badge {
      display: inline-block;
      background-color: #f1f5f9;
      color: #17324a;
      font-weight: 700;
      font-size: 10px;
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .document-content {
      margin-bottom: 32px;
      color: #334155;
    }
    .document-content h1, .document-content h2, .document-content h3 {
      color: #0f172a;
      font-weight: 700;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    .document-content h1 { font-size: 18px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    .document-content h2 { font-size: 15px; }
    .document-content h3 { font-size: 13px; }
    .document-content p { margin: 8px 0; line-height: 1.65; }
    .document-content ul, .document-content ol { margin: 8px 0 12px 20px; padding: 0; }
    .document-content li { margin-bottom: 4px; line-height: 1.5; }
    
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 11px;
    }
    th, td {
      padding: 7px 10px;
      border: 1px solid #cbd5e1;
    }
    th {
      background-color: #f8fafc;
      font-weight: 600;
      color: #1e293b;
    }

    /* Signature Section */
    .signature-section {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .signature-block {
      width: 45%;
      border-top: 1px solid #94a3b8;
      padding-top: 8px;
      font-size: 11px;
      color: #475569;
    }
    .signature-block strong {
      display: block;
      color: #0f172a;
      font-size: 12px;
      margin-bottom: 2px;
    }

    /* Footer */
    .document-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      margin-top: 40px;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      page-break-inside: avoid;
    }

    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="document-header">
    <div class="company-branding">
      <h1>${company.name}</h1>
      <p>${company.address}</p>
      <p>Tel: ${company.phone} | Email: ${company.email} | ${company.website}</p>
    </div>
    <div class="document-meta">
      <span class="document-badge">Official HR Document</span>
      <p style="margin: 4px 0 0 0;"><strong>Date:</strong> ${dateString}</p>
    </div>
  </div>

  <div class="document-content">
    ${bodyHtml}
  </div>

  <div class="signature-section">
    <div class="signature-block">
      <p style="color: #64748b; font-size: 10px; text-transform: uppercase; margin-bottom: 28px;">Authorized Signatory</p>
      <strong>${company.hrSignatoryName}</strong>
      <span>${company.hrSignatoryTitle}</span>
      <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">${company.name}</p>
    </div>
    <div class="signature-block" style="text-align: right;">
      <p style="color: #64748b; font-size: 10px; text-transform: uppercase; margin-bottom: 28px;">Candidate Acceptance</p>
      <strong>Candidate Signature Placeholder</strong>
      <span>Name: ______________________</span>
      <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">Date: ______________________</p>
    </div>
  </div>

  <div class="document-footer">
    <p>This document is confidential and strictly intended for the designated recipient. Issued by People & Talent Operations, ${company.name}.</p>
  </div>
</body>
</html>`;
}

/**
 * Standard Default Template Contents for Offer Letter, Appointment Letter, Joining Letter, and NDA
 */
export const DEFAULT_TEMPLATE_CONTENT_BY_TYPE: Record<DocumentTemplateType, { title: string; content: string }> = {
  Offer_Letter: {
    title: 'Formal Offer of Employment',
    content: `
<h1>Formal Offer of Employment</h1>

<p>Date: <strong>{{generatedDate}}</strong></p>

<p>Dear <strong>{{candidate.fullName}}</strong>,</p>

<p>We are delighted to extend this formal offer of employment for the position of <strong>{{offer.offeredTitle}}</strong> with <strong>{{company.name}}</strong>. Based on your impressive technical evaluations, domain expertise, and cultural alignment, we believe you will make a substantial contribution to our organization.</p>

<h3>1. Position & Reporting</h3>
<p>You will be designated as <strong>{{offer.offeredTitle}}</strong> in the <strong>{{job.department}}</strong> department, reporting to <strong>{{job.hiringManager}}</strong>. Your primary work base location will be <strong>{{job.location}}</strong> ({{employment.workMode}}).</p>

<h3>2. Date of Joining & Validity</h3>
<p>Your proposed date of commencement will be <strong>{{offer.proposedJoinDate}}</strong>. This offer is valid until <strong>{{offer.expiresAt}}</strong>, after which it will automatically lapse unless extended in writing by People Operations.</p>

<h3>3. Compensation Package (Annexure-A)</h3>
<p>Your total Annual Cost to Company (CTC) will be <strong>{{offer.offeredCtc}}</strong> ({{offer.currency}}), structured as follows:</p>

{{compensation.tableHtml}}

<h3>4. Terms of Employment</h3>
<ul>
  <li><strong>Probationary Period:</strong> You will be on probation for a period of <strong>{{employment.probationPeriod}}</strong> from your date of joining. Upon successful review of your performance, your employment will be confirmed in writing.</li>
  <li><strong>Notice Period:</strong> Following confirmation, either party may terminate employment by giving <strong>{{employment.noticePeriod}}</strong> prior written notice or gross salary in lieu thereof.</li>
  <li><strong>Working Hours:</strong> Standard working hours are {{employment.workingHours}}.</li>
  <li><strong>Benefits & Insurance:</strong> You will be entitled to {{benefits}}</li>
</ul>

<p>Please review the enclosed terms and return a signed copy acknowledging your acceptance of this offer.</p>

<p>We look forward to welcoming you to our team!</p>
`.trim(),
  },

  Appointment_Letter: {
    title: 'Formal Letter of Appointment',
    content: `
<h1>Letter of Appointment</h1>

<p>Date: <strong>{{generatedDate}}</strong></p>

<p>Dear <strong>{{candidate.fullName}}</strong>,</p>

<p>Subsequent to your offer acceptance and completion of pre-joining formalities, the Management is pleased to formally appoint you as <strong>{{offer.offeredTitle}}</strong> with <strong>{{company.name}}</strong> effective from your date of joining <strong>{{offer.proposedJoinDate}}</strong>.</p>

<h3>1. Employment Terms & Duties</h3>
<p>You will perform the duties and responsibilities associated with the role of <strong>{{offer.offeredTitle}}</strong> in the <strong>{{job.department}}</strong> department. You agree to devote your whole time and attention to the business affairs of the company.</p>

<h3>2. Compensation & Remuneration</h3>
<p>Your Annual Cost to Company is confirmed at <strong>{{compensation.annualCtc}}</strong>, with a monthly gross salary of <strong>{{compensation.monthlyGross}}</strong> and basic salary of <strong>{{compensation.basicMonthly}}</strong>.</p>

{{compensation.tableHtml}}

<h3>3. Company Policies & Code of Conduct</h3>
<p>During the course of your employment, you will be governed by the standard policies, code of conduct, confidentiality agreements, and information security rules of <strong>{{company.name}}</strong>.</p>

<p>We extend our warmest congratulations on your appointment.</p>
`.trim(),
  },

  NDA: {
    title: 'Employee Non-Disclosure & Confidentiality Agreement',
    content: `
<h1>Employee Non-Disclosure & Proprietary Rights Agreement</h1>

<p>This Non-Disclosure and Confidentiality Agreement is entered into on <strong>{{generatedDate}}</strong> by and between <strong>{{company.name}}</strong> and <strong>{{candidate.fullName}}</strong> (residing at {{candidate.location}}).</p>

<h3>1. Confidential Information</h3>
<p>For purposes of this Agreement, "Confidential Information" shall include all proprietary software code, technical architecture, client data, compensation matrices, business strategies, and intellectual property developed or accessed during employment as <strong>{{offer.offeredTitle}}</strong>.</p>

<h3>2. Non-Disclosure Obligations</h3>
<p>The Employee agrees to maintain strict confidentiality of all proprietary assets and shall not disclose, copy, transfer, or commercialize any confidential material without express prior written authorization from <strong>{{company.name}}</strong>.</p>

<h3>3. Intellectual Property Assignment</h3>
<p>All inventions, software code, designs, and discoveries conceived or developed during the course of employment shall remain the sole and exclusive property of <strong>{{company.name}}</strong>.</p>

<h3>4. Governing Law</h3>
<p>This Agreement shall be governed by and construed in accordance with the laws of India, under the exclusive jurisdiction of the courts in <strong>{{job.location}}</strong>.</p>
`.trim(),
  },

  Relieving_Letter: {
    title: 'Relieving Letter',
    content: `
<h1>Relieving Certificate</h1>
<p>This is to certify that <strong>{{candidate.fullName}}</strong> was employed with <strong>{{company.name}}</strong> as <strong>{{offer.offeredTitle}}</strong> in the <strong>{{job.department}}</strong> department.</p>
`.trim(),
  },

  Experience_Letter: {
    title: 'Service & Experience Certificate',
    content: `
<h1>Experience Certificate</h1>
<p>This is to certify that <strong>{{candidate.fullName}}</strong> has rendered exemplary service with <strong>{{company.name}}</strong> in the capacity of <strong>{{offer.offeredTitle}}</strong>.</p>
`.trim(),
  },

  Custom: {
    title: 'Joining Formalities & Welcome Letter',
    content: `
<h1>Joining Information & Induction Schedule</h1>
<p>Dear <strong>{{candidate.fullName}}</strong>,</p>
<p>We look forward to your joining as <strong>{{offer.offeredTitle}}</strong> on <strong>{{offer.proposedJoinDate}}</strong> at our <strong>{{job.location}}</strong> office.</p>
<p>Your reporting manager is <strong>{{job.hiringManager}}</strong> ({{job.department}} department).</p>
`.trim(),
  },
};

/**
 * Main Template Rendering Function
 */
export function renderDocumentTemplate(
  template: {
    id: string;
    type: DocumentTemplateType;
    name: string;
    content: string;
    version: number;
  },
  contextData: DocumentContextData
): RenderedDocumentResult {
  // 1. Security validation of raw template content
  sanitizeAndValidateTemplateContent(template.content);

  // 2. Resolve context variables dictionary
  const resolvedVariables = resolveContextVariables(contextData);

  // 3. Validate template variable requirements
  const { missingRequired } = validateTemplateRequirements(template.content, resolvedVariables);
  if (missingRequired.length > 0) {
    throw new Error(
      `Template requires missing mandatory variable(s): ${missingRequired.join(', ')}`
    );
  }

  // 4. Perform dynamic variable substitution
  const { renderedText, unresolved } = substituteVariables(template.content, resolvedVariables);

  // 5. Wrap in executive A4 printable styling
  const fullHtml = wrapDocumentInPrintableLayout(
    renderedText,
    template.name,
    contextData.company,
    contextData.generatedDate || resolvedVariables.generatedDate
  );

  return {
    html: fullHtml,
    documentTitle: template.name,
    templateId: template.id,
    templateType: template.type,
    templateVersion: template.version,
    unresolvedVariables: unresolved,
    resolvedVariables,
    generatedAt: new Date().toISOString(),
  };
}
