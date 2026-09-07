"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARSER_VERSION = void 0;
exports.extractResumeText = extractResumeText;
exports.parseResumeDraft = parseResumeDraft;
exports.computeMatchScore = computeMatchScore;
exports.PARSER_VERSION = 'v1.2.0';
function extractResumeText(buffer, mimetype) {
    const isPdf = mimetype === 'application/pdf' ||
        buffer.subarray(0, 5).toString('latin1') === '%PDF-';
    const isDocx = mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        (buffer.length > 3 && buffer[0] === 0x50 && buffer[1] === 0x4b);
    if (isPdf)
        return extractPdfText(buffer);
    if (isDocx)
        return extractDocxText(buffer);
    return buffer.toString('utf8');
}
function extractPdfText(buffer) {
    const latin = buffer.toString('latin1');
    const chunks = [];
    const tjRe = /\(((?:\\.|[^\\()])*)\)\s*Tj/g;
    const tjArrRe = /\[((?:\\.|[^\]])*)\]\s*TJ/g;
    const literalRe = /\(((?:\\.|[^\\()])*)\)/g;
    let m;
    while ((m = tjRe.exec(latin)) !== null) {
        chunks.push(unescapePdfString(m[1]));
    }
    while ((m = tjArrRe.exec(latin)) !== null) {
        let inner;
        literalRe.lastIndex = 0;
        while ((inner = literalRe.exec(m[1])) !== null) {
            chunks.push(unescapePdfString(inner[1]));
        }
    }
    return chunks.join('\n');
}
function unescapePdfString(s) {
    return s
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\([()\\])/g, '$1')
        .replace(/\\(\d{1,3})/g, (_x, oct) => String.fromCharCode(parseInt(oct, 8)));
}
function extractDocxText(buffer) {
    const latin = buffer.toString('latin1');
    const xmlStart = latin.indexOf('word/document.xml');
    if (xmlStart === -1)
        return '';
    const probe = latin.slice(xmlStart, Math.min(latin.length, xmlStart + 200000));
    const docIdx = probe.search(/<w:document/);
    if (docIdx === -1)
        return '';
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
const SKILL_CATALOG = {
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
const DEGREE_RE = /\b(b\.?tech|b\.?e\.?|b\.?sc|b\.?com|b\.?a\.?|m\.?tech|m\.?e\.?|m\.?sc|m\.?com|m\.?a\.?|mba|ph\.?d|bca|mca|bba)\b[^,\n]{0,80}/gi;
function parseResumeDraft(rawText) {
    const text = rawText.replace(/\r\n/g, '\n');
    const lower = text.toLowerCase();
    const provenance = {};
    const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
    const email = emailMatch ? emailMatch[0].toLowerCase() : undefined;
    const phoneMatch = text.match(/(\+?\d[\d\s\-()]{8,16}\d)/);
    const phone = phoneMatch ? phoneMatch[0].trim() : undefined;
    const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i);
    const githubMatch = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+/i);
    const portfolioMatch = text.match(/(?:https?:\/\/)[\w.-]+\.[a-z]{2,}(?:\/[\w./-]*)?/i);
    let name;
    const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
    for (const line of lines.slice(0, 8)) {
        const cleaned = line
            .replace(/^(curriculum vitae|resume|cv)\b[:\s-]*/i, '')
            .replace(/[|•].*$/, '')
            .trim();
        if (cleaned.length >= 3 &&
            cleaned.length <= 48 &&
            /^[\p{L}][\p{L}\s.'-]*$/u.test(cleaned) &&
            cleaned.split(/\s+/).length <= 5 &&
            !/^(contact|email|phone|summary|objective|profile|address|location)\b/i.test(cleaned)) {
            name = cleaned;
            break;
        }
    }
    const locationMatch = text.match(/\b(bengaluru|bangalore|mumbai|delhi|noida|gurgaon|gurugram|hyderabad|pune|chennai|kolkata|ahmedabad|jaipur|indore|kochi|coimbatore|remote|work from home)\b/i);
    const location = locationMatch ? titleCase(locationMatch[0]) : undefined;
    let currentRole;
    const roleRe = /\b(senior|junior|lead|principal|staff|associate|assistant)?\s*(software|full[\s-]?stack|backend|back[\s-]?end|frontend|front[\s-]?end|web|mobile|data|devops|ml|machine learning|qa|test|systems|cloud|product|project|program)\s*(engineer|developer|architect|analyst|scientist|manager|designer|consultant|lead)\b/i;
    const roleMatch = text.match(roleRe);
    if (roleMatch)
        currentRole = titleCase(roleMatch[0].trim());
    let currentCompany;
    const companyRe = /(?:at|with|@)\s+([A-Z][\w&.\- ]{2,39}(?:Inc|Ltd|Limited|Pvt|Technologies|Labs|Solutions|Systems|Softwares?|Consulting|Group|Studios?)?)\b/;
    const companyMatch = text.match(companyRe);
    if (companyMatch)
        currentCompany = companyMatch[1].trim();
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
    const experienceDisplay = totalYears > 0 ? `${totalYears} yr${totalYears === 1 ? '' : 's'}` : 'Fresher';
    const skills = [];
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
    const workHistory = [];
    const jobBlockRe = /([A-Z][\w&.\- ]{2,39})[\s|,-]+((?:Senior |Junior |Lead |Principal |Staff )?(?:Software |Full Stack |Backend |Frontend |Web |Data |DevOps |ML )?(?:Engineer|Developer|Architect|Analyst|Scientist|Manager|Consultant))[\s|,-]*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}\s*[-–—to]+\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|Present|Current|Now))?/g;
    let jm;
    while ((jm = jobBlockRe.exec(text)) !== null && workHistory.length < 6) {
        const company = jm[1].trim();
        const role = jm[2].trim();
        const dates = jm[3];
        let startDate;
        let endDate;
        let durationYears;
        if (dates) {
            const dateParts = dates.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{4})/gi);
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
    const education = [];
    let em;
    DEGREE_RE.lastIndex = 0;
    while ((em = DEGREE_RE.exec(text)) !== null && education.length < 4) {
        const raw = em[0].trim().replace(/\s+/g, ' ');
        const instMatch = raw.match(/\b(from|at|[,–-])\s+([A-Z][\w&.\-' ]{3,60}(?:University|College|Institute|School|Academy|IIT|NIT|IIIT|BHU))\b/);
        const yearMatch = raw.match(/\b(19|20)\d{2}\b/);
        education.push({
            degree: raw.split(/\b(from|at|[,–-])\b/)[0].trim() || raw,
            institution: instMatch ? instMatch[2].trim() : '—',
            year: yearMatch ? yearMatch[0] : undefined,
        });
    }
    const certifications = [];
    const certRe = /\b((?:AWS|Azure|GCP|Google|Oracle|Cisco|Scrum|PMP|SAFe|Kubernetes|TensorFlow)[\w\s]{0,40}?(?:Certified|Certification|Certificate|Associate|Professional|Practitioner|Developer|Architect))\b/g;
    let cm;
    while ((cm = certRe.exec(text)) !== null && certifications.length < 5) {
        certifications.push({ name: cm[1].trim() });
    }
    let summary = '';
    const summaryHeading = text.match(/(?:summary|objective|profile|about me)\s*[:\-\n]\s*([\s\S]{40,400}?)(?:\n\s*\n|$)/i);
    if (summaryHeading) {
        summary = summaryHeading[1].replace(/\s+/g, ' ').trim();
    }
    else {
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
        parserVersion: exports.PARSER_VERSION,
    };
}
function titleCase(s) {
    return s
        .toLowerCase()
        .split(/\s+/)
        .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w.toUpperCase()))
        .join(' ')
        .trim();
}
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9+#]/g, '');
function computeMatchScore(input) {
    const reqs = (input.jobRequirements || []).map((r) => r.trim()).filter(Boolean);
    const candSkills = new Set((input.candidateSkills || []).map(norm));
    const matchedSkills = [];
    const missingSkills = [];
    for (const req of reqs) {
        const reqNorm = norm(req);
        const hit = candSkills.has(reqNorm) ||
            [...candSkills].some((cs) => (reqNorm.length > 2 && cs.includes(reqNorm)) ||
                (cs.length > 2 && reqNorm.includes(cs)));
        if (hit)
            matchedSkills.push(req);
        else
            missingSkills.push(req);
    }
    const skillScore = reqs.length
        ? Math.round((matchedSkills.length / reqs.length) * 100)
        : 60;
    const min = input.jobExperienceMin ?? 0;
    const max = input.jobExperienceMax ?? null;
    const years = input.candidateExperienceYears || 0;
    let experienceScore;
    let experienceGap = null;
    if (years < min) {
        experienceGap = Math.round((min - years) * 10) / 10;
        experienceScore = Math.max(20, Math.round(100 - experienceGap * 25));
    }
    else if (max && years > max + 2) {
        experienceScore = 65;
    }
    else {
        experienceScore = 95;
    }
    const educationScore = 80;
    let locationScore = 60;
    const jobLoc = (input.jobLocation || '').toLowerCase();
    const candLoc = (input.candidateLocation || '').toLowerCase();
    if (jobLoc && candLoc) {
        if (jobLoc === candLoc)
            locationScore = 100;
        else if (/remote|hybrid/.test(jobLoc) ||
            /remote|hybrid/.test(candLoc))
            locationScore = 90;
        else if (jobLoc.split(/[^a-z]+/).some((w) => w.length > 3 && candLoc.includes(w)))
            locationScore = 85;
    }
    else if (/remote|hybrid/.test(jobLoc)) {
        locationScore = 90;
    }
    const overallScore = Math.round(skillScore * 0.5 + experienceScore * 0.25 + educationScore * 0.1 + locationScore * 0.15);
    const parts = [];
    parts.push(reqs.length
        ? `Skills match ${matchedSkills.length}/${reqs.length} requirements`
        : 'No specific skill requirements listed');
    if (experienceGap)
        parts.push(`${experienceGap} yrs below the experience bar`);
    else
        parts.push('Experience aligns with the role');
    if (locationScore >= 85)
        parts.push('Location compatible');
    else
        parts.push('Location may require relocation');
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
//# sourceMappingURL=resume-parser.js.map