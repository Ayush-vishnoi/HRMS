/**
 * Bridge to the production Python resume parser
 * (scripts/resume_parser/resume_parser_production.py).
 *
 * The Python parser handles PDF / DOCX / TXT (+ OCR and legacy Office when the
 * optional system deps are present) far more robustly than the built-in
 * heuristic TS parser. We shell out to it, map its rich JSON into the
 * ParsedDraft shape the rest of the recruitment module already consumes, and
 * fall back to the TS parser if Python is unavailable or errors — so resume
 * upload never hard-fails on a bad environment.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import {
  extractResumeText,
  parseResumeDraft,
  SKILL_CATALOG,
  type ParsedDraft,
  type ParsedSkill,
} from './resume-parser';

const logger = new Logger('PythonResumeParser');

/** Resolve the parser dir across dev (src) and prod (dist) layouts. */
function resolveParserDir(): string | null {
  const candidates = [
    process.env.RESUME_PARSER_DIR,
    join(__dirname, '..', '..', 'scripts', 'resume_parser'), // dist/recruitment -> backend/scripts
    join(__dirname, '..', 'scripts', 'resume_parser'),
    join(process.cwd(), 'scripts', 'resume_parser'),
    join(process.cwd(), 'backend', 'scripts', 'resume_parser'),
  ].filter(Boolean) as string[];
  return candidates.find((dir) => existsSync(join(dir, 'resume_parser_production.py'))) ?? null;
}

function resolvePython(parserDir: string): string {
  if (process.env.RESUME_PARSER_PYTHON) return process.env.RESUME_PARSER_PYTHON;
  const venvUnix = join(parserDir, '.venv', 'bin', 'python');
  const venvWin = join(parserDir, '.venv', 'Scripts', 'python.exe');
  if (existsSync(venvUnix)) return venvUnix;
  if (existsSync(venvWin)) return venvWin;
  return 'python3'; // fall back to system python (deps may still be present globally)
}

const PARSER_TIMEOUT_MS = 25_000;

interface PyOutput {
  schema_version?: string;
  candidate?: {
    name?: string | null;
    emails?: string[];
    phones?: string[];
    links?: { linkedin?: string | null; github?: string | null; portfolio?: string | null };
  };
  summary?: string | null;
  skills?: { canonical?: string[] };
  experience?: Array<{ heading?: string | null; date_range?: string | null; details?: string[] }>;
  education?: Array<{ heading?: string | null; date_range?: string | null }>;
  certifications?: string[];
  raw_text?: string;
  error?: string;
}

/** Spawn the Python parser and return its parsed JSON, or throw on failure. */
function runPython(pythonBin: string, scriptPath: string, filePath: string): Promise<PyOutput> {
  return new Promise((resolve, reject) => {
    const proc = spawn(pythonBin, [scriptPath, filePath], {
      timeout: PARSER_TIMEOUT_MS,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0 && stdout.trim()) {
        try {
          resolve(JSON.parse(stdout) as PyOutput);
        } catch (err) {
          reject(new Error(`Could not parse Python output: ${(err as Error).message}`));
        }
        return;
      }
      // Parser writes {"error": ...} to stderr on a handled failure.
      let detail = stderr.trim();
      try {
        detail = (JSON.parse(stderr) as PyOutput).error || detail;
      } catch {
        /* stderr wasn't JSON */
      }
      reject(new Error(detail || `Python parser exited with code ${code}`));
    });
  });
}

const catNorm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#]/g, '');
const CATEGORY_BY_NORM: Record<string, string> = Object.fromEntries(
  Object.entries(SKILL_CATALOG).map(([k, v]) => [catNorm(k), v]),
);

function categoryFor(skill: string): string {
  const n = catNorm(skill);
  if (CATEGORY_BY_NORM[n]) return CATEGORY_BY_NORM[n];
  const hit = Object.keys(CATEGORY_BY_NORM).find((k) => k.includes(n) || n.includes(k));
  return hit ? CATEGORY_BY_NORM[hit] : 'General';
}

/** Estimate total years of experience from the date ranges in experience entries. */
function estimateExperienceYears(exp: PyOutput['experience']): number {
  if (!exp?.length) return 0;
  const now = new Date();
  let earliest: number | null = null;
  let latest: number | null = null;
  for (const e of exp) {
    const range = e.date_range || '';
    const years = [...range.matchAll(/(19|20)\d{2}/g)].map((m) => Number(m[0]));
    if (/present|current|now/i.test(range)) years.push(now.getFullYear());
    for (const y of years) {
      if (earliest === null || y < earliest) earliest = y;
      if (latest === null || y > latest) latest = y;
    }
  }
  if (earliest === null || latest === null) return 0;
  return Math.max(0, Math.min(50, latest - earliest));
}

const LOCATION_RE =
  /\b(bengaluru|bangalore|mumbai|delhi|noida|gurgaon|gurugram|hyderabad|pune|chennai|kolkata|ahmedabad|jaipur|indore|kochi|coimbatore|remote|work from home)\b/i;

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w.toUpperCase()))
    .join(' ')
    .trim();
}

