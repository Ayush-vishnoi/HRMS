import { Controller, Get, Post, Patch, Body, Query, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LeavesService } from './leaves.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('leaves')
@UseGuards(AuthGuard('jwt'))
export class LeavesController {
  constructor(private leavesService: LeavesService) {}

  @Get('balances')
  getBalances(@Query('employeeId') employeeId: string, @CurrentUser('id') userId: string) {
    return this.leavesService.getBalances(employeeId || userId);
  }

  @Get()
  getRequests(@Query('employeeId') employeeId?: string, @Query('status') status?: string) {
    return this.leavesService.getRequests(employeeId, status);
  }

  @Post()
  createRequest(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.leavesService.createRequest({ ...body, employeeId: userId });
  }

  @Patch(':id')
  reviewRequest(
    @Param('id') id: string,
    @Body() body: { status: 'Approved' | 'Rejected' },
    @CurrentUser('id') userId: string,
  ) {
    return this.leavesService.reviewRequest(id, body.status, userId);
  }
}
