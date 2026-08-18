import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PerformanceService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, userRole: string, employeeId?: string) {
    const targetId = employeeId || userId;
    const [kras, goals, cycles, feedback, pips] = await Promise.all([
      this.prisma.performanceKra.findMany({ where: userRole === 'admin' ? {} : { assignedToId: targetId }, include: { assignedTo: { select: { id: true, name: true } }, assignedBy: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.performanceGoal.findMany({ where: userRole === 'admin' ? {} : { owner_employee_id: targetId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.performance_review_cycles.findMany({ orderBy: { start_date: 'desc' } }),
      this.prisma.performance_feedback.findMany({ where: { recipient_id: targetId }, orderBy: { created_at: 'desc' }, take: 20 }),
      this.prisma.performance_improvement_plans.findMany({ where: userRole === 'admin' ? {} : { employee_id: targetId }, orderBy: { created_at: 'desc' } }),
    ]);
    return { kras, goals, cycles, feedback, pips };
  }

  async handleAction(userId: string, body: any) {
    const { action } = body;

    if (action === 'create_kra') {
      return this.prisma.performanceKra.create({
        data: { id: `KRA-${Date.now().toString(36)}`, title: body.title, description: body.description, keyResult: body.keyResult, category: body.category || 'Delivery', assignedToId: body.assignedToId, assignedById: userId, assignedOn: new Date().toISOString().split('T')[0], dueDate: body.dueDate, priority: body.priority || 'Medium', weightage: body.weightage || 20 },
      });
    }

    if (action === 'update_kra') {
      return this.prisma.performanceKra.update({ where: { id: body.id }, data: { status: body.status, progress: body.progress !== undefined ? Number(body.progress) : undefined, lastUpdate: body.lastUpdate } });
    }

    if (action === 'submit_feedback') {
      return this.prisma.performance_feedback.create({
        data: { id: `FB-${Date.now().toString(36)}`, author_id: userId, recipient_id: body.recipientId, cycle_id: body.cycleId || null, review_type: body.reviewType || 'Continuous', content: body.content, rating: body.rating ? Number(body.rating) : null, private: body.private || false, is_anonymous: body.isAnonymous || false },
      });
    }

    throw new Error('Invalid performance action');
  }
}
