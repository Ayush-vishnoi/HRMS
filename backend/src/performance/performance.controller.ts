import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PerformanceService } from './performance.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('performance')
@UseGuards(AuthGuard('jwt'))
export class PerformanceController {
  constructor(private performanceService: PerformanceService) {}

  @Get()
  findAll(@CurrentUser() user: any, @Query('employeeId') employeeId?: string) {
    return this.performanceService.findAll(user.id, user.userRole, employeeId);
  }

  @Post()
  handleAction(@CurrentUser() user: any, @Body() body: any) {
    return this.performanceService.handleAction(user.id, body);
  }
}
