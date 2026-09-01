import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
} from '@/lib/auth-session';

export async function GET(request: Request) {
  try {
    const employee = await requireEmployee();
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 50);

    const [notifications, unreadCount] = await Promise.all([
      db.userNotification.findMany({
        where: { userId: employee.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      db.userNotification.count({
        where: { userId: employee.id, isRead: false },
      }),
    ]);

    return NextResponse.json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const employee = await requireEmployee();
    const body = await request.json();
    const { id, markAllAsRead } = body;

    if (markAllAsRead) {
      const result = await db.userNotification.updateMany({
        where: { userId: employee.id, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, data: { updatedCount: result.count } });
    }

    if (id) {
      const updated = await db.userNotification.update({
        where: { id, userId: employee.id },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const employee = await requireEmployee();
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (id) {
      await db.userNotification.deleteMany({
        where: { id, userId: employee.id },
      });
      return NextResponse.json({ success: true });
    }

    await db.userNotification.deleteMany({
      where: { userId: employee.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error clearing notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear notifications' },
      { status: 500 }
    );
  }
}
