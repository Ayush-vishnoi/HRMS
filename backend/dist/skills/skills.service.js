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
exports.SkillsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SkillsService = class SkillsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(employeeId) {
        const [allSkills, employeeSkills] = await Promise.all([
            this.prisma.skillMaster.findMany({ orderBy: { name: 'asc' } }),
            this.prisma.employeeSkill.findMany({ where: employeeId ? { employeeId } : {}, include: { skill: true } }),
        ]);
        return { allSkills, employeeSkills };
    }
    async upsertSkill(body) {
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
};
exports.SkillsService = SkillsService;
exports.SkillsService = SkillsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SkillsService);
//# sourceMappingURL=skills.service.js.map