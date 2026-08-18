import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CalendarService } from './calendar.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('calendar')
@UseGuards(AuthGuard('jwt'))
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  @Get()
  getEvents(@CurrentUser() user: any, @Query('from') from: string, @Query('to') to: string) {
    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
      throw new BadRequestException('A valid date range is required');
    }
    return this.calendarService.getEvents(user, from, to);
  }
}
