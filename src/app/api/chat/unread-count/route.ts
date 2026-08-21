import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { resolveSessionUserId } from '@/lib/chat-auth';

export async function GET(req: Request) {
  try {
    const currentUserId = await resolveSessionUserId(req);
    if (!currentUserId) {
      return NextResponse.json({ success: false, unreadCount: 0 }, { status: 401 });
    }

    const unreadCount = await db.message.count({
      where: {
        receiverId: currentUserId,
        status: { in: ['SENT', 'DELIVERED'] },
      },
    });

    return NextResponse.json({
      success: true,
      unreadCount,
    });
  } catch (error: any) {
    console.error('Failed to get unread count:', error);
    return NextResponse.json({ success: false, unreadCount: 0 }, { status: 500 });
  }
}
