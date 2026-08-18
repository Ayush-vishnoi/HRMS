import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SkillsService } from './skills.service';

@Controller('skills')
@UseGuards(AuthGuard('jwt'))
export class SkillsController {
  constructor(private skillsService: SkillsService) {}

  @Get()
  findAll(@Query('employeeId') employeeId?: string) { return this.skillsService.findAll(employeeId); }

  @Post()
  upsertSkill(@Body() body: any) { return this.skillsService.upsertSkill(body); }
}
