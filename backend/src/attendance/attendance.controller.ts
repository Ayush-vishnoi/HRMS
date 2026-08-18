import { Controller, Get, Post, Patch, Body, Query, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AttendanceService } from './attendance.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('attendance')
@UseGuards(AuthGuard('jwt'))
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Get()
  findAll(
    @Query('employeeId') employeeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.attendanceService.findAll(employeeId, from, to);
  }

  @Post('clock-in')
  clockIn(@CurrentUser('id') userId: string, @Body('location') location: string) {
    return this.attendanceService.clockIn(userId, location || 'Office - HQ');
  }

  @Post('clock-out')
  clockOut(@CurrentUser('id') userId: string) {
    return this.attendanceService.clockOut(userId);
  }

  @Get('late-requests')
  getLateRequests(@Query('status') status?: string) {
    return this.attendanceService.getLateRequests(status);
  }

  @Post('late-requests')
  createLateRequest(
    @CurrentUser('id') userId: string,
    @Body() body: { requestDate: string; reason: string },
  ) {
    return this.attendanceService.createLateRequest(userId, body.requestDate, body.reason);
  }

  @Patch('late-requests/:id')
  reviewLateRequest(
    @Param('id') id: string,
    @Body() body: { status: 'approved' | 'rejected' },
    @CurrentUser('id') userId: string,
  ) {
    return this.attendanceService.reviewLateRequest(id, body.status, userId);
  }
}
