import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
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

  @Post()
  createTeam(@CurrentUser() user: any, @Body() body: any) {
    return this.myTeamService.createTeam(user, body);
  }

  @Delete()
  deleteTeam(@CurrentUser() user: any, @Query('teamId') teamId?: string) {
    return this.myTeamService.deleteTeam(user, teamId);
  }

  @Patch()
  handleAction(@CurrentUser() user: any, @Body() body: any) {
    return this.myTeamService.handleAction(user, body);
  }
}
