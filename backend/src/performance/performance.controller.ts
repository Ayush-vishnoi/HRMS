import { Controller, Get, Post, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PerformanceService } from './performance.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('performance')
@UseGuards(AuthGuard('jwt'))
export class PerformanceController {
  constructor(private performanceService: PerformanceService) {}

  /** GET /api/performance — role-scoped KRA list (formatted for the KRA board). */
  @Get()
  findAll(@CurrentUser() user: any) {
    return this.performanceService.findAll(user);
  }

  /** POST /api/performance — manager/admin assigns a KRA. */
  @Post()
  createKra(@CurrentUser() user: any, @Body() body: any) {
    return this.performanceService.createKra(user, body);
  }

  /** PATCH /api/performance — assignee updates KRA progress/status. */
  @Patch()
  updateKra(@CurrentUser() user: any, @Body() body: any) {
    return this.performanceService.updateKra(user, body);
  }

  /** GET /api/performance/goals — { goals, kpis, kras } with role scoping. */
  @Get('goals')
  getGoalsData(
    @CurrentUser() user: any,
    @Query('employeeId') employeeId?: string,
    @Query('role') _role?: string,
  ) {
    return this.performanceService.getGoalsData(user, employeeId);
  }

  /** POST /api/performance/goals — create_goal | cascade_goal | add_key_result | sync_kpis | create_kpi. */
  @Post('goals')
  handleGoalAction(@CurrentUser() user: any, @Body() body: any) {
    return this.performanceService.handleGoalAction(user, body);
  }

  /** PATCH /api/performance/goals — update key result / goal / KPI actual. */
  @Patch('goals')
  updateGoalTarget(@CurrentUser() user: any, @Body() body: any) {
    return this.performanceService.updateGoalTarget(user, body);
  }

  /** GET /api/performance/cycles — { cycles, assignments, feedback, recommendations }. */
  @Get('cycles')
  getCyclesData(
    @CurrentUser() user: any,
    @Query('employeeId') employeeId?: string,
    @Query('cycleId') cycleId?: string,
  ) {
    return this.performanceService.getCyclesData(user, employeeId, cycleId);
  }

  /** POST /api/performance/cycles — cycle lifecycle + review submissions. */
  @Post('cycles')
  handleCycleAction(@CurrentUser() user: any, @Body() body: any) {
    return this.performanceService.handleCycleAction(user, body);
  }

  /** GET /api/performance/competencies — { competencies, assessments } with auto-seed. */
  @Get('competencies')
  getCompetenciesData(
    @CurrentUser() user: any,
    @Query('employeeId') employeeId?: string,
    @Query('cycleId') cycleId?: string,
  ) {
    return this.performanceService.getCompetenciesData(user, employeeId, cycleId);
  }

  /** POST /api/performance/competencies — submit_assessment. */
  @Post('competencies')
  handleCompetencyAction(@CurrentUser() user: any, @Body() body: any) {
    return this.performanceService.handleCompetencyAction(user, body);
  }

  /** GET /api/performance/pip — role-scoped PIP list with milestones. */
  @Get('pip')
  getPips(@CurrentUser() user: any, @Query('employeeId') employeeId?: string) {
    return this.performanceService.getPips(user, employeeId);
  }

  /** POST /api/performance/pip — create_pip | add_milestone | update_milestone | update_pip_status. */
  @Post('pip')
  handlePipAction(@CurrentUser() user: any, @Body() body: any) {
    return this.performanceService.handlePipAction(user, body);
  }

  /** GET /api/performance/calibration — { sessions, departments, distribution, assignments }. */
  @Get('calibration')
  getCalibrationData(
    @CurrentUser() user: any,
    @Query('cycleId') cycleId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.performanceService.getCalibrationData(user, cycleId, departmentId);
  }

  /** POST /api/performance/calibration — admin: create_session | update_calibrated_rating. */
  @Post('calibration')
  handleCalibrationAction(@CurrentUser() user: any, @Body() body: any) {
    return this.performanceService.handleCalibrationAction(user, body);
  }
}
