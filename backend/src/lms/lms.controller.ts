import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LmsService } from './lms.service';

@Controller('lms')
@UseGuards(AuthGuard('jwt'))
export class LmsController {
  constructor(private lmsService: LmsService) {}

  @Get()
  findAll(@Query('employeeId') employeeId?: string) { return this.lmsService.findAll(employeeId); }

  @Post()
  handleAction(@Body() body: any) { return this.lmsService.handleAction(body); }
}
