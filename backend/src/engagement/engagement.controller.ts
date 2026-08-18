import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EngagementService } from './engagement.service';

@Controller('engagement')
@UseGuards(AuthGuard('jwt'))
export class EngagementController {
  constructor(private engagementService: EngagementService) {}

  @Get()
  findAll() { return this.engagementService.findAll(); }

  @Post()
  handleAction(@Body() body: any) { return this.engagementService.handleAction(body); }
}
