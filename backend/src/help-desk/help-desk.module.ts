import { Module } from '@nestjs/common';
import { HelpDeskService } from './help-desk.service';
import { HelpDeskController } from './help-desk.controller';

@Module({
  providers: [HelpDeskService],
  controllers: [HelpDeskController],
})
export class HelpDeskModule {}
