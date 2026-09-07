/**
 * Resume parsing + candidate/job match scoring (Phase 4B).
 *
 * Self-contained text extraction + heuristic parser producing the
 * ParsedDraft shape consumed by ResumeReviewQueue.tsx, plus the
 * match-intelligence calculator used by resume upload / re-parse /
 * rediscovery endpoints.
 */

export interface ParsedSkill {
  name: string;
  category: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceScore: number;
  occurrences: number;
}

export interface ParsedWorkHistory {
  company: string;
  role: string;
  startDate?: string;
  endDate?: string;
  durationYears?: number;
  description?: string;
}

export interface ParsedEducation {
  degree: string;
  institution: string;
  year?: string;
  fieldOfStudy?: string;
}

export interface ParsedCertification {
  name: string;
  issuer?: string;
  year?: string;
}

export interface ParsedDraft {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  currentRole?: string;
  currentCompany?: string;
  totalExperienceYears: number;
  experienceDisplay: string;
  skills: ParsedSkill[];
  topSkills: string[];
  workHistory: ParsedWorkHistory[];
  education: ParsedEducation[];
  certifications: ParsedCertification[];
  socialLinks: { linkedin?: string; github?: string; portfolio?: string };
  summary: string;
  provenance: Record<string, 'PARSED' | 'MANUAL' | 'SYSTEM'>;
  parserVersion: string;
}

export const PARSER_VERSION = 'v1.2.0';

/* ============================================================
   TEXT EXTRACTION
   ============================================================ */

/** Extract readable text from PDF / DOCX / plain-text buffers. */
export function extractResumeText(buffer: Buffer, mimetype: string): string {
  const isPdf =
    mimetype === 'application/pdf' ||
    buffer.subarray(0, 5).toString('latin1') === '%PDF-';
  const isDocx =
    mimetype ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    (buffer.length > 3 && buffer[0] === 0x50 && buffer[1] === 0x4b); // PK zip

  if (isPdf) return extractPdfText(buffer);
  if (isDocx) return extractDocxText(buffer);
  return buffer.toString('utf8');
}

/**
 * Minimal PDF text extraction: finds text-showing operators
 * (Tj / TJ) inside uncompressed streams. Good enough for
 * text-based resumes; returns '' for scanned/image PDFs.
 */
function extractPdfText(buffer: Buffer): string {
  const latin = buffer.toString('latin1');
  const chunks: string[] = [];
  // Match ( ... ) Tj  and  [ (..) (..) ] TJ
  const tjRe = /\(((?:\\.|[^\\()])*)\)\s*Tj/g;
  const tjArrRe = /\[((?:\\.|[^\]])*)\]\s*TJ/g;
  const literalRe = /\(((?:\\.|[^\\()])*)\)/g;

  let m: RegExpExecArray | null;
  while ((m = tjRe.exec(latin)) !== null) {
    chunks.push(unescapePdfString(m[1]));
  }
  while ((m = tjArrRe.exec(latin)) !== null) {
    let inner: RegExpExecArray | null;
    literalRe.lastIndex = 0;
    while ((inner = literalRe.exec(m[1])) !== null) {
      chunks.push(unescapePdfString(inner[1]));
    }
  }
  return chunks.join('\n');
}

function unescapePdfString(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\([()\\])/g, '$1')
    .replace(/\\(\d{1,3})/g, (_x, oct: string) => String.fromCharCode(parseInt(oct, 8)));
}

/**
 * Minimal DOCX text extraction: a DOCX is a ZIP; word/document.xml
 * holds the runs. We locate <w:t> contents without a zip library by
 * scanning for the XML signature and stripping tags.
 */
