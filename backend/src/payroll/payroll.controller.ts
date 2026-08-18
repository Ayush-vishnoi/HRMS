import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PayrollService } from './payroll.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('payroll')
@UseGuards(AuthGuard('jwt'))
export class PayrollController {
  constructor(private payrollService: PayrollService) {}

  @Get('payslips')
  getPayslips(
    @Query('employeeId') employeeId?: string,
    @Query('monthYear') monthYear?: string,
    @CurrentUser('id') userId?: string,
  ) {
    return this.payrollService.getPayslips(employeeId, monthYear);
  }

  @Get('cycles')
  getCycles(@Query('status') status?: string) {
    return this.payrollService.getCycles(status);
  }

  @Get('salary-structure/:employeeId')
  getSalaryStructure(@Param('employeeId') employeeId: string) {
    return this.payrollService.getSalaryStructure(employeeId);
  }

  @Get('loans')
  getLoans(@Query('employeeId') employeeId?: string) {
    return this.payrollService.getLoans(employeeId);
  }

  @Get('tax-declarations')
  getTaxDeclarations(@Query('employeeId') employeeId: string, @CurrentUser('id') userId: string) {
    return this.payrollService.getTaxDeclarations(employeeId || userId);
  }
}
