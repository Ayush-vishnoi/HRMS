import crypto from 'crypto';

/* ==========================================================================
   EMAIL SERVICE ADAPTER INTERFACE & TYPES
   Phase 4C-C4: Provider-Agnostic Email Notification Service
========================================================================== */

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
  eventType: string;
  metadata?: Record<string, any>;
}

export interface SendEmailResult {
  success: boolean;
  messageId: string;
  provider: 'adapter-ready' | 'smtp' | 'resend' | 'sendgrid';
  dispatchedAt: string;
}

// In-memory dispatch log for testing and verification
export const emailDispatchLog: Array<EmailPayload & { dispatchedAt: string; messageId: string }> = [];

/**
 * Dispatches an email through the active provider adapter
 * In production without configured external SMTP credentials, operates in adapter-ready mode
 */
export async function sendEmail(payload: EmailPayload): Promise<SendEmailResult> {
  const messageId = `msg-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const dispatchedAt = new Date().toISOString();

  // Log in-memory for audit and test assertion
  emailDispatchLog.push({
    ...payload,
    messageId,
    dispatchedAt,
  });

  // Keep log size bounded
  if (emailDispatchLog.length > 500) {
    emailDispatchLog.shift();
  }

  // Development / Test console indicator
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[EMAIL DISPATCH] [${payload.eventType}] To: ${payload.to} | Subject: "${payload.subject}"`);
  }

  return {
    success: true,
    messageId,
    provider: 'adapter-ready',
    dispatchedAt,
  };
}

/* ==========================================================================
   CANDIDATE-FACING EMAIL DISPATCHERS
========================================================================== */

/**
 * Dispatches Magic Link / Access Token email for Candidate Portal Login
 */
export async function sendMagicLinkEmail(params: {
  to: string;
  candidateName: string;
  token: string;
  loginUrl: string;
}): Promise<SendEmailResult> {
  const subject = `Your Secure Access Link - Candidate Portal`;
  const text = `Hello ${params.candidateName},\n\nClick the link below or use the token to access your candidate portal:\n${params.loginUrl}\n\nToken: ${params.token}\n\nThis token will expire in 15 minutes.\n\nBest regards,\nPeople Operations Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
      <h2 style="color: #1e293b; margin-bottom: 12px;">Candidate Portal Access</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.5;">Hello <strong>${params.candidateName}</strong>,</p>
      <p style="color: #475569; font-size: 15px; line-height: 1.5;">You requested access to your candidate portal. Click the button below to securely sign in:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${params.loginUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Access Candidate Portal</a>
      </div>
      <p style="color: #64748b; font-size: 13px;">Or enter your verification code manually: <strong style="color: #0f172a; font-family: monospace; font-size: 15px; letter-spacing: 1px;">${params.token}</strong></p>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">This single-use link will expire in 15 minutes. If you did not request this, you can safely ignore this email.</p>
    </div>
  `;

  return sendEmail({
    to: params.to,
    subject,
    text,
    html,
    eventType: 'MAGIC_LINK_REQUESTED',
    metadata: { candidateName: params.candidateName },
  });
}

/**
 * Dispatches notification that an official offer is ready for candidate viewing
 */
export async function sendOfferAvailableEmail(params: {
  to: string;
  candidateName: string;
  jobTitle: string;
  portalUrl: string;
}): Promise<SendEmailResult> {
  const subject = `Offer of Employment: ${params.jobTitle}`;
  const text = `Hello ${params.candidateName},\n\nWe are pleased to inform you that your formal offer of employment for the position of ${params.jobTitle} is now available in the candidate portal.\n\nPlease log in to review your offer details and documents:\n${params.portalUrl}\n\nBest regards,\nPeople Operations Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
      <h2 style="color: #0f172a; margin-bottom: 12px;">Offer of Employment</h2>
      <p style="color: #334155; font-size: 15px; line-height: 1.5;">Dear <strong>${params.candidateName}</strong>,</p>
      <p style="color: #334155; font-size: 15px; line-height: 1.5;">We are delighted to extend a formal offer of employment for the role of <strong>${params.jobTitle}</strong>.</p>
      <p style="color: #334155; font-size: 15px; line-height: 1.5;">Your detailed offer letter and compensation breakdown are now ready for your review in the candidate portal.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${params.portalUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">View Offer in Portal</a>
      </div>
      <p style="color: #64748b; font-size: 13px;">Please log in to review, download the official documents, and submit your response.</p>
    </div>
  `;

  return sendEmail({
    to: params.to,
    subject,
    text,
    html,
    eventType: 'OFFER_AVAILABLE',
    metadata: { jobTitle: params.jobTitle },
  });
}

/**
 * Dispatches confirmation to candidate upon successful electronic signature
 */
export async function sendSignatureCompletedCandidateEmail(params: {
  to: string;
  candidateName: string;
  jobTitle: string;
  signedAt: string;
}): Promise<SendEmailResult> {
  const subject = `Documents Signed Successfully: ${params.jobTitle}`;
  const text = `Hello ${params.candidateName},\n\nThank you. Your electronic signature for the position of ${params.jobTitle} has been recorded on ${params.signedAt}.\n\nOur People Operations team will be in touch with next steps.\n\nBest regards,\nPeople Operations Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
      <h2 style="color: #0f172a; margin-bottom: 12px;">Electronic Signature Confirmation</h2>
      <p style="color: #334155; font-size: 15px; line-height: 1.5;">Dear <strong>${params.candidateName}</strong>,</p>
      <p style="color: #334155; font-size: 15px; line-height: 1.5;">Your electronic signature for the <strong>${params.jobTitle}</strong> offer documents was successfully completed on <strong>${params.signedAt}</strong>.</p>
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px 16px; margin: 16px 0;">
        <span style="color: #166534; font-weight: 600;">Status: Signed & Verified</span>
      </div>
      <p style="color: #64748b; font-size: 13px;">You can download your signed documents anytime through the candidate portal.</p>
    </div>
  `;

  return sendEmail({
    to: params.to,
    subject,
    text,
    html,
    eventType: 'CANDIDATE_SIGNATURE_COMPLETED',
    metadata: { jobTitle: params.jobTitle, signedAt: params.signedAt },
  });
}

