"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const notify_service_1 = require("../common/notifications/notify.service");
const kpi_engine_1 = require("./engines/kpi-engine");
const score_engine_1 = require("./engines/score-engine");
const mapKraStatusToPrisma = (status) => {
    if (!status)
        return client_1.KraStatus.NotStarted;
    const s = status.toLowerCase().replace(/[^a-z]/g, '');
    if (s === 'completed')
        return client_1.KraStatus.Completed;
    if (s.includes('review'))
        return client_1.KraStatus.UnderReview;
    if (s.includes('progress'))
        return client_1.KraStatus.InProgress;
    return client_1.KraStatus.NotStarted;
};
const mapPrismaStatusToDisplay = (status) => {
    switch (status) {
        case client_1.KraStatus.Completed:
            return 'Completed';
        case client_1.KraStatus.UnderReview:
            return 'Under Review';
        case client_1.KraStatus.InProgress:
            return 'In Progress';
        case client_1.KraStatus.NotStarted:
        default:
            return 'Not Started';
    }
};
const KRA_INCLUDE = {
    assignedTo: { select: { id: true, name: true, roleTitle: true, department: true } },
    assignedBy: { select: { id: true, name: true, roleTitle: true, department: true } },
};
const formatKra = (kra) => ({
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
let PerformanceService = class PerformanceService {
    prisma;
    notify;
    constructor(prisma, notify) {
        this.prisma = prisma;
        this.notify = notify;
    }
    async requireEmployeeAccess(user, targetEmployeeId) {
        if (user.userRole === 'admin' || user.id === targetEmployeeId)
            return;
        if (user.userRole === 'manager') {
            const report = await this.prisma.employee.findFirst({
                where: { id: targetEmployeeId, managerId: user.id },
                select: { id: true },
            });
            if (report)
                return;
        }
        throw new common_1.ForbiddenException('Access denied: you can only manage yourself or your direct reports.');
    }
    requireRole(user, ...roles) {
        if (!roles.includes(user.userRole)) {
            throw new common_1.ForbiddenException('Access denied: insufficient role permissions.');
        }
    }
    async getOrgId() {
        const org = await this.prisma.organizations.findFirst({ select: { id: true } });
        return org?.id || 'org_default';
    }
    async findAll(user) {
        const whereClause = user.userRole === 'admin'
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
    async createKra(user, body) {
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
                assignedOn: body.assignedOn ||
                    new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()),
                dueDate: body.dueDate,
                priority: body.priority || client_1.KraPriority.Medium,
                status: mapKraStatusToPrisma(body.status),
                progress: Number(body.progress) || 0,
                weightage: Number(body.weightage) || 20,
                lastUpdate: body.lastUpdate || 'Task assigned by manager; waiting for team member update.',
                deliverables: body.deliverables || ['Progress update', 'Completed work handover'],
            },
            include: KRA_INCLUDE,
        });
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
    async updateKra(user, body) {
        const { id, progress, status, lastUpdate } = body;
        const existing = await this.prisma.performanceKra.findUnique({
            where: { id },
            select: { assignedToId: true, assignedById: true, title: true },
        });
        if (!existing)
            throw new common_1.NotFoundException('KRA not found');
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
        if (existing.assignedById && user.id === existing.assignedToId && existing.assignedById !== user.id) {
            await this.notify.notifyUser({
                userId: existing.assignedById,
                title: 'KRA progress update',
                message: `KRA "${existing.title}" was updated${progress !== undefined ? ` to ${Number(progress)}% progress` : ''}${status !== undefined ? ` — status: ${status}` : ''}.`,
                type: 'Performance',
                linkUrl: '/performance',
            });
        }
        else if (user.id !== existing.assignedToId) {
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
    async getGoalsData(user, employeeId, scope, type, cycleId) {
        const targetId = employeeId || user.id;
        const [goals, kpis, kras] = await Promise.all([
            this.prisma.performanceGoal.findMany({
                where: {
                    ...(scope ? { scope: scope } : {}),
                    ...(type ? { type: type } : {}),
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
                where: user.userRole === 'admin'
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
    async handleGoalAction(user, body) {
        const { action } = body;
        const orgId = await this.getOrgId();
        if (action === 'create_goal' || !action) {
            const { title, description, type = 'OKR', scope = 'Individual', ownerId = user.id, parentGoalId, departmentId, teamId, metric, targetValue, currentValue, weightage = 20, startDate, dueDate, cycleId, keyResults = [], } = body;
            if (scope === 'Organization' && user.userRole !== 'admin') {
                throw new common_1.ForbiddenException('Only HR Admins can create company-wide objectives.');
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
                    type: type,
                    scope: scope,
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
        if (action === 'cascade_goal') {
            const { parentGoalId, title, ownerId, scope = 'Individual', weightage = 20, dueDate } = body;
            const parent = await this.prisma.performanceGoal.findUnique({ where: { id: parentGoalId } });
            if (!parent)
                throw new common_1.NotFoundException('Parent goal not found');
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
                    scope: scope,
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
        if (action === 'add_key_result') {
            const { goalId, title, metric, targetValue, unit = '%', weightage = 25 } = body;
            const goal = await this.prisma.performanceGoal.findUnique({ where: { id: goalId } });
            if (!goal)
                throw new common_1.NotFoundException('Goal not found');
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
        if (action === 'sync_kpis') {
            const targetEmpId = body.employeeId || user.id;
            return (0, kpi_engine_1.syncEmployeeKpis)(this.prisma, orgId, targetEmpId, body.cycleId);
        }
        if (action === 'create_kpi') {
            const { employeeId = user.id, name, description, metric, target, unit = '%', weightage = 20, frequency = 'Quarterly', } = body;
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
        throw new common_1.BadRequestException('Invalid action');
    }
    async updateGoalTarget(user, body) {
        const { goalId, keyResultId, kpiId, progress, currentValue, actualValue, status } = body;
        if (keyResultId) {
            const kr = await this.prisma.performance_key_results.findUnique({
                where: { id: keyResultId },
                include: { goal: true },
            });
            if (!kr)
                throw new common_1.NotFoundException('Key Result not found');
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
        if (goalId) {
            const goal = await this.prisma.performanceGoal.findUnique({ where: { id: goalId } });
            if (!goal)
                throw new common_1.NotFoundException('Goal not found');
            if (goal.owner_employee_id) {
                await this.requireEmployeeAccess(user, goal.owner_employee_id);
            }
            return this.prisma.performanceGoal.update({
                where: { id: goalId },
                data: {
                    ...(progress !== undefined ? { progress: Number(progress) } : {}),
                    ...(currentValue !== undefined ? { currentValue: Number(currentValue) } : {}),
                    ...(status ? { status: status } : {}),
                    updatedAt: new Date(),
                },
            });
        }
        if (kpiId) {
            const kpi = await this.prisma.performance_kpis.findUnique({ where: { id: kpiId } });
            if (!kpi)
                throw new common_1.NotFoundException('KPI not found');
            await this.requireEmployeeAccess(user, kpi.employee_id);
            return this.prisma.performance_kpis.update({
                where: { id: kpiId },
                data: {
                    actual: actualValue !== undefined ? Number(actualValue) : kpi.actual,
                    updated_at: new Date(),
                },
            });
        }
        throw new common_1.BadRequestException('No valid target identifier provided');
    }
    async getCyclesData(user, employeeId, cycleId) {
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
                where: user.userRole === 'admin'
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
                where: user.userRole === 'admin'
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
                where: user.userRole === 'admin'
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
        const sanitizedFeedback = feedbackList.map((fb) => {
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
    async handleCycleAction(user, body) {
        const { action } = body;
        if (action === 'create_cycle') {
            this.requireRole(user, 'admin');
            const { name, description, reviewPeriod = 'Quarterly', startDate, endDate, goalSettingDeadline, selfReviewDeadline, managerReviewDeadline, calibrationDate, scoringWeights, } = body;
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
            const allActiveEmployees = await this.prisma.employee.findMany({
                where: { status: 'Active' },
                select: { id: true, managerId: true },
            });
            for (const emp of allActiveEmployees) {
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
        if (action === 'update_cycle_status') {
            this.requireRole(user, 'admin');
            const { cycleId, status, isLocked } = body;
            const cycle = await this.prisma.performance_review_cycles.findUnique({ where: { id: cycleId } });
            if (!cycle)
                throw new common_1.NotFoundException('Cycle not found');
            if (cycle.status === 'Completed' && cycle.is_locked && status !== 'Draft') {
                throw new common_1.BadRequestException('Performance cycle is closed and locked. Historical reviews are immutable.');
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
        if (action === 'submit_self_assessment') {
            const { cycleId, accomplishments, challenges, goalProgressSummary, strengths, improvementAreas, trainingNeeds, careerAspirations, selfRating, } = body;
            const cycle = await this.prisma.performance_review_cycles.findUnique({ where: { id: cycleId } });
            if (cycle?.is_locked) {
                throw new common_1.ForbiddenException('Cycle is locked. Submissions disabled.');
            }
            const assignment = await this.prisma.performance_review_assignments.findFirst({
                where: {
                    cycle_id: cycleId,
                    employee_id: user.id,
                    review_type: 'Self',
                },
            });
            if (assignment?.is_locked) {
                throw new common_1.BadRequestException('Self-assessment has already been locked.');
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
        if (action === 'submit_manager_review') {
            const { cycleId, employeeId, managerRating, managerComments, strengths, developmentAreas, goalAssessment, kpiAssessment, promotionRecommended, incrementRecommended, recommendedIncrementPct, justification, } = body;
            const targetEmployee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
            if (!targetEmployee)
                throw new common_1.NotFoundException('Employee not found');
            if (user.userRole !== 'admin' && targetEmployee.managerId !== user.id) {
                throw new common_1.ForbiddenException('Unauthorized. You can only review direct reports.');
            }
            const cycle = await this.prisma.performance_review_cycles.findUnique({ where: { id: cycleId } });
            if (cycle?.is_locked) {
                throw new common_1.ForbiddenException('Cycle is locked. Reviews are immutable.');
            }
            const scoreResult = await (0, score_engine_1.calculateEmployeePerformanceScore)(this.prisma, employeeId, cycleId);
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
                    score_breakdown: scoreResult,
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
                    score_breakdown: scoreResult,
                    is_locked: true,
                    submitted_at: new Date(),
                },
            });
            if (promotionRecommended) {
                await this.prisma.performance_recommendations.create({
                    data: {
                        id: `REC-PROMO-${Date.now().toString(36)}`,
                        employee_id: employeeId,
                        recommender_id: user.id,
                        cycle_id: cycleId,
                        type: 'Promotion',
                        status: 'Submitted',
                        justification: justification || managerComments || 'Manager recommends promotion based on cycle evaluation.',
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
            return { success: true, data: updated, scoreResult };
        }
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
        throw new common_1.BadRequestException('Invalid cycle action');
    }
    async getCompetenciesData(user, employeeId, cycleId) {
        const targetId = employeeId || user.id;
        const orgId = await this.getOrgId();
        let competencies = await this.prisma.performance_competencies.findMany({
            where: { organization_id: orgId, is_active: true },
        });
        if (competencies.length === 0) {
            await this.prisma.performance_competencies.createMany({
                data: DEFAULT_COMPETENCIES.map((c) => ({
                    id: `COMP-${c.name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30)}`,
                    organization_id: orgId,
                    name: c.name,
                    description: c.description,
                    scale: c.scale,
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
    async handleCompetencyAction(user, body) {
        const { action } = body;
        if (action === 'submit_assessment' || !action) {
            const { competencyId, employeeId, cycleId, rating, comments } = body;
            if (!competencyId || !employeeId) {
                throw new common_1.BadRequestException('Missing competencyId or employeeId');
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
        throw new common_1.BadRequestException('Invalid action');
    }
    async getPips(user, employeeId) {
        return this.prisma.performance_improvement_plans.findMany({
            where: user.userRole === 'admin'
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
    async handlePipAction(user, body) {
        const { action } = body;
        if (action === 'create_pip' || !action) {
            if (user.userRole === 'employee') {
                throw new common_1.ForbiddenException('Employees cannot initiate a PIP.');
            }
            const { employeeId, title, reason, expectations, startDate, reviewDate, milestones = [] } = body;
            const targetEmp = await this.prisma.employee.findUnique({ where: { id: employeeId } });
            if (!targetEmp)
                throw new common_1.NotFoundException('Employee not found');
            if (user.userRole !== 'admin' && targetEmp.managerId !== user.id) {
                throw new common_1.ForbiddenException('You can only initiate PIPs for direct reports.');
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
        if (action === 'add_milestone') {
            const { pipId, title, dueDate, note } = body;
            const pip = await this.prisma.performance_improvement_plans.findUnique({ where: { id: pipId } });
            if (!pip)
                throw new common_1.NotFoundException('PIP not found');
            if (user.userRole !== 'admin' && pip.manager_id !== user.id) {
                throw new common_1.ForbiddenException('Unauthorized to add milestones.');
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
        if (action === 'update_milestone') {
            const { milestoneId, status, note } = body;
            const milestone = await this.prisma.performance_pip_milestones.findUnique({
                where: { id: milestoneId },
                include: { performance_improvement_plans: true },
            });
            if (!milestone)
                throw new common_1.NotFoundException('Milestone not found');
            return this.prisma.performance_pip_milestones.update({
                where: { id: milestoneId },
                data: {
                    status: status || milestone.status,
                    note: note !== undefined ? note : milestone.note,
                },
            });
        }
        if (action === 'update_pip_status') {
            const { pipId, status, outcome, endDate } = body;
            const pip = await this.prisma.performance_improvement_plans.findUnique({ where: { id: pipId } });
            if (!pip)
                throw new common_1.NotFoundException('PIP not found');
            if (user.userRole !== 'admin' && pip.manager_id !== user.id) {
                throw new common_1.ForbiddenException('Unauthorized to close or update PIP.');
            }
            const updated = await this.prisma.performance_improvement_plans.update({
                where: { id: pipId },
                data: {
                    status: status,
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
        throw new common_1.BadRequestException('Invalid PIP action');
    }
    async getCalibrationData(user, cycleId, departmentId) {
        if (user.userRole === 'employee') {
            throw new common_1.ForbiddenException('Access restricted to HR & Reviewers');
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
        const ratings = reviewAssignments.map((a) => Number(a.rating || 3.0));
        const distribution = {
            level5: ratings.filter((r) => r >= 4.5).length,
            level4: ratings.filter((r) => r >= 3.8 && r < 4.5).length,
            level3: ratings.filter((r) => r >= 2.8 && r < 3.8).length,
            level2: ratings.filter((r) => r >= 2.0 && r < 2.8).length,
            level1: ratings.filter((r) => r < 2.0).length,
            total: ratings.length,
            average: ratings.length > 0
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
    async handleCalibrationAction(user, body) {
        this.requireRole(user, 'admin');
        const { action } = body;
        const orgId = await this.getOrgId();
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
        throw new common_1.BadRequestException('Invalid action');
    }
};
exports.PerformanceService = PerformanceService;
exports.PerformanceService = PerformanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notify_service_1.NotifyService])
], PerformanceService);
//# sourceMappingURL=performance.service.js.map