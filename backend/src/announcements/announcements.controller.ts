import { Controller, Get, Post, Patch, Delete, Body, Query, Req, Headers, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { AnnouncementsService } from './announcements.service';

@Controller('announcements')
@UseGuards(AuthGuard('jwt'))
export class AnnouncementsController {
  constructor(private announcementsService: AnnouncementsService) {}

  private resolveUserId(req: Request, headerUserId?: string): string {
    const user = (req as any).user;
    if (user?.id) return user.id;
    if (user?.sub) return user.sub;
    if (headerUserId) return headerUserId;
    return '';
  }

  @Get()
  async findAll(@Req() req: Request, @Query('scope') scope?: string, @Headers('x-user-id') headerUserId?: string) {
    const userId = this.resolveUserId(req, headerUserId);
    if (!userId) return { success: false, error: 'Unauthorized' };
    const data = await this.announcementsService.findAll(userId, scope);
    return { success: true, data };
  }

  @Post()
  async create(@Req() req: Request, @Body() body: any, @Headers('x-user-id') headerUserId?: string) {
    const userId = this.resolveUserId(req, headerUserId);
    if (!userId) return { success: false, error: 'Unauthorized' };
    const data = await this.announcementsService.create(userId, body);
    return { success: true, data };
  }

  @Patch()
  async update(@Req() req: Request, @Body() body: any, @Headers('x-user-id') headerUserId?: string) {
    const userId = this.resolveUserId(req, headerUserId);
    if (!userId) return { success: false, error: 'Unauthorized' };
    const data = await this.announcementsService.update(userId, body.id, body);
    return { success: true, data };
  }

  @Delete()
  async delete(@Req() req: Request, @Query('id') id: string, @Headers('x-user-id') headerUserId?: string) {
    const userId = this.resolveUserId(req, headerUserId);
    if (!userId) return { success: false, error: 'Unauthorized' };
    return this.announcementsService.delete(userId, id);
  }
}

