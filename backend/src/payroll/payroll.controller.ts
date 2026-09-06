import { Controller, Get, Post, Patch, Query, Param, Body, Req, Headers } from '@nestjs/common';
import type { Request } from 'express';
import { PayrollService } from './payroll.service';

@Controller('payroll')
export class PayrollController {
  constructor(private payrollService: PayrollService) {}

  private resolveUserId(req: Request, headerUserId?: string): string {
    const user = (req as any).user;
    if (user?.id) return user.id;
    if (user?.sub) return user.sub;
    if (headerUserId) return headerUserId;
    return '';
  }

  @Get('payslips')
  async getPayslips(
    @Query('employeeId') employeeId?: string,
    @Query('monthYear') monthYear?: string,
  ) {
    const data = await this.payrollService.getPayslips(employeeId, monthYear);
    return { success: true, data };
  }

  @Get('cycles')
  async getCycles(
    @Query('status') status?: string,
    @Query('cycleId') cycleId?: string,
  ) {
    const data = await this.payrollService.getCycles(status, cycleId);
    return { success: true, data };
  }

  @Get('engine')
  async getEngineCycles(
    @Query('cycleId') cycleId?: string,
  ) {
    const data = await this.payrollService.getCycles(undefined, cycleId);
    return { success: true, data };
  }

  @Post('engine')
  async calculateCycle(
    @Req() req: Request,
    @Body() body: any,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const userId = this.resolveUserId(req, headerUserId) || 'EMP-006';
    const data = await this.payrollService.calculateAndSaveCycle(userId, body);
    return { success: true, data };
  }

  @Patch('engine')
  async updateCycle(
    @Req() req: Request,
    @Body() body: any,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const userId = this.resolveUserId(req, headerUserId) || 'EMP-006';
    const data = await this.payrollService.updateCycleStatus(userId, body);
    return { success: true, data };
  }

  @Get('salary-structure/:employeeId')
  async getSalaryStructure(@Param('employeeId') employeeId: string) {
    const data = await this.payrollService.getSalaryStructure(employeeId);
    return { success: true, data };
  }

  @Get('loans')
  async getLoans(@Query('employeeId') employeeId?: string) {
    const data = await this.payrollService.getLoans(employeeId);
    return { success: true, data };
  }

  @Get('tax-declarations')
  async getTaxDeclarations(
    @Query('employeeId') employeeId?: string,
    @Query('financialYear') financialYear?: string,
  ) {
    const data = await this.payrollService.getTaxDeclarations(employeeId, financialYear);
    return { success: true, data };
  }

  @Get('reconciliation')
  async getReconciliation(
    @Query('currentCycleId') currentCycleId: string,
    @Query('previousCycleId') previousCycleId?: string,
  ) {
    const data = await this.payrollService.getReconciliation(currentCycleId, previousCycleId);
    return { success: true, data };
  }

  @Get('reports')
  async getReports(@Query('monthYear') monthYear?: string) {
    const data = await this.payrollService.getReports(monthYear);
    return { success: true, data };
  }

  @Get('form16')
  async getForm16(
    @Query('employeeId') employeeId: string,
    @Query('financialYear') financialYear: string,
  ) {
    const data = await this.payrollService.getForm16(employeeId, financialYear || '2026-27');
    return { success: true, data };
  }
}
