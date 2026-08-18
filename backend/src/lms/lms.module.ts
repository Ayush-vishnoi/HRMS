import { Module } from '@nestjs/common';
import { LmsService } from './lms.service';
import { LmsController } from './lms.controller';

@Module({ providers: [LmsService], controllers: [LmsController] })
export class LmsModule {}
