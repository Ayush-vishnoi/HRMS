import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
} from '@/lib/auth-session';

export async function GET() {
  try {
    const [surveys, feedPosts, recognitions, suggestions] = await Promise.all([
      db.engagementSurvey.findMany({
        orderBy: { createdAt: 'desc' },
        include: { responses: true },
      }),
      db.engagementFeedPost.findMany({
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      }),
      db.employeeRecognition.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      db.employeeSuggestion.findMany({
        orderBy: [{ upvotesCount: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { surveys, feedPosts, recognitions, suggestions },
    });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching engagement data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch engagement data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body; // 'kudos' | 'post' | 'suggestion' | 'survey_response' | 'upvote_suggestion'

    if (action === 'kudos') {
      const { giverId, giverName, receiverId, receiverName, recognitionType = 'Kudos', badgeIcon = '⭐', message } = body;
      const rec = await db.employeeRecognition.create({
        data: {
          id: `REC-${Date.now().toString(36)}`,
          giverId,
          giverName: giverName || 'Colleague',
          receiverId,
          receiverName: receiverName || 'Team Member',
          recognitionType,
          badgeIcon,
          message,
          isPublic: true,
          likesCount: 1,
        },
      });
      return NextResponse.json({ success: true, data: rec }, { status: 201 });
    }

    if (action === 'post') {
      const { authorId, authorName, authorAvatar, postType = 'General', title, content, mediaUrl } = body;
      const post = await db.engagementFeedPost.create({
        data: {
          id: `POST-${Date.now().toString(36)}`,
          authorId,
          authorName: authorName || 'HR Admin',
          authorAvatar: authorAvatar || null,
          postType,
          title,
          content,
          mediaUrl: mediaUrl || null,
          likesCount: 0,
          commentsCount: 0,
        },
      });
      return NextResponse.json({ success: true, data: post }, { status: 201 });
    }

    if (action === 'suggestion') {
      const { employeeId, employeeName, category, title, description } = body;
      const sug = await db.employeeSuggestion.create({
        data: {
          id: `SUG-${Date.now().toString(36)}`,
          employeeId: employeeId || null,
          employeeName: employeeName || 'Anonymous',
          category: category || 'Workplace',
          title,
          description,
          status: 'Submitted',
          upvotesCount: 1,
        },
      });
      return NextResponse.json({ success: true, data: sug }, { status: 201 });
    }

    if (action === 'upvote_suggestion') {
      const { id } = body;
      const updated = await db.employeeSuggestion.update({
        where: { id },
        data: { upvotesCount: { increment: 1 } },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === 'survey_response') {
      const { surveyId, respondentId, npsScore, feedback, answersJson } = body;
      const resp = await db.surveyResponse.create({
        data: {
          id: `SR-${Date.now().toString(36)}`,
          surveyId,
          respondentId: respondentId || null,
          npsScore: Number(npsScore) || 9,
          feedback: feedback || '',
          answersJson: answersJson || '[]',
        },
      });

      await db.engagementSurvey.update({
        where: { id: surveyId },
        data: { responseCount: { increment: 1 } },
      });

      return NextResponse.json({ success: true, data: resp }, { status: 201 });
    }

    return NextResponse.json({ success: false, error: 'Invalid engagement action' }, { status: 400 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error handling engagement action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process engagement action' },
      { status: 500 }
    );
  }
}
