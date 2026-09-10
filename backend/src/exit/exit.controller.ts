import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExitService } from './exit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('exit')
@UseGuards(AuthGuard('jwt'))
export class ExitController {
  constructor(private exitService: ExitService) {}

  @Get()
  findAll(@CurrentUser() user: any, @Query('employeeId') employeeId?: string) {
    return this.exitService.findAll(user.id, user.userRole, employeeId);
  }

  @Post()
  handleAction(@CurrentUser() user: any, @Body() body: any) {
    return this.exitService.handleAction({ id: user.id, userRole: user.userRole }, body);
  }
}
