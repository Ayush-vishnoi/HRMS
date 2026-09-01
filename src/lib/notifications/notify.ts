import { db } from '@/lib/db';

/**
 * Central notification service.
 *
 * Every helper here is fire-and-forget safe: notification failures are
 * logged but NEVER propagated, so a broken notification can never fail
 * the business operation that triggered it.
 */

export type NotificationType =
  | 'System'
  | 'Leave'
  | 'HelpDesk'
  | 'Meeting'
  | 'Asset'
  | 'Attendance'
  | 'Expense'
  | 'Policy'
  | 'Payroll'
  | 'Performance'
  | 'Exit'
  | 'Document'
  | 'Recruitment'
  | 'Employee'
  | 'Onboarding'
  | 'Announcement'
  | 'Task';

export interface NotifyInput {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  linkUrl?: string | null;
}

/** Notify a single user. Never throws. */
export async function notifyUser(input: NotifyInput): Promise<void> {
  try {
    if (!input.userId) return;
    await db.userNotification.create({
      data: {
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type ?? 'System',
        linkUrl: input.linkUrl ?? null,
      },
    });
  } catch (error) {
    console.error('[notify] Failed to create notification:', error);
  }
}

/** Notify multiple users at once. Never throws. */
export async function notifyUsers(
  userIds: string[],
  payload: Omit<NotifyInput, 'userId'>,
): Promise<void> {
  try {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueIds.length === 0) return;

    await db.userNotification.createMany({
      data: uniqueIds.map((userId) => ({
        userId,
        title: payload.title,
        message: payload.message,
        type: payload.type ?? 'System',
        linkUrl: payload.linkUrl ?? null,
      })),
    });
  } catch (error) {
    console.error('[notify] Failed to create notifications:', error);
  }
}

/** Notify every active admin. Never throws. */
export async function notifyAdmins(
  payload: Omit<NotifyInput, 'userId'>,
): Promise<void> {
  try {
    const admins = await db.employee.findMany({
      where: {
        userRole: 'admin',
        status: { in: ['Active', 'OnLeave', 'Remote'] },
      },
      select: { id: true },
    });

    await notifyUsers(
      admins.map((admin) => admin.id),
      payload,
    );
  } catch (error) {
    console.error('[notify] Failed to notify admins:', error);
  }
}

/** Notify the manager of the given employee (if one exists). Never throws. */
export async function notifyManagerOf(
  employeeId: string,
  payload: Omit<NotifyInput, 'userId'>,
): Promise<void> {
  try {
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      select: { managerId: true },
    });

    if (!employee?.managerId) return;
    await notifyUser({ ...payload, userId: employee.managerId });
  } catch (error) {
    console.error('[notify] Failed to notify manager:', error);
  }
}

/** Broadcast a notification to every active employee. Never throws. */
export async function notifyAllActiveEmployees(
  payload: Omit<NotifyInput, 'userId'>,
): Promise<void> {
  try {
    const employees = await db.employee.findMany({
      where: { status: { in: ['Active', 'OnLeave', 'Remote'] } },
      select: { id: true },
    });

    await notifyUsers(
      employees.map((employee) => employee.id),
      payload,
    );
  } catch (error) {
    console.error('[notify] Failed to broadcast notification:', error);
  }
}
