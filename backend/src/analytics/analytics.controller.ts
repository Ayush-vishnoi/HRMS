import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('analytics')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get()
  getMetrics() {
    return this.analyticsService.getMetrics();
  }

  /**
   * Executive summary for the CEO dashboard. Gated to `ceo` and above (so CEOs
   * and Super Admins can read it, but HR Admins cannot). The RolesGuard only
   * enforces on handlers that declare `@Roles(...)`, so the plain `GET
   * /analytics` above stays open to every authenticated HR Admin as before.
   */
  @Get('executive')
  @Roles('ceo')
  getExecutiveSummary() {
    return this.analyticsService.getExecutiveSummary();
  }
}
