import { db } from '@/lib/db';

export interface SkillGapItem {
  skillId: string;
  skillName: string;
  category: string;
  currentProficiency: string;
  currentLevel: number; // 1 to 5
  requiredProficiency: string;
  requiredLevel: number; // 1 to 5
  gapLevels: number; // e.g. 2
  status: 'Met' | 'Gap' | 'Exceeds' | 'Missing';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  recommendedCourse?: {
    id: string;
    title: string;
    durationHours: number;
    level: string;
    isEnrolled: boolean;
    progressPercentage: number;
  };
}

export interface EmployeeSkillGapAnalysis {
  employeeId: string;
  employeeName: string;
  currentRole: string;
  targetRole: string;
  targetDepartment?: string;
  readinessPercentage: number;
  totalSkillsAssessed: number;
  skillsMetCount: number;
  skillsGapCount: number;
  criticalGapsCount: number;
  gaps: SkillGapItem[];
  careerPath?: {
    id: string;
    current_role_title: string;
    next_role_title: string;
    min_experience_years: number;
    performance_expectation: string;
  } | null;
}

const PROFICIENCY_TO_LEVEL: Record<string, number> = {
  Beginner: 1,
  Intermediate: 3,
  Advanced: 4,
  Expert: 5,
};

const LEVEL_TO_PROFICIENCY: Record<number, string> = {
  1: 'Beginner',
  2: 'Developing',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
};

export function proficiencyToNumber(prof?: string): number {
  if (!prof) return 0;
  return PROFICIENCY_TO_LEVEL[prof] || 2;
}

export function numberToProficiency(level: number): string {
  return LEVEL_TO_PROFICIENCY[Math.min(5, Math.max(1, Math.round(level)))] || 'Intermediate';
}

/**
 * Computes skill gap between employee's existing skills and target role benchmarks.
 */
export async function calculateEmployeeSkillGap(
  employeeId: string,
  targetRoleTitle?: string
): Promise<EmployeeSkillGapAnalysis> {
  const [employee, empSkills, aspirations, allCourses, enrollments] = await Promise.all([
    db.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true, roleTitle: true, department: true },
    }),
    db.employeeSkill.findMany({
      where: { employeeId },
      include: { skill: true },
    }),
    db.career_aspirations.findUnique({
      where: { employee_id: employeeId },
    }),
    db.lmsCourse.findMany(),
    db.employeeCourseEnrollment.findMany({
      where: { employeeId },
    }),
  ]);

  if (!employee) {
    throw new Error('Employee not found');
  }

  // Determine target role: explicit param -> career aspiration -> default next step
  const currentRole = employee.roleTitle;
  const targetRole = targetRoleTitle || aspirations?.target_role || `Senior ${currentRole}`;

  // Find career path definition if available
  const careerPath = await db.career_paths.findFirst({
    where: {
      current_role_title: currentRole,
      is_active: true,
    },
  });

  // Find benchmarks for target role or fallback to current role benchmarks
  let benchmarks = await db.role_skill_benchmarks.findMany({
    where: { role_title: targetRole },
    include: { skill: true },
  });

  if (benchmarks.length === 0) {
    // If no specific benchmark for target role, look for generic benchmarks in the department or role
    benchmarks = await db.role_skill_benchmarks.findMany({
      take: 5,
      include: { skill: true },
    });
  }

  const enrollmentMap = new Map(enrollments.map((e) => [e.courseId, e]));
  const empSkillMap = new Map(empSkills.map((es) => [es.skillId, es]));

  const gapItems: SkillGapItem[] = [];
  let metCount = 0;
  let gapCount = 0;
  let criticalCount = 0;

  for (const b of benchmarks) {
    const empSkill = empSkillMap.get(b.skill_id);
    const currentLevel = empSkill ? proficiencyToNumber(empSkill.proficiency) : 0;
    const currentProficiency = empSkill ? empSkill.proficiency : 'Not Acquired';
    const requiredLevel = b.min_proficiency_level || proficiencyToNumber(b.required_proficiency);
    const requiredProficiency = b.required_proficiency || numberToProficiency(requiredLevel);

    const gap = Math.max(0, requiredLevel - currentLevel);

    let status: 'Met' | 'Gap' | 'Exceeds' | 'Missing' = 'Met';
    if (currentLevel === 0) {
      status = 'Missing';
      gapCount++;
    } else if (currentLevel < requiredLevel) {
      status = 'Gap';
      gapCount++;
    } else if (currentLevel > requiredLevel) {
      status = 'Exceeds';
      metCount++;
    } else {
      status = 'Met';
      metCount++;
    }

    const priority: 'Critical' | 'High' | 'Medium' | 'Low' =
      gap >= 2 || status === 'Missing'
        ? 'Critical'
        : gap === 1
        ? 'High'
        : 'Medium';

    if (priority === 'Critical') criticalCount++;

    // Find recommended LMS course for this skill
    let recommendedCourse;
    const matchingCourse = allCourses.find(
      (c) =>
        c.title.toLowerCase().includes(b.skill.name.toLowerCase()) ||
        c.category.toLowerCase() === b.skill.category.toLowerCase()
    );

    if (matchingCourse) {
      const enr = enrollmentMap.get(matchingCourse.id);
      recommendedCourse = {
        id: matchingCourse.id,
        title: matchingCourse.title,
        durationHours: matchingCourse.durationHours,
        level: matchingCourse.level,
        isEnrolled: Boolean(enr),
        progressPercentage: enr?.progressPercentage ?? 0,
      };
    }

    gapItems.push({
      skillId: b.skill_id,
      skillName: b.skill.name,
      category: b.skill.category,
      currentProficiency,
      currentLevel,
      requiredProficiency,
      requiredLevel,
      gapLevels: gap,
      status,
      priority,
      recommendedCourse,
    });
  }

  const totalAssessed = gapItems.length;
  const readinessPercentage =
    totalAssessed > 0 ? Math.round((metCount / totalAssessed) * 100) : 100;

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    currentRole,
    targetRole,
    targetDepartment: aspirations?.target_department || employee.department,
    readinessPercentage,
    totalSkillsAssessed: totalAssessed,
    skillsMetCount: metCount,
    skillsGapCount: gapCount,
    criticalGapsCount: criticalCount,
    gaps: gapItems,
    careerPath: careerPath
      ? {
          id: careerPath.id,
          current_role_title: careerPath.current_role_title,
          next_role_title: careerPath.next_role_title,
          min_experience_years: careerPath.min_experience_years,
          performance_expectation: careerPath.performance_expectation,
        }
      : null,
  };
}
