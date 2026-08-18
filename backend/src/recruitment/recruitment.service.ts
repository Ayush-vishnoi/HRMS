import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RecruitmentService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const [jobs, candidates, interviews, offers] = await Promise.all([
      this.prisma.recruitmentJob.findMany({ orderBy: { createdAt: 'desc' } }),
      this.prisma.recruitmentCandidate.findMany({ orderBy: { createdAt: 'desc' }, include: { job: { select: { id: true, title: true, department: true } } } }),
      this.prisma.recruitment_interviews.findMany({ orderBy: { starts_at: 'desc' }, include: { recruitment_candidates: { select: { id: true, name: true } } } }),
      this.prisma.recruitment_offers.findMany({ orderBy: { created_at: 'desc' }, include: { recruitment_candidates: { select: { id: true, name: true } } } }),
    ]);
    return { jobs, candidates, interviews, offers };
  }

  async getJobs(status?: string) {
    return this.prisma.recruitmentJob.findMany({ where: status ? { status: status as any } : {}, orderBy: { createdAt: 'desc' } });
  }

  async getCandidates(jobId?: string, stage?: string) {
    return this.prisma.recruitmentCandidate.findMany({
      where: { ...(jobId ? { jobId } : {}), ...(stage ? { stage: stage as any } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { job: { select: { id: true, title: true, department: true } } },
    });
  }

  async updateCandidateStage(id: string, stage: any, changedById: string, note?: string) {
    const candidate = await this.prisma.recruitmentCandidate.findUnique({ where: { id }, select: { stage: true } });
    await this.prisma.candidate_stage_history.create({ data: { candidate_id: id, from_stage: candidate?.stage, to_stage: stage, changed_by_id: changedById, note: note || null } });
    return this.prisma.recruitmentCandidate.update({ where: { id }, data: { stage } });
  }

  async createJob(data: any) {
    return this.prisma.recruitmentJob.create({
      data: { id: uuidv4(), title: data.title, department: data.department, location: data.location, employmentType: data.employmentType || 'FullTime', openings: data.openings || 1, status: data.status || 'Open', postedOn: new Date().toISOString().split('T')[0], description: data.description, requirements: data.requirements || [], responsibilities: data.responsibilities || [] },
    });
  }
}
