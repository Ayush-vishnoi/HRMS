import { type ParsedDraft } from './resume-parser';
export declare function parseResumeFile(filePath: string, mimetype: string): Promise<{
    parsed: ParsedDraft;
    rawText: string;
    engine: 'python' | 'ts-fallback';
}>;
