import { Controller, Get, Post, Patch, Query, Param, Body, UseGuards, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { PayrollService } from './payroll.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('payroll')
@UseGuards(AuthGuard('jwt'))
export class PayrollController {
  constructor(private payrollService: PayrollService) {}

  /** GET /api/payroll?view=my|all — payslip overview enriched from PayrollCycleItem. */
  @Get()
  getOverview(@CurrentUser() user: any, @Query('view') view?: string) {
    return this.payrollService.getPayrollOverview(user, view || 'my');
  }

  /** GET /api/payroll/structures — merged structures + revisions (pre-wrapped response). */
  @Get('structures')
  getStructures(@Query('employeeId') employeeId?: string) {
    return this.payrollService.getSalaryStructures(employeeId);
  }

  /** POST /api/payroll/structures — upsert structure + revision history (pre-wrapped response). */
  @Post('structures')
  saveStructure(@CurrentUser() user: any, @Body() body: any) {
    return this.payrollService.saveSalaryStructure(user, body);
  }

  /** GET /api/payroll/variable-pay — variable pay records with role scoping. */
  @Get('variable-pay')
  getVariablePay(
    @CurrentUser() user: any,
    @Query('employeeId') employeeId?: string,
    @Query('monthYear') monthYear?: string,
    @Query('view') view?: string,
  ) {
    return this.payrollService.getVariablePayRecords(user, employeeId, monthYear, view);
  }

  /** POST /api/payroll/variable-pay — admin/manager creates a VariablePayRecord. */
  @Post('variable-pay')
  createVariablePay(@CurrentUser() user: any, @Body() body: any) {
    return this.payrollService.createVariablePayRecord(user, body);
  }

  /** GET /api/payroll/statutory-rules — statutory config + custom rules + salary components. */
  @Get('statutory-rules')
  getStatutory() {
    return this.payrollService.getStatutoryRules();
  }

  /** POST /api/payroll/statutory-rules — admin creates a StatutoryRule. */
  @Post('statutory-rules')
  createStatutory(@CurrentUser() user: any, @Body() body: any) {
    return this.payrollService.createStatutoryRule(user, body);
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
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    const data = await this.payrollService.calculateAndSaveCycle(user.id, body);
    return { success: true, data };
  }

  @Patch('engine')
  async updateCycle(
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    const data = await this.payrollService.updateCycleStatus(user.id, body);
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

  /** POST /api/payroll/tax-declarations — employee submits (upserts) own declaration. */
  @Post('tax-declarations')
  async saveTaxDeclaration(@CurrentUser() user: any, @Body() body: any) {
    const data = await this.payrollService.saveTaxDeclaration(user, body);
    return { success: true, data };
  }

  /** PATCH /api/payroll/tax-declarations — admin/manager approves or rejects ({id, declarationStatus, verificationRemarks}). */
  @Patch('tax-declarations')
  async verifyTaxDeclaration(@CurrentUser() user: any, @Body() body: any) {
    const data = await this.payrollService.verifyTaxDeclaration(user, body);
    return { success: true, data };
  }

  /** POST /api/payroll/reconciliation — run reconciliation for {cycleId} and persist the snapshot. */
  @Post('reconciliation')
  async runReconciliation(@CurrentUser() user: any, @Body() body: any) {
    const data = await this.payrollService.runReconciliation(user, body);
    return { success: true, data };
  }

  /**
   * POST /api/payroll/pdf — renders payslip / Form 16 statements as raw printable HTML.
   * Frontend reads res.text() and document.write()s it, so the response MUST be
   * raw HTML (Content-Type: text/html), bypassing the JSON response interceptor.
   */
  @Post('pdf')
  async generatePdf(
    @CurrentUser() user: any,
    @Body() body: any,
    @Res() res: Response,
  ) {
    const html = await this.payrollService.generatePdfDocument(user, body);
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Content-Disposition', 'inline; filename="document.html"');
    res.send(Buffer.from(html, 'utf-8'));
  }

  @Get('reconciliation')
  async getReconciliation(
    @Query('currentCycleId') currentCycleId: string,
    @Query('previousCycleId') previousCycleId?: string,
  ) {
    const data = await this.payrollService.getReconciliation(currentCycleId, previousCycleId);
    return { success: true, data };
  }

  /** GET /api/payroll/reports?type=register|pf_ecr|esic|department&monthYear=... */
  @Get('reports')
  async getReports(
    @Query('type') type?: string,
    @Query('monthYear') monthYear?: string,
  ) {
    const data = await this.payrollService.getReports(type, monthYear);
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
