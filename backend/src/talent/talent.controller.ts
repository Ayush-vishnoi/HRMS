import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TalentService } from './talent.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('talent')
@UseGuards(AuthGuard('jwt'))
export class TalentController {
  constructor(private talentService: TalentService) {}

  @Get()
  findAll(@CurrentUser() user: any, @Query('employeeId') employeeId?: string) {
    return this.talentService.findAll(user.id, user.userRole, employeeId);
  }

  @Post()
  handleAction(@CurrentUser() user: any, @Body() body: any) {
    return this.talentService.handleAction(user.id, user.userRole, body);
  }
}
