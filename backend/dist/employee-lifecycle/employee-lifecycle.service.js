"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeLifecycleService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const argon2 = __importStar(require("argon2"));
const prisma_service_1 = require("../prisma/prisma.service");
const notify_service_1 = require("../common/notifications/notify.service");
const default_balances_1 = require("../leaves/default-balances");
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
const DEPARTMENT_ASSET_SETS = {
    'Engineering': ['Laptop', 'Monitor'],
    'AI/ML': ['Laptop', 'Monitor'],
    'Marketing': ['Laptop', 'Mobile'],
    'Human Resources': ['Laptop', 'AccessCard'],
    'Finance': ['Laptop', 'AccessCard'],
    'Executive Leadership': ['Laptop', 'Mobile', 'AccessCard'],
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDay(date = new Date()) {
    return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
function makeId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
let EmployeeLifecycleService = class EmployeeLifecycleService {
    prisma;
    notify;
    constructor(prisma, notify) {
        this.prisma = prisma;
        this.notify = notify;
    }
    async findAll(employeeId) {
        const [candidates, employees, onboardingHistory, offboardingHistory, employmentProfiles, changeRequests, salaryRevisions, bgvRecords, onboardingTasks] = await Promise.all([
            this.prisma.recruitmentCandidate.findMany({
                where: { stage: { in: ['Shortlisted', 'Selected', 'Offer'] }, onboarding: null },
                include: { job: { select: { id: true, title: true, department: true, location: true } }, recruitment_offers: { orderBy: { version: 'desc' }, take: 1, include: { document_signatures: true } } },
                orderBy: { updatedAt: 'desc' },
            }),
            this.prisma.employee.findMany({
                select: { id: true, employeeCode: true, name: true, email: true, roleTitle: true, userRole: true, department: true, phone: true, avatarUrl: true, status: true, joinDate: true, location: true, salary: true, managerId: true, manager: { select: { id: true, name: true, employeeCode: true } } },
                orderBy: { name: 'asc' },
            }),
            this.prisma.employeeOnboarding.findMany({
                include: { candidate: { select: { id: true, name: true, email: true, currentRole: true } }, employee: { select: { id: true, employeeCode: true, name: true, email: true, roleTitle: true, department: true } }, onboardedBy: { select: { id: true, name: true, employeeCode: true } }, onboarding_tasks: true, background_verifications: true },
                orderBy: { onboardedAt: 'desc' }, take: 50,
            }),
            this.prisma.employeeOffboarding.findMany({
                include: { employee: { select: { id: true, employeeCode: true, name: true, email: true, roleTitle: true, department: true } }, offboardedBy: { select: { id: true, name: true, employeeCode: true } } },
                orderBy: { offboardedAt: 'desc' }, take: 50,
            }),
            this.prisma.employee_employment_profiles.findMany({ where: employeeId ? { employee_id: employeeId } : {}, orderBy: { created_at: 'desc' } }),
            this.prisma.employee_change_requests.findMany({
                where: employeeId ? { employee_id: employeeId } : {},
                include: { employees_employee_change_requests_employee_idToemployees: { select: { id: true, name: true, employeeCode: true, department: true, roleTitle: true } } },
                orderBy: { created_at: 'desc' },
            }),
            this.prisma.salaryRevisionHistory.findMany({ where: employeeId ? { employeeId } : {}, orderBy: { effectiveDate: 'desc' } }),
            this.prisma.backgroundVerification.findMany({ orderBy: { createdAt: 'desc' } }),
            this.prisma.onboardingTask.findMany({ orderBy: { created_at: 'desc' } }),
        ]);
        return { candidates, employees, onboardingHistory, offboardingHistory, employmentProfiles, changeRequests, salaryRevisions, bgvRecords, onboardingTasks };
    }
    async onboard(user, body) {
        const { candidateId, name, email, phone, avatarUrl, roleTitle, department, location, joinDate, salary = 0, managerId, userRole = 'employee', probationMonths = 6, dateOfBirth, gender, currentAddress, emergencyContactName, emergencyContactPhone, emergencyContactRelation, } = body;
        const plainPassword = `Hr!${(0, node_crypto_1.randomBytes)(6).toString('base64url')}9a`;
        const passwordHash = await argon2.hash(plainPassword);
        return this.prisma.$transaction(async (tx) => {
            const candidate = await tx.recruitmentCandidate.findUnique({ where: { id: candidateId }, include: { onboarding: true } });
            if (!candidate)
                throw new Error('Candidate not found.');
            if (candidate.onboarding)
                throw new Error('Candidate already onboarded.');
            const year = new Date().getUTCFullYear();
            const prefix = `EMP-${year}-`;
            const sameYearCount = await tx.employee.count({ where: { employeeCode: { startsWith: prefix } } });
            let seq = sameYearCount + 1;
            let employeeCode = `${prefix}${String(seq).padStart(3, '0')}`;
            while (await tx.employee.findUnique({ where: { employeeCode } })) {
                seq += 1;
                employeeCode = `${prefix}${String(seq).padStart(3, '0')}`;
            }
            const employee = await tx.employee.create({
                data: { employeeCode, name, email, passwordHash, phone: phone || null, avatarUrl: avatarUrl || DEFAULT_AVATAR, roleTitle, userRole, department, joinDate, location, salary: Number(salary), managerId: managerId || null, status: 'Onboarding', mustChangePassword: true },
            });
            const onboarding = await tx.employeeOnboarding.create({
                data: { candidateId: candidate.id, employeeId: employee.id, onboardedById: user.id, probation_start_date: joinDate ? new Date(joinDate) : new Date(), probation_review_date: (() => { const d = joinDate ? new Date(joinDate) : new Date(); d.setMonth(d.getMonth() + Number(probationMonths)); return d; })(), updated_at: new Date() },
            });
            await tx.candidate_stage_history.create({
                data: {
                    id: crypto.randomUUID(),
                    candidate_id: candidate.id,
                    from_stage: candidate.stage,
                    to_stage: 'Joined',
                    changed_by_id: user.id,
                    note: 'Converted to employee via onboarding',
                },
            });
            await tx.recruitmentCandidate.update({
                where: { id: candidate.id },
                data: { stage: 'Joined' },
            });
            const joinDateTime = new Date(joinDate || new Date());
            const probationEnd = new Date(joinDateTime);
            probationEnd.setMonth(probationEnd.getMonth() + Number(probationMonths));
            await tx.employee_employment_profiles.create({
                data: { id: `emp-prof-${employee.id}`, employee_id: employee.id, date_of_joining: joinDateTime, probation_end_date: probationEnd, lifecycle_status: 'Probation', employment_type: 'Full_Time', work_mode: 'Office', notice_period_days: 60, updated_at: new Date() },
            });
            await tx.leaveBalance.createMany({
                data: (0, default_balances_1.defaultLeaveBalanceRows)(employee.id, new Date().getUTCFullYear()),
                skipDuplicates: true,
            });
            await tx.employee_personal_profiles.create({
                data: {
                    id: `pp-${employee.id}`,
                    employee_id: employee.id,
                    date_of_birth: dateOfBirth ? new Date(dateOfBirth) : null,
                    gender: gender || null,
                    current_address: currentAddress || null,
                    emergency_contact_name: emergencyContactName || null,
                    emergency_contact_phone: emergencyContactPhone || null,
                    emergency_contact_relation: emergencyContactRelation || null,
                    updated_at: new Date(),
                },
            });
            const defaultTasks = [
                { title: 'Verify Aadhaar / PAN / Identity Documents', owner: 'HR' },
                { title: 'Initiate Education & Employment BGV Check', owner: 'HR' },
                { title: 'Assign Team Buddy & Schedule 1-on-1 Introduction', owner: 'Manager' },
                { title: 'Provision Corporate Laptop, Email & VPN Access', owner: 'IT' },
                { title: 'Bank Account & Statutory Payroll Tax Setup', owner: 'Finance' },
                { title: 'Complete POSH Compliance & Information Security Training', owner: 'Onboarding' },
            ];
            for (const t of defaultTasks) {
                await tx.onboardingTask.create({ data: { onboarding_id: onboarding.id, title: t.title, owner: t.owner, status: 'Pending', updated_at: new Date() } });
            }
            const basic = Math.round(Number(salary) * 0.5 / 12);
            const hra = Math.round(Number(salary) * 0.25 / 12);
            const special = Math.max(0, Math.round(Number(salary) / 12) - basic - hra - 1600 - 1250);
            await tx.salaryStructure.upsert({
                where: { employeeId: employee.id },
                update: { ctcAnnual: Number(salary), basicMonthly: basic, hraMonthly: hra, specialAllowanceMonthly: special },
                create: { id: `sal-${employee.id}`, employeeId: employee.id, ctcAnnual: Number(salary), basicMonthly: basic, hraMonthly: hra, conveyanceMonthly: 1600, specialAllowanceMonthly: special, medicalAllowanceMonthly: 1250, pfEmployerMonthly: 1800, pfEmployeeMonthly: 1800, ptMonthly: 200, effectiveFrom: joinDate || new Date().toISOString().split('T')[0] },
            });
            await tx.documentRequest.create({
                data: { id: makeId('dreq'), employeeId: employee.id, documentType: 'Address Proof', reason: 'Mandatory KYC document required during onboarding. Please upload a valid address proof (Aadhaar, utility bill, or rental agreement).', status: 'Requested', requestedOn: formatDay() },
            });
            await tx.employee_bank_details.create({
                data: { id: `bank-${employee.id}`, employee_id: employee.id, status: 'Pending', updated_at: new Date() },
            });
            const assetCategories = DEPARTMENT_ASSET_SETS[department] ?? ['Laptop'];
            let assetSeq = await tx.assetRequest.count() + 1;
            for (const category of assetCategories) {
                const existing = await tx.assetRequest.findUnique({ where: { id: `AR-${String(assetSeq).padStart(3, '0')}` } });
                if (existing)
                    assetSeq += 1;
                await tx.assetRequest.create({
                    data: { id: `AR-${String(assetSeq).padStart(3, '0')}`, type: 'NewAsset', status: 'Pending', requestedById: employee.id, category: category, reason: `Standard ${department} onboarding kit — ${category}`, updatedAt: new Date() },
                }).catch(() => { });
                assetSeq += 1;
            }
            await tx.auditLog.create({ data: { id: `audit-${Date.now()}`, action: 'CREATE', module: 'Onboarding', employeeId: employee.id, details: JSON.stringify({ name: employee.name, code: employee.employeeCode }) } });
            await tx.userNotification.create({ data: { id: `notif-${Date.now()}`, userId: employee.id, title: 'Welcome to the Organization!', message: `Your employee profile has been created. Your Employee ID is ${employeeCode}. Please complete your pending onboarding requests (password change, address proof, bank details).`, type: 'Celebration', linkUrl: '/dashboard' } });
            void this.notify.notifyAdmins({
                title: 'New Employee Onboarded',
                message: `${employee.name} (${employeeCode}) has been onboarded to ${department}. Pending HR actions: assign assets, collect address proof & bank details.`,
                type: 'Onboarding',
                linkUrl: '/employee-lifecycle',
            });
            return { employee, onboarding, temporaryPassword: plainPassword };
        }, { timeout: 30_000, maxWait: 10_000 });
    }
    async convertOffer(user, body) {
        const { candidateId, customJoinDate, customManagerId, customProbationMonths, customDateOfBirth, customGender, customCurrentAddress, customEmergencyContactName, customEmergencyContactPhone, customEmergencyContactRelation } = body ?? {};
        if (!candidateId)
            throw new Error('candidateId is required.');
        const candidate = await this.prisma.recruitmentCandidate.findUnique({
            where: { id: candidateId },
            include: {
                onboarding: true,
                job: { select: { id: true, title: true, department: true, location: true } },
                recruitment_offers: { orderBy: { version: 'desc' }, take: 1 },
            },
        });
        if (!candidate)
            throw new Error('Candidate not found.');
        if (candidate.onboarding)
            throw new Error('Candidate already onboarded.');
        const offer = candidate.recruitment_offers[0];
        if (!offer)
            throw new Error('Candidate has no recruitment offer to convert.');
        const joinDate = customJoinDate || offer.proposed_join_date || new Date().toISOString().split('T')[0];
        const salary = Number(offer.offered_ctc ?? 0);
        return this.onboard(user, {
            candidateId,
            name: candidate.name,
            email: candidate.email,
            phone: candidate.phone,
            avatarUrl: candidate.avatarUrl,
            roleTitle: offer.offered_title || candidate.currentRole,
            department: candidate.job?.department || 'General',
            location: candidate.job?.location || candidate.location,
            joinDate,
            salary,
            managerId: customManagerId || null,
            probationMonths: Number(customProbationMonths || 6),
            dateOfBirth: customDateOfBirth,
            gender: customGender,
            currentAddress: customCurrentAddress,
            emergencyContactName: customEmergencyContactName,
            emergencyContactPhone: customEmergencyContactPhone,
            emergencyContactRelation: customEmergencyContactRelation,
        });
    }
    async updateTask(taskId, status) {
        return this.prisma.onboardingTask.update({
            where: { id: taskId },
            data: { status: status, completedAt: status === 'Completed' ? new Date() : null, updated_at: new Date() },
        });
    }
    async updateBgv(bgvId, status, vendorNotes) {
        return this.prisma.backgroundVerification.update({
            where: { id: bgvId },
            data: { status: status, vendor_notes: vendorNotes || null, completed_at: status === 'Verified' ? new Date() : null, updated_at: new Date() },
        });
    }
    async probationAction(body) {
        const { employeeId, decision, notes, extensionMonths } = body;
        const profile = await this.prisma.employee_employment_profiles.findUnique({ where: { employee_id: employeeId } });
        if (!profile)
            throw new Error('Employment profile not found');
        const now = new Date();
        if (decision === 'Confirm') {
            const updated = await this.prisma.employee_employment_profiles.update({ where: { employee_id: employeeId }, data: { lifecycle_status: 'Active', confirmation_date: now, updated_at: now } });
            await this.prisma.employee.update({ where: { id: employeeId }, data: { status: 'Active' } });
            await this.prisma.userNotification.create({ data: { id: `notif-${Date.now()}`, userId: employeeId, title: 'Congratulations on Probation Confirmation!', message: 'Your employment has been confirmed successfully.', type: 'Celebration', linkUrl: '/employees/' + employeeId } });
            return updated;
        }
        if (decision === 'Extend') {
            const currentEnd = profile.probation_end_date ? new Date(profile.probation_end_date) : now;
            const newEnd = new Date(currentEnd);
            newEnd.setMonth(newEnd.getMonth() + Number(extensionMonths || 3));
            const updated = await this.prisma.employee_employment_profiles.update({ where: { employee_id: employeeId }, data: { lifecycle_status: 'Probation', probation_end_date: newEnd, updated_at: now } });
            await this.prisma.userNotification.create({ data: { id: `notif-${Date.now()}`, userId: employeeId, title: 'Probation Period Extended', message: `Your probation has been extended. Reason: ${notes || 'Performance review'}`, type: 'Reminder', linkUrl: '/employee-lifecycle' } });
            return updated;
        }
    }
    async transferRequest(user, body) {
        const { employeeId, toDepartment, toLocation, toManagerId, effectiveDate, reason } = body;
        const emp = await this.prisma.employee.findUnique({ where: { id: employeeId } });
        if (!emp)
            throw new Error('Employee not found');
        const changeReq = await this.prisma.employee_change_requests.create({
            data: { id: `CHG-${Date.now().toString(36)}`, employee_id: employeeId, requested_by_id: user.id, type: 'Transfer', status: 'Approved', effective_date: effectiveDate ? new Date(effectiveDate) : new Date(), reason: reason || 'Departmental reorganization', updated_at: new Date() },
        });
        await this.prisma.employee.update({ where: { id: employeeId }, data: { department: toDepartment || emp.department, location: toLocation || emp.location, managerId: toManagerId || emp.managerId } });
        await this.prisma.auditLog.create({ data: { id: `audit-${Date.now()}`, action: 'UPDATE', module: 'Transfer', employeeId, details: JSON.stringify({ fromDept: emp.department, toDept: toDepartment, reason }) } });
        await this.prisma.userNotification.create({ data: { id: `notif-${Date.now()}`, userId: employeeId, title: 'Department / Location Transfer Approved', message: `Your transfer to ${toDepartment || emp.department} is effective from ${effectiveDate}.`, type: 'Approval', linkUrl: '/employees/' + employeeId } });
        return changeReq;
    }
    async promotionRequest(user, body) {
        const { employeeId, newDesignation, newCtcAnnual, effectiveDate = new Date().toISOString().split('T')[0], reason, source = 'PromotionWorkflow' } = body;
        const emp = await this.prisma.employee.findUnique({ where: { id: employeeId } });
        if (!emp)
            throw new Error('Employee not found');
        const currentStructure = await this.prisma.salaryStructure.findUnique({ where: { employeeId } });
        const previousCtc = currentStructure?.ctcAnnual ?? Number(emp.salary ?? 0);
        const newCtc = Number(newCtcAnnual) || previousCtc;
        const newBasic = Math.round(newCtc * 0.5 / 12);
        const newHra = Math.round(newCtc * 0.25 / 12);
        const newSpecial = Math.max(0, Math.round(newCtc / 12) - newBasic - newHra - 1600 - 1250);
        return this.prisma.$transaction(async (tx) => {
            await tx.employee.update({ where: { id: employeeId }, data: { roleTitle: newDesignation || emp.roleTitle, salary: newCtc } });
            await tx.salaryStructure.upsert({
                where: { employeeId },
                update: { ctcAnnual: newCtc, basicMonthly: newBasic, hraMonthly: newHra, specialAllowanceMonthly: newSpecial, effectiveFrom: effectiveDate },
                create: { id: `sal-${employeeId}`, employeeId, ctcAnnual: newCtc, basicMonthly: newBasic, hraMonthly: newHra, conveyanceMonthly: 1600, specialAllowanceMonthly: newSpecial, medicalAllowanceMonthly: 1250, pfEmployerMonthly: 1800, pfEmployeeMonthly: 1800, ptMonthly: 200, effectiveFrom: effectiveDate },
            });
            const revision = await tx.salaryRevisionHistory.create({
                data: { id: `rev-${Date.now().toString(36)}`, employeeId, previousCtcAnnual: Number(previousCtc), newCtcAnnual: Number(newCtc), previousBasicMonthly: Number(currentStructure?.basicMonthly ?? 0), newBasicMonthly: newBasic, previousHraMonthly: Number(currentStructure?.hraMonthly ?? 0), newHraMonthly: newHra, previousSpecialMonthly: Number(currentStructure?.specialAllowanceMonthly ?? 0), newSpecialMonthly: newSpecial, effectiveDate, revisionType: 'Promotion', reason: reason || `Promoted to ${newDesignation}`, source, approvedById: user.id, approvedAt: new Date() },
            });
            await tx.auditLog.create({ data: { id: `audit-${Date.now()}`, action: 'UPDATE', module: 'Promotion', employeeId, details: JSON.stringify({ previousRole: emp.roleTitle, newRole: newDesignation, previousCtc, newCtc }) } });
            await tx.userNotification.create({ data: { id: `notif-${Date.now()}`, userId: employeeId, title: 'Congratulations on Your Promotion!', message: `You have been promoted to ${newDesignation}.`, type: 'Celebration', linkUrl: '/employees/' + employeeId } });
            return revision;
        });
    }
    async getBankDetails(userId) {
        return this.prisma.employee_bank_details.findUnique({ where: { employee_id: userId } });
    }
    async submitBankDetails(user, body) {
        const account_number = String(body?.accountNumber ?? '').trim();
        const ifsc_code = String(body?.ifscCode ?? '').trim().toUpperCase();
        const bank_name = String(body?.bankName ?? '').trim();
        const account_holder_name = String(body?.accountHolderName ?? '').trim();
        if (!account_holder_name || !bank_name || !account_number || !ifsc_code) {
            throw new common_1.BadRequestException('All bank detail fields are required.');
        }
        if (!/^\d{9,18}$/.test(account_number)) {
            throw new common_1.BadRequestException('Account number must be 9-18 digits.');
        }
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc_code)) {
            throw new common_1.BadRequestException('Invalid IFSC code format (expected e.g. HDFC0001234).');
        }
        const now = new Date();
        const record = await this.prisma.employee_bank_details.upsert({
            where: { employee_id: user.id },
            update: { account_number, ifsc_code, bank_name, account_holder_name, status: 'Submitted', submitted_at: now, updated_at: now },
            create: { id: `bank-${user.id}`, employee_id: user.id, account_number, ifsc_code, bank_name, account_holder_name, status: 'Submitted', submitted_at: now, updated_at: now },
        });
        void this.notify.notifyAdmins({
            title: 'Bank Details Submitted',
            message: `${user?.name ?? 'An employee'} submitted bank details for payroll verification.`,
            type: 'Onboarding',
            linkUrl: '/employee-lifecycle',
        });
        return record;
    }
};
exports.EmployeeLifecycleService = EmployeeLifecycleService;
exports.EmployeeLifecycleService = EmployeeLifecycleService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, notify_service_1.NotifyService])
], EmployeeLifecycleService);
//# sourceMappingURL=employee-lifecycle.service.js.map