import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';

@Module({
  providers: [PayrollService],
  controllers: [PayrollController],
})
export class PayrollModule {}
