import { Module } from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { PoliciesController } from './policies.controller';

@Module({ providers: [PoliciesService], controllers: [PoliciesController] })
export class PoliciesModule {}