function extractDocxText(buffer: Buffer): string {
  const latin = buffer.toString('latin1');
  const xmlStart = latin.indexOf('word/document.xml');
  if (xmlStart === -1) return '';
  // The XML payload follows the header; find '<?xml' or '<w:document' after it
  const probe = latin.slice(xmlStart, Math.min(latin.length, xmlStart + 200000));
  const docIdx = probe.search(/<w:document/);
  if (docIdx === -1) return '';
  const xml = probe.slice(docIdx);
  return xml
    .replace(/<w:p [^>]*>/g, '\n')
    .replace(/<w:p>/g, '\n')
    .replace(/<w:tab[^>]*\/>/g, '\t')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ============================================================
   HEURISTIC RESUME PARSER
   ============================================================ */

const SKILL_CATALOG: Record<string, string> = {
  javascript: 'Programming',
  typescript: 'Programming',
  python: 'Programming',
  java: 'Programming',
  'c++': 'Programming',
  c: 'Programming',
  golang: 'Programming',
  rust: 'Programming',
  php: 'Programming',
  ruby: 'Programming',
  kotlin: 'Programming',
  swift: 'Programming',
  sql: 'Data',
  nosql: 'Data',
  postgresql: 'Data',
  mysql: 'Data',
  mongodb: 'Data',
  redis: 'Data',
  elasticsearch: 'Data',
  kafka: 'Data',
  spark: 'Data',
  hadoop: 'Data',
  react: 'Frontend',
  'react.js': 'Frontend',
  nextjs: 'Frontend',
  'next.js': 'Frontend',
  vue: 'Frontend',
  angular: 'Frontend',
  tailwind: 'Frontend',
  css: 'Frontend',
  html: 'Frontend',
  redux: 'Frontend',
  'node.js': 'Backend',
  nodejs: 'Backend',
  express: 'Backend',
  nestjs: 'Backend',
  django: 'Backend',
  flask: 'Backend',
  'spring boot': 'Backend',
  spring: 'Backend',
  graphql: 'Backend',
  rest: 'Backend',
  microservices: 'Architecture',
  docker: 'DevOps',
  kubernetes: 'DevOps',
  k8s: 'DevOps',
  jenkins: 'DevOps',
  'ci/cd': 'DevOps',
  terraform: 'DevOps',
  aws: 'Cloud',
  azure: 'Cloud',
  gcp: 'Cloud',
  lambda: 'Cloud',
  linux: 'DevOps',
  git: 'Tools',
  jira: 'Tools',
  figma: 'Design',
  'machine learning': 'AI/ML',
  'deep learning': 'AI/ML',
  nlp: 'AI/ML',
  tensorflow: 'AI/ML',
  pytorch: 'AI/ML',
  pandas: 'Data',
  numpy: 'Data',
  'power bi': 'Data',
  tableau: 'Data',
  excel: 'Tools',
  testing: 'Quality',
  jest: 'Quality',
  cypress: 'Quality',
  selenium: 'Quality',
  agile: 'Process',
  scrum: 'Process',
};

const DEGREE_RE =
  /\b(b\.?tech|b\.?e\.?|b\.?sc|b\.?com|b\.?a\.?|m\.?tech|m\.?e\.?|m\.?sc|m\.?com|m\.?a\.?|mba|ph\.?d|bca|mca|bba)\b[^,\n]{0,80}/gi;

export function parseResumeDraft(rawText: string): ParsedDraft {
  const text = rawText.replace(/\r\n/g, '\n');
  const lower = text.toLowerCase();
  const provenance: Record<string, 'PARSED' | 'MANUAL' | 'SYSTEM'> = {};

  // --- Email / phone / links ---
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  const email = emailMatch ? emailMatch[0].toLowerCase() : undefined;
  const phoneMatch = text.match(/(\+?\d[\d\s\-()]{8,16}\d)/);
  const phone = phoneMatch ? phoneMatch[0].trim() : undefined;

  const linkedinMatch = text.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i,
  );
  const githubMatch = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+/i);
  const portfolioMatch = text.match(/(?:https?:\/\/)[\w.-]+\.[a-z]{2,}(?:\/[\w./-]*)?/i);

  // --- Name: first non-empty line that looks like a person name ---
  let name: string | undefined;
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines.slice(0, 8)) {
    const cleaned = line
      .replace(/^(curriculum vitae|resume|cv)\b[:\s-]*/i, '')
      .replace(/[|•].*$/, '')
      .trim();
    if (
      cleaned.length >= 3 &&
      cleaned.length <= 48 &&
      /^[\p{L}][\p{L}\s.'-]*$/u.test(cleaned) &&
      cleaned.split(/\s+/).length <= 5 &&
      !/^(contact|email|phone|summary|objective|profile|address|location)\b/i.test(cleaned)
    ) {
      name = cleaned;
      break;
    }
  }

  // --- Location ---
  const locationMatch = text.match(
    /\b(bengaluru|bangalore|mumbai|delhi|noida|gurgaon|gurugram|hyderabad|pune|chennai|kolkata|ahmedabad|jaipur|indore|kochi|coimbatore|remote|work from home)\b/i,
  );
  const location = locationMatch ? titleCase(locationMatch[0]) : undefined;

  // --- Current role / company ---
  let currentRole: string | undefined;
  const roleRe =
    /\b(senior|junior|lead|principal|staff|associate|assistant)?\s*(software|full[\s-]?stack|backend|back[\s-]?end|frontend|front[\s-]?end|web|mobile|data|devops|ml|machine learning|qa|test|systems|cloud|product|project|program)\s*(engineer|developer|architect|analyst|scientist|manager|designer|consultant|lead)\b/i;
  const roleMatch = text.match(roleRe);
  if (roleMatch) currentRole = titleCase(roleMatch[0].trim());

  let currentCompany: string | undefined;
  const companyRe =
    /(?:at|with|@)\s+([A-Z][\w&.\- ]{2,39}(?:Inc|Ltd|Limited|Pvt|Technologies|Labs|Solutions|Systems|Softwares?|Consulting|Group|Studios?)?)\b/;
  const companyMatch = text.match(companyRe);
  if (companyMatch) currentCompany = companyMatch[1].trim();

  // --- Experience ---
  let totalYears = 0;
  const expPatterns = [
    /(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:total\s+)?(?:work\s+)?experience/i,
    /experience\s*(?:of|:)?\s*(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)/i,
    /(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)/i,
  ];
  for (const re of expPatterns) {
    const m = text.match(re);
    if (m) {
      totalYears = parseFloat(m[1]);
      break;
    }
  }
  const experienceDisplay =
    totalYears > 0 ? `${totalYears} yr${totalYears === 1 ? '' : 's'}` : 'Fresher';

  // --- Skills ---
  const skills: ParsedSkill[] = [];
  for (const [skill, category] of Object.entries(SKILL_CATALOG)) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'gi');
    const occurrences = (lower.match(re) || []).length;
    if (occurrences > 0) {
      const confidenceScore = Math.min(95, 55 + occurrences * 12);
      skills.push({
        name: titleCase(skill),
        category,
        confidence: occurrences >= 2 ? 'HIGH' : occurrences === 1 ? 'MEDIUM' : 'LOW',
        confidenceScore,
        occurrences,
      });
    }
  }
  skills.sort((a, b) => b.occurrences - a.occurrences || a.name.localeCompare(b.name));
  const topSkills = skills.slice(0, 6).map((s) => s.name);

  // --- Work history (company + role pairs near date ranges) ---
  const workHistory: ParsedWorkHistory[] = [];
  const jobBlockRe =
    /([A-Z][\w&.\- ]{2,39})[\s|,-]+((?:Senior |Junior |Lead |Principal |Staff )?(?:Software |Full Stack |Backend |Frontend |Web |Data |DevOps |ML )?(?:Engineer|Developer|Architect|Analyst|Scientist|Manager|Consultant))[\s|,-]*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}\s*[-–—to]+\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|Present|Current|Now))?/g;
  let jm: RegExpExecArray | null;
  while ((jm = jobBlockRe.exec(text)) !== null && workHistory.length < 6) {
    const company = jm[1].trim();
    const role = jm[2].trim();
    const dates = jm[3];
    let startDate: string | undefined;
    let endDate: string | undefined;
    let durationYears: number | undefined;
    if (dates) {
      const dateParts = dates.match(
        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{4})/gi,
      );
      if (dateParts && dateParts.length >= 1) {
        startDate = dateParts[0];
        endDate = dateParts[1] || (/present|current|now/i.test(dates) ? 'Present' : undefined);
        if (dateParts[1]) {
          const start = new Date('1 ' + dateParts[0]);
          const end = new Date('1 ' + dateParts[1]);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            durationYears =
              Math.round(((end.getTime() - start.getTime()) / 31557600000) * 10) / 10;
          }
        }
      }
    }
    workHistory.push({ company, role, startDate, endDate, durationYears });
  }

  // --- Education ---
  const education: ParsedEducation[] = [];
  let em: RegExpExecArray | null;
  DEGREE_RE.lastIndex = 0;
  while ((em = DEGREE_RE.exec(text)) !== null && education.length < 4) {
    const raw = em[0].trim().replace(/\s+/g, ' ');
    const instMatch = raw.match(
      /\b(from|at|[,–-])\s+([A-Z][\w&.\-' ]{3,60}(?:University|College|Institute|School|Academy|IIT|NIT|IIIT|BHU))\b/,
    );
    const yearMatch = raw.match(/\b(19|20)\d{2}\b/);
    education.push({
      degree: raw.split(/\b(from|at|[,–-])\b/)[0].trim() || raw,
      institution: instMatch ? instMatch[2].trim() : '—',
      year: yearMatch ? yearMatch[0] : undefined,
    });
  }

  // --- Certifications ---
  const certifications: ParsedCertification[] = [];
  const certRe =
    /\b((?:AWS|Azure|GCP|Google|Oracle|Cisco|Scrum|PMP|SAFe|Kubernetes|TensorFlow)[\w\s]{0,40}?(?:Certified|Certification|Certificate|Associate|Professional|Practitioner|Developer|Architect))\b/g;
  let cm: RegExpExecArray | null;
  while ((cm = certRe.exec(text)) !== null && certifications.length < 5) {
    certifications.push({ name: cm[1].trim() });
  }

  // --- Summary: first paragraph after a summary/objective heading, else first 2 lines ---
  let summary = '';
  const summaryHeading = text.match(
    /(?:summary|objective|profile|about me)\s*[:\-\n]\s*([\s\S]{40,400}?)(?:\n\s*\n|$)/i,
  );
  if (summaryHeading) {
    summary = summaryHeading[1].replace(/\s+/g, ' ').trim();
  } else {
    summary = lines.slice(0, 3).join(' ').slice(0, 300);
  }

  provenance.name = name ? 'PARSED' : 'MANUAL';
  provenance.email = email ? 'PARSED' : 'MANUAL';
  provenance.phone = phone ? 'PARSED' : 'MANUAL';
  provenance.location = location ? 'PARSED' : 'MANUAL';
  provenance.currentRole = currentRole ? 'PARSED' : 'MANUAL';
  provenance.totalExperienceYears = 'SYSTEM';
  provenance.skills = 'SYSTEM';

  return {
    name,
    email,
    phone,
    location,
    currentRole,
    currentCompany,
    totalExperienceYears: totalYears,
    experienceDisplay,
    skills,
    topSkills,
    workHistory,
    education,
    certifications,
    socialLinks: {
      linkedin: linkedinMatch ? linkedinMatch[0] : undefined,
      github: githubMatch ? githubMatch[0] : undefined,
      portfolio: portfolioMatch ? portfolioMatch[0] : undefined,
    },
    summary,
    provenance,
    parserVersion: PARSER_VERSION,
  };
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w.toUpperCase()))
    .join(' ')
    .trim();
}

