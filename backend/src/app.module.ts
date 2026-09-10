import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { LegacyResponseInterceptor } from './common/interceptors/legacy-response.interceptor';
import { LegacyExceptionFilter } from './common/filters/legacy-exception.filter';
import { PrismaModule } from './prisma/prisma.module';
import { NotifyModule } from './common/notifications/notify.module';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { AttendanceModule } from './attendance/attendance.module';
import { LeavesModule } from './leaves/leaves.module';
import { MeetingsModule } from './meetings/meetings.module';
import { PayrollModule } from './payroll/payroll.module';
import { HelpDeskModule } from './help-desk/help-desk.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AssetsModule } from './assets/assets.module';
import { PoliciesModule } from './policies/policies.module';
import { EngagementModule } from './engagement/engagement.module';
import { ExpensesModule } from './expenses/expenses.module';
import { BenefitsModule } from './benefits/benefits.module';
import { LmsModule } from './lms/lms.module';
import { SkillsModule } from './skills/skills.module';
import { TalentModule } from './talent/talent.module';
import { MyTeamModule } from './my-team/my-team.module';
import { ExitModule } from './exit/exit.module';
import { PerformanceModule } from './performance/performance.module';
import { RecruitmentModule } from './recruitment/recruitment.module';
import { WorkforceModule } from './workforce/workforce.module';
import { DisciplinaryModule } from './disciplinary/disciplinary.module';
import { EmployeeLifecycleModule } from './employee-lifecycle/employee-lifecycle.module';
import { CalendarModule } from './calendar/calendar.module';
import { ChatModule } from './chat/chat.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { TasksModule } from './tasks/tasks.module';
import { DocumentsModule } from './documents/documents.module';

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: LegacyExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LegacyResponseInterceptor,
    },
  ],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    NotifyModule,
    AuthModule,
    EmployeesModule,
    AttendanceModule,
    LeavesModule,
    MeetingsModule,
    PayrollModule,
    HelpDeskModule,
    NotificationsModule,
    AnalyticsModule,
    AssetsModule,
    PoliciesModule,
    EngagementModule,
    ExpensesModule,
    BenefitsModule,
    LmsModule,
    SkillsModule,
    TalentModule,
    MyTeamModule,
    ExitModule,
    PerformanceModule,
    RecruitmentModule,
    WorkforceModule,
    DisciplinaryModule,
    EmployeeLifecycleModule,
    CalendarModule,
    ChatModule,
    AnnouncementsModule,
    TasksModule,
    DocumentsModule,
  ],
})
export class AppModule {}
