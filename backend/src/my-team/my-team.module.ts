import { Module } from '@nestjs/common';
import { MyTeamService } from './my-team.service';
import { MyTeamController } from './my-team.controller';

@Module({ providers: [MyTeamService], controllers: [MyTeamController] })
export class MyTeamModule {}
