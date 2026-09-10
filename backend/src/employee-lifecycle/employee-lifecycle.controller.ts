import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EmployeeLifecycleService } from './employee-lifecycle.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('employee-lifecycle')
@UseGuards(AuthGuard('jwt'))
export class EmployeeLifecycleController {
  constructor(private lifecycleService: EmployeeLifecycleService) {}

  @Get()
  findAll(@Query('employeeId') employeeId?: string) {
    return this.lifecycleService.findAll(employeeId);
  }

  /**
   * POST /api/employee-lifecycle/convert — offer-based onboarding.
   * Frontend (handleOnboardSubmit) calls this when the selected candidate
   * has recruitment_offers, passing {candidateId, customJoinDate,
   * customManagerId, customProbationMonths}.
   */
  @Post('convert')
  convert(@CurrentUser() user: any, @Body() body: any) {
    return this.lifecycleService.convertOffer(user, body);
  }

  /** GET /api/employee-lifecycle/bank-details — my bank details record. */
  @Get('bank-details')
  getBankDetails(@CurrentUser('id') userId: string) {
    return this.lifecycleService.getBankDetails(userId);
  }

  /** POST /api/employee-lifecycle/bank-details — submit salary account details. */
  @Post('bank-details')
  submitBankDetails(@CurrentUser() user: any, @Body() body: any) {
    return this.lifecycleService.submitBankDetails(user, body);
  }

  @Post()
  handleAction(@CurrentUser() user: any, @Body() body: any) {
    switch (body.action) {
      case 'onboard': return this.lifecycleService.onboard(user, body);
      case 'update_task': return this.lifecycleService.updateTask(body.taskId, body.status);
      case 'update_bgv': return this.lifecycleService.updateBgv(body.bgvId, body.status, body.vendorNotes);
      case 'probation_action': return this.lifecycleService.probationAction(body);
      case 'transfer_request': return this.lifecycleService.transferRequest(user, body);
      case 'promotion_request': return this.lifecycleService.promotionRequest(user, body);
      default: return { success: false, error: 'Invalid lifecycle action' };
    }
  }
}
