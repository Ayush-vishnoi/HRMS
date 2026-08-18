import { Controller, Get, Post, Patch, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AssetsService } from './assets.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('assets')
@UseGuards(AuthGuard('jwt'))
export class AssetsController {
  constructor(private assetsService: AssetsService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.assetsService.findAll(user.id, user.userRole === 'admin');
  }

  @Post()
  create(@Body() body: any) {
    return this.assetsService.create(body);
  }

  @Patch()
  update(@Body() body: any) {
    const { id, ...data } = body;
    return this.assetsService.update(id, data);
  }
}
