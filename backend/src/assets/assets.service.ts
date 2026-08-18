import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  async findAll(employeeId?: string, isAdmin = false) {
    return this.prisma.asset.findMany({
      where: isAdmin ? undefined : { assignedToId: employeeId },
      orderBy: { id: 'asc' },
      include: { assignedTo: { select: { id: true, name: true, employeeCode: true, department: true } } },
    });
  }

  async create(data: any) {
    const count = await this.prisma.asset.count();
    return this.prisma.asset.create({
      data: {
        id: data.id || `AST-${String(count + 1).padStart(3, '0')}`,
        assetTag: data.assetTag || `APX-${(data.category || 'LT').slice(0, 2).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
        category: data.category,
        name: data.name,
        brand: data.brand,
        model: data.model,
        serialNumber: data.serialNumber,
        purchaseDate: data.purchaseDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        purchaseCost: data.purchaseCost || null,
        warrantyUntil: data.warrantyUntil || null,
        status: data.status || 'Available',
        assignedToId: data.assignedToId || null,
        location: data.location || 'Bengaluru Office',
        condition: data.condition || 'Good',
        lastChecked: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        notes: data.notes || null,
      },
      include: { assignedTo: { select: { id: true, name: true, employeeCode: true, department: true } } },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.asset.update({
      where: { id },
      data: { ...data, lastChecked: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
      include: { assignedTo: { select: { id: true, name: true, employeeCode: true, department: true } } },
    });
  }
}
