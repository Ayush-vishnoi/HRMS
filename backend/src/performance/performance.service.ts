import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { KraPriority, KraStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotifyService } from '../common/notifications/notify.service';
import { syncEmployeeKpis } from './engines/kpi-engine';
import { calculateEmployeePerformanceScore } from './engines/score-engine';

// ---------------------------------------------------------------------------
// KRA status mapping (display strings <-> Prisma enum)
// ---------------------------------------------------------------------------

const mapKraStatusToPrisma = (status?: string): KraStatus => {
  if (!status) return KraStatus.NotStarted;
  const s = status.toLowerCase().replace(/[^a-z]/g, '');
  if (s === 'completed') return KraStatus.Completed;
  if (s.includes('review')) return KraStatus.UnderReview;
  if (s.includes('progress')) return KraStatus.InProgress;
  return KraStatus.NotStarted;
};

const mapPrismaStatusToDisplay = (status: KraStatus): string => {
  switch (status) {
    case KraStatus.Completed:
      return 'Completed';
    case KraStatus.UnderReview:
      return 'Under Review';
    case KraStatus.InProgress:
      return 'In Progress';
    case KraStatus.NotStarted:
    default:
      return 'Not Started';
  }
};

const KRA_INCLUDE = {
  assignedTo: { select: { id: true, name: true, roleTitle: true, department: true } },
  assignedBy: { select: { id: true, name: true, roleTitle: true, department: true } },
};

const formatKra = (kra: any) => ({
  id: kra.id,
  title: kra.title,
  description: kra.description,
  keyResult: kra.keyResult,
  category: kra.category,
  assignedToId: kra.assignedToId,
  assignedTo: kra.assignedTo?.name,
  assignedBy: kra.assignedBy?.name,
  assignerRole: kra.assignedBy?.roleTitle,
  assignedOn: kra.assignedOn,
  dueDate: kra.dueDate,
  priority: kra.priority,
  status: mapPrismaStatusToDisplay(kra.status),
  progress: kra.progress,
  weightage: kra.weightage,
  lastUpdate: kra.lastUpdate || '',
  deliverables: kra.deliverables,
});

// ---------------------------------------------------------------------------
// Default competency framework (auto-seeded per organization)
// ---------------------------------------------------------------------------

const DEFAULT_COMPETENCIES = [
  {
    name: 'Technical Expertise & Craft',
    description: 'Demonstrates deep domain knowledge, quality execution, and adherence to technical standards.',
    scale: {
      1: 'Novice: Requires constant guidance on core tasks',
      2: 'Developing: Handles routine tasks with supervision',
      3: 'Proficient: Independently delivers complex technical deliverables',
      4: 'Advanced: Sets technical standards and mentors team members',
      5: 'Expert: Industry-recognized technical authority and system architect',
    },
  },
  {
    name: 'Problem Solving & Critical Thinking',
    description: 'Analyzes ambiguous challenges, identifies root causes, and implements robust solutions.',
    scale: {
      1: 'Struggles to diagnose issues without step-by-step instructions',
      2: 'Solves known problems using standard procedures',
      3: 'Effectively deconstructs complex problems and evaluates trade-offs',
      4: 'Proactively identifies systemic bottlenecks and crafts preventive solutions',
      5: 'Solves unprecedented organizational challenges with innovative methodologies',
    },
  },
  {
    name: 'Communication & Stakeholder Management',
    description: 'Articulates ideas clearly, listens actively, and aligns diverse stakeholders.',
    scale: {
      1: 'Communication is unclear or causes misunderstandings',
      2: 'Communicates adequately within immediate team',
      3: 'Clear, concise, and structured written and verbal communication',
      4: 'Tailors communication seamlessly across executive and technical audiences',
      5: 'Inspires organization-wide alignment and excels in high-stakes negotiations',
    },
  },
  {
    name: 'Collaboration & Teamwork',
    description: 'Fosters an inclusive, supportive environment and collaborates across functional silos.',
    scale: {
      1: 'Works in isolation and resists collaborative efforts',
      2: 'Participates in team activities when requested',
      3: 'Active, reliable contributor who unblocks teammates',
      4: 'Builds cross-functional bridges and elevates collective team morale',
      5: 'Champions organizational culture of mutual trust and seamless cross-org collaboration',
    },
  },
  {
    name: 'Leadership & Mentorship',
    description: 'Guides others, develops emerging talent, and drives team outcomes.',
    scale: {
      1: 'Does not support or guide colleagues',
      2: 'Provides ad-hoc assistance to peers',
      3: 'Proactively mentors junior team members and models best practices',
      4: 'Empowers high-performing teams, coaches future leaders, and drives initiatives',
      5: 'Visionary leader who attracts, retains, and grows exceptional industry talent',
    },
  },
  {
    name: 'Ownership & Accountability',
    description: 'Takes end-to-end responsibility for results, overcomes roadblocks, and delivers on commitments.',
    scale: {
      1: 'Deflects responsibility and misses deadlines frequently',
      2: 'Takes responsibility only for assigned tasks',
      3: 'Takes full ownership of outcomes and reliably delivers on commitments',
      4: 'Anticipates risks, unblocks team obstacles, and ensures flawless delivery',
      5: 'Exemplifies extreme ownership across company-wide strategic bets',
    },
  },
  {
    name: 'Customer Focus & Value Delivery',
    description: 'Understands customer/user needs and delivers high-impact, user-centric value.',
    scale: {
      1: 'Lacks awareness of end-user impact and business requirements',
      2: 'Follows specifications without considering user experience',
      3: 'Consistently prioritizes user experience and business value',
      4: 'Deeply understands customer pain points and drives product excellence',
      5: 'Transforms customer insights into long-term strategic advantage',
    },
  },
  {
    name: 'Innovation & Continuous Improvement',
    description: 'Challenges the status quo, introduces optimizations, and champions continuous learning.',
    scale: {
      1: 'Resistant to change and new methodologies',
      2: 'Adopts new tools when instructed',
      3: 'Regularly identifies process improvements and implements optimizations',
      4: 'Pioneers innovative workflows and tools that boost productivity',
      5: 'Drives breakthrough innovations that define company strategy',
    },
  },
];

@Injectable()
export class PerformanceService {
  constructor(
    private prisma: PrismaService,
    private notify: NotifyService,
  ) {}

  // -------------------------------------------------------------------------
  // RBAC helpers (ported from legacy requireEmployeeAccess / requireRole)
  // -------------------------------------------------------------------------

