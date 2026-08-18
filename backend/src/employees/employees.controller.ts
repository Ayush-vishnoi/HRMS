import { Controller, Get, Patch, Post, Param, Body, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EmployeesService } from './employees.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('employees')
@UseGuards(AuthGuard('jwt'))
export class EmployeesController {
  constructor(private employeesService: EmployeesService) {}

  @Get()
  findAll(
    @Query('department') department?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.employeesService.findAll({ department, status, search });
  }

  @Post()
  create(@CurrentUser() user: any, @Body() body: any) {
    if (user?.userRole !== 'admin') {
      throw new ForbiddenException('Only administrators can create employees');
    }
    return this.employeesService.create(body);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.employeesService.update(id, body);
  }
}