/* ============================================================
   MATCH INTELLIGENCE (candidate ↔ job)
   ============================================================ */

export interface MatchInput {
  candidateSkills: string[];
  candidateExperienceYears: number;
  candidateLocation?: string | null;
  jobRequirements: string[];
  jobExperienceMin?: number | null;
  jobExperienceMax?: number | null;
  jobLocation?: string | null;
}

export interface MatchResult {
  overallScore: number;
  skillScore: number;
  experienceScore: number;
  educationScore: number;
  locationScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  experienceGap: number | null;
  explanation: string;
  engineVersion: string;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#]/g, '');

export function computeMatchScore(input: MatchInput): MatchResult {
  const reqs = (input.jobRequirements || []).map((r) => r.trim()).filter(Boolean);
  const candSkills = new Set((input.candidateSkills || []).map(norm));

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];
  for (const req of reqs) {
    const reqNorm = norm(req);
    const hit =
      candSkills.has(reqNorm) ||
      [...candSkills].some(
        (cs) =>
          (reqNorm.length > 2 && cs.includes(reqNorm)) ||
          (cs.length > 2 && reqNorm.includes(cs)),
      );
    if (hit) matchedSkills.push(req);
    else missingSkills.push(req);
  }

  const skillScore = reqs.length
    ? Math.round((matchedSkills.length / reqs.length) * 100)
    : 60;

