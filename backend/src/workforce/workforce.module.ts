import { Module } from '@nestjs/common';
import { WorkforceService } from './workforce.service';
import { WorkforceController } from './workforce.controller';

@Module({ providers: [WorkforceService], controllers: [WorkforceController] })
export class WorkforceModule {}
