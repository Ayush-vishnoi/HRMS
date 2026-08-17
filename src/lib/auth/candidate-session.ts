import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendMagicLinkEmail } from '@/lib/notifications/email-service';

/* ==========================================================================
   CANDIDATE AUTHENTICATION & SESSION MANAGEMENT
   Phase 4C-C4: Isolated Candidate Portal Authentication
========================================================================== */

export const CANDIDATE_COOKIE_NAME = 'candidate_session';
const CANDIDATE_SECRET =
  process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'candidate_portal_isolated_secret_key_hrms_2026';
const TOKEN_EXPIRY_MINUTES = 15;
const SESSION_EXPIRY_DAYS = 7;

export interface CandidateSessionPayload {
  candidateId: string;
  email: string;
  name: string;
  issuedAt: number;
  expiresAt: number;
}

export class CandidateAuthError extends Error {
  readonly status = 401;
  constructor(message = 'Candidate authentication required') {
    super(message);
    this.name = 'CandidateAuthError';
  }
}

export class CandidateAccessError extends Error {
  readonly status = 403;
  constructor(message = 'Access denied to requested candidate resource') {
    super(message);
    this.name = 'CandidateAccessError';
  }
}

/**
 * Hash raw token for secure database storage
 */
export function hashVerificationToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Sign session payload using HMAC-SHA256
 */
export function signCandidateSessionPayload(payload: CandidateSessionPayload): string {
  const jsonStr = JSON.stringify(payload);
  const base64Data = Buffer.from(jsonStr).toString('base64url');
  const signature = crypto
    .createHmac('sha256', CANDIDATE_SECRET)
    .update(base64Data)
    .digest('base64url');
  return `${base64Data}.${signature}`;
}

/**
 * Verify and decode session token
 */
export function verifyCandidateSessionToken(tokenStr: string): CandidateSessionPayload | null {
  try {
    const [base64Data, signature] = tokenStr.split('.');
    if (!base64Data || !signature) return null;

    const expectedSig = crypto
      .createHmac('sha256', CANDIDATE_SECRET)
      .update(base64Data)
      .digest('base64url');

    if (
      signature.length !== expectedSig.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))
    ) {
      return null;
    }

    const payloadJson = Buffer.from(base64Data, 'base64url').toString('utf-8');
    const payload: CandidateSessionPayload = JSON.parse(payloadJson);

    if (payload.expiresAt < Date.now()) {
      return null; // Expired session
    }

    return payload;
  } catch {
    return null;
  }
}

/* ==========================================================================
   AUTHENTICATION WORKFLOWS (MAGIC LINK / TOKEN)
========================================================================== */

/**
 * Generates and dispatches a single-use magic link access token for candidate
 */
