import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DisciplinaryService } from './disciplinary.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('disciplinary')
@UseGuards(AuthGuard('jwt'))
export class DisciplinaryController {
  constructor(private disciplinaryService: DisciplinaryService) {}

  @Get()
  findAll(@CurrentUser() user: any, @Query('employeeId') employeeId?: string) {
    return this.disciplinaryService.findAll(user, employeeId);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.disciplinaryService.create(user, body);
  }
}
