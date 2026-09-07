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

  /**
   * POST /api/attendance  body: { id?, employeeId, date, checkIn, status, location }
   * Frontend (HRMSContext.startClockIn) creates the full record client-side
   * (with its own id) and asks the backend to persist it as-is.
   */
  @Post()
  create(@CurrentUser('id') userId: string, @Body() body: any) {
    const { employeeId, ...rest } = body ?? {};
    return this.attendanceService.create(employeeId || userId, rest);
  }

  /**
   * PATCH /api/attendance  body: { id, checkOut, hoursWorked }
   * Frontend (HRMSContext.finishClockOut) updates an existing record by body id.
   */
  @Patch()
  update(@Body() body: { id: string; checkOut?: string; hoursWorked?: string }) {
    return this.attendanceService.update(body.id, {
      checkOut: body.checkOut,
      hoursWorked: body.hoursWorked,
    });
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
