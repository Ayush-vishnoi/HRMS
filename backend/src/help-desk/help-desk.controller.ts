import { Controller, Get, Post, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { HelpDeskService } from './help-desk.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('help-desk')
@UseGuards(AuthGuard('jwt'))
export class HelpDeskController {
  constructor(private helpDeskService: HelpDeskService) {}

  @Get()
  findAll(
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    return this.helpDeskService.findAll(employeeId, status, category);
  }

  /**
   * POST /api/help-desk  body: { employeeId, category, priority, subject, description }
   * Frontend sends employeeId in the body; fall back to the authenticated user.
   */
  @Post()
  create(@CurrentUser('id') userId: string, @Body() body: any) {
    const { employeeId, ...rest } = body;
    return this.helpDeskService.create(employeeId || userId, rest);
  }

  /**
   * PATCH /api/help-desk  body: { id, status, resolution?, resolvedById? }
   * Frontend uses action-in-body pattern (no id in URL).
   */
  @Patch()
  update(
    @Body() body: {
      id: string;
      status?: 'Open' | 'In Progress' | 'Resolved';
      resolution?: string;
      resolvedById?: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.helpDeskService.update(body.id, {
      status: body.status,
      resolution: body.resolution,
      resolvedById: body.resolvedById || userId,
    });
  }
}
