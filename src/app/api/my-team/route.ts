import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TeamRisk } from '@prisma/client';
import {
  AuthorizationError,
  authAccessErrorResponse,
  isAuthAccessError,
  requireRole,
} from '@/lib/auth-session';

class ConflictValidationError extends Error {
  code: string;
  conflict: any;

  constructor(code: string, message: string, conflict: any) {
    super(message);
    this.name = 'ConflictValidationError';
    this.code = code;
    this.conflict = conflict;
  }
}

const mapRiskToDisplay = (risk: TeamRisk): 'On track' | 'Needs attention' | 'At risk' => {
  switch (risk) {
    case TeamRisk.AtRisk: return 'At risk';
    case TeamRisk.NeedsAttention: return 'Needs attention';
    case TeamRisk.OnTrack:
    default:
      return 'On track';
  }
};

const mapDisplayToRisk = (risk?: string): TeamRisk => {
  if (!risk) return TeamRisk.OnTrack;
  const s = risk.toLowerCase().replace(/[^a-z]/g, '');
  if (s.includes('atrisk') || s === 'risk') return TeamRisk.AtRisk;
  if (s.includes('attention')) return TeamRisk.NeedsAttention;
  return TeamRisk.OnTrack;
};

const isSameDepartment = (deptA?: string | null, deptB?: string | null): boolean => {
  if (!deptA || !deptB) return false;
  const a = deptA.trim().toLowerCase();
  const b = deptB.trim().toLowerCase();
  return a === b;
};

/**
 * Validates Team Leader department uniqueness inside a Prisma transaction.
 */
async function validateLeaderDepartmentUniquenessTx(
  tx: any,
  leaderId: string,
  targetDepartment: string,
  targetTeamId?: string
) {
  const leaderEmployee = await tx.employee.findUnique({
    where: { id: leaderId },
    select: { id: true, name: true, department: true },
  });

  if (!leaderEmployee) {
    throw new Error('Selected Team Leader employee not found');
  }

  const effectiveDept = targetDepartment || leaderEmployee.department || 'Engineering';

  const existingLedTeams = await tx.managedTeam.findMany({
    where: {
      leaderId,
      ...(targetTeamId ? { id: { not: targetTeamId } } : {}),
    },
    include: { leader: true },
  });

  for (const team of existingLedTeams) {
    if (
      isSameDepartment(team.department, effectiveDept) ||
      isSameDepartment(team.department, leaderEmployee.department) ||
      isSameDepartment(team.leader.department, effectiveDept)
    ) {
      throw new ConflictValidationError(
        'TEAM_LEADER_DEPARTMENT_CONFLICT',
        `${leaderEmployee.name} is already Team Leader of ${team.name} within the ${team.department} department.`,
        {
          employeeId: leaderEmployee.id,
          employeeName: leaderEmployee.name,
          existingTeamId: team.id,
          existingTeamName: team.name,
          department: team.department,
        }
      );
    }
  }
}

/**
 * Validates Team Member department uniqueness inside a Prisma transaction.
 */
async function validateMemberDepartmentUniquenessTx(
  tx: any,
  employeeId: string,
  targetDepartment: string,
  targetTeamId?: string
) {
  const memberEmployee = await tx.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, name: true, department: true },
  });

  if (!memberEmployee) {
    throw new Error(`Target employee ${employeeId} not found`);
  }

  const effectiveDept = targetDepartment || memberEmployee.department || 'Engineering';

  const existingMemberships = await tx.teamMember.findMany({
    where: {
      employeeId,
      ...(targetTeamId ? { teamId: { not: targetTeamId } } : {}),
    },
    include: {
      team: {
        include: { leader: true },
      },
      employee: true,
    },
  });

  for (const membership of existingMemberships) {
    const existingTeam = membership.team;

    if (
      isSameDepartment(existingTeam.department, effectiveDept) ||
      isSameDepartment(existingTeam.department, memberEmployee.department) ||
      isSameDepartment(existingTeam.leader.department, effectiveDept)
    ) {
      throw new ConflictValidationError(
        'TEAM_MEMBER_DEPARTMENT_CONFLICT',
        `${memberEmployee.name} is already assigned to ${existingTeam.name} within the ${existingTeam.department} department.`,
        {
          employeeId: memberEmployee.id,
          employeeName: memberEmployee.name,
          existingTeamId: existingTeam.id,
          existingTeamName: existingTeam.name,
          department: existingTeam.department,
        }
      );
    }
  }
}

