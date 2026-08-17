import { db } from '@/lib/db';
import { normalizeSkillName } from './skills-extractor';

export interface MatchWeights {
  skillsWeight: number; // default 0.50 (50%)
  experienceWeight: number; // default 0.30 (30%)
  educationWeight: number; // default 0.10 (10%)
  locationWeight: number; // default 0.10 (10%)
}

export const DEFAULT_MATCH_WEIGHTS: MatchWeights = {
  skillsWeight: 0.50,
  experienceWeight: 0.30,
  educationWeight: 0.10,
  locationWeight: 0.10,
};

export interface MatchResult {
  overallScore: number;
  skillScore: number;
  experienceScore: number;
  educationScore: number;
  locationScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  experienceGap: string;
  explanation: string;
  engineVersion: string;
  calculatedAt: Date;
}

/**
 * Extracts required skill list from job requirements and description
 */
export function extractJobRequiredSkills(job: { requirements?: string[]; description?: string; title?: string }): string[] {
  const skillSet = new Set<string>();

  if (job.requirements && Array.isArray(job.requirements)) {
    for (const req of job.requirements) {
      const normalized = normalizeSkillName(req);
      skillSet.add(normalized.canonical);
    }
  }

  // Common title skills
  if (job.title) {
    const titleLower = job.title.toLowerCase();
    if (titleLower.includes('frontend') || titleLower.includes('react')) {
      skillSet.add('React');
      skillSet.add('TypeScript');
      skillSet.add('JavaScript');
    }
    if (titleLower.includes('backend') || titleLower.includes('node')) {
      skillSet.add('Node.js');
      skillSet.add('PostgreSQL');
    }
    if (titleLower.includes('full stack') || titleLower.includes('fullstack')) {
      skillSet.add('React');
      skillSet.add('Node.js');
      skillSet.add('TypeScript');
    }
    if (titleLower.includes('ai') || titleLower.includes('ml')) {
      skillSet.add('Python');
      skillSet.add('Machine Learning');
    }
    if (titleLower.includes('devops') || titleLower.includes('cloud')) {
      skillSet.add('AWS');
      skillSet.add('Docker');
      skillSet.add('Kubernetes');
    }
  }

  return Array.from(skillSet);
}

/**
 * Computes deterministic, explainable match score between a candidate and a job requisition
 */
