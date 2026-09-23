"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseResumeFile = parseResumeFile;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const common_1 = require("@nestjs/common");
const resume_parser_1 = require("./resume-parser");
const logger = new common_1.Logger('PythonResumeParser');
function resolveParserDir() {
    const candidates = [
        process.env.RESUME_PARSER_DIR,
        (0, node_path_1.join)(__dirname, '..', '..', 'scripts', 'resume_parser'),
        (0, node_path_1.join)(__dirname, '..', 'scripts', 'resume_parser'),
        (0, node_path_1.join)(process.cwd(), 'scripts', 'resume_parser'),
        (0, node_path_1.join)(process.cwd(), 'backend', 'scripts', 'resume_parser'),
    ].filter(Boolean);
    return candidates.find((dir) => (0, node_fs_1.existsSync)((0, node_path_1.join)(dir, 'resume_parser_production.py'))) ?? null;
}
function resolvePython(parserDir) {
    if (process.env.RESUME_PARSER_PYTHON)
        return process.env.RESUME_PARSER_PYTHON;
    const venvUnix = (0, node_path_1.join)(parserDir, '.venv', 'bin', 'python');
    const venvWin = (0, node_path_1.join)(parserDir, '.venv', 'Scripts', 'python.exe');
    if ((0, node_fs_1.existsSync)(venvUnix))
        return venvUnix;
    if ((0, node_fs_1.existsSync)(venvWin))
        return venvWin;
    return 'python3';
}
const PARSER_TIMEOUT_MS = 25_000;
function runPython(pythonBin, scriptPath, filePath) {
    return new Promise((resolve, reject) => {
        const proc = (0, node_child_process_1.spawn)(pythonBin, [scriptPath, filePath], {
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
                    resolve(JSON.parse(stdout));
                }
                catch (err) {
                    reject(new Error(`Could not parse Python output: ${err.message}`));
                }
                return;
            }
            let detail = stderr.trim();
            try {
                detail = JSON.parse(stderr).error || detail;
            }
            catch {
            }
            reject(new Error(detail || `Python parser exited with code ${code}`));
        });
    });
}
const catNorm = (s) => s.toLowerCase().replace(/[^a-z0-9+#]/g, '');
const CATEGORY_BY_NORM = Object.fromEntries(Object.entries(resume_parser_1.SKILL_CATALOG).map(([k, v]) => [catNorm(k), v]));
function categoryFor(skill) {
    const n = catNorm(skill);
    if (CATEGORY_BY_NORM[n])
        return CATEGORY_BY_NORM[n];
    const hit = Object.keys(CATEGORY_BY_NORM).find((k) => k.includes(n) || n.includes(k));
    return hit ? CATEGORY_BY_NORM[hit] : 'General';
}
function estimateExperienceYears(exp) {
    if (!exp?.length)
        return 0;
    const now = new Date();
    let earliest = null;
    let latest = null;
    for (const e of exp) {
        const range = e.date_range || '';
        const years = [...range.matchAll(/(19|20)\d{2}/g)].map((m) => Number(m[0]));
        if (/present|current|now/i.test(range))
            years.push(now.getFullYear());
        for (const y of years) {
            if (earliest === null || y < earliest)
                earliest = y;
            if (latest === null || y > latest)
                latest = y;
        }
    }
    if (earliest === null || latest === null)
        return 0;
    return Math.max(0, Math.min(50, latest - earliest));
}
const LOCATION_RE = /\b(bengaluru|bangalore|mumbai|delhi|noida|gurgaon|gurugram|hyderabad|pune|chennai|kolkata|ahmedabad|jaipur|indore|kochi|coimbatore|remote|work from home)\b/i;
function titleCase(s) {
    return s
        .toLowerCase()
        .split(/\s+/)
        .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w.toUpperCase()))
        .join(' ')
        .trim();
}
function stripTrailingDates(head) {
    return head
        .replace(/\s+(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(?:19|20)\d{2}\b.*$/i, '')
        .trim();
}
function mapToDraft(py) {
    const canonical = py.skills?.canonical ?? [];
    const skills = canonical.map((name) => ({
        name,
        category: categoryFor(name),
        confidence: 'HIGH',
        confidenceScore: 90,
        occurrences: 1,
    }));
    const firstExp = py.experience?.[0];
    let currentCompany;
    let currentRole;
    if (firstExp?.heading) {
        const head = stripTrailingDates(firstExp.heading);
        if (head.includes('|')) {
            const [a, b] = head.split('|').map((p) => p.trim());
            currentCompany = a || undefined;
            currentRole = b || undefined;
        }
        else {
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
        const instMatch = head.match(/([A-Z][\w&.\-' ]{3,60}(?:University|College|Institute|School|Academy|IIT|NIT|IIIT|BHU))/);
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
async function parseResumeFile(filePath, mimetype) {
    const parserDir = resolveParserDir();
    if (parserDir) {
        const pythonBin = resolvePython(parserDir);
        const scriptPath = (0, node_path_1.join)(parserDir, 'resume_parser_production.py');
        try {
            const py = await runPython(pythonBin, scriptPath, filePath);
            if (py.error)
                throw new Error(py.error);
            return { parsed: mapToDraft(py), rawText: py.raw_text || '', engine: 'python' };
        }
        catch (err) {
            logger.warn(`Python resume parser failed (${err.message}); falling back to TS parser.`);
        }
    }
    else {
        logger.warn('Python resume parser not found on disk; using TS fallback parser.');
    }
    const buffer = await (0, promises_1.readFile)(filePath);
    const rawText = (0, resume_parser_1.extractResumeText)(buffer, mimetype);
    return { parsed: (0, resume_parser_1.parseResumeDraft)(rawText), rawText, engine: 'ts-fallback' };
}
//# sourceMappingURL=python-resume-parser.js.map