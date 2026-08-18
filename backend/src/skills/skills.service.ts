import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SkillsService {
  constructor(private prisma: PrismaService) {}

  async findAll(employeeId?: string) {
    const [allSkills, employeeSkills] = await Promise.all([
      this.prisma.skillMaster.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.employeeSkill.findMany({ where: employeeId ? { employeeId } : {}, include: { skill: true } }),
    ]);
    return { allSkills, employeeSkills };
  }

  async upsertSkill(body: any) {
    let skillId = body.skillId;
    if (!skillId && body.skillName) {
      const skill = await this.prisma.skillMaster.upsert({
        where: { name: body.skillName },
        update: {},
        create: { name: body.skillName, category: body.category || 'Engineering' },
      });
      skillId = skill.id;
    }
    return this.prisma.employeeSkill.upsert({
      where: { employeeId_skillId: { employeeId: body.employeeId, skillId } },
      update: { proficiency: body.proficiency || 'Intermediate', yearsExp: Number(body.yearsExp) || 2.0, verified: true },
      create: { employeeId: body.employeeId, skillId, proficiency: body.proficiency || 'Intermediate', yearsExp: Number(body.yearsExp) || 2.0, verified: true },
      include: { skill: true },
    });
  }
}
