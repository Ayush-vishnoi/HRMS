import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MyTeamService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, userRole: string, managerId?: string) {
    const targetManagerId = userRole === 'admin' && managerId ? managerId : userId;

    const teams = await this.prisma.managedTeam.findMany({
      where: { managerId: targetManagerId },
      include: {
        manager: true, leader: true,
        members: { include: { employee: true } },
      },
    });

    const metadataList = await this.prisma.teamMemberMetadata.findMany({ where: { managerId: targetManagerId } });
    const metadataMap = new Map(metadataList.map((m) => [m.employeeId, m]));

    return teams.map((team) => {
      const mapRisk = (risk: any) => risk === 'AtRisk' ? 'At risk' : risk === 'NeedsAttention' ? 'Needs attention' : 'On track';
      const mapMember = (emp: any) => {
        const meta = metadataMap.get(emp.id);
        return {
          employee: { id: emp.id, employeeCode: emp.employeeCode, name: emp.name, role: emp.roleTitle, department: emp.department, email: emp.email, phone: emp.phone || '', avatar: emp.avatarUrl || '', status: emp.status, joinDate: emp.joinDate, location: emp.location, salary: Number(emp.salary) },
          metadata: { employeeId: emp.id, focus: meta?.focus || '', workload: meta?.workload ?? 70, goalProgress: meta?.goalProgress ?? 60, goalLabel: meta?.goalLabel || '', nextOneToOne: meta?.nextOneToOne || '', risk: meta ? mapRisk(meta.risk) : 'On track', notes: meta?.notes || '' },
        };
      };
      return { id: team.id, name: team.name, department: team.department, manager: team.manager.name, leaderId: team.leaderId, focus: team.focus, leader: mapMember(team.leader), members: team.members.map(({ employee }) => mapMember(employee)) };
    });
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
}