export function computeMatchScore(
  candidate: {
    matchedSkills?: string[];
    experience?: string;
    location?: string;
    parsed_resume?: any;
    name?: string;
  },
  job: {
    requirements?: string[];
    description?: string;
    title?: string;
    experience_min?: number | null;
    experience_max?: number | null;
    location?: string;
  },
  weights: MatchWeights = DEFAULT_MATCH_WEIGHTS
): MatchResult {
  // 1. Skill Score Calculation
  const requiredSkills = extractJobRequiredSkills(job);
  const candidateSkills: string[] = [];

  if (candidate.matchedSkills && Array.isArray(candidate.matchedSkills)) {
    for (const s of candidate.matchedSkills) {
      candidateSkills.push(normalizeSkillName(s).canonical);
    }
  }

  if (candidate.parsed_resume?.skills && Array.isArray(candidate.parsed_resume.skills)) {
    for (const s of candidate.parsed_resume.skills) {
      const name = typeof s === 'string' ? s : s.name;
      if (name) candidateSkills.push(normalizeSkillName(name).canonical);
    }
  }

  const candidateSkillSet = new Set(candidateSkills);
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const reqSkill of requiredSkills) {
    if (candidateSkillSet.has(reqSkill)) {
      matchedSkills.push(reqSkill);
    } else {
      missingSkills.push(reqSkill);
    }
  }

  let skillScore = 75; // Baseline if no explicit job requirements
  if (requiredSkills.length > 0) {
    skillScore = Math.round((matchedSkills.length / requiredSkills.length) * 100);
  }

  // 2. Experience Score Calculation
  const minExp = job.experience_min ?? 2.0;
  const maxExp = job.experience_max ?? minExp + 4.0;
  
  let candidateExpYears = 3.0;
  if (candidate.parsed_resume?.totalExperienceYears !== undefined) {
    candidateExpYears = Number(candidate.parsed_resume.totalExperienceYears);
  } else if (candidate.experience) {
    const match = candidate.experience.match(/(\d+(?:\.\d+)?)/);
    if (match) candidateExpYears = parseFloat(match[1]);
  }

  let experienceScore = 100;
  let experienceGap = '';

  if (candidateExpYears >= minExp && candidateExpYears <= maxExp + 2) {
    experienceScore = 100;
    const diff = Math.round((candidateExpYears - minExp) * 10) / 10;
    experienceGap = diff > 0 ? `Exceeds minimum requirement by +${diff} yrs` : `Matches exact required experience (${minExp} yrs)`;
  } else if (candidateExpYears > maxExp + 2) {
    experienceScore = 85; // Slightly overqualified
    experienceGap = `Senior candidate (${candidateExpYears} yrs vs max ${maxExp} yrs)`;
  } else {
    // Under minimum
    const deficit = Math.round((minExp - candidateExpYears) * 10) / 10;
    const ratio = Math.max(0.2, candidateExpYears / minExp);
    experienceScore = Math.round(ratio * 80);
    experienceGap = `Experience deficit of ${deficit} yrs (${candidateExpYears} yrs vs min ${minExp} yrs)`;
  }

  // 3. Location Score Calculation
  let locationScore = 100;
  const jobLoc = (job.location || '').toLowerCase();
  const candLoc = (candidate.location || '').toLowerCase();

  if (jobLoc.includes('remote') || candLoc.includes('remote')) {
    locationScore = 100;
  } else if (jobLoc && candLoc) {
    const jobCity = jobLoc.split('/')[0].split(',')[0].trim();
    const candCity = candLoc.split('/')[0].split(',')[0].trim();
    if (jobCity === candCity || jobLoc.includes(candCity) || candLoc.includes(jobCity)) {
      locationScore = 100;
    } else {
      locationScore = 70; // Relocation or hybrid potential
    }
  }

  // 4. Education Score Calculation
  let educationScore = 95;
  if (candidate.parsed_resume?.education && candidate.parsed_resume.education.length > 0) {
    educationScore = 100;
  }

  // 5. Overall Weighted Score
  const overallScore = Math.min(
    100,
    Math.max(
      10,
      Math.round(
        skillScore * weights.skillsWeight +
        experienceScore * weights.experienceWeight +
        educationScore * weights.educationWeight +
        locationScore * weights.locationWeight
      )
    )
  );

  // 6. Narrative Explanation
  const skillSummary = missingSkills.length === 0
    ? `Matches 100% of required technical competencies (${matchedSkills.slice(0, 4).join(', ')}).`
    : `Covers ${matchedSkills.length}/${requiredSkills.length} required competencies; missing: ${missingSkills.slice(0, 3).join(', ')}.`;

  const explanation = `${candidate.name || 'Candidate'} scored ${overallScore}% fit for "${job.title || 'the requisition'}". ${skillSummary} ${experienceGap}.`;

  return {
    overallScore,
    skillScore,
    experienceScore,
    educationScore,
    locationScore,
    matchedSkills,
    missingSkills,
    experienceGap,
    explanation,
    engineVersion: 'v1.0',
    calculatedAt: new Date(),
  };
}

/**
 * Calculates and persists candidate match in the database
 */
export async function calculateAndPersistMatch(
  candidateId: string,
  jobId: string,
  weights: MatchWeights = DEFAULT_MATCH_WEIGHTS
): Promise<MatchResult> {
  const candidate = await db.recruitmentCandidate.findUnique({
    where: { id: candidateId },
  });
  if (!candidate) throw new Error('Candidate not found.');

  const job = await db.recruitmentJob.findUnique({
    where: { id: jobId },
  });
  if (!job) throw new Error('Job requisition not found.');

  const match = computeMatchScore(candidate, job, weights);

  // Update candidate table score and skills
  await db.recruitmentCandidate.update({
    where: { id: candidateId },
    data: {
      score: match.overallScore,
      ai_match_score: match.overallScore,
      matchedSkills: match.matchedSkills,
      missingSkills: match.missingSkills,
      recommendation: match.overallScore >= 80 ? 'StrongMatch' : match.overallScore >= 60 ? 'Review' : 'LowMatch',
    },
  });

  // Upsert normalized match record
  await db.recruitmentCandidateMatch.upsert({
    where: {
      candidateId_jobId: { candidateId, jobId },
    },
    create: {
      candidateId,
      jobId,
      overallScore: match.overallScore,
      skillScore: match.skillScore,
      experienceScore: match.experienceScore,
      educationScore: match.educationScore,
      locationScore: match.locationScore,
      matchedSkills: match.matchedSkills,
      missingSkills: match.missingSkills,
      experienceGap: match.experienceGap,
      explanation: match.explanation,
      engineVersion: match.engineVersion,
      calculatedAt: match.calculatedAt,
    },
    update: {
      overallScore: match.overallScore,
      skillScore: match.skillScore,
      experienceScore: match.experienceScore,
      educationScore: match.educationScore,
      locationScore: match.locationScore,
      matchedSkills: match.matchedSkills,
      missingSkills: match.missingSkills,
      experienceGap: match.experienceGap,
      explanation: match.explanation,
      engineVersion: match.engineVersion,
      calculatedAt: match.calculatedAt,
    },
  });

  return match;
}
