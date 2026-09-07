import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
  create(@CurrentUser() user: any, @Body() body: any) {
    if (user.userRole !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return this.assetsService.create(body);
  }

  @Patch()
  update(@CurrentUser() user: any, @Body() body: any) {
    if (user.userRole !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    const { id, ...data } = body;
    return this.assetsService.update(id, data);
  }

  @Delete()
  remove(@CurrentUser() user: any, @Body() body: any, @Query('id') queryId?: string) {
    if (user.userRole !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    const id = typeof body?.id === 'string' ? body.id : queryId;
    if (!id) {
      throw new BadRequestException('Asset id is required');
    }
    return this.assetsService.remove(id);
  }
}