export async function requestCandidateAccessToken(
  emailInput: string,
  baseUrl = 'http://localhost:3000'
): Promise<{ success: boolean; message: string; debugToken?: string }> {
  if (!emailInput || typeof emailInput !== 'string') {
    throw new Error('Valid email address is required.');
  }

  const cleanEmail = emailInput.trim().toLowerCase();

  // Find candidate by email
  const candidate = await db.recruitmentCandidate.findFirst({
    where: { email: { equals: cleanEmail, mode: 'insensitive' } },
    include: {
      recruitment_offers: {
        where: {
          status: { in: ['Approved', 'Sent', 'Viewed', 'Accepted', 'Declined'] },
        },
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  });

  if (!candidate) {
    // Return friendly generic response to prevent candidate email enumeration
    return {
      success: true,
      message: 'If an active offer exists for this email, an access link has been sent.',
    };
  }

  // Generate cryptographically secure token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = hashVerificationToken(rawToken);
  const identifier = `candidate_portal:${candidate.id}`;
  const expires = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

  // Clean up any existing tokens for this candidate
  try {
    await db.authVerificationToken.deleteMany({
      where: { identifier },
    });
  } catch {
    // Ignore if none exist
  }

  // Store hashed single-use token in AuthVerificationToken
  await db.authVerificationToken.create({
    data: {
      identifier,
      token: hashedToken,
      expires,
    },
  });

  // Compose login magic link
  const loginUrl = `${baseUrl}/candidate/login?token=${rawToken}&email=${encodeURIComponent(cleanEmail)}`;

  // Dispatch email notification
  await sendMagicLinkEmail({
    to: candidate.email,
    candidateName: candidate.name,
    token: rawToken,
    loginUrl,
  });

  return {
    success: true,
    message: 'If an active offer exists for this email, an access link has been sent.',
    // Return debugToken only in test environments for automated assertions
    debugToken: process.env.NODE_ENV === 'test' ? rawToken : undefined,
  };
}

/**
 * Validates a candidate access token and creates an isolated session payload
 */
export async function verifyCandidateAccessToken(
  rawToken: string,
  candidateEmail?: string
): Promise<{ sessionToken: string; candidate: { id: string; name: string; email: string } }> {
  if (!rawToken || typeof rawToken !== 'string') {
    throw new CandidateAuthError('Access token is required.');
  }

  const hashedToken = hashVerificationToken(rawToken.trim());

  // Lookup token record
  const tokenRecord = await db.authVerificationToken.findFirst({
    where: {
      token: hashedToken,
    },
  });

  if (!tokenRecord) {
    throw new CandidateAuthError('Invalid or already used access token.');
  }

  // Check token expiration
  if (tokenRecord.expires.getTime() < Date.now()) {
    // Delete expired token
    try {
      await db.authVerificationToken.delete({
        where: {
          identifier_token: {
            identifier: tokenRecord.identifier,
            token: tokenRecord.token,
          },
        },
      });
    } catch {
      // Ignore
    }
    throw new CandidateAuthError('Access token has expired. Please request a new one.');
  }

  // Parse candidateId from identifier: "candidate_portal:<candidateId>"
  const candidateId = tokenRecord.identifier.replace('candidate_portal:', '');

  const candidate = await db.recruitmentCandidate.findUnique({
    where: { id: candidateId },
    select: { id: true, name: true, email: true },
  });

  if (!candidate) {
    throw new CandidateAuthError('Candidate record not found.');
  }

  // Enforce single-use: Delete token record immediately
  try {
    await db.authVerificationToken.delete({
      where: {
        identifier_token: {
          identifier: tokenRecord.identifier,
          token: tokenRecord.token,
        },
      },
    });
  } catch {
    // Non-fatal
  }

  // Generate candidate session payload
  const sessionPayload: CandidateSessionPayload = {
    candidateId: candidate.id,
    email: candidate.email,
    name: candidate.name,
    issuedAt: Date.now(),
    expiresAt: Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  };

  const sessionToken = signCandidateSessionPayload(sessionPayload);

  return {
    sessionToken,
    candidate: {
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
    },
  };
}

/* ==========================================================================
   SESSION RETRIEVAL & GUARDS
========================================================================== */

/**
 * Extracts and verifies candidate session from cookie
 */
export async function getCandidateSession(
  request?: Request | NextRequest
): Promise<CandidateSessionPayload | null> {
  let rawCookieVal: string | undefined;

  if (request) {
    if ('cookies' in request && typeof (request as NextRequest).cookies?.get === 'function') {
      rawCookieVal = (request as NextRequest).cookies.get(CANDIDATE_COOKIE_NAME)?.value;
    } else {
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${CANDIDATE_COOKIE_NAME}=([^;]+)`));
      rawCookieVal = match ? decodeURIComponent(match[1]) : undefined;
    }
  } else {
    try {
      const cookieStore = await cookies();
      rawCookieVal = cookieStore.get(CANDIDATE_COOKIE_NAME)?.value;
    } catch {
      rawCookieVal = undefined;
    }
  }

  if (!rawCookieVal) {
    return null;
  }

  return verifyCandidateSessionToken(rawCookieVal);
}

/**
 * Requires valid candidate session or throws CandidateAuthError
 */
export async function requireCandidateSession(
  request?: Request | NextRequest
): Promise<CandidateSessionPayload> {
  const session = await getCandidateSession(request);
  if (!session) {
    throw new CandidateAuthError('Candidate authentication required to access this portal.');
  }

  // Verify candidate exists in database
  const candidate = await db.recruitmentCandidate.findUnique({
    where: { id: session.candidateId },
    select: { id: true },
  });

  if (!candidate) {
    throw new CandidateAuthError('Candidate record is no longer active.');
  }

  return session;
}
