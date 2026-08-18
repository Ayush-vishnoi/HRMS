"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const employees_module_1 = require("./employees/employees.module");
const attendance_module_1 = require("./attendance/attendance.module");
const leaves_module_1 = require("./leaves/leaves.module");
const meetings_module_1 = require("./meetings/meetings.module");
const payroll_module_1 = require("./payroll/payroll.module");
const help_desk_module_1 = require("./help-desk/help-desk.module");
const notifications_module_1 = require("./notifications/notifications.module");
const analytics_module_1 = require("./analytics/analytics.module");
const assets_module_1 = require("./assets/assets.module");
const policies_module_1 = require("./policies/policies.module");
const documents_module_1 = require("./documents/documents.module");
const engagement_module_1 = require("./engagement/engagement.module");
const expenses_module_1 = require("./expenses/expenses.module");
const benefits_module_1 = require("./benefits/benefits.module");
const lms_module_1 = require("./lms/lms.module");
const skills_module_1 = require("./skills/skills.module");
const talent_module_1 = require("./talent/talent.module");
const my_team_module_1 = require("./my-team/my-team.module");
const exit_module_1 = require("./exit/exit.module");
const performance_module_1 = require("./performance/performance.module");
const recruitment_module_1 = require("./recruitment/recruitment.module");
const workforce_module_1 = require("./workforce/workforce.module");
const disciplinary_module_1 = require("./disciplinary/disciplinary.module");
const employee_lifecycle_module_1 = require("./employee-lifecycle/employee-lifecycle.module");
const calendar_module_1 = require("./calendar/calendar.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            employees_module_1.EmployeesModule,
            attendance_module_1.AttendanceModule,
            leaves_module_1.LeavesModule,
            meetings_module_1.MeetingsModule,
            payroll_module_1.PayrollModule,
            help_desk_module_1.HelpDeskModule,
            notifications_module_1.NotificationsModule,
            analytics_module_1.AnalyticsModule,
            assets_module_1.AssetsModule,
            policies_module_1.PoliciesModule,
            documents_module_1.DocumentsModule,
            engagement_module_1.EngagementModule,
            expenses_module_1.ExpensesModule,
            benefits_module_1.BenefitsModule,
            lms_module_1.LmsModule,
            skills_module_1.SkillsModule,
            talent_module_1.TalentModule,
            my_team_module_1.MyTeamModule,
            exit_module_1.ExitModule,
            performance_module_1.PerformanceModule,
            recruitment_module_1.RecruitmentModule,
            workforce_module_1.WorkforceModule,
            disciplinary_module_1.DisciplinaryModule,
            employee_lifecycle_module_1.EmployeeLifecycleModule,
            calendar_module_1.CalendarModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map