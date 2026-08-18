import { Module } from '@nestjs/common';
import { LeavesService } from './leaves.service';
import { LeavesController } from './leaves.controller';

@Module({
  providers: [LeavesService],
  controllers: [LeavesController],
})
export class LeavesModule {}
