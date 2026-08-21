import { NextResponse } from 'next/server';
import db from '@/lib/db';
import chatBus from '@/lib/chat-bus';
import { canUserMessageEmployee, getOrCreateConversation, resolveSessionUserId } from '@/lib/chat-auth';

const MAX_MESSAGE_LENGTH = 2000;

export async function GET(req: Request) {
  try {
    const currentUserId = await resolveSessionUserId(req);
    if (!currentUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const targetEmployeeId = searchParams.get('employeeId');
    const conversationId = searchParams.get('conversationId');

    if (!targetEmployeeId && !conversationId) {
      return NextResponse.json(
        { success: false, error: 'employeeId or conversationId is required' },
        { status: 400 }
      );
    }

    let targetConvId = conversationId;

    if (!targetConvId && targetEmployeeId) {
      // Validate authorization
      const isAuthorized = await canUserMessageEmployee(currentUserId, targetEmployeeId);
      if (!isAuthorized) {
        return NextResponse.json(
          { success: false, error: 'Access denied. You are not authorized to message this employee.' },
          { status: 403 }
        );
      }

      const conv = await getOrCreateConversation(currentUserId, targetEmployeeId);
      targetConvId = conv.id;
    }

    // Verify current user is a participant of the conversation
    const conv = await db.conversation.findUnique({
      where: { id: targetConvId! },
    });

    if (!conv || (conv.participant1Id !== currentUserId && conv.participant2Id !== currentUserId)) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Conversation not found or unauthorized.' },
        { status: 403 }
      );
    }

    // Retrieve message history
    const messages = await db.message.findMany({
      where: { conversationId: targetConvId! },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        receiverId: true,
        content: true,
        status: true,
        createdAt: true,
      },
    });

    // Determine target employee info
    const otherParticipantId = conv.participant1Id === currentUserId ? conv.participant2Id : conv.participant1Id;
    const otherEmployee = await db.employee.findUnique({
      where: { id: otherParticipantId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        roleTitle: true,
        department: true,
        userRole: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        conversationId: targetConvId,
        targetEmployee: otherEmployee
          ? {
              id: otherEmployee.id,
              name: otherEmployee.name,
              email: otherEmployee.email,
              avatar: otherEmployee.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
              role: otherEmployee.roleTitle,
              department: otherEmployee.department,
              userRole: otherEmployee.userRole,
              isOnline: chatBus.isUserOnline(otherEmployee.id),
            }
          : null,
        messages,
      },
    });
  } catch (error: any) {
    console.error('Failed to fetch messages:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const senderId = await resolveSessionUserId(req);
    if (!senderId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { receiverId, content } = body;

    if (!receiverId || typeof receiverId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'receiverId is required' },
        { status: 400 }
      );
    }

    // Message validation
    const trimmedContent = (content || '').trim();
    if (!trimmedContent) {
      return NextResponse.json(
        { success: false, error: 'Message content cannot be empty or whitespace only.' },
        { status: 400 }
      );
    }

    if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Message exceeds maximum allowed length of ${MAX_MESSAGE_LENGTH} characters.` },
        { status: 400 }
      );
    }

    // Validate RBAC authorization (prevent IDOR)
    const isAuthorized = await canUserMessageEmployee(senderId, receiverId);
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Access denied. You are not authorized to message this employee.' },
        { status: 403 }
      );
    }

    // Fetch or create conversation
    const conversation = await getOrCreateConversation(senderId, receiverId);

    // Determine initial message status based on recipient real-time presence
    const isRecipientOnline = chatBus.isUserOnline(receiverId);
    const initialStatus = isRecipientOnline ? 'DELIVERED' : 'SENT';

    // Persist message in PostgreSQL via Prisma
    const message = await db.message.create({
      data: {
        conversationId: conversation.id,
        senderId,
        receiverId,
        content: trimmedContent,
        status: initialStatus,
      },
    });

    // Update conversation timestamp
    await db.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    // Fetch sender info for real-time payload
    const senderInfo = await db.employee.findUnique({
      where: { id: senderId },
      select: { id: true, name: true, avatarUrl: true, roleTitle: true, department: true },
    });

    const realTimeMessagePayload = {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName: senderInfo?.name || 'User',
      senderAvatar: senderInfo?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      receiverId: message.receiverId,
      content: message.content,
      status: message.status,
      createdAt: message.createdAt,
    };

    // Emit real-time events over SSE
    chatBus.sendToUser(receiverId, {
      type: 'message:new',
      payload: realTimeMessagePayload,
    });

    if (isRecipientOnline) {
      chatBus.sendToUser(senderId, {
        type: 'message:delivered',
        payload: {
          messageId: message.id,
          conversationId: message.conversationId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    console.error('Failed to send message:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
