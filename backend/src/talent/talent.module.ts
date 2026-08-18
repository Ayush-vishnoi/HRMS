import { Module } from '@nestjs/common';
import { TalentService } from './talent.service';
import { TalentController } from './talent.controller';

@Module({ providers: [TalentService], controllers: [TalentController] })
export class TalentModule {}
