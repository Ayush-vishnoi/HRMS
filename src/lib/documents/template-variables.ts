/**
 * Template Variable Registry for HRMS Offer Document Generation (Phase 4C-C3)
 * Central dictionary of all supported document variables, formats, and sources.
 */

export interface TemplateVariableDefinition {
  key: string;
  category: 'candidate' | 'job' | 'offer' | 'compensation' | 'employment' | 'company' | 'benefits';
  label: string;
  description: string;
  example: string;
  required?: boolean;
}

export interface DocumentContextData {
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone?: string | null;
    location?: string | null;
    currentRole?: string | null;
    experience?: string | null;
  };
  job: {
    id: string;
    title: string;
    department: string;
    location: string;
    jobCode?: string | null;
    hiringManagerName?: string | null;
    recruiterName?: string | null;
  };
  offer: {
    id: string;
    version: number;
    status: string;
    offeredTitle: string;
    offeredCtc: number;
    currency: string;
    proposedJoinDate?: string | null;
    expiresAt?: string | null;
    contentSnapshot?: Record<string, unknown> | null;
  };
  compensation: {
    annualCtc: number;
    monthlyGross: number;
    basicMonthly: number;
    hraMonthly: number;
    conveyanceMonthly: number;
    specialAllowanceMonthly: number;
    medicalAllowanceMonthly: number;
    basicAnnual: number;
    hraAnnual: number;
    specialAllowanceAnnual: number;
    variablePayAnnual: number;
    joiningBonus: number;
    retentionBonus: number;
    pfEmployerMonthly: number;
    pfEmployeeMonthly: number;
    gratuityMonthly: number;
    estimatedNetTakeHomeMonthly: number;
    totalEmployerCostMonthly: number;
    tableHtml?: string;
  };
  employment: {
    probationPeriod: string;
    noticePeriod: string;
    workingHours: string;
    workMode: string;
  };
  company: {
    name: string;
    address: string;
    email: string;
    phone: string;
    website: string;
    hrSignatoryName: string;
    hrSignatoryTitle: string;
  };
  benefits?: string[];
  generatedDate?: string;
}

/**
 * Standard variable catalog registry
 */
