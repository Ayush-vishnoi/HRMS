import { db } from '@/lib/db';

export interface ExtractedSkill {
  name: string;
  category: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceScore: number;
  occurrences: number;
  canonicalId?: string;
}

// Canonical taxonomy mapping for common industry terms, acronyms, and variations
export const SKILL_CANONICAL_MAP: Record<string, { canonical: string; category: string }> = {
  // Frontend
  react: { canonical: 'React', category: 'Frontend' },
  'react.js': { canonical: 'React', category: 'Frontend' },
  reactjs: { canonical: 'React', category: 'Frontend' },
  'react native': { canonical: 'React Native', category: 'Mobile' },
  typescript: { canonical: 'TypeScript', category: 'Frontend' },
  ts: { canonical: 'TypeScript', category: 'Frontend' },
  javascript: { canonical: 'JavaScript', category: 'Frontend' },
  js: { canonical: 'JavaScript', category: 'Frontend' },
  es6: { canonical: 'JavaScript', category: 'Frontend' },
  nextjs: { canonical: 'Next.js', category: 'Frontend' },
  'next.js': { canonical: 'Next.js', category: 'Frontend' },
  vue: { canonical: 'Vue.js', category: 'Frontend' },
  'vue.js': { canonical: 'Vue.js', category: 'Frontend' },
  angular: { canonical: 'Angular', category: 'Frontend' },
  tailwind: { canonical: 'Tailwind CSS', category: 'Frontend' },
  tailwindcss: { canonical: 'Tailwind CSS', category: 'Frontend' },
  'tailwind css': { canonical: 'Tailwind CSS', category: 'Frontend' },
  html5: { canonical: 'HTML5', category: 'Frontend' },
  css3: { canonical: 'CSS3', category: 'Frontend' },

  // Backend & Languages
  node: { canonical: 'Node.js', category: 'Backend' },
  nodejs: { canonical: 'Node.js', category: 'Backend' },
  'node.js': { canonical: 'Node.js', category: 'Backend' },
  express: { canonical: 'Express.js', category: 'Backend' },
  'express.js': { canonical: 'Express.js', category: 'Backend' },
  python: { canonical: 'Python', category: 'Backend' },
  'python 3': { canonical: 'Python', category: 'Backend' },
  golang: { canonical: 'Go', category: 'Backend' },
  go: { canonical: 'Go', category: 'Backend' },
  java: { canonical: 'Java', category: 'Backend' },
  'spring boot': { canonical: 'Spring Boot', category: 'Backend' },
  spring: { canonical: 'Spring Boot', category: 'Backend' },
  'c++': { canonical: 'C++', category: 'Backend' },
  'c#': { canonical: 'C#', category: 'Backend' },
  '.net': { canonical: '.NET Core', category: 'Backend' },
  rust: { canonical: 'Rust', category: 'Backend' },
  ruby: { canonical: 'Ruby on Rails', category: 'Backend' },

  // Databases
  postgres: { canonical: 'PostgreSQL', category: 'Database' },
  postgresql: { canonical: 'PostgreSQL', category: 'Database' },
  mongodb: { canonical: 'MongoDB', category: 'Database' },
  mongo: { canonical: 'MongoDB', category: 'Database' },
  redis: { canonical: 'Redis', category: 'Database' },
  mysql: { canonical: 'MySQL', category: 'Database' },
  dynamodb: { canonical: 'DynamoDB', category: 'Database' },
  elasticsearch: { canonical: 'Elasticsearch', category: 'Database' },

  // Cloud & DevOps
  aws: { canonical: 'AWS', category: 'Cloud' },
  'aws cloud': { canonical: 'AWS', category: 'Cloud' },
  'amazon web services': { canonical: 'AWS', category: 'Cloud' },
  gcp: { canonical: 'GCP', category: 'Cloud' },
  'google cloud platform': { canonical: 'GCP', category: 'Cloud' },
  'google cloud': { canonical: 'GCP', category: 'Cloud' },
  azure: { canonical: 'Microsoft Azure', category: 'Cloud' },
  'microsoft azure': { canonical: 'Microsoft Azure', category: 'Cloud' },
  docker: { canonical: 'Docker', category: 'DevOps' },
  'docker containers': { canonical: 'Docker', category: 'DevOps' },
  kubernetes: { canonical: 'Kubernetes', category: 'DevOps' },
  k8s: { canonical: 'Kubernetes', category: 'DevOps' },
  terraform: { canonical: 'Terraform', category: 'DevOps' },
  'ci/cd': { canonical: 'CI/CD Pipelines', category: 'DevOps' },
  github: { canonical: 'GitHub', category: 'DevOps' },
  git: { canonical: 'Git', category: 'DevOps' },
  linux: { canonical: 'Linux', category: 'DevOps' },

  // Architecture & APIs
  'system design': { canonical: 'System Design', category: 'Architecture' },
  microservices: { canonical: 'Microservices', category: 'Architecture' },
  'distributed systems': { canonical: 'Distributed Systems', category: 'Architecture' },
  'rest apis': { canonical: 'REST APIs', category: 'Architecture' },
  restful: { canonical: 'REST APIs', category: 'Architecture' },
  graphql: { canonical: 'GraphQL', category: 'Architecture' },
  kafka: { canonical: 'Apache Kafka', category: 'Architecture' },
  'apache kafka': { canonical: 'Apache Kafka', category: 'Architecture' },
  rabbitmq: { canonical: 'RabbitMQ', category: 'Architecture' },

  // AI & Data
  'machine learning': { canonical: 'Machine Learning', category: 'AI/ML' },
  'deep learning': { canonical: 'Deep Learning', category: 'AI/ML' },
  pytorch: { canonical: 'PyTorch', category: 'AI/ML' },
  tensorflow: { canonical: 'TensorFlow', category: 'AI/ML' },
  nlp: { canonical: 'Natural Language Processing', category: 'AI/ML' },
  pandas: { canonical: 'Pandas', category: 'AI/ML' },
  numpy: { canonical: 'NumPy', category: 'AI/ML' },
};

