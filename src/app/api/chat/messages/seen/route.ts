import { NextResponse } from 'next/server';
import db from '@/lib/db';
import chatBus from '@/lib/chat-bus';
import { resolveSessionUserId } from '@/lib/chat-auth';

export async function PATCH(req: Request) {
  try {
    const currentUserId = await resolveSessionUserId(req);
    if (!currentUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const { conversationId, senderId } = body;

    if (!conversationId && !senderId) {
      return NextResponse.json(
        { success: false, error: 'conversationId or senderId is required' },
        { status: 400 }
      );
    }

    let targetConvId = conversationId;

    if (!targetConvId && senderId) {
      const conv = await db.conversation.findFirst({
        where: {
          OR: [
            { participant1Id: currentUserId, participant2Id: senderId },
            { participant1Id: senderId, participant2Id: currentUserId },
          ],
        },
      });
      if (conv) {
        targetConvId = conv.id;
      }
    }

    if (!targetConvId) {
      return NextResponse.json({ success: true, updatedCount: 0 });
    }

    // Verify current user is a participant
    const conv = await db.conversation.findUnique({
      where: { id: targetConvId },
    });

    if (!conv || (conv.participant1Id !== currentUserId && conv.participant2Id !== currentUserId)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Mark messages sent to currentUserId as SEEN
    const updateResult = await db.message.updateMany({
      where: {
        conversationId: targetConvId,
        receiverId: currentUserId,
        status: { in: ['SENT', 'DELIVERED'] },
      },
      data: {
        status: 'SEEN',
      },
    });

    const otherParticipantId = conv.participant1Id === currentUserId ? conv.participant2Id : conv.participant1Id;

    // Emit message:seen real-time event to the sender over SSE
    chatBus.sendToUser(otherParticipantId, {
      type: 'message:seen',
      payload: {
        conversationId: targetConvId,
        seenBy: currentUserId,
      },
    });

    return NextResponse.json({
      success: true,
      updatedCount: updateResult.count,
    });
  } catch (error: any) {
    console.error('Failed to mark messages as seen:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