export const TEMPLATE_VARIABLE_CATALOG: Record<string, TemplateVariableDefinition> = {
  // Candidate
  'candidate.firstName': {
    key: 'candidate.firstName',
    category: 'candidate',
    label: 'Candidate First Name',
    description: 'First name of the applicant/candidate',
    example: 'Aarav',
    required: true,
  },
  'candidate.lastName': {
    key: 'candidate.lastName',
    category: 'candidate',
    label: 'Candidate Last Name',
    description: 'Last name of the applicant/candidate',
    example: 'Sen',
  },
  'candidate.fullName': {
    key: 'candidate.fullName',
    category: 'candidate',
    label: 'Candidate Full Name',
    description: 'Full official name of candidate',
    example: 'Aarav Sen',
    required: true,
  },
  'candidate.email': {
    key: 'candidate.email',
    category: 'candidate',
    label: 'Candidate Email',
    description: 'Primary email address of candidate',
    example: 'aarav.sen@example.com',
    required: true,
  },
  'candidate.phone': {
    key: 'candidate.phone',
    category: 'candidate',
    label: 'Candidate Phone',
    description: 'Contact phone number of candidate',
    example: '+91 98765 43210',
  },
  'candidate.location': {
    key: 'candidate.location',
    category: 'candidate',
    label: 'Candidate Location',
    description: 'Candidate home or base city location',
    example: 'Bengaluru, India',
  },

  // Job
  'job.title': {
    key: 'job.title',
    category: 'job',
    label: 'Requisition Title',
    description: 'Title of the job opening requisition',
    example: 'Staff Backend Architect',
    required: true,
  },
  'job.department': {
    key: 'job.department',
    category: 'job',
    label: 'Department',
    description: 'Department or business division',
    example: 'Engineering',
    required: true,
  },
  'job.location': {
    key: 'job.location',
    category: 'job',
    label: 'Work Location',
    description: 'Job posting location / primary base office',
    example: 'Bengaluru',
    required: true,
  },
  'job.jobCode': {
    key: 'job.jobCode',
    category: 'job',
    label: 'Job Code',
    description: 'Unique requisition identifier',
    example: 'JOB-2026-081',
  },
  'job.hiringManager': {
    key: 'job.hiringManager',
    category: 'job',
    label: 'Hiring Manager Name',
    description: 'Name of the designated hiring manager',
    example: 'Priya Sharma',
  },

  // Offer
  'offer.version': {
    key: 'offer.version',
    category: 'offer',
    label: 'Offer Version',
    description: 'Version number of the offer',
    example: '1',
  },
  'offer.status': {
    key: 'offer.status',
    category: 'offer',
    label: 'Offer Status',
    description: 'Current approval/dispatch status',
    example: 'Approved',
  },
  'offer.offeredTitle': {
    key: 'offer.offeredTitle',
    category: 'offer',
    label: 'Offered Designation',
    description: 'Specific designation/job title offered to candidate',
    example: 'Staff Backend Architect',
    required: true,
  },
  'offer.offeredCtc': {
    key: 'offer.offeredCtc',
    category: 'offer',
    label: 'Offered Annual CTC (Formatted)',
    description: 'Formatted annual cost to company in INR',
    example: '₹36,00,000',
    required: true,
  },
  'offer.currency': {
    key: 'offer.currency',
    category: 'offer',
    label: 'Currency',
    description: 'Currency denomination for compensation',
    example: 'INR',
  },
  'offer.proposedJoinDate': {
    key: 'offer.proposedJoinDate',
    category: 'offer',
    label: 'Proposed Joining Date',
    description: 'Expected starting date of employment',
    example: 'September 1, 2026',
    required: true,
  },
  'offer.expiresAt': {
    key: 'offer.expiresAt',
    category: 'offer',
    label: 'Offer Expiry Date',
    description: 'Formal offer acceptance deadline',
    example: 'August 25, 2026',
  },

  // Compensation
  'compensation.annualCtc': {
    key: 'compensation.annualCtc',
    category: 'compensation',
    label: 'Annual CTC (₹)',
    description: 'Total Annual Cost to Company (INR)',
    example: '₹36,00,000',
    required: true,
  },
  'compensation.monthlyGross': {
    key: 'compensation.monthlyGross',
    category: 'compensation',
    label: 'Monthly Gross Salary',
    description: 'Total monthly earnings before deductions',
    example: '₹2,92,400',
  },
  'compensation.basicMonthly': {
    key: 'compensation.basicMonthly',
    category: 'compensation',
    label: 'Basic Pay (Monthly)',
    description: 'Monthly basic salary component (50% of CTC standard)',
    example: '₹1,50,000',
  },
  'compensation.hraMonthly': {
    key: 'compensation.hraMonthly',
    category: 'compensation',
    label: 'HRA (Monthly)',
    description: 'Monthly House Rent Allowance component',
    example: '₹75,000',
  },
  'compensation.specialAllowanceMonthly': {
    key: 'compensation.specialAllowanceMonthly',
    category: 'compensation',
    label: 'Special Allowance (Monthly)',
    description: 'Monthly special balancing allowance',
    example: '₹64,550',
  },
  'compensation.basicAnnual': {
    key: 'compensation.basicAnnual',
    category: 'compensation',
    label: 'Basic Pay (Annual)',
    description: 'Annual basic salary component',
    example: '₹18,00,000',
  },
  'compensation.hraAnnual': {
    key: 'compensation.hraAnnual',
    category: 'compensation',
    label: 'HRA (Annual)',
    description: 'Annual House Rent Allowance component',
    example: '₹9,00,000',
  },
  'compensation.specialAllowanceAnnual': {
    key: 'compensation.specialAllowanceAnnual',
    category: 'compensation',
    label: 'Special Allowance (Annual)',
    description: 'Annual special balancing allowance',
    example: '₹7,74,600',
  },
  'compensation.variablePayAnnual': {
    key: 'compensation.variablePayAnnual',
    category: 'compensation',
    label: 'Annual Variable Pay / Performance Bonus',
    description: 'Performance-linked annual incentive',
    example: '₹3,00,000',
  },
  'compensation.joiningBonus': {
    key: 'compensation.joiningBonus',
    category: 'compensation',
    label: 'Joining Bonus',
    description: 'One-time sign-on bonus payable on joining',
    example: '₹1,00,000',
  },
  'compensation.estimatedNetTakeHomeMonthly': {
    key: 'compensation.estimatedNetTakeHomeMonthly',
    category: 'compensation',
    label: 'Estimated Net Monthly In-Hand',
    description: 'Estimated monthly net in-hand payout after standard PF and PT deductions',
    example: '₹2,89,600',
  },
  'compensation.tableHtml': {
    key: 'compensation.tableHtml',
    category: 'compensation',
    label: 'Annexure Salary Breakdown Table (HTML)',
    description: 'Structured HTML Annexure-A compensation table',
    example: '<table>...</table>',
  },

  // Employment
  'employment.probationPeriod': {
    key: 'employment.probationPeriod',
    category: 'employment',
    label: 'Probation Period',
    description: 'Initial employment probation duration',
    example: '6 Months',
  },
  'employment.noticePeriod': {
    key: 'employment.noticePeriod',
    category: 'employment',
    label: 'Notice Period',
    description: 'Standard resignation/termination notice period',
    example: '60 Days',
  },
  'employment.workingHours': {
    key: 'employment.workingHours',
    category: 'employment',
    label: 'Standard Working Hours',
    description: 'Weekly scheduled work hours expectation',
    example: '40 hours per week (Monday to Friday, 9:00 AM - 6:00 PM)',
  },
  'employment.workMode': {
    key: 'employment.workMode',
    category: 'employment',
    label: 'Work Mode',
    description: 'Office, Hybrid, or Remote arrangement',
    example: 'Hybrid (3 days office, 2 days remote)',
  },

  // Company
  'company.name': {
    key: 'company.name',
    category: 'company',
    label: 'Company Name',
    description: 'Official corporate legal entity name',
    example: 'Mylotic Group Private Limited',
  },
  'company.address': {
    key: 'company.address',
    category: 'company',
    label: 'Company Address',
    description: 'Registered corporate office address',
    example: '100 Innovation Park, Whitefield, Bengaluru, Karnataka 560066',
  },
  'company.email': {
    key: 'company.email',
    category: 'company',
    label: 'Company HR Contact Email',
    description: 'HR operations inquiries contact email',
    example: 'hr@mylotic.com',
  },
  'company.phone': {
    key: 'company.phone',
    category: 'company',
    label: 'Company Phone',
    description: 'Corporate telephone contact number',
    example: '+91 80 4123 4567',
  },
  'company.website': {
    key: 'company.website',
    category: 'company',
    label: 'Company Website',
    description: 'Official company website URL',
    example: 'https://www.mylotic.com',
  },
  'company.hrSignatoryName': {
    key: 'company.hrSignatoryName',
    category: 'company',
    label: 'HR Signatory Name',
    description: 'Authorized HR executive name for signature block',
    example: 'Ayush Vishnoi',
  },
  'company.hrSignatoryTitle': {
    key: 'company.hrSignatoryTitle',
    category: 'company',
    label: 'HR Signatory Title',
    description: 'Authorized HR executive job title',
    example: 'Head of People Operations',
  },

  // Benefits
  'benefits': {
    key: 'benefits',
    category: 'benefits',
    label: 'Benefits Summary',
    description: 'Corporate employee health, wellness, and insurance benefits summary',
    example: 'Comprehensive Medical Insurance (₹5,00,000 coverage), Gratuity, Annual Wellness Allowance.',
  },
  'generatedDate': {
    key: 'generatedDate',
    category: 'company',
    label: 'Document Date',
    description: 'Current document issue date',
    example: 'August 17, 2026',
  },
};