  const min = input.jobExperienceMin ?? 0;
  const max = input.jobExperienceMax ?? null;
  const years = input.candidateExperienceYears || 0;
  let experienceScore: number;
  let experienceGap: number | null = null;
  if (years < min) {
    experienceGap = Math.round((min - years) * 10) / 10;
    experienceScore = Math.max(20, Math.round(100 - experienceGap * 25));
  } else if (max && years > max + 2) {
    experienceScore = 65;
  } else {
    experienceScore = 95;
  }

  const educationScore = 80; // heuristic baseline (degree parsing is best-effort)

  let locationScore = 60;
  const jobLoc = (input.jobLocation || '').toLowerCase();
  const candLoc = (input.candidateLocation || '').toLowerCase();
  if (jobLoc && candLoc) {
    if (jobLoc === candLoc) locationScore = 100;
    else if (
      /remote|hybrid/.test(jobLoc) ||
      /remote|hybrid/.test(candLoc)
    )
      locationScore = 90;
    else if (jobLoc.split(/[^a-z]+/).some((w) => w.length > 3 && candLoc.includes(w)))
      locationScore = 85;
  } else if (/remote|hybrid/.test(jobLoc)) {
    locationScore = 90;
  }

  const overallScore = Math.round(
    skillScore * 0.5 + experienceScore * 0.25 + educationScore * 0.1 + locationScore * 0.15,
  );

  const parts: string[] = [];
  parts.push(
    reqs.length
      ? `Skills match ${matchedSkills.length}/${reqs.length} requirements`
      : 'No specific skill requirements listed',
  );
  if (experienceGap) parts.push(`${experienceGap} yrs below the experience bar`);
  else parts.push('Experience aligns with the role');
  if (locationScore >= 85) parts.push('Location compatible');
  else parts.push('Location may require relocation');

  return {
    overallScore: Math.max(0, Math.min(100, overallScore)),
    skillScore,
    experienceScore,
    educationScore,
    locationScore,
    matchedSkills,
    missingSkills,
    experienceGap,
    explanation: parts.join(' · ') + '.',
    engineVersion: 'v1.0',
  };
}
