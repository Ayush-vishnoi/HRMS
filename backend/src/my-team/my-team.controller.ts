import { Controller, Get, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MyTeamService } from './my-team.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('my-team')
@UseGuards(AuthGuard('jwt'))
export class MyTeamController {
  constructor(private myTeamService: MyTeamService) {}

  @Get()
  findAll(@CurrentUser() user: any, @Query('managerId') managerId?: string) {
    return this.myTeamService.findAll(user.id, user.userRole, managerId);
  }

  @Patch()
  updateMetadata(@CurrentUser() user: any, @Body() body: any) {
    return this.myTeamService.updateMetadata(user.id, user.userRole, body);
  }
}