  /** Admin or self always pass; manager passes iff target is a direct report. */
  private async requireEmployeeAccess(user: any, targetEmployeeId: string): Promise<void> {
    if (user.userRole === 'admin' || user.id === targetEmployeeId) return;
    if (user.userRole === 'manager') {
      const report = await this.prisma.employee.findFirst({
        where: { id: targetEmployeeId, managerId: user.id },
        select: { id: true },
      });
      if (report) return;
    }
    throw new ForbiddenException('Access denied: you can only manage yourself or your direct reports.');
  }

  private requireRole(user: any, ...roles: string[]): void {
    if (!roles.includes(user.userRole)) {
      throw new ForbiddenException('Access denied: insufficient role permissions.');
    }
  }

  private async getOrgId(): Promise<string> {
    const org = await this.prisma.organizations.findFirst({ select: { id: true } });
    return org?.id || 'org_default';
  }

  // =========================================================================
  // ROOT /api/performance — KRAs
  // =========================================================================

  /** GET /api/performance — role-scoped KRA list (formatted for the KRA board). */
  async findAll(user: any) {
    const whereClause: any =
      user.userRole === 'admin'
        ? undefined
        : user.userRole === 'manager'
          ? {
              OR: [
                { assignedById: user.id },
                { assignedToId: user.id },
                { assignedTo: { managerId: user.id } },
              ],
            }
          : { assignedToId: user.id };

    const kras = await this.prisma.performanceKra.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: KRA_INCLUDE,
    });

    return kras.map(formatKra);
  }

  /** POST /api/performance — manager/admin assigns a KRA. */
  async createKra(user: any, body: any) {
    this.requireRole(user, 'manager', 'admin');
    await this.requireEmployeeAccess(user, body.assignedToId);

    const newKra = await this.prisma.performanceKra.create({
      data: {
        id: `KRA-${Date.now().toString(36).toUpperCase()}`,
        title: body.title,
        description: body.description || 'Complete the assigned team deliverable.',
        keyResult: body.keyResult,
        category: body.category || 'Team Delivery',
        assignedToId: body.assignedToId,
        assignedById: user.id,
        assignedOn:
          body.assignedOn ||
          new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()),
        dueDate: body.dueDate,
        priority: (body.priority as KraPriority) || KraPriority.Medium,
        status: mapKraStatusToPrisma(body.status),
        progress: Number(body.progress) || 0,
        weightage: Number(body.weightage) || 20,
        lastUpdate: body.lastUpdate || 'Task assigned by manager; waiting for team member update.',
        deliverables: body.deliverables || ['Progress update', 'Completed work handover'],
      },
      include: KRA_INCLUDE,
    });

    // Notify the assignee about the new KRA
    if (body.assignedToId && body.assignedToId !== user.id) {
      await this.notify.notifyUser({
        userId: body.assignedToId,
        title: 'New KRA assigned',
        message: `You have been assigned a new KRA "${body.title}"${body.dueDate ? ` (due ${body.dueDate})` : ''}.`,
        type: 'Performance',
        linkUrl: '/performance',
      });
    }

    return formatKra(newKra);
  }

  /** PATCH /api/performance — assignee updates KRA progress/status. */
  async updateKra(user: any, body: any) {
    const { id, progress, status, lastUpdate } = body;
    const existing = await this.prisma.performanceKra.findUnique({
      where: { id },
      select: { assignedToId: true, assignedById: true, title: true },
    });
    if (!existing) throw new NotFoundException('KRA not found');

    await this.requireEmployeeAccess(user, existing.assignedToId);

    const updated = await this.prisma.performanceKra.update({
      where: { id },
      data: {
        ...(progress !== undefined ? { progress: Number(progress) } : {}),
        ...(status !== undefined ? { status: mapKraStatusToPrisma(status) } : {}),
        ...(lastUpdate !== undefined ? { lastUpdate } : {}),
      },
      include: KRA_INCLUDE,
    });

    // Notify the counterpart about the KRA update
    if (existing.assignedById && user.id === existing.assignedToId && existing.assignedById !== user.id) {
      await this.notify.notifyUser({
        userId: existing.assignedById,
        title: 'KRA progress update',
        message: `KRA "${existing.title}" was updated${progress !== undefined ? ` to ${Number(progress)}% progress` : ''}${status !== undefined ? ` — status: ${status}` : ''}.`,
        type: 'Performance',
        linkUrl: '/performance',
      });
    } else if (user.id !== existing.assignedToId) {
      await this.notify.notifyUser({
        userId: existing.assignedToId,
        title: 'KRA updated',
        message: `Your KRA "${existing.title}" was updated by your manager.`,
        type: 'Performance',
        linkUrl: '/performance',
      });
    }

    return formatKra(updated);
  }

  // =========================================================================
  // /api/performance/goals — Goals, OKRs & KPIs
  // =========================================================================

  /** GET /api/performance/goals — { goals, kpis, kras } with role scoping. */
  async getGoalsData(
    user: any,
    employeeId?: string,
    scope?: string,
    type?: string,
    cycleId?: string,
  ) {
    const targetId = employeeId || user.id;

    const [goals, kpis, kras] = await Promise.all([
      this.prisma.performanceGoal.findMany({
        where: {
          ...(scope ? { scope: scope as any } : {}),
          ...(type ? { type: type as any } : {}),
          ...(cycleId ? { cycle_id: cycleId } : {}),
          ...(user.userRole === 'admin'
            ? {}
            : user.userRole === 'manager'
              ? {
                  OR: [
                    { owner_employee_id: targetId },
                    { owner_employee_id: user.id },
                    { created_by_id: user.id },
                    { scope: 'Organization' },
                    { scope: 'Team' },
                  ],
                }
              : {
                  OR: [
                    { owner_employee_id: user.id },
                    { scope: 'Organization' },
                    { scope: 'Team' },
                  ],
                }),
        },
        include: {
          key_results: true,
          other_performance_goals: {
            include: { key_results: true },
          },
          employees_performance_goals_owner_employee_idToemployees: {
            select: { id: true, name: true, employeeCode: true, department: true, roleTitle: true, avatarUrl: true },
          },
          employees_performance_goals_created_by_idToemployees: {
            select: { id: true, name: true, employeeCode: true, roleTitle: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.performance_kpis.findMany({
        where: {
          ...(cycleId ? { cycle_id: cycleId } : {}),
          ...(user.userRole === 'admin'
            ? {}
            : user.userRole === 'manager'
              ? {
                  OR: [{ employee_id: targetId }, { employee_id: user.id }],
                }
              : { employee_id: user.id }),
        },
        include: {
          employee: {
            select: { id: true, name: true, employeeCode: true, department: true, roleTitle: true },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.performanceKra.findMany({
        where:
          user.userRole === 'admin'
            ? {}
            : user.userRole === 'manager'
              ? {
                  OR: [
                    { assignedToId: targetId },
                    { assignedById: user.id },
                    { assignedToId: user.id },
                  ],
                }
              : { assignedToId: user.id },
        include: KRA_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { goals, kpis, kras };
  }

  /** POST /api/performance/goals — create_goal | cascade_goal | add_key_result | sync_kpis | create_kpi. */
  async handleGoalAction(user: any, body: any) {
    const { action } = body;
    const orgId = await this.getOrgId();

    // 1. CREATE GOAL / OBJECTIVE (OKR / KPI / Standard Goal)
    if (action === 'create_goal' || !action) {
      const {
        title,
        description,
        type = 'OKR',
        scope = 'Individual',
        ownerId = user.id,
        parentGoalId,
        departmentId,
        teamId,
        metric,
        targetValue,
        currentValue,
        weightage = 20,
        startDate,
        dueDate,
        cycleId,
        keyResults = [],
      } = body;

      // RBAC: Only admins can create Org-level goals
      if (scope === 'Organization' && user.userRole !== 'admin') {
        throw new ForbiddenException('Only HR Admins can create company-wide objectives.');
      }

      if (ownerId !== user.id) {
        await this.requireEmployeeAccess(user, ownerId);
      }

      const goal = await this.prisma.performanceGoal.create({
        data: {
          id: `GOAL-${Date.now().toString(36).toUpperCase()}`,
          organization_id: orgId,
          department_id: departmentId || null,
          team_id: teamId || null,
          owner_employee_id: ownerId,
          parentGoalId: parentGoalId || null,
          created_by_id: user.id,
          type: type as any,
          scope: scope as any,
          title,
          description: description || null,
          metric: metric || null,
          targetValue: targetValue ? Number(targetValue) : null,
          currentValue: currentValue ? Number(currentValue) : null,
          progress: 0,
          weightage: Number(weightage) || 20,
          cycle_id: cycleId || null,
          start_date: new Date(startDate || new Date()),
          due_date: new Date(dueDate || new Date(Date.now() + 90 * 86400000)),
          status: 'Active',
        },
      });

      // Create Key Results if provided
      if (Array.isArray(keyResults) && keyResults.length > 0) {
        for (const kr of keyResults) {
          await this.prisma.performance_key_results.create({
            data: {
              goal_id: goal.id,
              title: kr.title,
              metric: kr.metric || 'Metric Target',
              target_value: kr.targetValue ? Number(kr.targetValue) : 100,
              current_value: kr.currentValue ? Number(kr.currentValue) : 0,
              unit: kr.unit || '%',
              weightage: Number(kr.weightage) || 25,
              progress: Number(kr.progress) || 0,
              status: 'Active',
            },
          });
        }
      }

      await this.prisma.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'CREATE_GOAL',
          module: 'GoalsAndOKRs',
          employeeId: ownerId,
          details: JSON.stringify({ title, type, scope, parentGoalId }),
        },
      });

      return this.prisma.performanceGoal.findUnique({
        where: { id: goal.id },
        include: { key_results: true },
      });
    }

    // 2. CASCADE GOAL (create child goal under parent)
    if (action === 'cascade_goal') {
      const { parentGoalId, title, ownerId, scope = 'Individual', weightage = 20, dueDate } = body;

      const parent = await this.prisma.performanceGoal.findUnique({ where: { id: parentGoalId } });
      if (!parent) throw new NotFoundException('Parent goal not found');

      await this.requireEmployeeAccess(user, ownerId);

      const cascaded = await this.prisma.performanceGoal.create({
        data: {
          id: `GOAL-CASC-${Date.now().toString(36).toUpperCase()}`,
          organization_id: parent.organization_id,
          department_id: parent.department_id,
          team_id: parent.team_id,
          owner_employee_id: ownerId,
          parentGoalId: parent.id,
          created_by_id: user.id,
          type: parent.type,
          scope: scope as any,
          title,
          description: `Cascaded from parent goal: "${parent.title}"`,
          weightage: Number(weightage) || 20,
          cycle_id: parent.cycle_id,
          start_date: parent.start_date,
          due_date: dueDate ? new Date(dueDate) : parent.due_date,
          status: 'Active',
        },
        include: { key_results: true },
      });

      await this.prisma.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'CASCADE_GOAL',
          module: 'GoalsAndOKRs',
          employeeId: ownerId,
          details: JSON.stringify({ parentId: parent.id, cascadedId: cascaded.id, title }),
        },
      });

      return cascaded;
    }

    // 3. ADD KEY RESULT TO OBJECTIVE
    if (action === 'add_key_result') {
      const { goalId, title, metric, targetValue, unit = '%', weightage = 25 } = body;
      const goal = await this.prisma.performanceGoal.findUnique({ where: { id: goalId } });
      if (!goal) throw new NotFoundException('Goal not found');

      if (goal.owner_employee_id) {
        await this.requireEmployeeAccess(user, goal.owner_employee_id);
      }

      return this.prisma.performance_key_results.create({
        data: {
          goal_id: goalId,
          title,
          metric: metric || 'Completion rate',
          target_value: Number(targetValue) || 100,
          current_value: 0,
          unit,
          weightage: Number(weightage) || 25,
          progress: 0,
          status: 'Active',
        },
      });
    }

    // 4. SYNC DATA-DRIVEN KPIS (Attendance, LMS, Timesheets)
    if (action === 'sync_kpis') {
      const targetEmpId = body.employeeId || user.id;
      return syncEmployeeKpis(this.prisma, orgId, targetEmpId, body.cycleId);
    }

    // 5. CREATE MANUAL KPI
    if (action === 'create_kpi') {
      const {
        employeeId = user.id,
        name,
        description,
        metric,
        target,
        unit = '%',
        weightage = 20,
        frequency = 'Quarterly',
      } = body;
      await this.requireEmployeeAccess(user, employeeId);

      return this.prisma.performance_kpis.create({
        data: {
          id: `KPI-${Date.now().toString(36)}`,
          organization_id: orgId,
          employee_id: employeeId,
          cycle_id: body.cycleId || null,
          name,
          description: description || metric,
          metric,
          target: Number(target) || 100,
          actual: 0,
          unit,
          weightage: Number(weightage) || 20,
          frequency,
          source_module: 'Manual',
          is_system_calculated: false,
        },
      });
    }

    throw new BadRequestException('Invalid action');
  }

  /** PATCH /api/performance/goals — update key result / goal / KPI actual. */
  async updateGoalTarget(user: any, body: any) {
    const { goalId, keyResultId, kpiId, progress, currentValue, actualValue, status } = body;

    // 1. Update Key Result Progress (with parent goal recompute)
    if (keyResultId) {
      const kr = await this.prisma.performance_key_results.findUnique({
        where: { id: keyResultId },
        include: { goal: true },
      });
      if (!kr) throw new NotFoundException('Key Result not found');

      if (kr.goal.owner_employee_id) {
        await this.requireEmployeeAccess(user, kr.goal.owner_employee_id);
      }

      const targetVal = Number(kr.target_value) || 100;
      const curVal = currentValue !== undefined ? Number(currentValue) : Number(kr.current_value);
      const computedProgress = Math.min(100, Math.round((curVal / targetVal) * 100));

      const updatedKr = await this.prisma.performance_key_results.update({
        where: { id: keyResultId },
        data: {
          current_value: curVal,
          progress: progress !== undefined ? Number(progress) : computedProgress,
          status: status || kr.status,
          updated_at: new Date(),
        },
      });

      // Recalculate parent goal progress (weighted average of key results)
      const allKrs = await this.prisma.performance_key_results.findMany({ where: { goal_id: kr.goal_id } });
      const totalWeight = allKrs.reduce((acc, item) => acc + (item.weightage || 25), 0);
      const weightedProg = allKrs.reduce((acc, item) => acc + item.progress * (item.weightage || 25), 0);
      const avgProg = totalWeight > 0 ? Math.round(weightedProg / totalWeight) : 0;

      await this.prisma.performanceGoal.update({
        where: { id: kr.goal_id },
        data: { progress: avgProg, updatedAt: new Date() },
      });

      return updatedKr;
    }

    // 2. Update Goal Progress / Status
    if (goalId) {
      const goal = await this.prisma.performanceGoal.findUnique({ where: { id: goalId } });
      if (!goal) throw new NotFoundException('Goal not found');

      if (goal.owner_employee_id) {
        await this.requireEmployeeAccess(user, goal.owner_employee_id);
      }

      return this.prisma.performanceGoal.update({
        where: { id: goalId },
        data: {
          ...(progress !== undefined ? { progress: Number(progress) } : {}),
          ...(currentValue !== undefined ? { currentValue: Number(currentValue) } : {}),
          ...(status ? { status: status as any } : {}),
          updatedAt: new Date(),
        },
      });
    }

    // 3. Update KPI actual value
    if (kpiId) {
      const kpi = await this.prisma.performance_kpis.findUnique({ where: { id: kpiId } });
      if (!kpi) throw new NotFoundException('KPI not found');

      await this.requireEmployeeAccess(user, kpi.employee_id);

      return this.prisma.performance_kpis.update({
        where: { id: kpiId },
        data: {
          actual: actualValue !== undefined ? Number(actualValue) : kpi.actual,
          updated_at: new Date(),
        },
      });
    }

    throw new BadRequestException('No valid target identifier provided');
  }

  // =========================================================================
  // /api/performance/cycles — Review cycles, assignments, feedback, recs
  // =========================================================================

  /** GET /api/performance/cycles — { cycles, assignments, feedback, recommendations }. */
  async getCyclesData(user: any, employeeId?: string, cycleId?: string) {
    const targetId = employeeId || user.id;

    const [cycles, assignments, feedbackList, recommendations] = await Promise.all([
      this.prisma.performance_review_cycles.findMany({
        where: cycleId ? { id: cycleId } : {},
        include: {
          performance_calibration_sessions: true,
          performance_review_assignments: {
            include: {
              employees_performance_review_assignments_employee_idToemployees: {
                select: { id: true, name: true, employeeCode: true, department: true, roleTitle: true, avatarUrl: true },
              },
              employees_performance_review_assignments_reviewer_idToemployees: {
                select: { id: true, name: true, employeeCode: true, roleTitle: true },
              },
            },
          },
        },
        orderBy: { start_date: 'desc' },
      }),
      this.prisma.performance_review_assignments.findMany({
        where:
          user.userRole === 'admin'
            ? {}
            : user.userRole === 'manager'
              ? {
                  OR: [
                    { reviewer_id: user.id },
                    { employee_id: user.id },
                    { employees_performance_review_assignments_employee_idToemployees: { managerId: user.id } },
                  ],
                }
              : { employee_id: user.id },
        include: {
          performance_review_cycles: true,
          employees_performance_review_assignments_employee_idToemployees: {
            select: { id: true, name: true, employeeCode: true, department: true, roleTitle: true, avatarUrl: true },
          },
          employees_performance_review_assignments_reviewer_idToemployees: {
            select: { id: true, name: true, employeeCode: true, roleTitle: true },
          },
        },
      }),
      this.prisma.performance_feedback.findMany({
        where:
          user.userRole === 'admin'
            ? {}
            : user.userRole === 'manager'
              ? {
                  OR: [{ recipient_id: targetId }, { author_id: user.id }],
                }
              : { recipient_id: user.id },
        include: {
          employees_performance_feedback_author_idToemployees: {
            select: { id: true, name: true, employeeCode: true, roleTitle: true },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.performance_recommendations.findMany({
        where:
          user.userRole === 'admin'
            ? {}
            : user.userRole === 'manager'
              ? {
                  OR: [
                    { recommender_id: user.id },
                    { employees_performance_recommendations_employee_idToemployees: { managerId: user.id } },
                  ],
                }
              : { employee_id: user.id },
        include: {
          employees_performance_recommendations_employee_idToemployees: {
            select: { id: true, name: true, employeeCode: true, department: true, roleTitle: true },
          },
          employees_performance_recommendations_recommender_idToemployees: {
            select: { id: true, name: true, employeeCode: true },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    // SERVER-SIDE ANONYMITY ENFORCEMENT:
    // If feedback is anonymous and the viewer is not admin/author, redact author identity
    const sanitizedFeedback = feedbackList.map((fb: any) => {
      if (fb.is_anonymous && user.userRole !== 'admin' && fb.author_id !== user.id) {
        return {
          ...fb,
          author_id: 'ANONYMOUS_REVIEWER',
          employees_performance_feedback_author_idToemployees: {
            id: 'ANONYMOUS',
            name: 'Anonymous Colleague',
            employeeCode: 'ANON',
            roleTitle: 'Peer Reviewer',
          },
        };
      }
      return fb;
    });

    return {
      cycles,
      assignments,
      feedback: sanitizedFeedback,
      recommendations,
    };
  }

  /** POST /api/performance/cycles — cycle lifecycle + review submissions. */
  async handleCycleAction(user: any, body: any) {
    const { action } = body;

    // 1. CREATE PERFORMANCE CYCLE (Admin only)
    if (action === 'create_cycle') {
      this.requireRole(user, 'admin');
      const {
        name,
        description,
        reviewPeriod = 'Quarterly',
        startDate,
        endDate,
        goalSettingDeadline,
        selfReviewDeadline,
        managerReviewDeadline,
        calibrationDate,
        scoringWeights,
      } = body;

      const orgId = await this.getOrgId();
      const cycleId = `CYCLE-${Date.now().toString(36).toUpperCase()}`;

      const newCycle = await this.prisma.performance_review_cycles.create({
        data: {
          id: cycleId,
          organization_id: orgId,
          name,
          description: description || `${reviewPeriod} Performance Assessment & Growth Cycle`,
          review_period: reviewPeriod,
          start_date: new Date(startDate || new Date()),
          end_date: new Date(endDate || new Date(Date.now() + 90 * 86400000)),
          goal_setting_deadline: goalSettingDeadline ? new Date(goalSettingDeadline) : null,
          self_review_deadline: selfReviewDeadline ? new Date(selfReviewDeadline) : null,
          manager_review_deadline: managerReviewDeadline ? new Date(managerReviewDeadline) : null,
          calibration_date: calibrationDate ? new Date(calibrationDate) : null,
          status: 'Draft',
          scoring_weights: scoringWeights || { goals: 40, kpis: 30, competencies: 20, feedback: 10 },
          created_by_id: user.id,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Auto-assign Self and Manager review assignments for all active employees
      const allActiveEmployees = await this.prisma.employee.findMany({
        where: { status: 'Active' },
        select: { id: true, managerId: true },
      });

      for (const emp of allActiveEmployees) {
        // Self Review assignment
        await this.prisma.performance_review_assignments.upsert({
          where: {
            cycle_id_employee_id_reviewer_id_review_type: {
              cycle_id: cycleId,
              employee_id: emp.id,
              reviewer_id: emp.id,
              review_type: 'Self',
            },
          },
          update: {},
          create: {
            id: `ASGN-SELF-${emp.id}-${Date.now().toString(36)}`,
            cycle_id: cycleId,
            employee_id: emp.id,
            reviewer_id: emp.id,
            review_type: 'Self',
            status: 'Pending',
          },
        });

        // Manager Review assignment if reporting manager exists
        if (emp.managerId) {
          await this.prisma.performance_review_assignments.upsert({
            where: {
              cycle_id_employee_id_reviewer_id_review_type: {
                cycle_id: cycleId,
                employee_id: emp.id,
                reviewer_id: emp.managerId,
                review_type: 'Manager',
              },
            },
            update: {},
            create: {
              id: `ASGN-MGR-${emp.id}-${Date.now().toString(36)}`,
              cycle_id: cycleId,
              employee_id: emp.id,
              reviewer_id: emp.managerId,
              review_type: 'Manager',
              status: 'Pending',
            },
          });
        }
      }

      await this.prisma.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'CREATE',
          module: 'PerformanceCycle',
          employeeId: user.id,
          details: JSON.stringify({ cycleId, name, reviewPeriod }),
        },
      });

      return newCycle;
    }

    // 2. UPDATE CYCLE STAGE / STATUS (Admin only)
    if (action === 'update_cycle_status') {
      this.requireRole(user, 'admin');
      const { cycleId, status, isLocked } = body;

      const cycle = await this.prisma.performance_review_cycles.findUnique({ where: { id: cycleId } });
      if (!cycle) throw new NotFoundException('Cycle not found');

      // If already closed, records are immutable unless administrative override
      if (cycle.status === 'Completed' && cycle.is_locked && status !== 'Draft') {
        throw new BadRequestException(
          'Performance cycle is closed and locked. Historical reviews are immutable.',
        );
      }

      const updatedCycle = await this.prisma.performance_review_cycles.update({
        where: { id: cycleId },
        data: {
          status: status || cycle.status,
          is_locked: isLocked !== undefined ? Boolean(isLocked) : cycle.is_locked,
          updated_at: new Date(),
        },
      });

      await this.prisma.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'UPDATE',
          module: 'PerformanceCycle',
          employeeId: user.id,
          details: JSON.stringify({ cycleId, previousStatus: cycle.status, newStatus: status }),
        },
      });

      return updatedCycle;
    }

    // 3. SUBMIT EMPLOYEE SELF-ASSESSMENT
    if (action === 'submit_self_assessment') {
      const {
        cycleId,
        accomplishments,
        challenges,
        goalProgressSummary,
        strengths,
        improvementAreas,
        trainingNeeds,
        careerAspirations,
        selfRating,
      } = body;

      const cycle = await this.prisma.performance_review_cycles.findUnique({ where: { id: cycleId } });
      if (cycle?.is_locked) {
        throw new ForbiddenException('Cycle is locked. Submissions disabled.');
      }

      const assignment = await this.prisma.performance_review_assignments.findFirst({
        where: {
          cycle_id: cycleId,
          employee_id: user.id,
          review_type: 'Self',
        },
      });

      if (assignment?.is_locked) {
        throw new BadRequestException('Self-assessment has already been locked.');
      }

      const selfData = {
        accomplishments,
        challenges,
        goalProgressSummary,
        strengths,
        improvementAreas,
        trainingNeeds,
        careerAspirations,
        selfRating: Number(selfRating) || 3.5,
      };

      const updated = await this.prisma.performance_review_assignments.upsert({
        where: {
          cycle_id_employee_id_reviewer_id_review_type: {
            cycle_id: cycleId,
            employee_id: user.id,
            reviewer_id: user.id,
            review_type: 'Self',
          },
        },
        update: {
          status: 'Completed',
          rating: Number(selfRating) || 3.5,
          comments: accomplishments,
          self_review_data: selfData,
          is_locked: true,
          submitted_at: new Date(),
          updated_at: new Date(),
        },
        create: {
          id: `ASGN-SELF-${user.id}-${Date.now().toString(36)}`,
          cycle_id: cycleId,
          employee_id: user.id,
          reviewer_id: user.id,
          review_type: 'Self',
          status: 'Completed',
          rating: Number(selfRating) || 3.5,
          comments: accomplishments,
          self_review_data: selfData,
          is_locked: true,
          submitted_at: new Date(),
        },
      });

      await this.prisma.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'SUBMIT_SELF_ASSESSMENT',
          module: 'PerformanceReview',
          employeeId: user.id,
          details: JSON.stringify({ cycleId, rating: selfRating }),
        },
      });

      return updated;
    }

    // 4. SUBMIT MANAGER REVIEW (with composite score + auto recommendations)
    if (action === 'submit_manager_review') {
      const {
        cycleId,
        employeeId,
        managerRating,
        managerComments,
        strengths,
        developmentAreas,
        goalAssessment,
        kpiAssessment,
        promotionRecommended,
        incrementRecommended,
        recommendedIncrementPct,
        justification,
      } = body;

      // Validate manager permissions
      const targetEmployee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
      if (!targetEmployee) throw new NotFoundException('Employee not found');

      if (user.userRole !== 'admin' && targetEmployee.managerId !== user.id) {
        throw new ForbiddenException('Unauthorized. You can only review direct reports.');
      }

      const cycle = await this.prisma.performance_review_cycles.findUnique({ where: { id: cycleId } });
      if (cycle?.is_locked) {
        throw new ForbiddenException('Cycle is locked. Reviews are immutable.');
      }

      // Calculate composite score
      const scoreResult = await calculateEmployeePerformanceScore(this.prisma, employeeId, cycleId);

      const managerData = {
        managerRating: Number(managerRating) || 3.5,
        managerComments,
        strengths,
        developmentAreas,
        goalAssessment,
        kpiAssessment,
        promotionRecommended: Boolean(promotionRecommended),
        incrementRecommended: Boolean(incrementRecommended),
        recommendedIncrementPct: Number(recommendedIncrementPct) || 0,
      };

      const updated = await this.prisma.performance_review_assignments.upsert({
        where: {
          cycle_id_employee_id_reviewer_id_review_type: {
            cycle_id: cycleId,
            employee_id: employeeId,
            reviewer_id: user.id,
            review_type: 'Manager',
          },
        },
        update: {
          status: 'Completed',
          rating: Number(managerRating) || 3.5,
          comments: managerComments,
          manager_review_data: managerData,
          calculated_score: scoreResult.finalRating5,
          score_breakdown: scoreResult as any,
          is_locked: true,
          submitted_at: new Date(),
          updated_at: new Date(),
        },
        create: {
          id: `ASGN-MGR-${employeeId}-${Date.now().toString(36)}`,
          cycle_id: cycleId,
          employee_id: employeeId,
          reviewer_id: user.id,
          review_type: 'Manager',
          status: 'Completed',
          rating: Number(managerRating) || 3.5,
          comments: managerComments,
          manager_review_data: managerData,
          calculated_score: scoreResult.finalRating5,
          score_breakdown: scoreResult as any,
          is_locked: true,
          submitted_at: new Date(),
        },
      });

      // Auto-create promotion / increment recommendations if flagged by manager
      if (promotionRecommended) {
        await this.prisma.performance_recommendations.create({
          data: {
            id: `REC-PROMO-${Date.now().toString(36)}`,
            employee_id: employeeId,
            recommender_id: user.id,
            cycle_id: cycleId,
            type: 'Promotion',
            status: 'Submitted',
            justification:
              justification || managerComments || 'Manager recommends promotion based on cycle evaluation.',
            proposed_value: { recommendedRole: `Senior ${targetEmployee.roleTitle}` },
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      }

      if (incrementRecommended) {
        await this.prisma.performance_recommendations.create({
          data: {
            id: `REC-INCR-${Date.now().toString(36)}`,
            employee_id: employeeId,
            recommender_id: user.id,
            cycle_id: cycleId,
            type: 'Increment',
            status: 'Submitted',
            justification: justification || managerComments || 'Manager recommends merit salary revision.',
            proposed_value: { incrementPercentage: Number(recommendedIncrementPct) || 10 },
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      }

      await this.prisma.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'SUBMIT_MANAGER_REVIEW',
          module: 'PerformanceReview',
          employeeId,
          details: JSON.stringify({ reviewerId: user.id, cycleId, rating: managerRating }),
        },
      });

      // Pre-wrapped so the scoreResult sibling survives the response interceptor
      return { success: true, data: updated, scoreResult };
    }

    // 5. SUBMIT 360 / PEER FEEDBACK (with optional true anonymity)
    if (action === 'submit_feedback') {
      const { recipientId, cycleId, content, rating, categories, isAnonymous, isPrivate } = body;

      const fb = await this.prisma.performance_feedback.create({
        data: {
          id: `FB-${Date.now().toString(36)}`,
          author_id: user.id,
          recipient_id: recipientId,
          cycle_id: cycleId || null,
          review_type: 'Peer',
          content: content || 'Provides strong team support and cross-functional collaboration.',
          rating: rating ? Number(rating) : 4.0,
          categories: categories || { collaboration: 4, technical: 4, communication: 4 },
          is_anonymous: Boolean(isAnonymous),
          private: Boolean(isPrivate),
          created_at: new Date(),
        },
      });

      await this.prisma.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'SUBMIT_PEER_FEEDBACK',
          module: 'PerformanceFeedback',
          employeeId: recipientId,
          details: JSON.stringify({ isAnonymous: Boolean(isAnonymous), cycleId }),
        },
      });

      return fb;
    }

    throw new BadRequestException('Invalid cycle action');
  }

  // =========================================================================
  // /api/performance/competencies — Competency framework & assessments
  // =========================================================================

  /** GET /api/performance/competencies — { competencies, assessments } with auto-seed. */
  async getCompetenciesData(user: any, employeeId?: string, cycleId?: string) {
    const targetId = employeeId || user.id;
    const orgId = await this.getOrgId();

    let competencies = await this.prisma.performance_competencies.findMany({
      where: { organization_id: orgId, is_active: true },
    });

    // Auto-seed if empty (idempotent via skipDuplicates + deterministic ids)
    if (competencies.length === 0) {
      await this.prisma.performance_competencies.createMany({
        data: DEFAULT_COMPETENCIES.map((c) => ({
          id: `COMP-${c.name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30)}`,
          organization_id: orgId,
          name: c.name,
          description: c.description,
          scale: c.scale as any,
          is_active: true,
        })),
        skipDuplicates: true,
      });
      competencies = await this.prisma.performance_competencies.findMany({
        where: { organization_id: orgId, is_active: true },
      });
    }

    const assessments = await this.prisma.performance_competency_assessments.findMany({
      where: {
        employee_id: targetId,
        ...(cycleId ? { cycle_id: cycleId } : {}),
      },
      include: {
        performance_competencies: true,
        employees_performance_competency_assessments_assessor_idToemployees: {
          select: { id: true, name: true, employeeCode: true, roleTitle: true },
        },
      },
      orderBy: { assessed_at: 'desc' },
    });

    return { competencies, assessments };
  }

  /** POST /api/performance/competencies — submit_assessment. */
  async handleCompetencyAction(user: any, body: any) {
    const { action } = body;

    if (action === 'submit_assessment' || !action) {
      const { competencyId, employeeId, cycleId, rating, comments } = body;

      if (!competencyId || !employeeId) {
        throw new BadRequestException('Missing competencyId or employeeId');
      }

      await this.requireEmployeeAccess(user, employeeId);

      const ratingVal = Math.min(5, Math.max(1, Number(rating) || 3));

      const assessment = await this.prisma.performance_competency_assessments.create({
        data: {
          id: `COMP-ASSESS-${employeeId}-${competencyId}-${Date.now().toString(36)}`,
          competency_id: competencyId,
          employee_id: employeeId,
          assessor_id: user.id,
          cycle_id: cycleId || null,
          rating: ratingVal,
          comments: comments || null,
          assessed_at: new Date(),
        },
        include: { performance_competencies: true },
      });

      await this.prisma.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'ASSESS_COMPETENCY',
          module: 'Competencies',
          employeeId,
          details: JSON.stringify({ assessorId: user.id, competencyId, rating: ratingVal }),
        },
      });

      return assessment;
    }

    throw new BadRequestException('Invalid action');
  }

  // =========================================================================
  // /api/performance/pip — Performance Improvement Plans
  // =========================================================================

  /** GET /api/performance/pip — role-scoped PIP list with milestones. */
  async getPips(user: any, employeeId?: string) {
    return this.prisma.performance_improvement_plans.findMany({
      where:
        user.userRole === 'admin'
          ? employeeId
            ? { employee_id: employeeId }
            : {}
          : user.userRole === 'manager'
            ? {
                OR: [
                  { manager_id: user.id },
                  { employee_id: user.id },
                  ...(employeeId ? [{ employee_id: employeeId }] : []),
                ],
              }
            : { employee_id: user.id },
      include: {
        employees_performance_improvement_plans_employee_idToemployees: {
          select: { id: true, name: true, employeeCode: true, department: true, roleTitle: true, avatarUrl: true },
        },
        employees_performance_improvement_plans_manager_idToemployees: {
          select: { id: true, name: true, employeeCode: true, roleTitle: true },
        },
        performance_pip_milestones: {
          orderBy: { due_date: 'asc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /** POST /api/performance/pip — create_pip | add_milestone | update_milestone | update_pip_status. */
  async handlePipAction(user: any, body: any) {
    const { action } = body;

    // 1. CREATE PIP (Managers and Admins only)
    if (action === 'create_pip' || !action) {
      if (user.userRole === 'employee') {
        throw new ForbiddenException('Employees cannot initiate a PIP.');
      }

      const { employeeId, title, reason, expectations, startDate, reviewDate, milestones = [] } = body;

      const targetEmp = await this.prisma.employee.findUnique({ where: { id: employeeId } });
      if (!targetEmp) throw new NotFoundException('Employee not found');

      if (user.userRole !== 'admin' && targetEmp.managerId !== user.id) {
        throw new ForbiddenException('You can only initiate PIPs for direct reports.');
      }

      const pipId = `PIP-${Date.now().toString(36).toUpperCase()}`;

      const pip = await this.prisma.performance_improvement_plans.create({
        data: {
          id: pipId,
          employee_id: employeeId,
          manager_id: user.id,
          title: title || 'Performance Improvement Plan',
          reason,
          expectations,
          start_date: new Date(startDate || new Date()),
          review_date: new Date(reviewDate || new Date(Date.now() + 30 * 86400000)),
          status: 'Active',
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Create initial milestones if supplied
      if (Array.isArray(milestones) && milestones.length > 0) {
        for (const m of milestones) {
          await this.prisma.performance_pip_milestones.create({
            data: {
              id: `PIP-M-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
              pip_id: pip.id,
              title: m.title,
              due_date: new Date(m.dueDate || new Date(Date.now() + 14 * 86400000)),
              status: 'Pending',
              note: m.note || null,
            },
          });
        }
      }

      // Notify employee
      await this.notify.notifyUser({
        userId: employeeId,
        title: 'Performance Improvement Plan Initiated',
        message: `A structured development plan "${pip.title}" has been assigned. Please review expectations and milestones.`,
        type: 'Alert',
        linkUrl: '/performance',
      });

      await this.prisma.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'CREATE_PIP',
          module: 'PIP',
          employeeId,
          details: JSON.stringify({ pipId: pip.id, managerId: user.id, title }),
        },
      });

      return this.prisma.performance_improvement_plans.findUnique({
        where: { id: pip.id },
        include: { performance_pip_milestones: true },
      });
    }

    // 2. ADD MILESTONE TO PIP
    if (action === 'add_milestone') {
      const { pipId, title, dueDate, note } = body;
      const pip = await this.prisma.performance_improvement_plans.findUnique({ where: { id: pipId } });
      if (!pip) throw new NotFoundException('PIP not found');

      if (user.userRole !== 'admin' && pip.manager_id !== user.id) {
        throw new ForbiddenException('Unauthorized to add milestones.');
      }

      return this.prisma.performance_pip_milestones.create({
        data: {
          id: `PIP-M-${Date.now().toString(36)}`,
          pip_id: pipId,
          title,
          due_date: new Date(dueDate || new Date(Date.now() + 7 * 86400000)),
          status: 'Pending',
          note: note || null,
        },
      });
    }

    // 3. UPDATE MILESTONE (Check-in / Complete)
    if (action === 'update_milestone') {
      const { milestoneId, status, note } = body;
      const milestone = await this.prisma.performance_pip_milestones.findUnique({
        where: { id: milestoneId },
        include: { performance_improvement_plans: true },
      });

      if (!milestone) throw new NotFoundException('Milestone not found');

      return this.prisma.performance_pip_milestones.update({
        where: { id: milestoneId },
        data: {
          status: status || milestone.status,
          note: note !== undefined ? note : milestone.note,
        },
      });
    }

    // 4. UPDATE PIP STATUS & OUTCOME (Pass / Fail / Cancel / Extend)
    if (action === 'update_pip_status') {
      const { pipId, status, outcome, endDate } = body;
      const pip = await this.prisma.performance_improvement_plans.findUnique({ where: { id: pipId } });
      if (!pip) throw new NotFoundException('PIP not found');

      if (user.userRole !== 'admin' && pip.manager_id !== user.id) {
        throw new ForbiddenException('Unauthorized to close or update PIP.');
      }

      const updated = await this.prisma.performance_improvement_plans.update({
        where: { id: pipId },
        data: {
          status: status as any,
          outcome: outcome || pip.outcome,
          end_date: endDate ? new Date(endDate) : new Date(),
          updated_at: new Date(),
        },
      });

      await this.prisma.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'UPDATE_PIP_STATUS',
          module: 'PIP',
          employeeId: pip.employee_id,
          details: JSON.stringify({ pipId, status, outcome }),
        },
      });

      await this.notify.notifyUser({
        userId: pip.employee_id,
        title: `PIP Status Updated: ${status}`,
        message: `Your Performance Improvement Plan has been updated to "${status}". Outcome: ${outcome || 'Reviewed by manager'}.`,
        type: status === 'SuccessfullyCompleted' ? 'Celebration' : 'Alert',
        linkUrl: '/performance',
      });

      return updated;
    }

    throw new BadRequestException('Invalid PIP action');
  }

  // =========================================================================
  // /api/performance/calibration — Calibration sessions & ratings
  // =========================================================================

  /** GET /api/performance/calibration — { sessions, departments, distribution, assignments }. */
  async getCalibrationData(user: any, cycleId?: string, departmentId?: string) {
    // Only HR Admins and Managers have calibration access
    if (user.userRole === 'employee') {
      throw new ForbiddenException('Access restricted to HR & Reviewers');
    }

    const [sessions, departments, reviewAssignments] = await Promise.all([
      this.prisma.performance_calibration_sessions.findMany({
        where: {
          ...(cycleId ? { cycle_id: cycleId } : {}),
          ...(departmentId ? { department_id: departmentId } : {}),
        },
        include: {
          performance_calibration_ratings: {
            include: {
              employees: {
                select: { id: true, name: true, employeeCode: true, department: true, roleTitle: true, avatarUrl: true },
              },
            },
          },
          performance_review_cycles: true,
          departments: true,
        },
        orderBy: { scheduled_at: 'desc' },
      }),
      this.prisma.departments.findMany(),
      this.prisma.performance_review_assignments.findMany({
        where: {
          review_type: 'Manager',
          ...(cycleId ? { cycle_id: cycleId } : {}),
        },
        include: {
          employees_performance_review_assignments_employee_idToemployees: {
            select: { id: true, name: true, employeeCode: true, department: true, roleTitle: true },
          },
        },
      }),
    ]);

    // Calculate rating distribution stats (1 to 5)
    const ratings = reviewAssignments.map((a) => Number(a.rating || 3.0));
    const distribution = {
      level5: ratings.filter((r) => r >= 4.5).length,
      level4: ratings.filter((r) => r >= 3.8 && r < 4.5).length,
      level3: ratings.filter((r) => r >= 2.8 && r < 3.8).length,
      level2: ratings.filter((r) => r >= 2.0 && r < 2.8).length,
      level1: ratings.filter((r) => r < 2.0).length,
      total: ratings.length,
      average:
        ratings.length > 0
          ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100
          : 0,
    };

    return {
      sessions,
      departments,
      distribution,
      assignments: reviewAssignments,
    };
  }

  /** POST /api/performance/calibration — admin: create_session | update_calibrated_rating. */
  async handleCalibrationAction(user: any, body: any) {
    this.requireRole(user, 'admin');
    const { action } = body;
    const orgId = await this.getOrgId();

    // 1. CREATE CALIBRATION SESSION
    if (action === 'create_session') {
      const { name, cycleId, departmentId, scheduledAt } = body;

      const sessionId = `CALIB-${Date.now().toString(36).toUpperCase()}`;

      const session = await this.prisma.performance_calibration_sessions.create({
        data: {
          id: sessionId,
          organization_id: orgId,
          department_id: departmentId || null,
          cycle_id: cycleId,
          name: name || 'Department Performance Calibration',
          scheduled_at: new Date(scheduledAt || new Date()),
          status: 'Active',
          created_at: new Date(),
        },
      });

      // Populate initial candidate ratings from Manager reviews
      const mgrReviews = await this.prisma.performance_review_assignments.findMany({
        where: {
          cycle_id: cycleId,
          review_type: 'Manager',
        },
      });

      for (const rev of mgrReviews) {
        await this.prisma.performance_calibration_ratings.upsert({
          where: {
            session_id_employee_id: {
              session_id: session.id,
              employee_id: rev.employee_id,
            },
          },
          update: {},
          create: {
            id: `CALIB-R-${session.id}-${rev.employee_id}`,
            session_id: session.id,
            employee_id: rev.employee_id,
            original_rating: rev.rating || 3.5,
            calibrated_rating: rev.rating || 3.5,
            rationale: 'Initial manager assessment score',
          },
        });
      }

      await this.prisma.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'CREATE_CALIBRATION_SESSION',
          module: 'PerformanceCalibration',
          employeeId: user.id,
          details: JSON.stringify({ sessionId: session.id, name, cycleId }),
        },
      });

      return session;
    }

    // 2. ADJUST CALIBRATED RATING
    if (action === 'update_calibrated_rating') {
      const { sessionId, employeeId, calibratedRating, rationale } = body;

      const updated = await this.prisma.performance_calibration_ratings.upsert({
        where: {
          session_id_employee_id: {
            session_id: sessionId,
            employee_id: employeeId,
          },
        },
        update: {
          calibrated_rating: Number(calibratedRating),
          rationale: rationale || 'Calibrated during committee review',
        },
        create: {
          id: `CALIB-R-${sessionId}-${employeeId}`,
          session_id: sessionId,
          employee_id: employeeId,
          original_rating: Number(calibratedRating),
          calibrated_rating: Number(calibratedRating),
          rationale: rationale || 'Calibrated during committee review',
        },
      });

      // Update corresponding review assignment calibrated rating if session exists
      const session = await this.prisma.performance_calibration_sessions.findUnique({
        where: { id: sessionId },
      });
      if (session) {
        await this.prisma.performance_review_assignments.updateMany({
          where: {
            cycle_id: session.cycle_id,
            employee_id: employeeId,
            review_type: 'Manager',
          },
          data: {
            rating: Number(calibratedRating),
            updated_at: new Date(),
          },
        });
      }

      await this.prisma.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'UPDATE_CALIBRATED_RATING',
          module: 'PerformanceCalibration',
          employeeId,
          details: JSON.stringify({ sessionId, calibratedRating, rationale }),
        },
      });

      return updated;
    }

    throw new BadRequestException('Invalid action');
  }
}
