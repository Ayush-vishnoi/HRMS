import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PoliciesService } from './policies.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('policies')
@UseGuards(AuthGuard('jwt'))
export class PoliciesController {
  constructor(private policiesService: PoliciesService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.policiesService.findAll(user.id, user.userRole === 'admin');
  }

  @Post()
  async handle(@Body() body: any, @CurrentUser() user: any) {
    if (body.action === 'acknowledge') {
      return this.policiesService.acknowledge(body.policyId, user.id);
    }
    return this.policiesService.create(body, user.id);
  }
}
