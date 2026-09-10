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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecruitmentController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const multer_1 = require("@nestjs/platform-express/multer");
const multer_2 = require("multer");
const node_path_1 = require("node:path");
const recruitment_service_1 = require("./recruitment.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const ALLOWED_RESUME_MIMES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/rtf',
]);
const MAX_RESUME_BYTES = 10 * 1024 * 1024;
const resumeStorage = (0, multer_2.diskStorage)({
    destination: './uploads/resumes',
    filename: (_req, file, cb) => {
        const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        cb(null, `${unique}${(0, node_path_1.extname)(file.originalname).toLowerCase()}`);
    },
});
let RecruitmentController = class RecruitmentController {
    recruitmentService;
    constructor(recruitmentService) {
        this.recruitmentService = recruitmentService;
    }
    async getDashboard(jobId, stage) {
        const { jobs } = await this.recruitmentService.findAll();
        const candidates = await this.recruitmentService.getCandidates(jobId, stage);
        return { success: true, data: { jobs, candidates } };
    }
    getMyApprovals(user) {
        return this.recruitmentService.getMyApprovals(user.id);
    }
    getJobs() {
        return this.recruitmentService.findAll();
    }
    async createJob(body) {
        const job = await this.recruitmentService.createJob(body);
        return { success: true, data: job };
    }
    updateJob(id, body) {
        return this.recruitmentService.updateJob(id, body);
    }
    jobApprovalAction(id, body, user) {
        return this.recruitmentService.jobApprovalAction(id, body, user.id);
    }
    async rediscover(id, minScore) {
        const result = await this.recruitmentService.rediscover(id, minScore ? Number(minScore) : undefined);
        return { success: true, ...result };
    }
    getCandidates(jobId, stage) {
        return this.recruitmentService.getCandidates(jobId, stage);
    }
    createCandidate(body, user) {
        return this.recruitmentService.createCandidate({ ...body, createdById: user.id });
    }
    getCandidate(id) {
        return this.recruitmentService.getCandidate(id);
    }
    updateCandidate(id, body) {
        return this.recruitmentService.updateCandidate(id, body);
    }
    updateStage(id, body, user) {
        return this.recruitmentService.updateCandidateStage(id, body.stage, user.id, body.note);
    }
    selectionDecision(id, body, user) {
        return this.recruitmentService.selectionDecision(id, body, user.id);
    }
    async uploadResume(id, file, user = {}) {
        if (!file)
            throw new common_1.BadRequestException('A resume file is required (FormData field "file").');
        if (!ALLOWED_RESUME_MIMES.has(file.mimetype)) {
            throw new common_1.BadRequestException('Only PDF, DOC, DOCX, RTF and TXT resumes are supported.');
        }
        if (file.size > MAX_RESUME_BYTES) {
            throw new common_1.BadRequestException('Resume must be 10 MB or smaller.');
        }
        const result = await this.recruitmentService.uploadResume(id, file, user.id);
        return { success: true, ...result };
    }
    async downloadResume(id, res) {
        const { buffer, fileName, mimeType } = await this.recruitmentService.getResumeFile(id);
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Length', String(buffer.length));
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.end(buffer);
    }
    async reparseResume(id) {
        const result = await this.recruitmentService.reparseResume(id);
        return { success: true, ...result };
    }
    addToJob(id, body) {
        return this.recruitmentService.addToJob(id, body.targetJobId);
    }
    async parseDraft(file) {
        if (!file)
            throw new common_1.BadRequestException('A resume file is required (FormData field "file").');
        const result = await this.recruitmentService.parseDraft(file);
        return { success: true, ...result };
    }
    async createFromResume(file, fieldsJson, user = {}) {
        if (!file)
            throw new common_1.BadRequestException('A resume file is required (FormData field "file").');
        const result = await this.recruitmentService.createFromResume(file, fieldsJson || '{}', user.id);
        return { success: true, ...result };
    }
    getInterviews(candidateId) {
        return this.recruitmentService.getInterviews(candidateId || '');
    }
    createInterview(body) {
        return this.recruitmentService.createInterview(body);
    }
    updateInterview(id, body) {
        return this.recruitmentService.updateInterview(id, body);
    }
    submitFeedback(id, body, user) {
        return this.recruitmentService.submitFeedback(id, body, user.id);
    }
    async getNotes(id) {
        const notes = await this.recruitmentService.getNotes(id);
        return { success: true, data: notes };
    }
    async addNote(id, body, user) {
        const note = await this.recruitmentService.addNote(id, body, user.id);
        return { success: true, data: note };
    }
    async getTimeline(id) {
        const timeline = await this.recruitmentService.getTimeline(id);
        return { success: true, data: timeline };
    }
    async getOffers(candidateId, user) {
        const offers = await this.recruitmentService.getOffers(candidateId || '', user?.id);
        return { success: true, data: offers };
    }
    createOffer(body) {
        return this.recruitmentService.createOffer(body);
    }
    updateOffer(id, body) {
        return this.recruitmentService.updateOffer(id, body);
    }
    submitOfferForApproval(id, body) {
        return this.recruitmentService.submitOfferForApproval(id, body);
    }
    offerApprovalAction(id, body, user) {
        return this.recruitmentService.offerApprovalAction(id, body, user.id);
    }
    async listOfferDocuments(id) {
        const result = await this.recruitmentService.listOfferDocuments(id);
        return { success: true, ...result };
    }
    async previewOfferDocument(id, body) {
        const result = await this.recruitmentService.previewOfferDocument(id, body);
        return { success: true, ...result };
    }
    async generateOfferDocument(id, body, user) {
        const result = await this.recruitmentService.generateOfferDocument(id, body, user);
        return { success: true, ...result };
    }
    async downloadOfferDocument(id, docId, res) {
        const { buffer, fileName, mimeType } = await this.recruitmentService.downloadOfferDocument(id, docId);
        res.setHeader('Content-Type', mimeType || 'application/pdf');
        res.setHeader('Content-Length', String(buffer.length));
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.end(buffer);
    }
    async sendOffer(id) {
        const portalBase = process.env.FRONTEND_URL || 'http://localhost:3000';
        const result = await this.recruitmentService.sendOffer(id, (candidateId) => {
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            return {
                url: `${portalBase}/recruitment?candidateId=${encodeURIComponent(candidateId)}`,
                expiresAt,
            };
        });
        return { success: true, ...result };
    }
};
exports.RecruitmentController = RecruitmentController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('jobId')),
    __param(1, (0, common_1.Query)('stage')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('my-approvals'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "getMyApprovals", null);
__decorate([
    (0, common_1.Get)('jobs'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "getJobs", null);
__decorate([
    (0, common_1.Post)('jobs'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "createJob", null);
__decorate([
    (0, common_1.Patch)('jobs/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "updateJob", null);
__decorate([
    (0, common_1.Post)('jobs/:id/approvals'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "jobApprovalAction", null);
__decorate([
    (0, common_1.Get)('jobs/:id/rediscover'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('minScore')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "rediscover", null);
__decorate([
    (0, common_1.Get)('candidates'),
    __param(0, (0, common_1.Query)('jobId')),
    __param(1, (0, common_1.Query)('stage')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "getCandidates", null);
__decorate([
    (0, common_1.Post)('candidates'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "createCandidate", null);
__decorate([
    (0, common_1.Get)('candidates/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "getCandidate", null);
__decorate([
    (0, common_1.Patch)('candidates/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "updateCandidate", null);
__decorate([
    (0, common_1.Post)('candidates/:id/stage'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "updateStage", null);
__decorate([
    (0, common_1.Post)('candidates/:id/selection'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "selectionDecision", null);
__decorate([
    (0, common_1.Post)('candidates/:id/resume'),
    (0, common_1.UseInterceptors)((0, multer_1.FileInterceptor)('file', { storage: resumeStorage })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "uploadResume", null);
__decorate([
    (0, common_1.Get)('candidates/:id/resume'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "downloadResume", null);
__decorate([
    (0, common_1.Post)('candidates/:id/parse-resume'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "reparseResume", null);
__decorate([
    (0, common_1.Post)('candidates/:id/add-to-job'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "addToJob", null);
__decorate([
    (0, common_1.Post)('candidates/parse-draft'),
    (0, common_1.UseInterceptors)((0, multer_1.FileInterceptor)('file', { storage: resumeStorage })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "parseDraft", null);
__decorate([
    (0, common_1.Post)('candidates/from-resume'),
    (0, common_1.UseInterceptors)((0, multer_1.FileInterceptor)('file', { storage: resumeStorage })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('fields')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "createFromResume", null);
__decorate([
    (0, common_1.Get)('interviews'),
    __param(0, (0, common_1.Query)('candidateId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "getInterviews", null);
__decorate([
    (0, common_1.Post)('interviews'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "createInterview", null);
__decorate([
    (0, common_1.Patch)('interviews/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "updateInterview", null);
__decorate([
    (0, common_1.Post)('interviews/:id/feedback'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "submitFeedback", null);
__decorate([
    (0, common_1.Get)('candidates/:id/notes'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "getNotes", null);
__decorate([
    (0, common_1.Post)('candidates/:id/notes'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "addNote", null);
__decorate([
    (0, common_1.Get)('candidates/:id/timeline'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "getTimeline", null);
__decorate([
    (0, common_1.Get)('offers'),
    __param(0, (0, common_1.Query)('candidateId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "getOffers", null);
__decorate([
    (0, common_1.Post)('offers'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "createOffer", null);
__decorate([
    (0, common_1.Patch)('offers/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "updateOffer", null);
__decorate([
    (0, common_1.Post)('offers/:id/submit-approval'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "submitOfferForApproval", null);
__decorate([
    (0, common_1.Post)('offers/:id/approvals'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "offerApprovalAction", null);
__decorate([
    (0, common_1.Get)('offers/:id/documents'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "listOfferDocuments", null);
__decorate([
    (0, common_1.Post)('offers/:id/documents/preview'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "previewOfferDocument", null);
__decorate([
    (0, common_1.Post)('offers/:id/documents'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "generateOfferDocument", null);
__decorate([
    (0, common_1.Get)('offers/:id/documents/:docId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('docId')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "downloadOfferDocument", null);
__decorate([
    (0, common_1.Post)('offers/:id/send'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "sendOffer", null);
exports.RecruitmentController = RecruitmentController = __decorate([
    (0, common_1.Controller)('recruitment'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [recruitment_service_1.RecruitmentService])
], RecruitmentController);
//# sourceMappingURL=recruitment.controller.js.map