/**
 * Format currency amounts nicely in Indian numbering format (e.g. ₹36,00,000)
 */
export function formatCurrencyINR(amount: number): string {
  if (isNaN(amount) || amount === 0) return '₹0';
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

/**
 * Format date nicely in long English format (e.g. August 17, 2026)
 */
export function formatLongDate(dateInput?: string | Date | null): string {
  if (!dateInput) return 'TBD';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'TBD';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Generates structured HTML Annexure-A Salary Breakdown table
 */
export function generateCompensationTableHtml(data: DocumentContextData['compensation']): string {
  return `
<table class="salary-table" style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 11px; font-family: inherit;">
  <thead>
    <tr style="background-color: #17324A; color: #ffffff; text-align: left;">
      <th style="padding: 8px 10px; border: 1px solid #17324A; font-weight: 600;">Salary Component</th>
      <th style="padding: 8px 10px; border: 1px solid #17324A; text-align: right; font-weight: 600;">Monthly Amount (₹)</th>
      <th style="padding: 8px 10px; border: 1px solid #17324A; text-align: right; font-weight: 600;">Annual Amount (₹)</th>
    </tr>
  </thead>
  <tbody>
    <tr style="background-color: #F8FAFC;">
      <td style="padding: 6px 10px; border: 1px solid #E2E8F0; font-weight: 600; color: #1E293B;">Basic Pay</td>
      <td style="padding: 6px 10px; border: 1px solid #E2E8F0; text-align: right; color: #1E293B;">${data.basicMonthly.toLocaleString('en-IN')}</td>
      <td style="padding: 6px 10px; border: 1px solid #E2E8F0; text-align: right; color: #1E293B;">${data.basicAnnual.toLocaleString('en-IN')}</td>
    </tr>
    <tr>
      <td style="padding: 6px 10px; border: 1px solid #E2E8F0; color: #334155;">House Rent Allowance (HRA)</td>
      <td style="padding: 6px 10px; border: 1px solid #E2E8F0; text-align: right; color: #334155;">${data.hraMonthly.toLocaleString('en-IN')}</td>
      <td style="padding: 6px 10px; border: 1px solid #E2E8F0; text-align: right; color: #334155;">${data.hraAnnual.toLocaleString('en-IN')}</td>
    </tr>
    <tr style="background-color: #F8FAFC;">
      <td style="padding: 6px 10px; border: 1px solid #E2E8F0; color: #334155;">Conveyance Allowance</td>
      <td style="padding: 6px 10px; border: 1px solid #E2E8F0; text-align: right; color: #334155;">${data.conveyanceMonthly.toLocaleString('en-IN')}</td>
      <td style="padding: 6px 10px; border: 1px solid #E2E8F0; text-align: right; color: #334155;">${(data.conveyanceMonthly * 12).toLocaleString('en-IN')}</td>
    </tr>
    <tr>
      <td style="padding: 6px 10px; border: 1px solid #E2E8F0; color: #334155;">Medical Allowance</td>
      <td style="padding: 6px 10px; border: 1px solid #E2E8F0; text-align: right; color: #334155;">${data.medicalAllowanceMonthly.toLocaleString('en-IN')}</td>
      <td style="padding: 6px 10px; border: 1px solid #E2E8F0; text-align: right; color: #334155;">${(data.medicalAllowanceMonthly * 12).toLocaleString('en-IN')}</td>
    </tr>
    <tr style="background-color: #F8FAFC;">
      <td style="padding: 6px 10px; border: 1px solid #E2E8F0; color: #334155;">Special Allowance</td>
      <td style="padding: 6px 10px; border: 1px solid #E2E8F0; text-align: right; color: #334155;">${data.specialAllowanceMonthly.toLocaleString('en-IN')}</td>
      <td style="padding: 6px 10px; border: 1px solid #E2E8F0; text-align: right; color: #334155;">${data.specialAllowanceAnnual.toLocaleString('en-IN')}</td>
    </tr>
    <tr style="background-color: #F1F5F9; font-weight: 700; color: #0F172A;">
      <td style="padding: 7px 10px; border: 1px solid #CBD5E1;">(A) Total Monthly Gross Earnings</td>
      <td style="padding: 7px 10px; border: 1px solid #CBD5E1; text-align: right;">₹${data.monthlyGross.toLocaleString('en-IN')}</td>
      <td style="padding: 7px 10px; border: 1px solid #CBD5E1; text-align: right;">₹${(data.monthlyGross * 12).toLocaleString('en-IN')}</td>
    </tr>
    <tr>
      <td style="padding: 6px 10px; border: 1px solid #E2E8F0; color: #475569;">Employer PF Contribution (12% capped)</td>
      <td style="padding: 6px 10px; border: 1px solid #E2E8F0; text-align: right; color: #475569;">${data.pfEmployerMonthly.toLocaleString('en-IN')}</td>
      <td style="padding: 6px 10px; border: 1px solid #E2E8F0; text-align: right; color: #475569;">${(data.pfEmployerMonthly * 12).toLocaleString('en-IN')}</td>
    </tr>
    <tr style="background-color: #F8FAFC;">
      <td style="padding: 6px 10px; border: 1px solid #E2E8F0; color: #475569;">Gratuity Accrual Provision (4.81% Basic)</td>
      <td style="padding: 6px 10px; border: 1px solid #E2E8F0; text-align: right; color: #475569;">${data.gratuityMonthly.toLocaleString('en-IN')}</td>
      <td style="padding: 6px 10px; border: 1px solid #E2E8F0; text-align: right; color: #475569;">${(data.gratuityMonthly * 12).toLocaleString('en-IN')}</td>
    </tr>
    <tr style="background-color: #E2E8F0; font-weight: 700; color: #0F172A;">
      <td style="padding: 7px 10px; border: 1px solid #94A3B8;">(B) Total Employer Statutory Benefits</td>
      <td style="padding: 7px 10px; border: 1px solid #94A3B8; text-align: right;">₹${(data.pfEmployerMonthly + data.gratuityMonthly).toLocaleString('en-IN')}</td>
      <td style="padding: 7px 10px; border: 1px solid #94A3B8; text-align: right;">₹${((data.pfEmployerMonthly + data.gratuityMonthly) * 12).toLocaleString('en-IN')}</td>
    </tr>
    ${data.variablePayAnnual > 0 ? `
    <tr>
      <td style="padding: 6px 10px; border: 1px solid #E2E8F0; color: #0369A1; font-weight: 600;">(C) Annual Target Variable Pay</td>
      <td style="padding: 6px 10px; border: 1px solid #E2E8F0; text-align: right; color: #0369A1;">-</td>
      <td style="padding: 6px 10px; border: 1px solid #E2E8F0; text-align: right; color: #0369A1; font-weight: 600;">₹${data.variablePayAnnual.toLocaleString('en-IN')}</td>
    </tr>` : ''}
    ${data.joiningBonus > 0 ? `
    <tr style="background-color: #F8FAFC;">
      <td style="padding: 6px 10px; border: 1px solid #E2E8F0; color: #166534; font-weight: 600;">(D) One-Time Joining Bonus</td>
      <td style="padding: 6px 10px; border: 1px solid #E2E8F0; text-align: right; color: #166534;">-</td>
      <td style="padding: 6px 10px; border: 1px solid #E2E8F0; text-align: right; color: #166534; font-weight: 600;">₹${data.joiningBonus.toLocaleString('en-IN')}</td>
    </tr>` : ''}
    <tr style="background-color: #17324A; color: #FFFFFF; font-weight: 800; font-size: 12px;">
      <td style="padding: 9px 10px; border: 1px solid #17324A;">TOTAL COST TO COMPANY (CTC)</td>
      <td style="padding: 9px 10px; border: 1px solid #17324A; text-align: right;">₹${Math.round(data.annualCtc / 12).toLocaleString('en-IN')}</td>
      <td style="padding: 9px 10px; border: 1px solid #17324A; text-align: right;">₹${data.annualCtc.toLocaleString('en-IN')}</td>
    </tr>
  </tbody>
</table>
<p style="font-size: 10px; color: #64748B; margin: 4px 0 12px 0;">* Note: Income tax (TDS) and employee statutory deductions (PF ₹1,800/mo + PT ₹200/mo) will be deducted at source as per applicable statutory laws.</p>
`.trim();
}

/**
 * Resolves all variables from context into a key-value dictionary
 */
export function resolveContextVariables(context: DocumentContextData): Record<string, string> {
  const comp = context.compensation;
  const tableHtml = comp.tableHtml || generateCompensationTableHtml(comp);

  const vars: Record<string, string> = {
    // Candidate
    'candidate.firstName': context.candidate.firstName,
    'candidate.lastName': context.candidate.lastName,
    'candidate.fullName': context.candidate.fullName,
    'candidate.email': context.candidate.email,
    'candidate.phone': context.candidate.phone || '',
    'candidate.location': context.candidate.location || '',

    // Job
    'job.title': context.job.title,
    'job.department': context.job.department,
    'job.location': context.job.location,
    'job.jobCode': context.job.jobCode || context.job.id,
    'job.hiringManager': context.job.hiringManagerName || 'Hiring Leadership',

    // Offer
    'offer.version': String(context.offer.version),
    'offer.status': context.offer.status,
    'offer.offeredTitle': context.offer.offeredTitle,
    'offer.offeredCtc': formatCurrencyINR(context.offer.offeredCtc),
    'offer.currency': context.offer.currency,
    'offer.proposedJoinDate': formatLongDate(context.offer.proposedJoinDate),
    'offer.expiresAt': formatLongDate(context.offer.expiresAt),

    // Compensation
    'compensation.annualCtc': formatCurrencyINR(comp.annualCtc),
    'compensation.monthlyGross': formatCurrencyINR(comp.monthlyGross),
    'compensation.basicMonthly': formatCurrencyINR(comp.basicMonthly),
    'compensation.hraMonthly': formatCurrencyINR(comp.hraMonthly),
    'compensation.conveyanceMonthly': formatCurrencyINR(comp.conveyanceMonthly),
    'compensation.specialAllowanceMonthly': formatCurrencyINR(comp.specialAllowanceMonthly),
    'compensation.medicalAllowanceMonthly': formatCurrencyINR(comp.medicalAllowanceMonthly),
    'compensation.basicAnnual': formatCurrencyINR(comp.basicAnnual),
    'compensation.hraAnnual': formatCurrencyINR(comp.hraAnnual),
    'compensation.specialAllowanceAnnual': formatCurrencyINR(comp.specialAllowanceAnnual),
    'compensation.variablePayAnnual': formatCurrencyINR(comp.variablePayAnnual),
    'compensation.joiningBonus': formatCurrencyINR(comp.joiningBonus),
    'compensation.retentionBonus': formatCurrencyINR(comp.retentionBonus),
    'compensation.pfEmployerMonthly': formatCurrencyINR(comp.pfEmployerMonthly),
    'compensation.pfEmployeeMonthly': formatCurrencyINR(comp.pfEmployeeMonthly),
    'compensation.gratuityMonthly': formatCurrencyINR(comp.gratuityMonthly),
    'compensation.estimatedNetTakeHomeMonthly': formatCurrencyINR(comp.estimatedNetTakeHomeMonthly),
    'compensation.tableHtml': tableHtml,

    // Employment
    'employment.probationPeriod': context.employment.probationPeriod,
    'employment.noticePeriod': context.employment.noticePeriod,
    'employment.workingHours': context.employment.workingHours,
    'employment.workMode': context.employment.workMode,

    // Company
    'company.name': context.company.name,
    'company.address': context.company.address,
    'company.email': context.company.email,
    'company.phone': context.company.phone,
    'company.website': context.company.website,
    'company.hrSignatoryName': context.company.hrSignatoryName,
    'company.hrSignatoryTitle': context.company.hrSignatoryTitle,

    // Benefits & Global
    'benefits': (context.benefits && context.benefits.length > 0)
      ? context.benefits.join(', ')
      : 'Comprehensive Medical Insurance (₹5,00,000 coverage), Provident Fund, Gratuity, Annual Wellness Benefits.',
    'generatedDate': context.generatedDate || formatLongDate(new Date()),

    // Legacy & Custom Template Aliases
    'employee_name': context.candidate.fullName,
    'candidate_name': context.candidate.fullName,
    'candidateName': context.candidate.fullName,
    'job_title': context.offer.offeredTitle || context.job.title,
    'jobTitle': context.offer.offeredTitle || context.job.title,
    'designation': context.offer.offeredTitle,
    'doa': formatLongDate(context.offer.proposedJoinDate),
    'joining_date': formatLongDate(context.offer.proposedJoinDate),
    'joiningDate': formatLongDate(context.offer.proposedJoinDate),
    'salary': formatCurrencyINR(context.offer.offeredCtc),
    'ctc': formatCurrencyINR(context.offer.offeredCtc),
    'annual_ctc': formatCurrencyINR(context.offer.offeredCtc),
    'annualCtc': formatCurrencyINR(context.offer.offeredCtc),
    'company_name': context.company.name,
    'companyName': context.company.name,
  };

  return vars;
}
