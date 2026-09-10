import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotifyService } from '../common/notifications/notify.service';

@Injectable()
export class MyTeamService {
  constructor(private prisma: PrismaService, private notify: NotifyService) {}

  async findAll(userId: string, userRole: string, managerId?: string) {
    const targetManagerId = userRole === 'admin' && managerId ? managerId : userId;

    const teams = await this.prisma.managedTeam.findMany({
      where: { managerId: targetManagerId },
      include: {
        manager: true, leader: true,
        members: { include: { employee: true } },
      },
    });

    const metadataMap = await this.loadMetadata(targetManagerId);
    return teams.map((team) => this.formatTeam(team, metadataMap));
  }

  /** POST /api/my-team — create a team with leader + members (department-scoped uniqueness). */
  async createTeam(user: { id: string; userRole: string }, body: any) {
    const { name, department, leaderId, memberIds = [], focus, managerId } = body ?? {};

    if (!name || !leaderId) {
      throw new BadRequestException('Team name and leader are required.');
    }

    const targetManagerId = user.userRole === 'admin' && managerId ? managerId : user.id;
    const teamDepartment = department || 'Engineering';

    // Leader must not already lead a team in the same department.
    const leaderConflict = await this.prisma.managedTeam.findFirst({
      where: { leaderId, department: teamDepartment },
      include: { leader: true },
    });
    if (leaderConflict) {
      this.throwDepartmentConflict(
        leaderConflict.leader?.name || 'Selected employee',
        leaderConflict.name,
        teamDepartment,
        `${leaderConflict.leader?.name || 'Selected employee'} is already the Team Leader of "${leaderConflict.name}" in the ${teamDepartment} department.`,
      );
    }

    // Members must not already be assigned (as member or leader) within the same department.
    await this.assertMembersAvailableForDepartment(memberIds, teamDepartment);

    const team = await this.prisma.managedTeam.create({
      data: {
        id: `team-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        department: teamDepartment,
        managerId: targetManagerId,
        leaderId,
        focus: focus || `${name} delivery and goals`,
        members: {
          create: memberIds
            .filter((id: string) => id !== leaderId)
            .map((employeeId: string) => ({ employeeId })),
        },
      },
      include: {
        manager: true, leader: true,
        members: { include: { employee: true } },
      },
    });

    await this.notify.notifyUser({
      userId: leaderId,
      title: 'You are now a Team Leader',
      message: `You have been made the leader of team "${team.name}" (${team.department}).`,
      type: 'Meeting',
      linkUrl: '/my-team',
    });
    const memberIdsToNotify = memberIds.filter((id: string) => id !== leaderId);
    if (memberIdsToNotify.length > 0) {
      await this.notify.notifyUsers(memberIdsToNotify, {
        title: 'You have been added to a team',
        message: `You have been added as a member of team "${team.name}" (${team.department}).`,
        type: 'Meeting',
        linkUrl: '/my-team',
      });
    }

    return this.formatTeam(team, new Map());
  }

  /** DELETE /api/my-team?teamId= — delete a managed team (owning manager or admin only). */
  async deleteTeam(user: { id: string; userRole: string }, teamId?: string) {
    if (!teamId) {
      throw new BadRequestException('teamId query parameter is required.');
    }

    const team = await this.prisma.managedTeam.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found.');

    if (user.userRole !== 'admin' && team.managerId !== user.id) {
      throw new ForbiddenException('You can only delete teams you manage.');
    }

    await this.prisma.managedTeam.delete({ where: { id: teamId } });

    return { id: teamId, name: team.name, deleted: true };
  }

  /** PATCH /api/my-team — action router for team mutations. */
  async handleAction(user: { id: string; userRole: string }, body: any) {
    const action = body?.action || 'UPDATE_METADATA';

    switch (action) {
      case 'UPDATE_LEADER':
        return this.updateLeader(user, body);
      case 'ADD_MEMBERS':
        return this.addMembers(user, body);
      case 'REMOVE_MEMBER':
        return this.removeMember(user, body);
      case 'UPDATE_METADATA':
        return this.updateMetadata(user.id, user.userRole, body);
      default:
        throw new BadRequestException(`Unsupported action "${action}".`);
    }
  }

  async updateMetadata(userId: string, userRole: string, body: any) {
    const managerId = userRole === 'admin' && body.managerId ? body.managerId : userId;
    const { employeeId, notes, risk, goalProgress, workload, nextOneToOne } = body;

    const mapRisk = (r?: string): any => {
      if (!r) return 'OnTrack';
      const s = r.toLowerCase().replace(/[^a-z]/g, '');
      if (s.includes('atrisk') || s === 'risk') return 'AtRisk';
      if (s.includes('attention')) return 'NeedsAttention';
      return 'OnTrack';
    };

    return this.prisma.teamMemberMetadata.upsert({
      where: { employeeId_managerId: { employeeId, managerId } },
      update: {
        ...(notes !== undefined ? { notes } : {}),
        ...(risk ? { risk: mapRisk(risk) } : {}),
        ...(goalProgress !== undefined ? { goalProgress: Number(goalProgress) } : {}),
        ...(workload !== undefined ? { workload: Number(workload) } : {}),
        ...(nextOneToOne ? { nextOneToOne } : {}),
      },
      create: { id: `TMM-${Date.now()}`, employeeId, managerId, focus: 'Team delivery', goalLabel: 'Quarterly priorities', workload: Number(workload) || 70, goalProgress: Number(goalProgress) || 60, nextOneToOne: nextOneToOne || 'TBD', risk: mapRisk(risk), notes: notes || '' },
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** PATCH action=UPDATE_LEADER — {teamId, leaderId, managerId}. */
  private async updateLeader(user: { id: string; userRole: string }, body: any) {
    const { teamId, leaderId } = body ?? {};
    if (!teamId || !leaderId) {
      throw new BadRequestException('teamId and leaderId are required.');
    }

    const team = await this.prisma.managedTeam.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found.');
    this.assertCanManage(user, team.managerId);

    // New leader must not already lead another team in the same department.
    const conflict = await this.prisma.managedTeam.findFirst({
      where: { leaderId, department: team.department, id: { not: teamId } },
      include: { leader: true },
    });
    if (conflict) {
      this.throwDepartmentConflict(
        conflict.leader?.name || 'Selected employee',
        conflict.name,
        team.department,
        `${conflict.leader?.name || 'Selected employee'} is already the Team Leader of "${conflict.name}" in the ${team.department} department.`,
      );
    }

    const updated = await this.prisma.managedTeam.update({
      where: { id: teamId },
      data: { leaderId },
      include: {
        manager: true, leader: true,
        members: { include: { employee: true } },
      },
    });

    if (team.leaderId !== leaderId) {
      await this.notify.notifyUser({
        userId: leaderId,
        title: 'You are now a Team Leader',
        message: `You have been made the leader of team "${updated.name}" (${updated.department}).`,
        type: 'Meeting',
        linkUrl: '/my-team',
      });
    }

    return this.formatTeam(updated, await this.loadMetadata(updated.managerId));
  }

  /** PATCH action=ADD_MEMBERS — {teamId, employeeIds[], managerId}. Returns pre-wrapped payload with top-level addedCount. */
  private async addMembers(user: { id: string; userRole: string }, body: any) {
    const { teamId, employeeIds = [] } = body ?? {};
    if (!teamId || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      throw new BadRequestException('teamId and a non-empty employeeIds array are required.');
    }

    const team = await this.prisma.managedTeam.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found.');
    this.assertCanManage(user, team.managerId);

    await this.assertMembersAvailableForDepartment(employeeIds, team.department);

    const created = await this.prisma.teamMember.createMany({
      data: employeeIds.map((employeeId: string) => ({ teamId, employeeId })),
      skipDuplicates: true,
    });

    const updated = await this.prisma.managedTeam.findUnique({
      where: { id: teamId },
      include: {
        manager: true, leader: true,
        members: { include: { employee: true } },
      },
    });
    if (!updated) throw new NotFoundException('Team not found.');

    if (created.count > 0) {
      await this.notify.notifyUsers(employeeIds, {
        title: 'You have been added to a team',
        message: `You have been added as a member of team "${updated.name}" (${updated.department}).`,
        type: 'Meeting',
        linkUrl: '/my-team',
      });
    }

    // Pre-wrapped (has `success` key) so the interceptor passes it through —
    // the frontend reads top-level `json.addedCount`.
    return {
      success: true,
      data: this.formatTeam(updated, await this.loadMetadata(updated.managerId)),
      addedCount: created.count,
    };
  }

  /** PATCH action=REMOVE_MEMBER — {teamId, employeeId, managerId}. */
  private async removeMember(user: { id: string; userRole: string }, body: any) {
    const { teamId, employeeId } = body ?? {};
    if (!teamId || !employeeId) {
      throw new BadRequestException('teamId and employeeId are required.');
    }

    const team = await this.prisma.managedTeam.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found.');
    this.assertCanManage(user, team.managerId);

    // Only the TeamMember row is removed — the Employee record is preserved.
    await this.prisma.teamMember.deleteMany({ where: { teamId, employeeId } });

    const updated = await this.prisma.managedTeam.findUnique({
      where: { id: teamId },
      include: {
        manager: true, leader: true,
        members: { include: { employee: true } },
      },
    });
    if (!updated) throw new NotFoundException('Team not found.');

    await this.notify.notifyUser({
      userId: employeeId,
      title: 'Removed from team',
      message: `You have been removed from team "${team.name}" (${team.department}).`,
      type: 'Meeting',
      linkUrl: '/my-team',
    });

    return this.formatTeam(updated, await this.loadMetadata(updated.managerId));
  }

  /** Throws a 409 when any of the employees are already assigned within the department. */
  private async assertMembersAvailableForDepartment(employeeIds: string[], department: string) {
    if (!employeeIds || employeeIds.length === 0) return;

    const memberships = await this.prisma.teamMember.findMany({
      where: { employeeId: { in: employeeIds } },
      include: { team: true, employee: true },
    });
    const conflictingMembership = memberships.find((m) => m.team.department === department);
    if (conflictingMembership) {
      this.throwDepartmentConflict(
        conflictingMembership.employee?.name || 'Selected employee',
        conflictingMembership.team.name,
        department,
        `${conflictingMembership.employee?.name || 'Selected employee'} is already a member of "${conflictingMembership.team.name}" in the ${department} department.`,
      );
    }

    const leadingTeams = await this.prisma.managedTeam.findMany({
      where: { leaderId: { in: employeeIds }, department },
      include: { leader: true },
    });
    if (leadingTeams.length > 0) {
      const leading = leadingTeams[0];
      this.throwDepartmentConflict(
        leading.leader?.name || 'Selected employee',
        leading.name,
        department,
        `${leading.leader?.name || 'Selected employee'} is already the Team Leader of "${leading.name}" in the ${department} department.`,
      );
    }
  }

  private assertCanManage(user: { id: string; userRole: string }, teamManagerId: string) {
    if (user.userRole !== 'admin' && teamManagerId !== user.id) {
      throw new ForbiddenException('You can only modify teams you manage.');
    }
  }

  /** 409 payload matching the frontend conflict modal contract ({code, message, conflict}). */
  private throwDepartmentConflict(
    employeeName: string,
    existingTeamName: string,
    department: string,
    message: string,
  ): never {
    throw new HttpException(
      {
        statusCode: HttpStatus.CONFLICT,
        code: 'DEPARTMENT_ASSIGNMENT_CONFLICT',
        message,
        conflict: { employeeName, existingTeamName, department },
      },
      HttpStatus.CONFLICT,
    );
  }

  private async loadMetadata(managerId: string) {
    const metadataList = await this.prisma.teamMemberMetadata.findMany({
      where: { managerId },
    });
    return new Map(metadataList.map((m) => [m.employeeId, m]));
  }

  private formatTeam(team: any, metadataMap: Map<string, any>) {
    const mapRisk = (risk: any) =>
      risk === 'AtRisk' ? 'At risk' : risk === 'NeedsAttention' ? 'Needs attention' : 'On track';
    const mapMember = (emp: any) => {
      const meta = metadataMap.get(emp.id);
      return {
        employee: {
          id: emp.id,
          employeeCode: emp.employeeCode,
          name: emp.name,
          role: emp.roleTitle,
          department: emp.department,
          email: emp.email,
          phone: emp.phone || '',
          avatar: emp.avatarUrl || '',
          status: emp.status,
          joinDate: emp.joinDate,
          location: emp.location,
          salary: Number(emp.salary),
        },
        metadata: {
          employeeId: emp.id,
          focus: meta?.focus || '',
          workload: meta?.workload ?? 70,
          goalProgress: meta?.goalProgress ?? 60,
          goalLabel: meta?.goalLabel || '',
          nextOneToOne: meta?.nextOneToOne || '',
          risk: meta ? mapRisk(meta.risk) : 'On track',
          notes: meta?.notes || '',
        },
      };
    };
    return {
      id: team.id,
      name: team.name,
      department: team.department,
      manager: team.manager.name,
      leaderId: team.leaderId,
      focus: team.focus,
      leader: mapMember(team.leader),
      members: team.members.map(({ employee }: any) => mapMember(employee)),
    };
  }
}
