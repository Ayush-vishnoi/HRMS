import { Module } from '@nestjs/common';
import { EngagementService } from './engagement.service';
import { EngagementController } from './engagement.controller';

@Module({ providers: [EngagementService], controllers: [EngagementController] })
export class EngagementModule {}
