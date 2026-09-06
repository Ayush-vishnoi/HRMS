import { Controller, Get, Post, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MeetingsService } from './meetings.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('meetings')
@UseGuards(AuthGuard('jwt'))
export class MeetingsController {
  constructor(private meetingsService: MeetingsService) {}

  /**
   * GET /api/meetings
   * - ?search=q  -> employee search (for attendee picker)
   * - ?id=MTG-001 -> single meeting (attendee-scoped visibility)
   * - ?from&to&type&department&mine -> filtered list
   */
  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('search') search?: string,
    @Query('id') id?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('type') type?: string,
    @Query('department') department?: string,
    @Query('mine') mine?: string,
  ) {
    if (search !== undefined && search !== null) {
      const data = await this.meetingsService.searchEmployees(search);
      return { success: true, data };
    }

    if (id) {
      const data = await this.meetingsService.findOne(userId, id);
      return { success: true, data };
    }

    const data = await this.meetingsService.findAll(userId, { from, to, type, department, mine });
    return { success: true, data };
  }

  @Post()
  async create(@CurrentUser('id') userId: string, @Body() body: any) {
    const data = await this.meetingsService.create(userId, body);
    return { success: true, data };
  }

  /**
   * PATCH /api/meetings
   * Body: { id, action: 'cancel' | 'rsvp', rsvp?, reason? } or a plain update { id, ...fields }
   */
  @Patch()
  async update(@CurrentUser('id') userId: string, @Body() body: any) {
    const data = await this.meetingsService.update(userId, body);
    return { success: true, data };
  }
}