/** Strip a trailing date range ("... Jan 2020 - Present") from an entry heading. */
function stripTrailingDates(head: string): string {
  return head
    .replace(
      /\s+(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(?:19|20)\d{2}\b.*$/i,
      '',
    )
    .trim();
}

/** Map the Python parser JSON into the ParsedDraft shape used across the module. */
function mapToDraft(py: PyOutput): ParsedDraft {
  const canonical = py.skills?.canonical ?? [];
  const skills: ParsedSkill[] = canonical.map((name) => ({
    name,
    category: categoryFor(name),
    confidence: 'HIGH',
    confidenceScore: 90,
    occurrences: 1,
  }));

  // Split the first experience heading like "Acme Corp | Senior Engineer  Jan 2020 - Present".
  const firstExp = py.experience?.[0];
  let currentCompany: string | undefined;
  let currentRole: string | undefined;
  if (firstExp?.heading) {
    const head = stripTrailingDates(firstExp.heading);
    if (head.includes('|')) {
      const [a, b] = head.split('|').map((p) => p.trim());
      currentCompany = a || undefined;
      currentRole = b || undefined;
    } else {
      currentRole = head || undefined;
    }
  }

  const totalYears = estimateExperienceYears(py.experience);
  const rawText = py.raw_text || '';
  const locMatch = rawText.match(LOCATION_RE);
  const location = locMatch ? titleCase(locMatch[0]) : undefined;

  const workHistory = (py.experience ?? []).slice(0, 6).map((e) => {
    const head = stripTrailingDates(e.heading || '');
    const [company, role] = head.includes('|')
      ? head.split('|').map((p) => p.trim())
      : [head, ''];
    return {
      company: company || '—',
      role: role || head || '—',
      startDate: e.date_range?.split(/[-–—]/)[0]?.trim(),
      endDate: e.date_range?.split(/[-–—]/)[1]?.trim(),
    };
  });

  const education = (py.education ?? []).slice(0, 4).map((e) => {
    const head = e.heading || '';
    const yearMatch = head.match(/\b(19|20)\d{2}\b/);
    const instMatch = head.match(
      /([A-Z][\w&.\-' ]{3,60}(?:University|College|Institute|School|Academy|IIT|NIT|IIIT|BHU))/,
    );
    return {
      degree: head.replace(/\b(19|20)\d{2}\b/, '').replace(/,\s*$/, '').trim() || head || '—',
      institution: instMatch ? instMatch[1].trim() : '—',
      year: yearMatch ? yearMatch[0] : undefined,
    };
  });

  return {
    name: py.candidate?.name ?? undefined,
    email: py.candidate?.emails?.[0],
    phone: py.candidate?.phones?.[0],
    location,
    currentRole,
    currentCompany,
    totalExperienceYears: totalYears,
    experienceDisplay: totalYears > 0 ? `${totalYears} yr${totalYears === 1 ? '' : 's'}` : 'Fresher',
    skills,
    topSkills: canonical.slice(0, 6),
    workHistory,
    education,
    certifications: (py.certifications ?? []).slice(0, 6).map((name) => ({ name })),
    socialLinks: {
      linkedin: py.candidate?.links?.linkedin ?? undefined,
      github: py.candidate?.links?.github ?? undefined,
      portfolio: py.candidate?.links?.portfolio ?? undefined,
    },
    summary: py.summary ?? '',
    provenance: {
      name: py.candidate?.name ? 'PARSED' : 'MANUAL',
      email: py.candidate?.emails?.length ? 'PARSED' : 'MANUAL',
      phone: py.candidate?.phones?.length ? 'PARSED' : 'MANUAL',
      skills: 'PARSED',
      totalExperienceYears: 'SYSTEM',
    },
    parserVersion: `python-${py.schema_version || 'unknown'}`,
  };
}

/**
 * Parse a resume file, preferring the Python parser and falling back to the
 * built-in TS parser. Returns the ParsedDraft plus the raw text (for the
 * stored rawTextSample). Never throws for parsing reasons — always yields a
 * best-effort draft.
 */
export async function parseResumeFile(
  filePath: string,
  mimetype: string,
): Promise<{ parsed: ParsedDraft; rawText: string; engine: 'python' | 'ts-fallback' }> {
  const parserDir = resolveParserDir();
  if (parserDir) {
    const pythonBin = resolvePython(parserDir);
    const scriptPath = join(parserDir, 'resume_parser_production.py');
    try {
      const py = await runPython(pythonBin, scriptPath, filePath);
      if (py.error) throw new Error(py.error);
      return { parsed: mapToDraft(py), rawText: py.raw_text || '', engine: 'python' };
    } catch (err) {
      logger.warn(
        `Python resume parser failed (${(err as Error).message}); falling back to TS parser.`,
      );
    }
  } else {
    logger.warn('Python resume parser not found on disk; using TS fallback parser.');
  }

  // Fallback: built-in TS parser.
  const buffer = await readFile(filePath);
  const rawText = extractResumeText(buffer, mimetype);
  return { parsed: parseResumeDraft(rawText), rawText, engine: 'ts-fallback' };
}