const formatTeamRecord = (team: any, metadataMap: Map<string, any>) => {
  const leaderMeta = metadataMap.get(team.leader.id);

  const leaderData = {
    employee: {
      id: team.leader.id,
      employeeCode: team.leader.employeeCode,
      name: team.leader.name,
      role: team.leader.roleTitle,
      department: team.leader.department,
      email: team.leader.email,
      phone: team.leader.phone || '+91 98000 00000',
      avatar: team.leader.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      status: (team.leader.status === 'OnLeave' ? 'On Leave' : team.leader.status) as any,
      joinDate: team.leader.joinDate,
      location: team.leader.location,
      salary: Number(team.leader.salary),
      manager: team.manager.name,
    },
    metadata: {
      employeeId: team.leader.id,
      manager: team.manager.name,
      focus: leaderMeta?.focus || `${team.department} delivery and quarterly priorities`,
      workload: leaderMeta?.workload ?? 75,
      goalProgress: leaderMeta?.goalProgress ?? 65,
      goalLabel: leaderMeta?.goalLabel || 'Progress against quarterly priorities',
      nextOneToOne: leaderMeta?.nextOneToOne || '15 Aug 2026',
      risk: leaderMeta ? mapRiskToDisplay(leaderMeta.risk) : 'On track',
      notes: leaderMeta?.notes || 'Add a coaching note after the next one-to-one.',
    },
  };

  const membersData = team.members.map(({ employee }: any) => {
    const memMeta = metadataMap.get(employee.id);
    return {
      employee: {
        id: employee.id,
        employeeCode: employee.employeeCode,
        name: employee.name,
        role: employee.roleTitle,
        department: employee.department,
        email: employee.email,
        phone: employee.phone || '+91 98000 00000',
        avatar: employee.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        status: (employee.status === 'OnLeave' ? 'On Leave' : employee.status) as any,
        joinDate: employee.joinDate,
        location: employee.location,
        salary: Number(employee.salary),
        manager: team.leader.name,
      },
      metadata: {
        employeeId: employee.id,
        manager: team.leader.name,
        focus: memMeta?.focus || `${employee.department} feature delivery`,
        workload: memMeta?.workload ?? 70,
        goalProgress: memMeta?.goalProgress ?? 60,
        goalLabel: memMeta?.goalLabel || 'Deliver assigned sprint tasks',
        nextOneToOne: memMeta?.nextOneToOne || '18 Aug 2026',
        risk: memMeta ? mapRiskToDisplay(memMeta.risk) : 'On track',
        notes: memMeta?.notes || '',
      },
    };
  });

  return {
    id: team.id,
    name: team.name,
    department: team.department,
    manager: team.manager.name,
    leaderId: team.leaderId,
    focus: team.focus,
    leader: leaderData,
    members: membersData,
  };
};

