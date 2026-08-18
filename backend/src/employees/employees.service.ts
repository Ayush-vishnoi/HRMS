import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { department?: string; status?: string; search?: string }) {
    const where: any = {};
    if (query.department) where.department = query.department;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { employeeCode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.employee.findMany({
      where,
      select: {
        id: true,
        employeeCode: true,
        name: true,
        email: true,
        roleTitle: true,
        userRole: true,
        department: true,
        phone: true,
        avatarUrl: true,
        status: true,
        joinDate: true,
        location: true,
        managerId: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        manager: {
          select: { id: true, name: true, roleTitle: true, avatarUrl: true },
        },
        directReports: {
          select: { id: true, name: true, roleTitle: true, avatarUrl: true },
        },
        leaveBalances: true,
        assignedAssets: true,
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async create(data: any) {
    const count = await this.prisma.employee.count();
    const employeeCode = data.employeeCode || `EMP-${new Date().getUTCFullYear()}-${String(count + 1).padStart(3, '0')}`;

    return this.prisma.employee.create({
      data: {
        id: data.id || undefined,
        employeeCode,
        name: data.name,
        email: data.email,
        roleTitle: data.role || data.roleTitle || 'Employee',
        userRole: data.userRole || 'employee',
        department: data.department || 'General',
        phone: data.phone || null,
        avatarUrl: data.avatar || data.avatarUrl || null,
        status: data.status || 'Active',
        joinDate: data.joinDate || new Date().toISOString().slice(0, 10),
        location: data.location || 'Bengaluru, Karnataka',
        salary: Number(data.salary) || 0,
        managerId: data.managerId || null,
      },
      select: {
        id: true,
        employeeCode: true,
        name: true,
        email: true,
        roleTitle: true,
        userRole: true,
        department: true,
        phone: true,
        avatarUrl: true,
        status: true,
        joinDate: true,
        location: true,
        salary: true,
        managerId: true,
      },
    });
  }

  async update(id: string, data: any) {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException('Employee not found');
    return this.prisma.employee.update({ where: { id }, data });
  }
}
