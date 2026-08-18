import { Module } from '@nestjs/common';
import { DisciplinaryService } from './disciplinary.service';
import { DisciplinaryController } from './disciplinary.controller';

@Module({ providers: [DisciplinaryService], controllers: [DisciplinaryController] })
export class DisciplinaryModule {}
