import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdministrationService } from './administration.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/**
 * System administration API. The class-level `@Roles('super_admin')` combined
 * with the hierarchy-aware RolesGuard means only Super Admins reach any route
 * here — HR Admins and CEOs are intentionally excluded from user & role
 * management and the audit trail.
 */
@Controller('administration')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('super_admin')
export class AdministrationController {
  constructor(private administrationService: AdministrationService) {}

  @Get('overview')
  getOverview() {
    return this.administrationService.getOverview();
  }

  @Get('roles')
  getRoles() {
    return this.administrationService.getRoles();
  }

  @Get('users')
  listUsers(@Query('search') search?: string, @Query('role') role?: string) {
    return this.administrationService.listUsers({ search, role });
  }

  @Patch('users/:id/role')
  updateUserRole(
    @CurrentUser() actor: { id?: string; name?: string },
    @Param('id') id: string,
    @Body() body: { userRole: string },
  ) {
    return this.administrationService.updateUserRole(id, body?.userRole, {
      id: actor?.id,
      name: actor?.name,
    });
  }

  @Get('audit-logs')
  getAuditLogs(@Query('take') take?: string) {
    const parsed = take ? Number.parseInt(take, 10) : undefined;
    return this.administrationService.getAuditLogs(
      Number.isFinite(parsed) ? parsed : undefined,
    );
  }
}