export async function GET(request: Request) {
  try {
    const employee = await requireRole('manager', 'admin', request);
    const requestedManagerId = new URL(request.url).searchParams.get('managerId');
    const managerId =
      employee.userRole === 'admin' && requestedManagerId
        ? requestedManagerId
        : employee.id;

    const teams = await db.managedTeam.findMany({
      where: { managerId },
      include: {
        manager: true,
        leader: true,
        members: {
          include: {
            employee: true,
          },
        },
      },
    });

    const metadataList = await db.teamMemberMetadata.findMany({
      where: { managerId },
    });

    const metadataMap = new Map(metadataList.map((m) => [m.employeeId, m]));
    const formattedTeams = teams.map((team) => formatTeamRecord(team, metadataMap));

    return NextResponse.json({ success: true, data: formattedTeams });
  } catch (error) {
    if (error instanceof ConflictValidationError) {
      return NextResponse.json(
        { success: false, code: error.code, message: error.message, conflict: error.conflict },
        { status: 409 }
      );
    }
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching team data:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch team data' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const manager = await requireRole('manager', 'admin', request);
    const body = await request.json();
    const { action, teamId, leaderId, employeeId, employeeIds, notes, risk, goalProgress, workload, nextOneToOne } = body;
    const requestedManagerId = typeof body.managerId === 'string' ? body.managerId : null;
    const managerId =
      manager.userRole === 'admin' && requestedManagerId
        ? requestedManagerId
        : manager.id;

    // 1. UPDATE_LEADER action
    if (action === 'UPDATE_LEADER') {
      if (!teamId || !leaderId) {
        return NextResponse.json({ success: false, error: 'teamId and leaderId are required' }, { status: 400 });
      }

      const updatedTeam = await db.$transaction(async (tx) => {
        const team = await tx.managedTeam.findFirst({
          where: { id: teamId, ...(manager.userRole === 'admin' ? {} : { managerId }) },
        });
        if (!team) throw new AuthorizationError();

        // Perform transaction-safe department conflict validation
        await validateLeaderDepartmentUniquenessTx(tx, leaderId, team.department, teamId);

        await tx.managedTeam.update({
          where: { id: teamId },
          data: { leaderId },
        });

        return tx.managedTeam.findUnique({
          where: { id: teamId },
          include: {
            manager: true,
            leader: true,
            members: { include: { employee: true } },
          },
        });
      }, { timeout: 15000, maxWait: 10000 });

      const metadataList = await db.teamMemberMetadata.findMany({ where: { managerId } });
      const metadataMap = new Map(metadataList.map((m) => [m.employeeId, m]));
      const formatted = formatTeamRecord(updatedTeam, metadataMap);

      return NextResponse.json({ success: true, data: formatted });
    }

    // 2. ADD_MEMBERS action
    if (action === 'ADD_MEMBERS') {
      if (!teamId || !Array.isArray(employeeIds) || employeeIds.length === 0) {
        return NextResponse.json({ success: false, error: 'teamId and employeeIds array are required' }, { status: 400 });
      }

      const { updatedTeam, addedCount, alreadyAssigned } = await db.$transaction(async (tx) => {
        const team = await tx.managedTeam.findFirst({
          where: { id: teamId, ...(manager.userRole === 'admin' ? {} : { managerId }) },
          include: { members: true },
        });
        if (!team) throw new AuthorizationError();

        const existingMemberEmployeeIds = new Set(team.members.map((m) => m.employeeId));
        const toAddIds = employeeIds.filter((id) => typeof id === 'string' && !existingMemberEmployeeIds.has(id));

        if (toAddIds.length === 0) {
          const currentTeamData = await tx.managedTeam.findUnique({
            where: { id: teamId },
            include: {
              manager: true,
              leader: true,
              members: { include: { employee: true } },
            },
          });
          return { updatedTeam: currentTeamData, addedCount: 0, alreadyAssigned: true };
        }

        // Validate ALL new members against department-scoped uniqueness within transaction
        for (const empId of toAddIds) {
          await validateMemberDepartmentUniquenessTx(tx, empId, team.department, teamId);
        }

        // Create memberships atomically
        for (const empId of toAddIds) {
          await tx.teamMember.create({
            data: {
              teamId,
              employeeId: empId,
            },
          });
        }

        const freshTeamData = await tx.managedTeam.findUnique({
          where: { id: teamId },
          include: {
            manager: true,
            leader: true,
            members: { include: { employee: true } },
          },
        });

        return { updatedTeam: freshTeamData, addedCount: toAddIds.length, alreadyAssigned: false };
      }, { timeout: 15000, maxWait: 10000 });

      const metadataList = await db.teamMemberMetadata.findMany({ where: { managerId } });
      const metadataMap = new Map(metadataList.map((m) => [m.employeeId, m]));
      const formatted = formatTeamRecord(updatedTeam, metadataMap);

      return NextResponse.json({ success: true, data: formatted, addedCount, alreadyAssigned });
    }

    // 3. REMOVE_MEMBER action
    if (action === 'REMOVE_MEMBER') {
      if (!teamId || !employeeId) {
        return NextResponse.json({ success: false, error: 'teamId and employeeId are required' }, { status: 400 });
      }

      const team = await db.managedTeam.findFirst({
        where: { id: teamId, ...(manager.userRole === 'admin' ? {} : { managerId }) },
      });
      if (!team) throw new AuthorizationError();

      await db.teamMember.deleteMany({
        where: {
          teamId,
          employeeId,
        },
      });

      const updatedTeam = await db.managedTeam.findUnique({
        where: { id: teamId },
        include: {
          manager: true,
          leader: true,
          members: { include: { employee: true } },
        },
      });

      const metadataList = await db.teamMemberMetadata.findMany({ where: { managerId } });
      const metadataMap = new Map(metadataList.map((m) => [m.employeeId, m]));
      const formatted = formatTeamRecord(updatedTeam, metadataMap);

      return NextResponse.json({ success: true, data: formatted });
    }

    // 4. Default / UPDATE_METADATA action
    const managedPerson = await db.managedTeam.findFirst({
      where: {
        managerId,
        OR: [
          { leaderId: employeeId },
          { members: { some: { employeeId } } },
        ],
      },
      select: { id: true },
    });

    if (!managedPerson) throw new AuthorizationError();

    const updated = await db.teamMemberMetadata.upsert({
      where: {
        employeeId_managerId: {
          employeeId,
          managerId,
        },
      },
      update: {
        ...(notes !== undefined ? { notes } : {}),
        ...(risk ? { risk: mapDisplayToRisk(risk) } : {}),
        ...(goalProgress !== undefined ? { goalProgress: Number(goalProgress) } : {}),
        ...(workload !== undefined ? { workload: Number(workload) } : {}),
        ...(nextOneToOne ? { nextOneToOne } : {}),
      },
      create: {
        id: `TMM-${Date.now()}`,
        employeeId,
        managerId,
        focus: 'Team delivery and quarterly goals',
        goalLabel: 'Progress against quarterly priorities',
        workload: Number(workload) || 70,
        goalProgress: Number(goalProgress) || 60,
        nextOneToOne: nextOneToOne || 'To be scheduled',
        risk: mapDisplayToRisk(risk),
        notes: notes || '',
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof ConflictValidationError) {
      return NextResponse.json(
        { success: false, code: error.code, message: error.message, conflict: error.conflict },
        { status: 409 }
      );
    }
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error updating team data:', error);
    return NextResponse.json({ success: false, error: (error as Error).message || 'Failed to update team data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const manager = await requireRole('manager', 'admin', request);
    const body = await request.json();
    const { name, department, leaderId, memberIds, focus } = body;

    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName) {
      return NextResponse.json({ success: false, error: 'Team name is required' }, { status: 400 });
    }

    if (!leaderId || typeof leaderId !== 'string') {
      return NextResponse.json({ success: false, error: 'Team Leader is required' }, { status: 400 });
    }

    const requestedManagerId = typeof body.managerId === 'string' ? body.managerId : null;
    const managerId =
      manager.userRole === 'admin' && requestedManagerId
        ? requestedManagerId
        : manager.id;

    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const newTeamId = `TEAM-${Date.now()}-${randomSuffix}`;
    const validMemberIds = Array.isArray(memberIds)
      ? (memberIds.filter((id) => typeof id === 'string' && id !== leaderId) as string[])
      : [];

    const uniqueMemberIds = Array.from(new Set(validMemberIds));

    // Execute atomic transaction for ManagedTeam, validation, and TeamMember creation
    const createdTeamData = await db.$transaction(async (tx) => {
      const leaderEmp = await tx.employee.findUnique({ where: { id: leaderId } });
      if (!leaderEmp) throw new Error('Selected Team Leader employee not found');

      const teamDept = typeof department === 'string' && department.trim() ? department.trim() : leaderEmp.department || 'Engineering';
      const teamFocus = typeof focus === 'string' && focus.trim() ? focus.trim() : `${trimmedName} delivery and quarterly goals`;

      // 1. Validate Team Leader uniqueness
      await validateLeaderDepartmentUniquenessTx(tx, leaderId, teamDept);

      // 2. Validate Team Members uniqueness
      for (const empId of uniqueMemberIds) {
        await validateMemberDepartmentUniquenessTx(tx, empId, teamDept);
      }

      const team = await tx.managedTeam.create({
        data: {
          id: newTeamId,
          name: trimmedName,
          department: teamDept,
          managerId,
          leaderId,
          focus: teamFocus,
        },
      });

      for (const empId of uniqueMemberIds) {
        await tx.teamMember.create({
          data: {
            teamId: newTeamId,
            employeeId: empId,
          },
        });
      }

      return tx.managedTeam.findUnique({
        where: { id: team.id },
        include: {
          manager: true,
          leader: true,
          members: { include: { employee: true } },
        },
      });
    }, { timeout: 15000, maxWait: 10000 });

    const metadataList = await db.teamMemberMetadata.findMany({ where: { managerId } });
    const metadataMap = new Map(metadataList.map((m) => [m.employeeId, m]));
    const formatted = formatTeamRecord(createdTeamData, metadataMap);

    return NextResponse.json(
      {
        success: true,
        message: 'Team created successfully.',
        team: formatted,
        data: formatted,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ConflictValidationError) {
      return NextResponse.json(
        { success: false, code: error.code, message: error.message, conflict: error.conflict },
        { status: 409 }
      );
    }
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error creating new team:', error);
    return NextResponse.json({ success: false, error: (error as Error).message || 'Failed to create team' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const manager = await requireRole('manager', 'admin', request);
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json({ success: false, error: 'teamId query parameter is required' }, { status: 400 });
    }

    const team = await db.managedTeam.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return NextResponse.json({ success: false, error: 'Team no longer exists.' }, { status: 404 });
    }

    // Verify manager scope / authorization
    if (manager.userRole !== 'admin' && team.managerId !== manager.id) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to delete this team.' },
        { status: 403 }
      );
    }

    // Atomic transaction for deleting ManagedTeam and cleaning up assignments
    await db.$transaction(async (tx) => {
      // Reconcile performance goals referring to this team
      await tx.performanceGoal.updateMany({
        where: { team_id: teamId },
        data: { team_id: null },
      });

      // Delete associated TeamMember assignment records
      await tx.teamMember.deleteMany({
        where: { teamId },
      });

      // Delete the ManagedTeam record
      await tx.managedTeam.delete({
        where: { id: teamId },
      });
    }, { timeout: 15000, maxWait: 10000 });

    return NextResponse.json({
      success: true,
      message: 'Team deleted successfully.',
    });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Unable to delete team. Please try again.' },
      { status: 500 }
    );
  }
}

