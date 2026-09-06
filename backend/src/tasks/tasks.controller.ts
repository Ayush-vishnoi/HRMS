import { Controller, Get, Post, Patch, Delete, Body, Query, Req, Headers, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(AuthGuard('jwt'))
export class TasksController {
  constructor(private tasksService: TasksService) {}

  private resolveUserId(req: Request, headerUserId?: string): string {
    const user = (req as any).user;
    if (user?.id) return user.id;
    if (user?.sub) return user.sub;
    if (headerUserId) return headerUserId;
    return '';
  }

  @Get('direct-reports')
  @UseGuards(AuthGuard('jwt'))
  async getDirectReports(@Req() req: Request, @Headers('x-user-id') headerUserId?: string) {
    const userId = this.resolveUserId(req, headerUserId);
    if (!userId) return { success: false, error: 'Unauthorized' };
    const data = await this.tasksService.getDirectReports(userId);
    return { success: true, data };
  }

  @Get()
  async findAll(@Req() req: Request, @Query('scope') scope?: string, @Headers('x-user-id') headerUserId?: string) {
    const userId = this.resolveUserId(req, headerUserId);
    if (!userId) return { success: false, error: 'Unauthorized' };
    const res = await this.tasksService.findAll(userId, scope);
    if (scope === 'team') {
      return { success: true, ...res };
    }
    return { success: true, data: res };
  }

  @Post()
  async create(@Req() req: Request, @Body() body: any, @Headers('x-user-id') headerUserId?: string) {
    const userId = this.resolveUserId(req, headerUserId);
    if (!userId) return { success: false, error: 'Unauthorized' };
    const data = await this.tasksService.create(userId, body);
    return { success: true, data };
  }

  @Patch()
  async update(@Req() req: Request, @Body() body: any, @Headers('x-user-id') headerUserId?: string) {
    const userId = this.resolveUserId(req, headerUserId);
    if (!userId) return { success: false, error: 'Unauthorized' };
    const data = await this.tasksService.update(userId, body);
    return { success: true, data };
  }

  @Delete()
  async delete(@Req() req: Request, @Query('id') id: string, @Headers('x-user-id') headerUserId?: string) {
    const userId = this.resolveUserId(req, headerUserId);
    if (!userId) return { success: false, error: 'Unauthorized' };
    return this.tasksService.delete(userId, id);
  }
}

