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
    socialLinks: {
        linkedin?: string;
        github?: string;
        portfolio?: string;
    };
    summary: string;
    provenance: Record<string, 'PARSED' | 'MANUAL' | 'SYSTEM'>;
    parserVersion: string;
}
export declare const PARSER_VERSION = "v1.2.0";
export declare function extractResumeText(buffer: Buffer, mimetype: string): string;
export declare function parseResumeDraft(rawText: string): ParsedDraft;
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
export declare function computeMatchScore(input: MatchInput): MatchResult;
