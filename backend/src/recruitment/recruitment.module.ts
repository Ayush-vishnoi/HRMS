import { Module } from '@nestjs/common';
import { RecruitmentService } from './recruitment.service';
import { RecruitmentController } from './recruitment.controller';

@Module({ providers: [RecruitmentService], controllers: [RecruitmentController] })
export class RecruitmentModule {}
