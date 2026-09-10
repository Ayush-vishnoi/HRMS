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
exports.RecruitmentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notify_service_1 = require("../common/notifications/notify.service");
const offer_documents_1 = require("./offer-documents");
const resume_parser_1 = require("./resume-parser");
const node_crypto_1 = require("node:crypto");
const promises_1 = require("node:fs/promises");
const STAGES = [
    'New',
    'Applied',
    'Screening',
    'Interview',
    'Shortlisted',
    'Selected',
    'Offer',
    'Joined',
    'Rejected',
    'Withdrawn',
    'Archived',
];
const ACTIVE_OFFER_STATUSES = ['Draft', 'PendingApproval', 'Approved', 'Sent', 'Viewed'];
const EMPLOYEE_SUMMARY_SELECT = {
    id: true,
    employeeCode: true,
    name: true,
    email: true,
    roleTitle: true,
    userRole: true,
    department: true,
    avatarUrl: true,
    status: true,
};
let RecruitmentService = class RecruitmentService {
    prisma;
    notify;
    constructor(prisma, notify) {
        this.prisma = prisma;
        this.notify = notify;
    }
    async findAll() {
        const [jobs, candidates] = await Promise.all([
            this.prisma.recruitmentJob.findMany({
                orderBy: { createdAt: 'desc' },
                include: {
                    recruitment_job_approvals: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
                    hiringManager: { select: EMPLOYEE_SUMMARY_SELECT },
                    recruiter: { select: EMPLOYEE_SUMMARY_SELECT },
                    candidates: { select: { id: true, stage: true } },
                },
            }),
            this.prisma.recruitmentCandidate.findMany({
                orderBy: { createdAt: 'desc' },
                include: {
                    job: true,
                    onboarding: { include: { employee: { select: EMPLOYEE_SUMMARY_SELECT } } },
                    resumeDocument: true,
                    matches: true,
                    assignedRecruiter: { select: EMPLOYEE_SUMMARY_SELECT },
                },
            }),
        ]);
        return { jobs, candidates };
    }
    async createJob(data) {
        if (!data.title || !data.department || !data.location || !data.description) {
            throw new common_1.BadRequestException('title, department, location and description are required.');
        }
        const job = await this.prisma.recruitmentJob.create({
            data: {
                id: crypto.randomUUID(),
                title: String(data.title),
                department: String(data.department),
                location: String(data.location),
                employmentType: data.employmentType === 'Contract' ? 'Contract' : 'FullTime',
                openings: Number(data.openings) > 0 ? Math.round(Number(data.openings)) : 1,
                status: data.status === 'Draft' ? 'Draft' : 'Open',
                postedOn: new Date().toISOString().slice(0, 10),
                description: String(data.description),
                requirements: Array.isArray(data.requirements) ? data.requirements.map(String) : [],
                responsibilities: Array.isArray(data.responsibilities) ? data.responsibilities.map(String) : [],
                experience_min: data.experienceMin != null && data.experienceMin !== '' ? Number(data.experienceMin) : 0,
                experience_max: data.experienceMax != null && data.experienceMax !== '' ? Number(data.experienceMax) : null,
                salary_min: data.salaryMin != null && data.salaryMin !== '' ? Number(data.salaryMin) : null,
                salary_max: data.salaryMax != null && data.salaryMax !== '' ? Number(data.salaryMax) : null,
                currency: data.currency || 'INR',
                hiring_manager_id: data.hiringManagerId || null,
                recruiter_id: data.recruiterId || null,
                priority: data.priority || 'Medium',
                target_close_date: data.targetCloseDate ? new Date(data.targetCloseDate) : null,
            },
        });
        return job;
    }
    async updateJob(jobId, body) {
        const job = await this.prisma.recruitmentJob.findUnique({ where: { id: jobId } });
        if (!job)
            throw new common_1.NotFoundException('Job not found.');
        if (body.action) {
            return this.handleJobAction(job, body);
        }
        const data = {};
        if (body.title != null)
            data.title = String(body.title);
        if (body.description != null)
            data.description = String(body.description);
        if (body.requirements != null)
            data.requirements = body.requirements.map(String);
        if (body.responsibilities != null)
            data.responsibilities = body.responsibilities.map(String);
        if (body.priority != null)
            data.priority = String(body.priority);
        if (body.openings != null)
            data.openings = Math.max(1, Math.round(Number(body.openings) || 1));
        if (body.hiringManagerId !== undefined)
            data.hiring_manager_id = body.hiringManagerId || null;
        if (body.recruiterId !== undefined)
            data.recruiter_id = body.recruiterId || null;
        if (Object.keys(data).length === 0)
            return job;
        return this.prisma.recruitmentJob.update({ where: { id: jobId }, data });
    }
    async resolveFallbackApproverId() {
        const manager = await this.prisma.employee.findFirst({
            where: { userRole: 'manager', status: 'Active' },
            select: { id: true },
        });
        if (manager)
            return manager.id;
        const admin = await this.prisma.employee.findFirst({
            where: { userRole: 'admin' },
            select: { id: true },
        });
        return admin?.id ?? null;
    }
    async handleJobAction(job, body) {
        const action = String(body.action);
        if (action === 'submit_approval') {
            if (job.status !== 'Draft' && job.status !== 'Open') {
                throw new common_1.BadRequestException(`Cannot submit job in "${job.status}" status for approval.`);
            }
            const hiringManagerId = job.hiring_manager_id || (await this.resolveFallbackApproverId());
            if (!hiringManagerId) {
                throw new common_1.BadRequestException('Job must have a hiring manager before submitting for approval.');
            }
            const admin = await this.prisma.employee.findFirst({
                where: { userRole: 'admin', id: { not: hiringManagerId } },
                select: { id: true },
            });
            if (!admin) {
                throw new common_1.BadRequestException('No distinct admin approver available for L2. Assign a hiring manager and configure an admin first.');
            }
            const adminId = admin.id;
            const updated = await this.prisma.$transaction(async (tx) => {
                await tx.recruitment_job_approvals.deleteMany({ where: { job_id: job.id } });
                await tx.recruitment_job_approvals.create({
                    data: { job_id: job.id, sequence: 1, approver_id: hiringManagerId, status: 'Pending', note: body.note || null },
                });
                await tx.recruitment_job_approvals.create({
                    data: { job_id: job.id, sequence: 2, approver_id: adminId, status: 'Pending' },
                });
                return tx.recruitmentJob.update({
                    where: { id: job.id },
                    data: { status: 'PendingApproval' },
                    include: { recruitment_job_approvals: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } } },
                });
            });
            this.notify
                .notifyUser({
                userId: hiringManagerId,
                title: 'Job approval requested',
                message: `Job "${job.title}" is awaiting your L1 approval.`,
                type: 'Recruitment',
                linkUrl: '/recruitment',
            })
                .catch(() => undefined);
            return updated;
        }
        if (action === 'publish') {
            if (job.status !== 'Approved') {
                throw new common_1.BadRequestException('Job must be Approved before publishing.');
            }
            return this.prisma.recruitmentJob.update({
                where: { id: job.id },
                data: { status: 'Published' },
            });
        }
        if (action === 'hold' || action === 'close') {
            const nextStatus = action === 'hold' ? 'OnHold' : 'Closed';
            return this.prisma.recruitmentJob.update({
                where: { id: job.id },
                data: { status: nextStatus },
            });
        }
        throw new common_1.BadRequestException(`Unknown job action "${action}".`);
    }
    async jobApprovalAction(jobId, body, actorId) {
        const job = await this.prisma.recruitmentJob.findUnique({
            where: { id: jobId },
            include: { recruitment_job_approvals: { orderBy: { sequence: 'asc' } } },
        });
        if (!job)
            throw new common_1.NotFoundException('Job not found.');
        if (job.status !== 'PendingApproval') {
            throw new common_1.BadRequestException('Job is not pending approval.');
        }
        const action = String(body.action);
        const myStep = job.recruitment_job_approvals.find((a) => a.approver_id === actorId);
        if (!myStep)
            throw new common_1.ForbiddenException('You are not an approver for this job.');
        if (myStep.status !== 'Pending' && !(action === 'APPROVE' && myStep.status === 'Approved')) {
            throw new common_1.BadRequestException('You have already acted on this approval. The requisition is still awaiting other approvers.');
        }
        if (action === 'APPROVE') {
            const updated = await this.prisma.$transaction(async (tx) => {
                if (myStep.status === 'Pending') {
                    await tx.recruitment_job_approvals.update({
                        where: { id: myStep.id },
                        data: { status: 'Approved', note: body.note || null, acted_at: new Date() },
                    });
                }
                const supersededSteps = await tx.recruitment_job_approvals.findMany({
                    where: { job_id: job.id, status: 'Pending', sequence: { lt: myStep.sequence } },
                });
                for (const step of supersededSteps) {
                    await tx.recruitment_job_approvals.update({
                        where: { id: step.id },
                        data: {
                            status: 'Approved',
                            note: `Auto-approved: superseded by L${myStep.sequence} approval.`,
                            acted_at: new Date(),
                        },
                    });
                }
                const steps = await tx.recruitment_job_approvals.findMany({
                    where: { job_id: job.id },
                    orderBy: { sequence: 'asc' },
                });
                const allApproved = steps.every((s) => s.status === 'Approved');
                if (allApproved) {
                    return tx.recruitmentJob.update({
                        where: { id: job.id },
                        data: { status: 'Approved' },
                        include: { recruitment_job_approvals: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } } },
                    });
                }
                return tx.recruitmentJob.findUnique({
                    where: { id: job.id },
                    include: { recruitment_job_approvals: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } } },
                });
            });
            const stepsAfter = updated?.recruitment_job_approvals ?? [];
            const allStepsApproved = stepsAfter.every((s) => s.status === 'Approved');
            const nextPendingStep = stepsAfter.find((s) => s.status === 'Pending');
            if (allStepsApproved) {
                if (job.hiring_manager_id && job.hiring_manager_id !== actorId) {
                    await this.notify.notifyUser({
                        userId: job.hiring_manager_id,
                        title: 'Job approved',
                        message: `Job "${job.title}" has been fully approved and is ready to publish.`,
                        type: 'Recruitment',
                        linkUrl: '/recruitment',
                    });
                }
            }
            else if (nextPendingStep && nextPendingStep.approver_id !== actorId) {
                await this.notify.notifyUser({
                    userId: nextPendingStep.approver_id,
                    title: 'Job approval requested',
                    message: `Job "${job.title}" is awaiting your L${nextPendingStep.sequence} approval.`,
                    type: 'Recruitment',
                    linkUrl: '/recruitment',
                });
            }
            return updated;
        }
        if (action === 'REJECT' || action === 'REQUEST_CHANGES') {
            const status = action === 'REJECT' ? 'Rejected' : 'Cancelled';
            const updated = await this.prisma.$transaction(async (tx) => {
                await tx.recruitment_job_approvals.update({
                    where: { id: myStep.id },
                    data: { status, note: body.note || null, acted_at: new Date() },
                });
                return tx.recruitmentJob.update({
                    where: { id: job.id },
                    data: { status: action === 'REJECT' ? 'Draft' : 'Draft' },
                    include: { recruitment_job_approvals: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } } },
                });
            });
            if (job.hiring_manager_id && job.hiring_manager_id !== actorId) {
                await this.notify.notifyUser({
                    userId: job.hiring_manager_id,
                    title: action === 'REJECT' ? 'Job rejected' : 'Job sent back for changes',
                    message: `Job "${job.title}" was ${action === 'REJECT' ? 'rejected' : 'sent back for changes'} and moved to Draft.${body.note ? ` Note: ${body.note}` : ''}`,
                    type: 'Recruitment',
                    linkUrl: '/recruitment',
                });
            }
            return updated;
        }
        throw new common_1.BadRequestException(`Unknown approval action "${action}".`);
    }
    async getCandidates(jobId, stage) {
        return this.prisma.recruitmentCandidate.findMany({
            where: {
                ...(jobId ? { jobId } : {}),
                ...(stage ? { stage: stage } : {}),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                job: true,
                onboarding: { include: { employee: { select: EMPLOYEE_SUMMARY_SELECT } } },
                resumeDocument: true,
                matches: true,
                assignedRecruiter: { select: EMPLOYEE_SUMMARY_SELECT },
            },
        });
    }
    async getCandidate(id) {
        const candidate = await this.prisma.recruitmentCandidate.findUnique({
            where: { id },
            include: {
                job: true,
                onboarding: { include: { employee: { select: EMPLOYEE_SUMMARY_SELECT } } },
                resumeDocument: true,
                matches: true,
                assignedRecruiter: { select: EMPLOYEE_SUMMARY_SELECT },
            },
        });
        if (!candidate)
            throw new common_1.NotFoundException('Candidate not found.');
        return candidate;
    }
    async createCandidate(data) {
        if (!data.name || !data.email || !data.jobId) {
            throw new common_1.BadRequestException('name, email and jobId are required.');
        }
        const job = await this.prisma.recruitmentJob.findUnique({ where: { id: data.jobId } });
        if (!job)
            throw new common_1.NotFoundException('Job not found.');
        const existing = await this.prisma.recruitmentCandidate.findFirst({
            where: { email: String(data.email).toLowerCase(), jobId: data.jobId },
        });
        if (existing) {
            throw new common_1.BadRequestException('A candidate with this email already exists for this job.');
        }
        const experience = data.experience != null && data.experience !== '' ? String(data.experience) : '0';
        const candidate = await this.prisma.recruitmentCandidate.create({
            data: {
                id: crypto.randomUUID(),
                jobId: data.jobId,
                name: String(data.name),
                email: String(data.email).toLowerCase(),
                phone: data.phone ? String(data.phone) : '',
                appliedOn: new Date().toISOString().slice(0, 10),
                stage: 'Applied',
                score: 75,
                experience,
                currentRole: data.currentRole ? String(data.currentRole) : '',
                location: data.location ? String(data.location) : '',
                summary: data.summary ? String(data.summary) : '',
                recommendation: 'Review',
                tags: Array.isArray(data.tags) && data.tags.length > 0 ? data.tags.map(String) : ['New Applicant'],
                source: data.source || 'Manual',
                duplicate_key: `${String(data.email).toLowerCase()}::${data.jobId}`,
            },
            include: { job: true },
        });
        await this.prisma.recruitmentJob.update({
            where: { id: data.jobId },
            data: { applicants: { increment: 1 } },
        });
        return candidate;
    }
    async updateCandidate(id, body) {
        const candidate = await this.prisma.recruitmentCandidate.findUnique({ where: { id } });
        if (!candidate)
            throw new common_1.NotFoundException('Candidate not found.');
        const data = {};
        if (body.tags != null && Array.isArray(body.tags))
            data.tags = body.tags.map(String);
        if (body.name != null)
            data.name = String(body.name);
        if (body.phone != null)
            data.phone = String(body.phone);
        if (body.currentRole != null)
            data.currentRole = String(body.currentRole);
        if (body.location != null)
            data.location = String(body.location);
        if (body.summary != null)
            data.summary = String(body.summary);
        if (Object.keys(data).length === 0)
            return candidate;
        return this.prisma.recruitmentCandidate.update({ where: { id }, data });
    }
    async updateCandidateStage(id, stage, changedById, note) {
        const candidate = await this.prisma.recruitmentCandidate.findUnique({ where: { id } });
        if (!candidate)
            throw new common_1.NotFoundException('Candidate not found.');
        if (!STAGES.includes(stage)) {
            throw new common_1.BadRequestException(`Invalid stage "${stage}".`);
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            await tx.candidate_stage_history.create({
                data: {
                    id: crypto.randomUUID(),
                    candidate_id: id,
                    from_stage: candidate.stage,
                    to_stage: stage,
                    changed_by_id: changedById,
                    note: note || null,
                },
            });
            return tx.recruitmentCandidate.update({
                where: { id },
                data: { stage: stage },
            });
        });
        return updated;
    }
    async parseDraft(file) {
        const buffer = await (0, promises_1.readFile)(file.path);
        const rawText = (0, resume_parser_1.extractResumeText)(buffer, file.mimetype);
        const parsed = (0, resume_parser_1.parseResumeDraft)(rawText);
        return { parsedData: parsed };
    }
    async createFromResume(file, fieldsJson, uploadedById) {
        let fields;
        try {
            fields = JSON.parse(fieldsJson || '{}');
        }
        catch {
            throw new common_1.BadRequestException('fields must be a JSON string.');
        }
        if (!fields.name || !fields.email || !fields.jobId) {
            throw new common_1.BadRequestException('name, email and jobId are required.');
        }
        const job = await this.prisma.recruitmentJob.findUnique({ where: { id: fields.jobId } });
        if (!job)
            throw new common_1.NotFoundException('Job not found.');
        const buffer = await (0, promises_1.readFile)(file.path);
        const rawText = (0, resume_parser_1.extractResumeText)(buffer, file.mimetype);
        const parsed = (0, resume_parser_1.parseResumeDraft)(rawText);
        const existing = await this.prisma.recruitmentCandidate.findFirst({
            where: { email: String(fields.email).toLowerCase(), jobId: fields.jobId },
        });
        if (existing) {
            throw new common_1.BadRequestException('A candidate with this email already exists for this job.');
        }
        const experience = fields.experience != null && fields.experience !== ''
            ? String(fields.experience)
            : parsed.totalExperienceYears > 0
                ? `${parsed.totalExperienceYears} yr${parsed.totalExperienceYears === 1 ? '' : 's'}`
                : '0';
        const currentRole = fields.currentRole || parsed.currentRole || '';
        const location = fields.location || parsed.location || '';
        const summary = fields.summary || parsed.summary || '';
        const candidate = await this.prisma.recruitmentCandidate.create({
            data: {
                id: crypto.randomUUID(),
                jobId: fields.jobId,
                name: String(fields.name),
                email: String(fields.email).toLowerCase(),
                phone: fields.phone ? String(fields.phone) : parsed.phone || '',
                appliedOn: new Date().toISOString().slice(0, 10),
                stage: 'Applied',
                score: 75,
                experience,
                currentRole,
                location,
                matchedSkills: parsed.topSkills,
                missingSkills: [],
                summary,
                recommendation: 'Review',
                tags: Array.isArray(fields.tags) && fields.tags.length > 0 ? fields.tags.map(String) : ['New Applicant'],
                source: fields.source || 'CareerPage',
                duplicate_key: `${String(fields.email).toLowerCase()}::${fields.jobId}`,
                parsed_resume: parsed,
                resumeUrl: `/api/recruitment/candidates/${'PENDING'}/resume`,
            },
        });
        const fileHash = (0, node_crypto_1.createHash)('sha256').update(buffer).digest('hex');
        await this.prisma.candidateResumeDocument.create({
            data: {
                id: crypto.randomUUID(),
                candidateId: candidate.id,
                fileName: file.originalname,
                fileType: file.mimetype,
                fileSize: buffer.length,
                storagePath: file.path,
                fileHash,
                uploadedById,
                parsingStatus: 'COMPLETED',
                parserVersion: resume_parser_1.PARSER_VERSION,
                rawTextSample: rawText.slice(0, 2000),
            },
        });
        await this.prisma.recruitmentCandidate.update({
            where: { id: candidate.id },
            data: { resumeUrl: `/api/recruitment/candidates/${candidate.id}/resume` },
        });
        await this.prisma.recruitmentJob.update({
            where: { id: fields.jobId },
            data: { applicants: { increment: 1 } },
        });
        const match = (0, resume_parser_1.computeMatchScore)({
            candidateSkills: parsed.topSkills,
            candidateExperienceYears: parsed.totalExperienceYears,
            candidateLocation: location,
            jobRequirements: job.requirements,
            jobExperienceMin: job.experience_min ?? 0,
            jobExperienceMax: job.experience_max ?? undefined,
            jobLocation: job.location,
        });
        await this.prisma.recruitmentCandidateMatch.upsert({
            where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } },
            create: {
                id: crypto.randomUUID(),
                candidateId: candidate.id,
                jobId: job.id,
                overallScore: match.overallScore,
                skillScore: match.skillScore,
                experienceScore: match.experienceScore,
                educationScore: match.educationScore,
                locationScore: match.locationScore,
                matchedSkills: match.matchedSkills,
                missingSkills: match.missingSkills,
                experienceGap: match.experienceGap != null ? String(match.experienceGap) : null,
                explanation: match.explanation,
                engineVersion: match.engineVersion,
            },
            update: {
                overallScore: match.overallScore,
                skillScore: match.skillScore,
                experienceScore: match.experienceScore,
                educationScore: match.educationScore,
                locationScore: match.locationScore,
                matchedSkills: match.matchedSkills,
                missingSkills: match.missingSkills,
                experienceGap: match.experienceGap != null ? String(match.experienceGap) : null,
                explanation: match.explanation,
                calculatedAt: new Date(),
            },
        });
        await this.prisma.recruitmentCandidate.update({
            where: { id: candidate.id },
            data: {
                score: match.overallScore,
                matchedSkills: match.matchedSkills,
                missingSkills: match.missingSkills,
                ai_match_score: match.overallScore,
            },
        });
        return { candidate, match };
    }
    async uploadResume(candidateId, file, uploadedById) {
        const candidate = await this.prisma.recruitmentCandidate.findUnique({
            where: { id: candidateId },
            include: { job: true },
        });
        if (!candidate)
            throw new common_1.NotFoundException('Candidate not found.');
        const buffer = await (0, promises_1.readFile)(file.path);
        const rawText = (0, resume_parser_1.extractResumeText)(buffer, file.mimetype);
        const parsed = (0, resume_parser_1.parseResumeDraft)(rawText);
        const fileHash = (0, node_crypto_1.createHash)('sha256').update(buffer).digest('hex');
        await this.prisma.candidateResumeDocument.upsert({
            where: { candidateId },
            create: {
                id: crypto.randomUUID(),
                candidateId,
                fileName: file.originalname,
                fileType: file.mimetype,
                fileSize: buffer.length,
                storagePath: file.path,
                fileHash,
                uploadedById,
                parsingStatus: 'COMPLETED',
                parserVersion: resume_parser_1.PARSER_VERSION,
                rawTextSample: rawText.slice(0, 2000),
            },
            update: {
                fileName: file.originalname,
                fileType: file.mimetype,
                fileSize: buffer.length,
                storagePath: file.path,
                fileHash,
                uploadedById,
                parsingStatus: 'COMPLETED',
                parserVersion: resume_parser_1.PARSER_VERSION,
                rawTextSample: rawText.slice(0, 2000),
                uploadedAt: new Date(),
            },
        });
        const match = await this.recomputeMatch(candidate, parsed.topSkills, parsed.totalExperienceYears, parsed.location ?? "", []);
        await this.prisma.recruitmentCandidate.update({
            where: { id: candidateId },
            data: {
                parsed_resume: parsed,
                resumeUrl: `/api/recruitment/candidates/${candidateId}/resume`,
            },
        });
        return {
            candidateId,
            fileName: file.originalname,
            matchResult: match,
        };
    }
    async reparseResume(candidateId) {
        const candidate = await this.prisma.recruitmentCandidate.findUnique({
            where: { id: candidateId },
            include: { job: true, resumeDocument: true },
        });
        if (!candidate)
            throw new common_1.NotFoundException('Candidate not found.');
        if (!candidate.resumeDocument) {
            throw new common_1.BadRequestException('No resume uploaded for this candidate yet.');
        }
        let buffer;
        try {
            buffer = await (0, promises_1.readFile)(candidate.resumeDocument.storagePath);
        }
        catch {
            throw new common_1.BadRequestException('Stored resume file is no longer available on disk.');
        }
        const rawText = (0, resume_parser_1.extractResumeText)(buffer, candidate.resumeDocument.fileType);
        const parsed = (0, resume_parser_1.parseResumeDraft)(rawText);
        await this.prisma.candidateResumeDocument.update({
            where: { candidateId },
            data: {
                parsingStatus: 'COMPLETED',
                parserVersion: resume_parser_1.PARSER_VERSION,
                rawTextSample: rawText.slice(0, 2000),
                parsingError: null,
            },
        });
        const match = await this.recomputeMatch(candidate, parsed.topSkills, parsed.totalExperienceYears, parsed.location ?? "", []);
        await this.prisma.recruitmentCandidate.update({
            where: { id: candidateId },
            data: { parsed_resume: parsed },
        });
        return { candidateId, match };
    }
    async getResumeFile(candidateId) {
        const candidate = await this.prisma.recruitmentCandidate.findUnique({
            where: { id: candidateId },
            include: { resumeDocument: true },
        });
        if (!candidate)
            throw new common_1.NotFoundException('Candidate not found.');
        if (!candidate.resumeDocument) {
            throw new common_1.NotFoundException('No resume uploaded for this candidate yet.');
        }
        let buffer;
        try {
            buffer = await (0, promises_1.readFile)(candidate.resumeDocument.storagePath);
        }
        catch {
            throw new common_1.NotFoundException('Stored resume file is no longer available on disk.');
        }
        const fileName = candidate.resumeDocument.fileName || `resume-${candidateId}`;
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        const EXT_MIME = {
            pdf: 'application/pdf',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            doc: 'application/msword',
            txt: 'text/plain',
            rtf: 'application/rtf',
        };
        const storedType = candidate.resumeDocument.fileType || '';
        const mimeType = storedType.includes('/')
            ? storedType
            : EXT_MIME[ext] || EXT_MIME[storedType.toLowerCase()] || 'application/octet-stream';
        return { buffer, fileName, mimeType };
    }
    async recomputeMatch(candidate, skills, experienceYears, location, _education) {
        const job = candidate.job ?? (await this.prisma.recruitmentJob.findUnique({ where: { id: candidate.jobId } }));
        if (!job)
            throw new common_1.NotFoundException('Job not found.');
        const match = (0, resume_parser_1.computeMatchScore)({
            candidateSkills: skills,
            candidateExperienceYears: experienceYears,
            candidateLocation: location || candidate.location,
            jobRequirements: job.requirements,
            jobExperienceMin: job.experience_min ?? 0,
            jobExperienceMax: job.experience_max ?? undefined,
            jobLocation: job.location,
        });
        await this.prisma.recruitmentCandidateMatch.upsert({
            where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } },
            create: {
                id: crypto.randomUUID(),
                candidateId: candidate.id,
                jobId: job.id,
                overallScore: match.overallScore,
                skillScore: match.skillScore,
                experienceScore: match.experienceScore,
                educationScore: match.educationScore,
                locationScore: match.locationScore,
                matchedSkills: match.matchedSkills,
                missingSkills: match.missingSkills,
                experienceGap: match.experienceGap != null ? String(match.experienceGap) : null,
                explanation: match.explanation,
                engineVersion: match.engineVersion,
            },
            update: {
                overallScore: match.overallScore,
                skillScore: match.skillScore,
                experienceScore: match.experienceScore,
                educationScore: match.educationScore,
                locationScore: match.locationScore,
                matchedSkills: match.matchedSkills,
                missingSkills: match.missingSkills,
                experienceGap: match.experienceGap != null ? String(match.experienceGap) : null,
                explanation: match.explanation,
                calculatedAt: new Date(),
            },
        });
        await this.prisma.recruitmentCandidate.update({
            where: { id: candidate.id },
            data: {
                score: match.overallScore,
                matchedSkills: match.matchedSkills,
                missingSkills: match.missingSkills,
                ai_match_score: match.overallScore,
            },
        });
        return match;
    }
    async rediscover(jobId, minScore = 40) {
        const job = await this.prisma.recruitmentJob.findUnique({ where: { id: jobId } });
        if (!job)
            throw new common_1.NotFoundException('Job not found.');
        const pastCandidates = await this.prisma.recruitmentCandidate.findMany({
            where: {
                jobId: { not: jobId },
                stage: { in: ['Rejected', 'Withdrawn', 'Archived'] },
            },
            include: { job: true },
            take: 200,
        });
        const results = [];
        for (const cand of pastCandidates) {
            const skills = cand.matchedSkills || [];
            const expYears = parseFloat(cand.experience) || 0;
            const match = (0, resume_parser_1.computeMatchScore)({
                candidateSkills: skills,
                candidateExperienceYears: expYears,
                candidateLocation: cand.location,
                jobRequirements: job.requirements,
                jobExperienceMin: job.experience_min ?? 0,
                jobExperienceMax: job.experience_max ?? undefined,
                jobLocation: job.location,
            });
            if (match.overallScore >= minScore) {
                results.push({
                    candidateId: cand.id,
                    name: cand.name,
                    matchScore: match.overallScore,
                    previousJobTitle: cand.job?.title || '',
                    previousStage: cand.stage,
                    currentRole: cand.currentRole || '',
                    experience: cand.experience,
                    location: cand.location,
                    matchBreakdown: {
                        skillScore: match.skillScore,
                        experienceScore: match.experienceScore,
                        educationScore: match.educationScore,
                        locationScore: match.locationScore,
                        matchedSkills: match.matchedSkills,
                        missingSkills: match.missingSkills,
                        explanation: match.explanation,
                    },
                    tags: cand.tags || [],
                });
            }
        }
        results.sort((a, b) => b.matchScore - a.matchScore);
        return { rediscoveredCandidates: results };
    }
    async addToJob(candidateId, targetJobId) {
        const candidate = await this.prisma.recruitmentCandidate.findUnique({ where: { id: candidateId } });
        if (!candidate)
            throw new common_1.NotFoundException('Candidate not found.');
        const job = await this.prisma.recruitmentJob.findUnique({ where: { id: targetJobId } });
        if (!job)
            throw new common_1.NotFoundException('Target job not found.');
        const existing = await this.prisma.recruitmentCandidate.findFirst({
            where: { email: candidate.email, jobId: targetJobId },
        });
        if (existing) {
            throw new common_1.BadRequestException('Candidate already exists on the target job.');
        }
        const created = await this.prisma.recruitmentCandidate.create({
            data: {
                id: crypto.randomUUID(),
                jobId: targetJobId,
                name: candidate.name,
                email: candidate.email,
                phone: candidate.phone,
                appliedOn: new Date().toISOString().slice(0, 10),
                stage: 'Applied',
                score: candidate.score,
                experience: candidate.experience,
                currentRole: candidate.currentRole,
                location: candidate.location,
                matchedSkills: candidate.matchedSkills,
                missingSkills: candidate.missingSkills,
                summary: candidate.summary,
                recommendation: candidate.recommendation,
                tags: [...(candidate.tags || []), 'Rediscovered'],
                source: 'Manual',
                duplicate_key: `${candidate.email}::${targetJobId}`,
                parsed_resume: candidate.parsed_resume,
            },
            include: { job: true },
        });
        await this.prisma.recruitmentJob.update({
            where: { id: targetJobId },
            data: { applicants: { increment: 1 } },
        });
        return created;
    }
    async getInterviews(candidateId) {
        return this.prisma.recruitment_interviews.findMany({
            where: { candidate_id: candidateId },
            orderBy: [{ round: 'asc' }, { starts_at: 'asc' }],
            include: {
                interview_panel_members: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
                interview_feedback: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
            },
        });
    }
    async getMyApprovals(actorId) {
        const [jobSteps, offerSteps] = await Promise.all([
            this.prisma.recruitment_job_approvals.findMany({
                where: { approver_id: actorId, status: 'Pending', recruitment_jobs: { status: 'PendingApproval' } },
                include: {
                    recruitment_jobs: {
                        select: {
                            id: true,
                            title: true,
                            department: true,
                            recruitment_job_approvals: { select: { sequence: true, status: true }, orderBy: { sequence: 'asc' } },
                        },
                    },
                },
                orderBy: { sequence: 'asc' },
            }),
            this.prisma.recruitment_offer_approvals.findMany({
                where: { approver_id: actorId, status: 'Pending', recruitment_offers: { status: 'PendingApproval' } },
                include: {
                    recruitment_offers: {
                        select: {
                            id: true,
                            offered_title: true,
                            recruitment_candidates: { select: { name: true, currentRole: true } },
                            recruitment_offer_approvals: { select: { sequence: true, status: true }, orderBy: { sequence: 'asc' } },
                        },
                    },
                },
                orderBy: { sequence: 'asc' },
            }),
        ]);
        const isMyTurn = (siblings, sequence) => siblings.filter((step) => step.sequence < sequence).every((step) => step.status === 'Approved');
        return {
            jobs: jobSteps
                .filter((step) => isMyTurn(step.recruitment_jobs.recruitment_job_approvals, step.sequence))
                .map((step) => ({
                id: step.recruitment_jobs.id,
                level: step.sequence,
                title: step.recruitment_jobs.title,
                context: step.recruitment_jobs.department,
            })),
            offers: offerSteps
                .filter((step) => isMyTurn(step.recruitment_offers.recruitment_offer_approvals, step.sequence))
                .map((step) => ({
                id: step.recruitment_offers.id,
                level: step.sequence,
                title: step.recruitment_offers.offered_title,
                candidate: step.recruitment_offers.recruitment_candidates.name,
                context: step.recruitment_offers.recruitment_candidates.currentRole,
            })),
        };
    }
    interviewMeetingId(interviewId) {
        return `i${(0, node_crypto_1.createHash)('sha256').update(interviewId).digest('hex').slice(1, 32)}`;
    }
    interviewMeetingStatus(status) {
        if (status === 'Cancelled')
            return 'CANCELLED';
        if (status === 'Completed' || status === 'NoShow' || status === 'No Show')
            return 'COMPLETED';
        if (status === 'InProgress')
            return 'ONGOING';
        return 'UPCOMING';
    }
    async syncInterviewMeeting(interviewId) {
        const interview = await this.prisma.recruitment_interviews.findUnique({
            where: { id: interviewId },
            include: {
                interview_panel_members: true,
                recruitment_candidates: { select: { name: true } },
            },
        });
        if (!interview)
            return;
        const lead = interview.interview_panel_members.find((member) => member.is_lead) ??
            interview.interview_panel_members[0];
        if (!lead)
            return;
        const meetingId = this.interviewMeetingId(interviewId);
        const panelIds = [...new Set(interview.interview_panel_members.map((member) => member.employee_id))];
        const attendeeIds = panelIds.filter((employeeId) => employeeId !== lead.employee_id);
        const title = `${interview.title} — ${interview.recruitment_candidates.name}`.slice(0, 150);
        await this.prisma.$transaction(async (tx) => {
            await tx.meeting.upsert({
                where: { id: meetingId },
                create: {
                    id: meetingId,
                    title,
                    type: 'TEAM',
                    description: `Interview for ${interview.recruitment_candidates.name} (Round ${interview.round}). Managed by Recruitment ATS.`,
                    startsAt: interview.starts_at,
                    endsAt: interview.ends_at,
                    allDay: false,
                    location: interview.location,
                    videoLink: interview.meeting_url,
                    organizerId: lead.employee_id,
                    recurrence: 'NONE',
                    reminderMinutes: 15,
                    status: this.interviewMeetingStatus(interview.status),
                    attendees: {
                        create: [
                            { employeeId: lead.employee_id, rsvp: 'ACCEPTED' },
                            ...attendeeIds.map((employeeId) => ({ employeeId, rsvp: 'PENDING' })),
                        ],
                    },
                },
                update: {
                    title,
                    startsAt: interview.starts_at,
                    endsAt: interview.ends_at,
                    location: interview.location,
                    videoLink: interview.meeting_url,
                    organizerId: lead.employee_id,
                    status: this.interviewMeetingStatus(interview.status),
                },
            });
            const existingAttendees = await tx.meetingAttendee.findMany({
                where: { meetingId },
                select: { employeeId: true },
            });
            const currentIds = new Set([lead.employee_id, ...attendeeIds]);
            await tx.meetingAttendee.deleteMany({
                where: { meetingId, employeeId: { notIn: [...currentIds] } },
            });
            for (const employeeId of currentIds) {
                if (!existingAttendees.some((attendee) => attendee.employeeId === employeeId)) {
                    await tx.meetingAttendee.create({
                        data: { meetingId, employeeId, rsvp: employeeId === lead.employee_id ? 'ACCEPTED' : 'PENDING' },
                    });
                }
            }
        });
    }
    async createInterview(body) {
        const candidate = await this.prisma.recruitmentCandidate.findUnique({
            where: { id: body.candidateId },
        });
        if (!candidate)
            throw new common_1.NotFoundException('Candidate not found.');
        const panel = Array.isArray(body.panelMembers) ? body.panelMembers.map(String) : [];
        const leadId = body.leadInterviewerId ? String(body.leadInterviewerId) : '';
        if (panel.length === 0)
            throw new common_1.BadRequestException('At least one panel member is required.');
        if (!leadId)
            throw new common_1.BadRequestException('A lead interviewer is required.');
        if (!panel.includes(leadId)) {
            throw new common_1.BadRequestException('Lead interviewer must be part of the panel.');
        }
        if (!body.startsAt || !body.endsAt)
            throw new common_1.BadRequestException('start and end times are required.');
        const startsAt = new Date(body.startsAt);
        const endsAt = new Date(body.endsAt);
        if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
            throw new common_1.BadRequestException('Invalid interview dates.');
        }
        if (endsAt <= startsAt) {
            throw new common_1.BadRequestException('End time must be after start time.');
        }
        const round = Number(body.round) > 0 ? Math.round(Number(body.round)) : 1;
        const interview = await this.prisma.$transaction(async (tx) => {
            const created = await tx.recruitment_interviews.create({
                data: {
                    id: crypto.randomUUID(),
                    candidate_id: body.candidateId,
                    title: body.title ? String(body.title) : `Interview Round ${round}`,
                    round,
                    starts_at: startsAt,
                    ends_at: endsAt,
                    location: body.location ? String(body.location) : null,
                    meeting_url: body.meetingUrl ? String(body.meetingUrl) : null,
                    status: 'Scheduled',
                    updated_at: new Date(),
                },
            });
            await tx.interview_panel_members.createMany({
                data: panel.map((employeeId) => ({
                    id: crypto.randomUUID(),
                    interview_id: created.id,
                    employee_id: employeeId,
                    is_lead: employeeId === leadId,
                })),
            });
            return created;
        });
        this.notify
            .notifyUsers(panel, {
            title: 'Interview scheduled',
            message: `You are on the interview panel for ${candidate.name} (Round ${round}).`,
            type: 'recruitment',
            linkUrl: '/recruitment',
        })
            .catch(() => undefined);
        await this.syncInterviewMeeting(interview.id);
        return this.prisma.recruitment_interviews.findUnique({
            where: { id: interview.id },
            include: {
                interview_panel_members: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
                interview_feedback: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
            },
        });
    }
    async updateInterview(interviewId, body) {
        const interview = await this.prisma.recruitment_interviews.findUnique({
            where: { id: interviewId },
            include: { interview_panel_members: true },
        });
        if (!interview)
            throw new common_1.NotFoundException('Interview not found.');
        if (body.status && !body.startsAt && !body.panelMembers) {
            const allowed = [
                'Scheduled',
                'Confirmed',
                'InProgress',
                'Completed',
                'Cancelled',
                'NoShow',
                'No Show',
                'Rescheduled',
            ];
            if (!allowed.includes(String(body.status))) {
                throw new common_1.BadRequestException(`Invalid interview status "${body.status}".`);
            }
            const statusUpdated = await this.prisma.recruitment_interviews.update({
                where: { id: interviewId },
                data: { status: String(body.status), updated_at: new Date() },
                include: {
                    interview_panel_members: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
                    interview_feedback: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
                },
            });
            await this.syncInterviewMeeting(interviewId);
            return statusUpdated;
        }
        const data = { updated_at: new Date() };
        if (body.title != null)
            data.title = String(body.title);
        if (body.round != null)
            data.round = Math.max(1, Math.round(Number(body.round) || 1));
        if (body.startsAt != null) {
            const startsAt = new Date(body.startsAt);
            if (Number.isNaN(startsAt.getTime()))
                throw new common_1.BadRequestException('Invalid start time.');
            data.starts_at = startsAt;
        }
        if (body.endsAt != null) {
            const endsAt = new Date(body.endsAt);
            if (Number.isNaN(endsAt.getTime()))
                throw new common_1.BadRequestException('Invalid end time.');
            data.ends_at = endsAt;
        }
        if (body.location != null)
            data.location = String(body.location);
        if (body.meetingUrl != null)
            data.meeting_url = String(body.meetingUrl);
        if (body.status != null)
            data.status = String(body.status);
        const updated = await this.prisma.recruitment_interviews.update({
            where: { id: interviewId },
            data,
        });
        if (Array.isArray(body.panelMembers)) {
            const panel = body.panelMembers.map(String);
            const leadId = body.leadInterviewerId ? String(body.leadInterviewerId) : '';
            if (panel.length === 0)
                throw new common_1.BadRequestException('At least one panel member is required.');
            if (leadId && !panel.includes(leadId)) {
                throw new common_1.BadRequestException('Lead interviewer must be part of the panel.');
            }
            await this.prisma.interview_panel_members.deleteMany({ where: { interview_id: interviewId } });
            await this.prisma.interview_panel_members.createMany({
                data: panel.map((employeeId) => ({
                    id: crypto.randomUUID(),
                    interview_id: interviewId,
                    employee_id: employeeId,
                    is_lead: employeeId === leadId,
                })),
            });
        }
        await this.syncInterviewMeeting(interviewId);
        return this.prisma.recruitment_interviews.findUnique({
            where: { id: updated.id },
            include: {
                interview_panel_members: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
                interview_feedback: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
            },
        });
    }
    async submitFeedback(interviewId, body, reviewerId) {
        const interview = await this.prisma.recruitment_interviews.findUnique({
            where: { id: interviewId },
            include: { interview_panel_members: true },
        });
        if (!interview)
            throw new common_1.NotFoundException('Interview not found.');
        const isPanel = interview.interview_panel_members.some((p) => p.employee_id === reviewerId);
        if (!isPanel)
            throw new common_1.ForbiddenException('Only panel members can submit feedback.');
        const overallScore = Number(body.overallScore);
        if (!Number.isFinite(overallScore) || overallScore < 1 || overallScore > 5) {
            throw new common_1.BadRequestException('overallScore must be between 1 and 5.');
        }
        const recommendation = String(body.recommendation || '');
        const ALLOWED_RECOMMENDATIONS = ['StrongHire', 'Hire', 'Maybe', 'NoHire', 'StrongNoHire'];
        if (!ALLOWED_RECOMMENDATIONS.includes(recommendation)) {
            throw new common_1.BadRequestException(`recommendation must be one of ${ALLOWED_RECOMMENDATIONS.join(', ')}.`);
        }
        const scorecard = body.scorecard && Array.isArray(body.scorecard.criteria)
            ? {
                criteria: body.scorecard.criteria.map((c) => ({
                    name: String(c.name || ''),
                    score: Number(c.score) || 0,
                    weight: Number(c.weight) || 1,
                    remarks: c.remarks ? String(c.remarks) : undefined,
                })),
            }
            : null;
        const feedback = await this.prisma.interview_feedback.upsert({
            where: { interview_id_reviewer_id: { interview_id: interviewId, reviewer_id: reviewerId } },
            create: {
                id: crypto.randomUUID(),
                interview_id: interviewId,
                reviewer_id: reviewerId,
                overall_score: Math.round(overallScore),
                recommendation,
                scorecard: scorecard,
                comments: body.comments ? String(body.comments) : null,
            },
            update: {
                overall_score: Math.round(overallScore),
                recommendation,
                scorecard: scorecard,
                comments: body.comments ? String(body.comments) : null,
                submitted_at: new Date(),
            },
            include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } },
        });
        return feedback;
    }
    async selectionDecision(candidateId, body, actorId) {
        const candidate = await this.prisma.recruitmentCandidate.findUnique({ where: { id: candidateId } });
        if (!candidate)
            throw new common_1.NotFoundException('Candidate not found.');
        const decision = String(body.decision || '');
        const reason = String(body.reason || '').trim();
        if (!reason)
            throw new common_1.BadRequestException('A reason is required.');
        if (decision === 'SELECT') {
            const updated = await this.prisma.$transaction(async (tx) => {
                await tx.candidate_stage_history.create({
                    data: {
                        id: crypto.randomUUID(),
                        candidate_id: candidateId,
                        from_stage: candidate.stage,
                        to_stage: 'Selected',
                        changed_by_id: actorId,
                        note: reason,
                    },
                });
                return tx.recruitmentCandidate.update({
                    where: { id: candidateId },
                    data: { stage: 'Selected', recommendation: 'StrongMatch' },
                });
            });
            return updated;
        }
        if (decision === 'REJECT') {
            const updated = await this.prisma.$transaction(async (tx) => {
                await tx.candidate_stage_history.create({
                    data: {
                        id: crypto.randomUUID(),
                        candidate_id: candidateId,
                        from_stage: candidate.stage,
                        to_stage: 'Rejected',
                        changed_by_id: actorId,
                        note: reason,
                    },
                });
                return tx.recruitmentCandidate.update({
                    where: { id: candidateId },
                    data: { stage: 'Rejected', recommendation: 'LowMatch' },
                });
            });
            return updated;
        }
        if (decision === 'HOLD') {
            const updated = await this.prisma.$transaction(async (tx) => {
                await tx.candidate_stage_history.create({
                    data: {
                        id: crypto.randomUUID(),
                        candidate_id: candidateId,
                        from_stage: candidate.stage,
                        to_stage: candidate.stage,
                        changed_by_id: actorId,
                        note: `HOLD: ${reason}`,
                    },
                });
                return tx.recruitmentCandidate.update({ where: { id: candidateId }, data: {} });
            });
            return updated;
        }
        if (decision === 'NEXT_ROUND') {
            const maxRound = await this.prisma.recruitment_interviews.findFirst({
                where: { candidate_id: candidateId },
                orderBy: { round: 'desc' },
                select: { round: true },
            });
            const nextRound = (maxRound?.round ?? 0) + 1;
            const interview = await this.prisma.recruitment_interviews.create({
                data: {
                    id: crypto.randomUUID(),
                    candidate_id: candidateId,
                    title: `Interview Round ${nextRound}`,
                    round: nextRound,
                    starts_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    ends_at: new Date(Date.now() + 25 * 60 * 60 * 1000),
                    status: 'Scheduled',
                    updated_at: new Date(),
                },
            });
            const updated = await this.prisma.recruitmentCandidate.update({
                where: { id: candidateId },
                data: { stage: 'Interview' },
            });
            return { interview, candidate: updated };
        }
        throw new common_1.BadRequestException(`Unknown decision "${decision}".`);
    }
    async getNotes(candidateId) {
        return this.prisma.candidate_notes.findMany({
            where: { candidate_id: candidateId },
            orderBy: { created_at: 'desc' },
            include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } },
        });
    }
    async addNote(candidateId, body, authorId) {
        const candidate = await this.prisma.recruitmentCandidate.findUnique({ where: { id: candidateId } });
        if (!candidate)
            throw new common_1.NotFoundException('Candidate not found.');
        const note = String(body.note || '').trim();
        if (!note)
            throw new common_1.BadRequestException('Note text is required.');
        return this.prisma.candidate_notes.create({
            data: {
                id: crypto.randomUUID(),
                candidate_id: candidateId,
                author_id: authorId,
                note,
            },
            include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } },
        });
    }
    async getTimeline(candidateId) {
        const candidate = await this.prisma.recruitmentCandidate.findUnique({ where: { id: candidateId } });
        if (!candidate)
            throw new common_1.NotFoundException('Candidate not found.');
        const [history, interviews, offers, notes] = await Promise.all([
            this.prisma.candidate_stage_history.findMany({
                where: { candidate_id: candidateId },
                orderBy: { changed_at: 'desc' },
                include: { changedBy: true },
            }),
            this.prisma.recruitment_interviews.findMany({
                where: { candidate_id: candidateId },
                orderBy: { starts_at: 'desc' },
            }),
            this.prisma.recruitment_offers.findMany({
                where: { candidate_id: candidateId },
                orderBy: { created_at: 'desc' },
            }),
            this.prisma.candidate_notes.findMany({
                where: { candidate_id: candidateId },
                orderBy: { created_at: 'desc' },
                include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } },
            }),
        ]);
        const items = [];
        for (const h of history) {
            items.push({
                id: h.id,
                title: `Stage moved to ${h.to_stage}`,
                timestamp: h.changed_at.toISOString(),
                description: h.note || undefined,
                authorName: h.changedBy ? h.changedBy.name : undefined,
            });
        }
        for (const intv of interviews) {
            items.push({
                id: intv.id,
                title: `${intv.title} (${intv.status})`,
                timestamp: intv.starts_at.toISOString(),
                description: intv.location || intv.meeting_url || undefined,
            });
        }
        for (const offer of offers) {
            items.push({
                id: offer.id,
                title: `Offer ${offer.status} — ${offer.offered_title}`,
                timestamp: offer.created_at.toISOString(),
                description: offer.offered_ctc ? (0, offer_documents_1.formatIndianCurrency)(Number(offer.offered_ctc), offer.currency) : undefined,
            });
        }
        for (const n of notes) {
            items.push({
                id: n.id,
                title: 'Note added',
                timestamp: n.created_at.toISOString(),
                description: n.note,
                authorName: n.employees?.name,
            });
        }
        items.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
        return items;
    }
    async getOffers(candidateId, actorId) {
        const offers = await this.prisma.recruitment_offers.findMany({
            where: candidateId ? { candidate_id: candidateId } : {},
            orderBy: [{ version: 'desc' }, { created_at: 'desc' }],
            include: {
                recruitment_offer_approvals: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
                document_templates: true,
            },
        });
        return offers.map((offer) => ({
            ...offer,
            approvalSummary: this.buildOfferApprovalSummary(offer, actorId),
        }));
    }
    buildOfferApprovalSummary(offer, actorId) {
        const steps = offer.recruitment_offer_approvals || [];
        const completedLevels = steps.filter((s) => s.status === 'Approved').length;
        const myStep = actorId ? steps.find((s) => s.approver_id === actorId) : undefined;
        return {
            completedLevels,
            totalLevels: steps.length,
            canCurrentUserApprove: offer.status === 'PendingApproval' && !!myStep && myStep.status === 'Pending',
        };
    }
    buildSnapshot(offer) {
        const compensation = (0, offer_documents_1.calculateOfferCompensation)(offer.offeredCtc, offer.variablePayAnnual, offer.joiningBonus, offer.currency);
        return { compensation };
    }
    parseSnapshot(offer) {
        if (!offer.content_snapshot)
            return {};
        try {
            return JSON.parse(offer.content_snapshot);
        }
        catch {
            return {};
        }
    }
    async createOffer(body) {
        const candidate = await this.prisma.recruitmentCandidate.findUnique({
            where: { id: body.candidateId },
        });
        if (!candidate)
            throw new common_1.NotFoundException('Candidate not found.');
        if (candidate.stage !== 'Selected') {
            throw new common_1.BadRequestException(`Candidate must be in "Selected" stage before an offer can be created (current: "${candidate.stage}").`);
        }
        const activeOffer = await this.prisma.recruitment_offers.findFirst({
            where: { candidate_id: candidate.id, status: { in: ACTIVE_OFFER_STATUSES } },
        });
        if (activeOffer) {
            throw new common_1.BadRequestException('Candidate already has an active offer.');
        }
        const offeredCtc = Number(body.offeredCtc);
        if (!Number.isFinite(offeredCtc) || offeredCtc <= 0) {
            throw new common_1.BadRequestException('offeredCtc must be a positive number.');
        }
        const currency = body.currency || 'INR';
        const variablePayAnnual = Number(body.variablePayAnnual) > 0 ? Number(body.variablePayAnnual) : 0;
        const joiningBonus = Number(body.joiningBonus) > 0 ? Number(body.joiningBonus) : 0;
        const snapshot = this.buildSnapshot({ offeredCtc, currency, variablePayAnnual, joiningBonus });
        const offer = await this.prisma.recruitment_offers.create({
            data: {
                id: crypto.randomUUID(),
                candidate_id: candidate.id,
                status: 'Draft',
                version: 1,
                offered_title: String(body.offeredTitle || ''),
                offered_ctc: offeredCtc,
                currency,
                proposed_join_date: body.proposedJoinDate ? new Date(body.proposedJoinDate) : null,
                expires_at: body.expiresAt ? new Date(body.expiresAt) : null,
                content_snapshot: JSON.stringify(snapshot),
                updated_at: new Date(),
            },
            include: {
                recruitment_offer_approvals: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
                document_templates: true,
            },
        });
        return offer;
    }
    async updateOffer(offerId, body) {
        const offer = await this.prisma.recruitment_offers.findUnique({ where: { id: offerId } });
        if (!offer)
            throw new common_1.NotFoundException('Offer not found.');
        if (['Accepted', 'Declined', 'Expired', 'Withdrawn'].includes(offer.status)) {
            throw new common_1.BadRequestException(`Offer is already ${offer.status} and can no longer be edited.`);
        }
        const offeredCtc = body.offeredCtc != null ? Number(body.offeredCtc) : Number(offer.offered_ctc);
        const currency = body.currency || offer.currency;
        const prevSnapshot = this.parseSnapshot(offer);
        const variablePayAnnual = body.variablePayAnnual != null
            ? Number(body.variablePayAnnual) > 0
                ? Number(body.variablePayAnnual)
                : 0
            : Number(prevSnapshot?.compensation?.variablePayAnnual || 0);
        const joiningBonus = body.joiningBonus != null
            ? Number(body.joiningBonus) > 0
                ? Number(body.joiningBonus)
                : 0
            : Number(prevSnapshot?.compensation?.joiningBonus || 0);
        const snapshot = this.buildSnapshot({ offeredCtc, currency, variablePayAnnual, joiningBonus });
        if (prevSnapshot.declineReason)
            snapshot.declineReason = prevSnapshot.declineReason;
        if (Array.isArray(prevSnapshot.documents))
            snapshot.documents = prevSnapshot.documents;
        const maxVersion = await this.prisma.recruitment_offers.findFirst({
            where: { candidate_id: offer.candidate_id },
            orderBy: { version: 'desc' },
            select: { version: true },
        });
        const nextVersion = Math.max(offer.version, (maxVersion?.version ?? 0)) + (offer.version === (maxVersion?.version ?? 0) ? 1 : 0);
        const updated = await this.prisma.recruitment_offers.update({
            where: { id: offerId },
            data: {
                offered_title: body.offeredTitle != null ? String(body.offeredTitle) : offer.offered_title,
                offered_ctc: offeredCtc,
                currency,
                proposed_join_date: body.proposedJoinDate !== undefined
                    ? body.proposedJoinDate
                        ? new Date(body.proposedJoinDate)
                        : null
                    : offer.proposed_join_date,
                expires_at: body.expiresAt !== undefined
                    ? body.expiresAt
                        ? new Date(body.expiresAt)
                        : null
                    : offer.expires_at,
                content_snapshot: JSON.stringify(snapshot),
                version: nextVersion,
                updated_at: new Date(),
            },
            include: {
                recruitment_offer_approvals: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
                document_templates: true,
            },
        });
        return updated;
    }
    async submitOfferForApproval(offerId, body) {
        const offer = await this.prisma.recruitment_offers.findUnique({
            where: { id: offerId },
            include: { recruitment_candidates: true },
        });
        if (!offer)
            throw new common_1.NotFoundException('Offer not found.');
        if (offer.status !== 'Draft') {
            throw new common_1.BadRequestException(`Offer is already ${offer.status}.`);
        }
        const candidate = offer.recruitment_candidates;
        const job = await this.prisma.recruitmentJob.findUnique({ where: { id: candidate.jobId } });
        const hiringManagerId = job?.hiring_manager_id || (await this.resolveFallbackApproverId());
        if (!hiringManagerId) {
            throw new common_1.BadRequestException('Job has no hiring manager to act as L1 approver.');
        }
        const admin = await this.prisma.employee.findFirst({
            where: { userRole: 'admin', id: { not: hiringManagerId } },
        });
        if (!admin) {
            throw new common_1.BadRequestException('No distinct admin approver available.');
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            await tx.recruitment_offer_approvals.deleteMany({ where: { offer_id: offerId } });
            await tx.recruitment_offer_approvals.create({
                data: {
                    id: crypto.randomUUID(),
                    offer_id: offerId,
                    sequence: 1,
                    approver_id: hiringManagerId,
                    status: 'Pending',
                    note: body.note || null,
                },
            });
            await tx.recruitment_offer_approvals.create({
                data: {
                    id: crypto.randomUUID(),
                    offer_id: offerId,
                    sequence: 2,
                    approver_id: admin.id,
                    status: 'Pending',
                },
            });
            return tx.recruitment_offers.update({
                where: { id: offerId },
                data: { status: 'PendingApproval', updated_at: new Date() },
                include: {
                    recruitment_offer_approvals: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
                    document_templates: true,
                },
            });
        });
        this.notify
            .notifyUser({
            userId: hiringManagerId,
            title: 'Offer approval requested',
            message: `Offer for ${candidate.name} is awaiting your L1 approval.`,
            type: 'recruitment',
            linkUrl: '/recruitment',
        })
            .catch(() => undefined);
        return updated;
    }
    async offerApprovalAction(offerId, body, actorId) {
        const offer = await this.prisma.recruitment_offers.findUnique({
            where: { id: offerId },
            include: {
                recruitment_offer_approvals: { orderBy: { sequence: 'asc' } },
                recruitment_candidates: true,
            },
        });
        if (!offer)
            throw new common_1.NotFoundException('Offer not found.');
        if (offer.status !== 'PendingApproval') {
            throw new common_1.BadRequestException('Offer is not pending approval.');
        }
        const action = String(body.action);
        const myStep = offer.recruitment_offer_approvals.find((a) => a.approver_id === actorId);
        if (!myStep)
            throw new common_1.ForbiddenException('You are not an approver for this offer.');
        if (myStep.status !== 'Pending') {
            throw new common_1.BadRequestException('You have already acted on this approval.');
        }
        if (action === 'APPROVE') {
            const updated = await this.prisma.$transaction(async (tx) => {
                await tx.recruitment_offer_approvals.update({
                    where: { id: myStep.id },
                    data: { status: 'Approved', note: body.comment || null, acted_at: new Date() },
                });
                const steps = await tx.recruitment_offer_approvals.findMany({
                    where: { offer_id: offerId },
                });
                const allApproved = steps.every((s) => s.status === 'Approved');
                return tx.recruitment_offers.update({
                    where: { id: offerId },
                    data: { status: allApproved ? 'Approved' : offer.status, updated_at: new Date() },
                    include: {
                        recruitment_offer_approvals: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
                        document_templates: true,
                    },
                });
            });
            return updated;
        }
        if (action === 'REJECT' || action === 'REQUEST_CHANGES') {
            const status = action === 'REJECT' ? 'Rejected' : 'Cancelled';
            const updated = await this.prisma.$transaction(async (tx) => {
                await tx.recruitment_offer_approvals.update({
                    where: { id: myStep.id },
                    data: { status, note: body.comment || null, acted_at: new Date() },
                });
                return tx.recruitment_offers.update({
                    where: { id: offerId },
                    data: { status: 'Draft', updated_at: new Date() },
                    include: {
                        recruitment_offer_approvals: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
                        document_templates: true,
                    },
                });
            });
            return updated;
        }
        throw new common_1.BadRequestException(`Unknown approval action "${action}".`);
    }
    async resolveTemplate(documentType, templateId) {
        if (templateId) {
            const dbTemplate = await this.prisma.documentTemplate.findUnique({ where: { id: templateId } });
            if (dbTemplate && dbTemplate.isActive) {
                return { id: dbTemplate.id, name: dbTemplate.name, type: dbTemplate.type, content: dbTemplate.content, source: 'db' };
            }
            const builtin = offer_documents_1.BUILTIN_TEMPLATES.find((t) => t.id === templateId);
            if (builtin)
                return { ...builtin, source: 'builtin' };
            throw new common_1.NotFoundException('Template not found.');
        }
        const dbTemplate = await this.prisma.documentTemplate.findFirst({
            where: { type: documentType, isActive: true },
            orderBy: { version: 'desc' },
        });
        if (dbTemplate) {
            return { id: dbTemplate.id, name: dbTemplate.name, type: dbTemplate.type, content: dbTemplate.content, source: 'db' };
        }
        const builtin = offer_documents_1.BUILTIN_TEMPLATES.find((t) => t.type === documentType);
        if (builtin)
            return { ...builtin, source: 'builtin' };
        throw new common_1.BadRequestException(`No template available for document type "${documentType}".`);
    }
    async listOfferDocuments(offerId) {
        const offer = await this.prisma.recruitment_offers.findUnique({
            where: { id: offerId },
            include: { recruitment_candidates: { include: { job: true } } },
        });
        if (!offer)
            throw new common_1.NotFoundException('Offer not found.');
        const dbTemplates = await this.prisma.documentTemplate.findMany({
            where: { isActive: true, type: { in: ['Offer_Letter', 'Appointment_Letter', 'NDA'] } },
            orderBy: { version: 'desc' },
        });
        const templates = [
            ...dbTemplates.map((t) => ({ id: t.id, name: t.name, type: t.type, source: 'db' })),
            ...offer_documents_1.BUILTIN_TEMPLATES.map((t) => ({ id: t.id, name: t.name, type: t.type, source: 'builtin' })),
        ];
        const snapshot = this.parseSnapshot(offer);
        const documents = Array.isArray(snapshot.documents) ? snapshot.documents : [];
        return { templates, documents };
    }
    async renderOfferDocument(offer, candidate, job, documentType, templateId) {
        const template = await this.resolveTemplate(documentType, templateId);
        const snapshot = this.parseSnapshot(offer);
        const comp = snapshot.compensation ||
            (0, offer_documents_1.calculateOfferCompensation)(Number(offer.offered_ctc) || 0, 0, 0, offer.currency);
        const tableRows = (0, offer_documents_1.compensationTableRows)(comp);
        const tableHtml = `<table>${tableRows.map((r) => `<tr><td>${r}</td></tr>`).join('')}</table>`;
        const variables = {
            'candidate.fullName': candidate.name,
            'candidate.email': candidate.email,
            'offer.offeredTitle': offer.offered_title,
            'offer.proposedJoinDate': offer.proposed_join_date
                ? new Date(offer.proposed_join_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : 'To be confirmed',
            'offer.expiresAt': offer.expires_at
                ? new Date(offer.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : '30 days from issuance',
            'offer.offeredCtc': (0, offer_documents_1.formatIndianCurrency)(Number(offer.offered_ctc) || 0, offer.currency),
            'job.title': job?.title || '',
            'job.department': job?.department || '',
            'job.location': job?.location || '',
            'compensation.tableHtml': tableHtml,
        };
        const html = (0, offer_documents_1.renderTemplate)(template.content, variables);
        const documentTitle = template.name ||
            (documentType === 'Offer_Letter' ? 'Offer Letter' : documentType === 'Appointment_Letter' ? 'Appointment Letter' : 'Non-Disclosure Agreement');
        return { template, html, documentTitle, comp };
    }
    async previewOfferDocument(offerId, body) {
        const offer = await this.prisma.recruitment_offers.findUnique({
            where: { id: offerId },
            include: { recruitment_candidates: { include: { job: true } } },
        });
        if (!offer)
            throw new common_1.NotFoundException('Offer not found.');
        const documentType = String(body.documentType || '');
        if (!offer_documents_1.DOC_TYPES.includes(documentType)) {
            throw new common_1.BadRequestException(`documentType must be one of ${offer_documents_1.DOC_TYPES.join(', ')}.`);
        }
        const { html, documentTitle } = await this.renderOfferDocument(offer, offer.recruitment_candidates, offer.recruitment_candidates.job, documentType, body.templateId);
        return { preview: { html, documentTitle } };
    }
    async generateOfferDocument(offerId, body, generatedBy) {
        const offer = await this.prisma.recruitment_offers.findUnique({
            where: { id: offerId },
            include: { recruitment_candidates: { include: { job: true } } },
        });
        if (!offer)
            throw new common_1.NotFoundException('Offer not found.');
        if (!['Approved', 'Sent'].includes(offer.status)) {
            throw new common_1.BadRequestException(`Documents can only be generated for Approved or Sent offers (current: "${offer.status}").`);
        }
        const documentType = String(body.documentType || '');
        if (!offer_documents_1.DOC_TYPES.includes(documentType)) {
            throw new common_1.BadRequestException(`documentType must be one of ${offer_documents_1.DOC_TYPES.join(', ')}.`);
        }
        const snapshot = this.parseSnapshot(offer);
        const documents = Array.isArray(snapshot.documents) ? snapshot.documents : [];
        const existing = documents.find((d) => d.documentType === documentType);
        if (existing) {
            return {
                document: existing,
                autoSentToCandidate: false,
                portalUrl: null,
                portalUrlExpiresAt: null,
            };
        }
        const { template, html, documentTitle, comp } = await this.renderOfferDocument(offer, offer.recruitment_candidates, offer.recruitment_candidates.job, documentType, body.templateId);
        const pdf = (0, offer_documents_1.buildOfferLetterPdf)(documentTitle, html, comp);
        const storageKey = `offer-${offer.id}-${documentType.toLowerCase()}-v${offer.version}-${Date.now().toString(36)}.pdf`;
        await this.prisma.documentBlob.create({
            data: {
                id: storageKey,
                category: 'offers',
                mime_type: 'application/pdf',
                size_bytes: pdf.length,
                data: pdf,
            },
        });
        const docMeta = {
            id: storageKey,
            templateId: template.id,
            templateName: template.name,
            documentType,
            offerVersion: offer.version,
            generatedAt: new Date().toISOString(),
            generatedByName: generatedBy?.name || 'System',
            generatedById: generatedBy?.id || null,
            fileName: `${documentTitle.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${offer.id.slice(0, 8)}.pdf`,
            fileSize: pdf.length,
            fileSizeBytes: pdf.length,
            mimeType: 'application/pdf',
        };
        snapshot.documents = [...documents, docMeta];
        await this.prisma.recruitment_offers.update({
            where: { id: offerId },
            data: { content_snapshot: JSON.stringify(snapshot), updated_at: new Date() },
        });
        return {
            document: docMeta,
            autoSentToCandidate: false,
            portalUrl: null,
            portalUrlExpiresAt: null,
        };
    }
    async downloadOfferDocument(offerId, documentId) {
        const offer = await this.prisma.recruitment_offers.findUnique({ where: { id: offerId } });
        if (!offer)
            throw new common_1.NotFoundException('Offer not found.');
        const snapshot = this.parseSnapshot(offer);
        const documents = Array.isArray(snapshot.documents) ? snapshot.documents : [];
        const meta = documents.find((d) => d.id === documentId);
        if (!meta)
            throw new common_1.NotFoundException('Document not found for this offer.');
        const blob = await this.prisma.documentBlob.findUnique({ where: { id: documentId } });
        if (!blob)
            throw new common_1.NotFoundException('Document file not found.');
        return {
            buffer: Buffer.from(blob.data),
            fileName: meta.fileName || `${documentId}.pdf`,
            mimeType: blob.mime_type || 'application/pdf',
        };
    }
    async sendOffer(offerId, candidatePortalUrl) {
        const offer = await this.prisma.recruitment_offers.findUnique({
            where: { id: offerId },
            include: { recruitment_candidates: true },
        });
        if (!offer)
            throw new common_1.NotFoundException('Offer not found.');
        if (!['Approved', 'Sent'].includes(offer.status)) {
            throw new common_1.BadRequestException(`Offer must be Approved before sending (current: "${offer.status}").`);
        }
        const { url, expiresAt } = candidatePortalUrl(offer.candidate_id);
        const updated = await this.prisma.recruitment_offers.update({
            where: { id: offerId },
            data: { status: 'Sent', sent_at: new Date(), updated_at: new Date() },
            include: {
                recruitment_offer_approvals: { include: { employees: { select: EMPLOYEE_SUMMARY_SELECT } } },
                document_templates: true,
            },
        });
        return {
            offer: updated,
            message: 'Offer sent to candidate portal.',
            portalUrl: url,
            portalUrlExpiresAt: expiresAt.toISOString(),
        };
    }
};
exports.RecruitmentService = RecruitmentService;
exports.RecruitmentService = RecruitmentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notify_service_1.NotifyService])
], RecruitmentService);
//# sourceMappingURL=recruitment.service.js.map