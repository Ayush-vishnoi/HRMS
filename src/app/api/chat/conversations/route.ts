import { NextResponse } from 'next/server';
import db from '@/lib/db';
import chatBus from '@/lib/chat-bus';
import { resolveSessionUserId } from '@/lib/chat-auth';

export async function GET(req: Request) {
  try {
    const currentUserId = await resolveSessionUserId(req);
    if (!currentUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all conversations where currentUserId is participant1 or participant2
    const conversations = await db.conversation.findMany({
      where: {
        OR: [
          { participant1Id: currentUserId },
          { participant2Id: currentUserId },
        ],
      },
      include: {
        participant1: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            roleTitle: true,
            department: true,
            userRole: true,
          },
        },
        participant2: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            roleTitle: true,
            department: true,
            userRole: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            senderId: true,
            receiverId: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Format response and calculate unread count per conversation
    const formatted = await Promise.all(
      conversations.map(async (conv) => {
        const otherParticipant = conv.participant1Id === currentUserId ? conv.participant2 : conv.participant1;

        // Unread messages count sent to currentUserId in this conversation
        const unreadCount = await db.message.count({
          where: {
            conversationId: conv.id,
            receiverId: currentUserId,
            status: { in: ['SENT', 'DELIVERED'] },
          },
        });

        const lastMessage = conv.messages[0] || null;

        return {
          id: conv.id,
          employeeId: otherParticipant.id,
          name: otherParticipant.name,
          email: otherParticipant.email,
          avatar: otherParticipant.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          role: otherParticipant.roleTitle,
          department: otherParticipant.department,
          userRole: otherParticipant.userRole,
          isOnline: chatBus.isUserOnline(otherParticipant.id),
          unreadCount,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                content: lastMessage.content,
                senderId: lastMessage.senderId,
                status: lastMessage.status,
                createdAt: lastMessage.createdAt,
              }
            : null,
          updatedAt: conv.updatedAt,
        };
      })
    );

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error('Failed to fetch conversations:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
