import { Controller, Get, Post, Patch, Body, Query, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { HelpDeskService } from './help-desk.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('help-desk')
@UseGuards(AuthGuard('jwt'))
export class HelpDeskController {
  constructor(private helpDeskService: HelpDeskService) {}

  @Get()
  findAll(
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    return this.helpDeskService.findAll(employeeId, status, category);
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.helpDeskService.create(userId, body);
  }

  @Patch(':id/resolve')
  resolve(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('resolution') resolution: string,
  ) {
    return this.helpDeskService.resolve(id, userId, resolution);
  }
}
