import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EngagementService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const [surveys, feedPosts, recognitions, suggestions] = await Promise.all([
      this.prisma.engagementSurvey.findMany({ orderBy: { createdAt: 'desc' }, include: { responses: true } }),
      this.prisma.engagementFeedPost.findMany({ orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }] }),
      this.prisma.employeeRecognition.findMany({ orderBy: { createdAt: 'desc' } }),
      this.prisma.employeeSuggestion.findMany({ orderBy: [{ upvotesCount: 'desc' }, { createdAt: 'desc' }] }),
    ]);
    return { surveys, feedPosts, recognitions, suggestions };
  }

  async handleAction(body: any) {
    const { action } = body;

    if (action === 'kudos') {
      return this.prisma.employeeRecognition.create({
        data: {
          giverId: body.giverId, giverName: body.giverName || 'Colleague',
          receiverId: body.receiverId, receiverName: body.receiverName || 'Team Member',
          recognitionType: body.recognitionType || 'Kudos', badgeIcon: body.badgeIcon || '⭐',
          message: body.message, isPublic: true, likesCount: 1,
        },
      });
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
      return this.prisma.employeeSuggestion.create({
        data: {
          employeeId: body.employeeId || null, employeeName: body.employeeName || 'Anonymous',
          category: body.category || 'Workplace', title: body.title,
          description: body.description, status: 'Submitted', upvotesCount: 1,
        },
      });
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
}
