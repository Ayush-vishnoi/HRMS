import { Module } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';

@Module({
  providers: [MeetingsService],
  controllers: [MeetingsController],
})
export class MeetingsModule {}
