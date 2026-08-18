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
const uuid_1 = require("uuid");
let RecruitmentService = class RecruitmentService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        const [jobs, candidates, interviews, offers] = await Promise.all([
            this.prisma.recruitmentJob.findMany({ orderBy: { createdAt: 'desc' } }),
            this.prisma.recruitmentCandidate.findMany({ orderBy: { createdAt: 'desc' }, include: { job: { select: { id: true, title: true, department: true } } } }),
            this.prisma.recruitment_interviews.findMany({ orderBy: { starts_at: 'desc' }, include: { recruitment_candidates: { select: { id: true, name: true } } } }),
            this.prisma.recruitment_offers.findMany({ orderBy: { created_at: 'desc' }, include: { recruitment_candidates: { select: { id: true, name: true } } } }),
        ]);
        return { jobs, candidates, interviews, offers };
    }
    async getJobs(status) {
        return this.prisma.recruitmentJob.findMany({ where: status ? { status: status } : {}, orderBy: { createdAt: 'desc' } });
    }
    async getCandidates(jobId, stage) {
        return this.prisma.recruitmentCandidate.findMany({
            where: { ...(jobId ? { jobId } : {}), ...(stage ? { stage: stage } : {}) },
            orderBy: { createdAt: 'desc' },
            include: { job: { select: { id: true, title: true, department: true } } },
        });
    }
    async updateCandidateStage(id, stage, changedById, note) {
        const candidate = await this.prisma.recruitmentCandidate.findUnique({ where: { id }, select: { stage: true } });
        await this.prisma.candidate_stage_history.create({ data: { candidate_id: id, from_stage: candidate?.stage, to_stage: stage, changed_by_id: changedById, note: note || null } });
        return this.prisma.recruitmentCandidate.update({ where: { id }, data: { stage } });
    }
    async createJob(data) {
        return this.prisma.recruitmentJob.create({
            data: { id: (0, uuid_1.v4)(), title: data.title, department: data.department, location: data.location, employmentType: data.employmentType || 'FullTime', openings: data.openings || 1, status: data.status || 'Open', postedOn: new Date().toISOString().split('T')[0], description: data.description, requirements: data.requirements || [], responsibilities: data.responsibilities || [] },
        });
    }
};
exports.RecruitmentService = RecruitmentService;
exports.RecruitmentService = RecruitmentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RecruitmentService);
//# sourceMappingURL=recruitment.service.js.map