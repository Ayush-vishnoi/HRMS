import { Controller, Get, Post, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExpensesService } from './expenses.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('expenses')
@UseGuards(AuthGuard('jwt'))
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Get()
  findAll(@CurrentUser() user: any, @Query('view') view = 'my', @Query('employeeId') employeeId?: string) {
    return this.expensesService.findAll(user.id, user.userRole, view, employeeId);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.expensesService.create(body.employeeId || user.id, body);
  }

  @Patch()
  update(@Body() body: any) {
    const { id, ...data } = body;
    return this.expensesService.update(id, data);
  }
}
