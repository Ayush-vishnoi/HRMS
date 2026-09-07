import { Controller, Get, Post, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LeavesService } from './leaves.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('leaves')
@UseGuards(AuthGuard('jwt'))
export class LeavesController {
  constructor(private leavesService: LeavesService) {}

  /**
   * GET /api/leaves?employeeId=&status=
   * Frontend (HRMSContext) expects a combined payload:
   * { requests: LeaveRequest[], balances: LeaveBalance[] }
   */
  @Get()
  async getAll(
    @CurrentUser('id') userId: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
  ) {
    const targetId = employeeId || userId;
    const [requests, balances] = await Promise.all([
      this.leavesService.getRequests(employeeId, status),
      this.leavesService.getBalances(targetId),
    ]);
    return { requests, balances };
  }

  @Get('balances')
  getBalances(@Query('employeeId') employeeId: string, @CurrentUser('id') userId: string) {
    return this.leavesService.getBalances(employeeId || userId);
  }

  @Get('requests')
  getRequests(@Query('employeeId') employeeId?: string, @Query('status') status?: string) {
    return this.leavesService.getRequests(employeeId, status);
  }

  @Post()
  createRequest(@CurrentUser('id') userId: string, @Body() body: any) {
    // Frontend sends employeeId in the body; fall back to the authenticated user.
    const { employeeId, ...rest } = body;
    return this.leavesService.createRequest({ ...rest, employeeId: employeeId || userId });
  }

  /**
   * PATCH /api/leaves  body: { id, status, reviewerId }
   * Frontend uses action-in-body pattern (no id in URL).
   */
  @Patch()
  reviewRequest(
    @Body() body: { id: string; status: 'Approved' | 'Rejected'; reviewerId?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.leavesService.reviewRequest(body.id, body.status, body.reviewerId || userId);
  }
}
