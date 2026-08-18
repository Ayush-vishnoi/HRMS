import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WorkforceService } from './workforce.service';

@Controller('workforce')
@UseGuards(AuthGuard('jwt'))
export class WorkforceController {
  constructor(private workforceService: WorkforceService) {}

  @Get()
  findAll(@Query('employeeId') employeeId?: string) {
    return this.workforceService.findAll(employeeId);
  }

  @Post()
  handleAction(@Body() body: any) {
    if (body.action === 'log_time') return this.workforceService.logTime(body);
    return { success: false, error: 'Invalid workforce action' };
  }
}
