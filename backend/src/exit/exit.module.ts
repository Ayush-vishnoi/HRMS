import { Module } from '@nestjs/common';
import { ExitService } from './exit.service';
import { ExitController } from './exit.controller';

@Module({ providers: [ExitService], controllers: [ExitController] })
export class ExitModule {}
