import { Module } from '@nestjs/common';
import { AdministrationService } from './administration.service';
import { AdministrationController } from './administration.controller';

@Module({
  providers: [AdministrationService],
  controllers: [AdministrationController],
})
export class AdministrationModule {}
