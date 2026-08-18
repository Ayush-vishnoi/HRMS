import { Module } from '@nestjs/common';
import { PerformanceService } from './performance.service';
import { PerformanceController } from './performance.controller';

@Module({ providers: [PerformanceService], controllers: [PerformanceController] })
export class PerformanceModule {}
