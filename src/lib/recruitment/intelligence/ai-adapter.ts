import { ExtractedSkill, extractSkillsFromText } from './skills-extractor';
import { parseResumeContent, StructuredResumeData } from './parser';

export interface CandidateIntelligenceProvider {
  name: string;
  isAI: boolean;
  parseResume(text: string, candidateId?: string): Promise<StructuredResumeData>;
  extractSkills(text: string): Promise<ExtractedSkill[]>;
  generateMatchExplanation(candidate: any, job: any, matchScore: number): Promise<string>;
}

/**
 * Deterministic rule-based implementation (default engine)
 */
export class DeterministicIntelligenceProvider implements CandidateIntelligenceProvider {
  name = 'Deterministic Rule Engine v1.0';
  isAI = false;

  async parseResume(text: string, candidateId?: string): Promise<StructuredResumeData> {
    return parseResumeContent(text, candidateId);
  }

  async extractSkills(text: string): Promise<ExtractedSkill[]> {
    return extractSkillsFromText(text);
  }

  async generateMatchExplanation(candidate: any, job: any, matchScore: number): Promise<string> {
    return `Evaluated candidate "${candidate.name || 'Applicant'}" against "${job.title || 'Requisition'}" with deterministic match score of ${matchScore}%.`;
  }
}

/**
 * AI Adapter Factory - returns active provider based on environment configuration
 */
export function getIntelligenceProvider(): CandidateIntelligenceProvider {
  // Can be dynamically switched to Gemini or OpenAI when API keys and model configurations are present
  return new DeterministicIntelligenceProvider();
}
