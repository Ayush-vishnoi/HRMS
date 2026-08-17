import { db } from '@/lib/db';

export interface DuplicateMatch {
  candidateId: string;
  candidateName: string;
  existingEmail: string;
  existingPhone: string;
  jobId: string;
  jobTitle: string;
  appliedOn: string;
  stage: string;
  confidence: 'HIGH' | 'MEDIUM';
  matchingFields: string[];
  reason: string;
}

export interface CheckDuplicatesInput {
  email?: string;
  phone?: string;
  fileHash?: string;
  linkedinUrl?: string;
  name?: string;
  excludeCandidateId?: string;
}

/**
 * Normalizes phone numbers for matching (removes non-digits and leading zeros/country codes)
 */
export function normalizePhoneForMatching(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10); // Match last 10 digits
  }
  return digits;
}

/**
 * Computes deterministic duplicate key for candidate indexing
 */
export function generateDuplicateKey(email?: string, phone?: string, fileHash?: string): string {
  const normEmail = email?.toLowerCase().trim();
  if (normEmail) return `email:${normEmail}`;

  const normPhone = normalizePhoneForMatching(phone);
  if (normPhone) return `phone:${normPhone}`;

  if (fileHash) return `hash:${fileHash.slice(0, 16)}`;

  return `anon:${Date.now()}`;
}

/**
 * Detects potential duplicate candidates across existing database applications
 */
export async function checkCandidateDuplicates(input: CheckDuplicatesInput): Promise<{ hasDuplicates: boolean; duplicates: DuplicateMatch[] }> {
  const normalizedEmail = input.email?.toLowerCase().trim();
  const normalizedPhone = normalizePhoneForMatching(input.phone);
  const duplicates: DuplicateMatch[] = [];
  const matchedCandidateIds = new Set<string>();

  if (input.excludeCandidateId) {
    matchedCandidateIds.add(input.excludeCandidateId);
  }

  // 1. Email check (HIGH confidence)
  if (normalizedEmail) {
    const emailMatches = await db.recruitmentCandidate.findMany({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
        ...(input.excludeCandidateId ? { id: { not: input.excludeCandidateId } } : {}),
      },
      include: { job: true },
      take: 5,
    });

    for (const cand of emailMatches) {
      if (!matchedCandidateIds.has(cand.id)) {
        matchedCandidateIds.add(cand.id);
        duplicates.push({
          candidateId: cand.id,
          candidateName: cand.name,
          existingEmail: cand.email,
          existingPhone: cand.phone,
          jobId: cand.jobId,
          jobTitle: cand.job.title,
          appliedOn: cand.appliedOn,
          stage: cand.stage,
          confidence: 'HIGH',
          matchingFields: ['Email Address'],
          reason: `Exact email match (${cand.email}) found with existing application for "${cand.job.title}".`,
        });
      }
    }
  }

  // 2. Phone check (HIGH confidence)
  if (normalizedPhone && normalizedPhone.length >= 10) {
    const candidatesWithPhone = await db.recruitmentCandidate.findMany({
      where: {
        phone: { contains: normalizedPhone },
        ...(input.excludeCandidateId ? { id: { not: input.excludeCandidateId } } : {}),
      },
      include: { job: true },
      take: 5,
    });

    for (const cand of candidatesWithPhone) {
      if (!matchedCandidateIds.has(cand.id)) {
        matchedCandidateIds.add(cand.id);
        duplicates.push({
          candidateId: cand.id,
          candidateName: cand.name,
          existingEmail: cand.email,
          existingPhone: cand.phone,
          jobId: cand.jobId,
          jobTitle: cand.job.title,
          appliedOn: cand.appliedOn,
          stage: cand.stage,
          confidence: 'HIGH',
          matchingFields: ['Phone Number'],
          reason: `Matching phone number (${cand.phone}) with candidate on "${cand.job.title}".`,
        });
      }
    }
  }

  // 3. Resume SHA-256 Hash check (HIGH confidence)
  if (input.fileHash) {
    const resumeMatches = await db.candidateResumeDocument.findMany({
      where: {
        fileHash: input.fileHash,
        ...(input.excludeCandidateId ? { candidateId: { not: input.excludeCandidateId } } : {}),
      },
      include: {
        candidate: {
          include: { job: true },
        },
      },
      take: 5,
    });

    for (const doc of resumeMatches) {
      if (doc.candidate && !matchedCandidateIds.has(doc.candidate.id)) {
        matchedCandidateIds.add(doc.candidate.id);
        duplicates.push({
          candidateId: doc.candidate.id,
          candidateName: doc.candidate.name,
          existingEmail: doc.candidate.email,
          existingPhone: doc.candidate.phone,
          jobId: doc.candidate.jobId,
          jobTitle: doc.candidate.job.title,
          appliedOn: doc.candidate.appliedOn,
          stage: doc.candidate.stage,
          confidence: 'HIGH',
          matchingFields: ['Resume File Hash / Identical Document'],
          reason: `Identical resume file fingerprint (${doc.fileName}) matches previously submitted profile.`,
        });
      }
    }
  }

  // 4. Name exact match check (MEDIUM confidence)
  if (input.name && input.name.trim().length >= 4) {
    const nameMatches = await db.recruitmentCandidate.findMany({
      where: {
        name: { equals: input.name.trim(), mode: 'insensitive' },
        ...(input.excludeCandidateId ? { id: { not: input.excludeCandidateId } } : {}),
      },
      include: { job: true },
      take: 3,
    });

    for (const cand of nameMatches) {
      if (!matchedCandidateIds.has(cand.id)) {
        matchedCandidateIds.add(cand.id);
        duplicates.push({
          candidateId: cand.id,
          candidateName: cand.name,
          existingEmail: cand.email,
          existingPhone: cand.phone,
          jobId: cand.jobId,
          jobTitle: cand.job.title,
          appliedOn: cand.appliedOn,
          stage: cand.stage,
          confidence: 'MEDIUM',
          matchingFields: ['Full Name'],
          reason: `Matching candidate name (${cand.name}) on existing application.`,
        });
      }
    }
  }

  return {
    hasDuplicates: duplicates.length > 0,
    duplicates,
  };
}
