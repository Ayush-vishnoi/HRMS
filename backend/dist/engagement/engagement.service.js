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
exports.EngagementService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notify_service_1 = require("../common/notifications/notify.service");
let EngagementService = class EngagementService {
    prisma;
    notify;
    constructor(prisma, notify) {
        this.prisma = prisma;
        this.notify = notify;
    }
    async findAll() {
        const [surveys, feedPosts, recognitions, suggestions] = await Promise.all([
            this.prisma.engagementSurvey.findMany({ orderBy: { createdAt: 'desc' }, include: { responses: true } }),
            this.prisma.engagementFeedPost.findMany({ orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }] }),
            this.prisma.employeeRecognition.findMany({ orderBy: { createdAt: 'desc' } }),
            this.prisma.employeeSuggestion.findMany({ orderBy: [{ upvotesCount: 'desc' }, { createdAt: 'desc' }] }),
        ]);
        return { surveys, feedPosts, recognitions, suggestions };
    }
    async handleAction(body) {
        const { action } = body;
        if (action === 'kudos') {
            const created = await this.prisma.employeeRecognition.create({
                data: {
                    giverId: body.giverId, giverName: body.giverName || 'Colleague',
                    receiverId: body.receiverId, receiverName: body.receiverName || 'Team Member',
                    recognitionType: body.recognitionType || 'Kudos', badgeIcon: body.badgeIcon || '⭐',
                    message: body.message, isPublic: true, likesCount: 1,
                },
            });
            if (body.receiverId && body.receiverId !== body.giverId) {
                await this.notify.notifyUser({
                    userId: body.receiverId,
                    title: `You received ${body.recognitionType || 'Kudos'} ${body.badgeIcon || '⭐'}`,
                    message: `${body.giverName || 'A colleague'} recognized you: "${body.message}"`,
                    type: 'Celebration',
                    linkUrl: '/engagement',
                });
            }
            return created;
        }
        if (action === 'post') {
            return this.prisma.engagementFeedPost.create({
                data: {
                    authorId: body.authorId, authorName: body.authorName || 'HR Admin',
                    authorAvatar: body.authorAvatar || null, postType: body.postType || 'General',
                    title: body.title, content: body.content, mediaUrl: body.mediaUrl || null,
                    likesCount: 0, commentsCount: 0,
                },
            });
        }
        if (action === 'suggestion') {
            const created = await this.prisma.employeeSuggestion.create({
                data: {
                    employeeId: body.employeeId || null, employeeName: body.employeeName || 'Anonymous',
                    category: body.category || 'Workplace', title: body.title,
                    description: body.description, status: 'Submitted', upvotesCount: 1,
                },
            });
            await this.notify.notifyAdmins({
                title: 'New suggestion submitted',
                message: `${body.employeeName || 'Anonymous'} suggested: "${body.title}" (${body.category || 'Workplace'}).`,
                type: 'Announcement',
                linkUrl: '/engagement',
            });
            return created;
        }
        if (action === 'upvote_suggestion') {
            return this.prisma.employeeSuggestion.update({
                where: { id: body.id },
                data: { upvotesCount: { increment: 1 } },
            });
        }
        if (action === 'survey_response') {
            const resp = await this.prisma.surveyResponse.create({
                data: {
                    surveyId: body.surveyId, respondentId: body.respondentId || null,
                    npsScore: Number(body.npsScore) || 9, feedback: body.feedback || '',
                    answersJson: body.answersJson || '[]',
                },
            });
            await this.prisma.engagementSurvey.update({ where: { id: body.surveyId }, data: { responseCount: { increment: 1 } } });
            return resp;
        }
        throw new Error('Invalid engagement action');
    }
};
exports.EngagementService = EngagementService;
exports.EngagementService = EngagementService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, notify_service_1.NotifyService])
], EngagementService);
//# sourceMappingURL=engagement.service.js.map