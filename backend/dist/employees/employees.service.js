"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let EmployeesService = class EmployeesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const where = {};
        if (query.department)
            where.department = query.department;
        if (query.status)
            where.status = query.status;
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
    async findOne(id) {
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
        if (!employee)
            throw new common_1.NotFoundException('Employee not found');
        return employee;
    }
    async create(data) {
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
    async update(id, data) {
        const employee = await this.prisma.employee.findUnique({ where: { id } });
        if (!employee)
            throw new common_1.NotFoundException('Employee not found');
        return this.prisma.employee.update({ where: { id }, data });
    }
};
exports.EmployeesService = EmployeesService;
exports.EmployeesService = EmployeesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EmployeesService);
//# sourceMappingURL=employees.service.js.map