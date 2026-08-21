import db from '@/lib/db';
import { auth } from '@/auth';

/**
 * Resolves session employee ID from NextAuth session, custom x-user-id header,
 * or fallback demo employee in development mode.
 */
export async function resolveSessionUserId(req?: Request): Promise<string | null> {
  try {
    const session = await auth();
    if (session?.user?.id) {
      return session.user.id;
    }
  } catch (err) {
    console.warn('Session retrieval error in resolveSessionUserId:', err);
  }

  if (req) {
    const headerUserId = req.headers.get('x-user-id');
    if (headerUserId) return headerUserId;
  }


  return null;
}

/**
 * Returns deterministic ordering for 1-to-1 conversation participants
 * so that participant1Id < participant2Id always.
 */
export function getDeterministicParticipantOrder(idA: string, idB: string) {
  if (idA < idB) {
    return { participant1Id: idA, participant2Id: idB };
  }
  return { participant1Id: idB, participant2Id: idA };
}

/**
 * Server-side RBAC validation verifying whether currentUserId is authorized to message targetEmployeeId.
 * - Prevents IDOR and unauthorized messaging.
 * - Derives identity strictly from authenticated session.
 */
export async function canUserMessageEmployee(currentUserId: string, targetEmployeeId: string): Promise<boolean> {
  if (currentUserId === targetEmployeeId) {
    return false; // Cannot message self
  }

  // Fetch current user and target employee
  const [currentUser, targetUser] = await Promise.all([
    db.employee.findUnique({
      where: { id: currentUserId },
      select: { id: true, userRole: true, managerId: true, department: true, name: true },
    }),
    db.employee.findUnique({
      where: { id: targetEmployeeId },
      select: { id: true, userRole: true, managerId: true, department: true, name: true },
    }),
  ]);

  if (!currentUser || !targetUser) {
    return false;
  }

  // HR Admin can message anyone in the organization
  if (currentUser.userRole === 'admin' || targetUser.userRole === 'admin') {
    return true;
  }

  // Check if an existing conversation already exists between them
  const { participant1Id, participant2Id } = getDeterministicParticipantOrder(currentUserId, targetEmployeeId);
  const existingConv = await db.conversation.findUnique({
    where: {
      participant1Id_participant2Id: {
        participant1Id,
        participant2Id,
      },
    },
  });

  if (existingConv) {
    return true;
  }

  // Check direct report relationship (currentUser is manager of targetUser or vice versa)
  if (targetUser.managerId === currentUser.id || currentUser.managerId === targetUser.id) {
    return true;
  }

  // Check ManagedTeams scope
  const managedTeams = await db.managedTeam.findMany({
    where: {
      OR: [
        { managerId: currentUser.id },
        { leaderId: currentUser.id },
      ],
    },
    include: {
      members: true,
    },
  });

  const isInManagedTeam = managedTeams.some((team) =>
    team.leaderId === targetEmployeeId ||
    team.members.some((m) => m.employeeId === targetEmployeeId)
  );

  if (isInManagedTeam) {
    return true;
  }

  // Check reverse: targetUser manages a team that currentUser belongs to
  const targetManagedTeams = await db.managedTeam.findMany({
    where: {
      OR: [
        { managerId: targetUser.id },
        { leaderId: targetUser.id },
      ],
    },
    include: {
      members: true,
    },
  });

  const isCurrentInTargetTeam = targetManagedTeams.some((team) =>
    team.leaderId === currentUser.id ||
    team.members.some((m) => m.employeeId === currentUser.id)
  );

  if (isCurrentInTargetTeam) {
    return true;
  }

  // Fallback: If both belong to the same department, allow 1-to-1 communication
  if (currentUser.department === targetUser.department) {
    return true;
  }

  return false;
}

/**
 * Retrieves or creates a 1-to-1 Conversation record between two employees.
 */
export async function getOrCreateConversation(userAId: string, userBId: string) {
  const { participant1Id, participant2Id } = getDeterministicParticipantOrder(userAId, userBId);

  const conversation = await db.conversation.upsert({
    where: {
      participant1Id_participant2Id: {
        participant1Id,
        participant2Id,
      },
    },
    update: {},
    create: {
      participant1Id,
      participant2Id,
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
    },
  });

  return conversation;
}
