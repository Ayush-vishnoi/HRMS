import { AuthorizationError, getCurrentEmployee } from '@/lib/auth-session';

export type RecruitmentUser = {
  id: string;
  name: string;
  email: string;
  userRole: 'admin' | 'manager' | 'employee';
  department: string;
};

/**
 * Ensures user has access to ATS (admin or manager). Throws AuthorizationError for employee.
 */
export async function requireRecruitmentUser(): Promise<RecruitmentUser> {
  const emp = await getCurrentEmployee();
  if (!emp) {
    throw new AuthorizationError();
  }

  if (emp.userRole !== 'admin' && emp.userRole !== 'manager') {
    throw new AuthorizationError();
  }

  return {
    id: emp.id,
    name: emp.name,
    email: emp.email,
    userRole: emp.userRole as 'admin' | 'manager' | 'employee',
    department: emp.department,
  };
}

/**
 * Returns Prisma where filter for jobs based on user role
 */
export function getJobFilterForUser(user: RecruitmentUser) {
  if (user.userRole === 'admin') {
    return {};
  }

  // Manager sees jobs where they are the hiring manager or assigned recruiter
  return {
    OR: [
      { hiring_manager_id: user.id },
      { recruiter_id: user.id },
    ],
  };
}

/**
 * Returns Prisma where filter for candidates based on user role
 */
export function getCandidateFilterForUser(user: RecruitmentUser) {
  if (user.userRole === 'admin') {
    return {};
  }

  // Manager sees candidates for their authorized jobs
  return {
    job: {
      OR: [
        { hiring_manager_id: user.id },
        { recruiter_id: user.id },
      ],
    },
  };
}

/**
 * Checks if a specific user can access a specific job
 */
export function canUserAccessJob(
  user: RecruitmentUser,
  job: { hiring_manager_id?: string | null; recruiter_id?: string | null }
): boolean {
  if (user.userRole === 'admin') return true;
  return job.hiring_manager_id === user.id || job.recruiter_id === user.id;
}

/**
 * Returns any authenticated employee as RecruitmentUser (including employees who may be panel members)
 */
export async function getAuthenticatedRecruitmentUser(): Promise<RecruitmentUser> {
  const emp = await getCurrentEmployee();
  if (!emp) {
    throw new AuthorizationError();
  }

  return {
    id: emp.id,
    name: emp.name,
    email: emp.email,
    userRole: emp.userRole as 'admin' | 'manager' | 'employee',
    department: emp.department,
  };
}

/**
 * Returns Prisma where filter for recruitment interviews based on user role and panel assignments
 */
export function getInterviewFilterForUser(user: RecruitmentUser) {
  if (user.userRole === 'admin') {
    return {};
  }

  if (user.userRole === 'manager') {
    return {
      OR: [
        {
          recruitment_candidates: {
            job: {
              OR: [
                { hiring_manager_id: user.id },
                { recruiter_id: user.id },
              ],
            },
          },
        },
        {
          interview_panel_members: {
            some: { employee_id: user.id },
          },
        },
      ],
    };
  }

  // Normal employee / panel member: can only view interviews where assigned to panel
  return {
    interview_panel_members: {
      some: { employee_id: user.id },
    },
  };
}

/**
 * Checks if user has permission to schedule, update, reschedule, or cancel interviews for a candidate
 */
export function canUserManageCandidateInterview(
  user: RecruitmentUser,
  job: { hiring_manager_id?: string | null; recruiter_id?: string | null }
): boolean {
  if (user.userRole === 'admin') return true;
  if (user.userRole === 'manager') {
    return job.hiring_manager_id === user.id || job.recruiter_id === user.id;
  }
  return false;
}

/**
 * Checks if user can view an interview (admin, authorized manager/recruiter, or assigned panel member)
 */
export function canUserViewInterview(
  user: RecruitmentUser,
  interview: {
    recruitment_candidates?: {
      job?: { hiring_manager_id?: string | null; recruiter_id?: string | null } | null;
    } | null;
    interview_panel_members?: { employee_id: string }[];
  }
): boolean {
  if (user.userRole === 'admin') return true;

  if (user.userRole === 'manager' && interview.recruitment_candidates?.job) {
    if (canUserAccessJob(user, interview.recruitment_candidates.job)) {
      return true;
    }
  }

  if (interview.interview_panel_members?.some((pm) => pm.employee_id === user.id)) {
    return true;
  }

  return false;
}

