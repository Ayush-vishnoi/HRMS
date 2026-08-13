import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TeamRisk } from '@prisma/client';

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const managerId = searchParams.get('managerId') || 'EMP-002';

    // 1. Fetch managed teams where managerId matches (or fetch all if admin)
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

    // 2. Fetch team member metadata for this manager
    const metadataList = await db.teamMemberMetadata.findMany({
      where: { managerId },
    });

    const metadataMap = new Map(metadataList.map((m) => [m.employeeId, m]));

    const formattedTeams = teams.map((team) => {
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

      const membersData = team.members.map(({ employee }) => {
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
    });

    return NextResponse.json({ success: true, data: formattedTeams });
  } catch (error) {
    console.error('Error fetching team data:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch team data' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, managerId, notes, risk, goalProgress, workload, nextOneToOne } = body;

    const existing = await db.teamMemberMetadata.findUnique({
      where: {
        employeeId_managerId: {
          employeeId,
          managerId: managerId || 'EMP-002',
        },
      },
    });

    const updated = await db.teamMemberMetadata.upsert({
      where: {
        employeeId_managerId: {
          employeeId,
          managerId: managerId || 'EMP-002',
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
        managerId: managerId || 'EMP-002',
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
    console.error('Error updating team metadata:', error);
    return NextResponse.json({ success: false, error: 'Failed to update team metadata' }, { status: 500 });
  }
}
