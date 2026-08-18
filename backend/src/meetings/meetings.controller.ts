import { Controller, Get, Post, Patch, Body, Query, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MeetingsService } from './meetings.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('meetings')
@UseGuards(AuthGuard('jwt'))
export class MeetingsController {
  constructor(private meetingsService: MeetingsService) {}

  @Get()
  findAll(
    @CurrentUser('id') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.meetingsService.findAll(userId, from, to);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.meetingsService.findOne(id);
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.meetingsService.create(userId, body);
  }

  @Patch(':id/rsvp')
  rsvp(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { status: 'ACCEPTED' | 'DECLINED'; reason?: string },
  ) {
    return this.meetingsService.rsvp(id, userId, body.status, body.reason);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.meetingsService.cancel(id);
  }
}