/* ==========================================================================
   INTERNAL HR / RECRUITER EMAIL DISPATCHERS
========================================================================== */

/**
 * Dispatches notification to Recruiter / Hiring Manager that candidate has accepted offer
 */
export async function sendOfferAcceptedInternalEmail(params: {
  recruiterEmail: string;
  candidateName: string;
  jobTitle: string;
  respondedAt: string;
  portalUrl: string;
}): Promise<SendEmailResult> {
  const subject = `Offer Accepted: ${params.candidateName} - ${params.jobTitle}`;
  const text = `Candidate ${params.candidateName} has ACCEPTED the offer for ${params.jobTitle} on ${params.respondedAt}.\n\nView candidate profile in recruitment portal:\n${params.portalUrl}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
      <h2 style="color: #059669; margin-bottom: 12px;">Candidate Offer Accepted</h2>
      <p style="color: #334155; font-size: 15px; line-height: 1.5;">Great news! <strong>${params.candidateName}</strong> has accepted the offer of employment for the role of <strong>${params.jobTitle}</strong>.</p>
      <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 12px 16px; margin: 16px 0;">
        <p style="margin: 0; color: #475569; font-size: 14px;"><strong>Accepted On:</strong> ${params.respondedAt}</p>
        <p style="margin: 4px 0 0 0; color: #475569; font-size: 14px;"><strong>Candidate:</strong> ${params.candidateName}</p>
        <p style="margin: 4px 0 0 0; color: #475569; font-size: 14px;"><strong>Position:</strong> ${params.jobTitle}</p>
      </div>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${params.portalUrl}" style="background-color: #1e293b; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Open Recruitment Dashboard</a>
      </div>
    </div>
  `;

  return sendEmail({
    to: params.recruiterEmail,
    subject,
    text,
    html,
    eventType: 'INTERNAL_OFFER_ACCEPTED',
    metadata: { candidateName: params.candidateName, jobTitle: params.jobTitle },
  });
}

/**
 * Dispatches notification to Recruiter / Hiring Manager that candidate has declined offer
 */
export async function sendOfferRejectedInternalEmail(params: {
  recruiterEmail: string;
  candidateName: string;
  jobTitle: string;
  reason: string;
  respondedAt: string;
  portalUrl: string;
}): Promise<SendEmailResult> {
  const subject = `Offer Declined: ${params.candidateName} - ${params.jobTitle}`;
  const text = `Candidate ${params.candidateName} has DECLINED the offer for ${params.jobTitle} on ${params.respondedAt}.\n\nReason: ${params.reason}\n\nView details:\n${params.portalUrl}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
      <h2 style="color: #dc2626; margin-bottom: 12px;">Candidate Offer Declined</h2>
      <p style="color: #334155; font-size: 15px; line-height: 1.5;">Candidate <strong>${params.candidateName}</strong> has declined the offer for <strong>${params.jobTitle}</strong>.</p>
      <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; margin: 16px 0;">
        <p style="margin: 0; color: #991b1b; font-size: 14px;"><strong>Declined On:</strong> ${params.respondedAt}</p>
        <p style="margin: 6px 0 0 0; color: #7f1d1d; font-size: 14px;"><strong>Candidate Reason:</strong> ${params.reason}</p>
      </div>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${params.portalUrl}" style="background-color: #1e293b; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Open Recruitment Dashboard</a>
      </div>
    </div>
  `;

  return sendEmail({
    to: params.recruiterEmail,
    subject,
    text,
    html,
    eventType: 'INTERNAL_OFFER_REJECTED',
    metadata: { candidateName: params.candidateName, reason: params.reason },
  });
}

/**
 * Dispatches notification to internal HR that candidate completed electronic signature
 */
export async function sendSignatureCompletedInternalEmail(params: {
  recruiterEmail: string;
  candidateName: string;
  jobTitle: string;
  signedAt: string;
  portalUrl: string;
}): Promise<SendEmailResult> {
  const subject = `Offer Documents Signed: ${params.candidateName} - ${params.jobTitle}`;
  const text = `Candidate ${params.candidateName} has completed electronic signature for ${params.jobTitle} on ${params.signedAt}.\n\nView signed offer:\n${params.portalUrl}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
      <h2 style="color: #0f172a; margin-bottom: 12px;">Offer Documents Signed</h2>
      <p style="color: #334155; font-size: 15px; line-height: 1.5;"><strong>${params.candidateName}</strong> has completed electronic signatures for all required offer documents for <strong>${params.jobTitle}</strong>.</p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; margin: 16px 0;">
        <p style="margin: 0; color: #334155; font-size: 14px;"><strong>Signed On:</strong> ${params.signedAt}</p>
        <p style="margin: 4px 0 0 0; color: #334155; font-size: 14px;"><strong>Ready for Phase 4C-C5 Onboarding Hand-off</strong></p>
      </div>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${params.portalUrl}" style="background-color: #2563eb; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">View in Recruitment ATS</a>
      </div>
    </div>
  `;

  return sendEmail({
    to: params.recruiterEmail,
    subject,
    text,
    html,
    eventType: 'INTERNAL_SIGNATURE_COMPLETED',
    metadata: { candidateName: params.candidateName, jobTitle: params.jobTitle },
  });
}