/**
 * Normalizes a raw skill string to the canonical enterprise taxonomy
 */
export function normalizeSkillName(rawSkill: string): { canonical: string; category: string } {
  const clean = rawSkill.toLowerCase().trim();
  if (SKILL_CANONICAL_MAP[clean]) {
    return SKILL_CANONICAL_MAP[clean];
  }

  // Capitalize title
  const formatted = rawSkill
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return { canonical: formatted, category: 'Technical' };
}

/**
 * Extracts and normalizes skills from resume plaintext against the canonical taxonomy
 */
export async function extractSkillsFromText(text: string): Promise<ExtractedSkill[]> {
  const lowerText = text.toLowerCase();
  const skillOccurrences: Map<string, { canonical: string; category: string; count: number }> = new Map();

  // 1. Match against known dictionary
  for (const [key, mapping] of Object.entries(SKILL_CANONICAL_MAP)) {
    // Word boundary regex for accurate keyword detection
    const escaped = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9_#+])${escaped}(?:$|[^a-zA-Z0-9_#+])`, 'gi');
    const matches = lowerText.match(regex);

    if (matches && matches.length > 0) {
      const existing = skillOccurrences.get(mapping.canonical);
      if (existing) {
        existing.count += matches.length;
      } else {
        skillOccurrences.set(mapping.canonical, {
          canonical: mapping.canonical,
          category: mapping.category,
          count: matches.length,
        });
      }
    }
  }

  // 2. Fetch canonical DB skills from SkillMaster to enrich IDs and include any custom org skills
  let dbSkills: Array<{ id: string; name: string; category: string }> = [];
  try {
    dbSkills = await db.skillMaster.findMany({
      select: { id: true, name: true, category: true },
    });
  } catch (err) {
    // Database fallback if offline
  }

  const dbSkillMap = new Map<string, { id: string; category: string }>();
  for (const dbSkill of dbSkills) {
    dbSkillMap.set(dbSkill.name.toLowerCase(), { id: dbSkill.id, category: dbSkill.category });
    
    // Check if dbSkill exists in text directly
    const escaped = dbSkill.name.toLowerCase().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9_#+])${escaped}(?:$|[^a-zA-Z0-9_#+])`, 'gi');
    const matches = lowerText.match(regex);
    if (matches && matches.length > 0 && !skillOccurrences.has(dbSkill.name)) {
      skillOccurrences.set(dbSkill.name, {
        canonical: dbSkill.name,
        category: dbSkill.category,
        count: matches.length,
      });
    }
  }

  // 3. Construct response with confidence scores
  const results: ExtractedSkill[] = [];
  for (const [canonicalName, info] of skillOccurrences.entries()) {
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    let confidenceScore = 0.65;

    if (info.count >= 3) {
      confidence = 'HIGH';
      confidenceScore = 0.95;
    } else if (info.count >= 2) {
      confidence = 'HIGH';
      confidenceScore = 0.88;
    } else {
      confidence = 'MEDIUM';
      confidenceScore = 0.75;
    }

    const dbRecord = dbSkillMap.get(canonicalName.toLowerCase());

    results.push({
      name: canonicalName,
      category: dbRecord?.category || info.category,
      confidence,
      confidenceScore,
      occurrences: info.count,
      canonicalId: dbRecord?.id,
    });
  }

  // Sort by confidenceScore desc, then occurrences desc
  return results.sort((a, b) => b.confidenceScore - a.confidenceScore || b.occurrences - a.occurrences);
}
