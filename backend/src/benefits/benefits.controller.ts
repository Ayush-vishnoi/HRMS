import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BenefitsService } from './benefits.service';

@Controller('benefits')
@UseGuards(AuthGuard('jwt'))
export class BenefitsController {
  constructor(private benefitsService: BenefitsService) {}

  @Get()
  findAll(@Query('employeeId') employeeId?: string) {
    return this.benefitsService.findAll(employeeId);
  }

  @Post()
  handleAction(@Body() body: any) { return this.benefitsService.handleAction(body); }
}
