import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { UploadsController } from './uploads.controller';

@Module({ providers: [ExpensesService], controllers: [ExpensesController, UploadsController] })
export class ExpensesModule {}
