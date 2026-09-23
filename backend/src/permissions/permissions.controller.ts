import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CeoPermission } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  CEO_PERMISSIONS,
  CEO_PERMISSION_LABELS,
  PermissionsService,
} from './permissions.service';

@Controller('permissions')
@UseGuards(AuthGuard('jwt'))
export class PermissionsController {
  constructor(private permissions: PermissionsService) {}

  /** The catalog of delegatable CEO permissions (for the delegation checklist UI). */
  @Get('catalog')
  catalog() {
    return CEO_PERMISSIONS.map((permission) => ({
      permission,
      label: CEO_PERMISSION_LABELS[permission],
    }));
  }

  /** Active permissions the current user holds via delegation (drives the banner). */
  @Get('my-delegated')
  myDelegated(@CurrentUser('id') userId: string) {
    return this.permissions.getMyActiveDelegations(userId);
  }

  /** CEO: list grants they have issued (active + historical). */
  @Get('delegations')
  listDelegations(@CurrentUser('id') userId: string) {
    return this.permissions.listDelegations(userId);
  }

  /** CEO: grant a permission to an admin. */
  @Post('delegations')
  createDelegation(
    @CurrentUser('id') userId: string,
    @Body()
    body: { permission: CeoPermission; delegateeId: string; expiresAt?: string | null; note?: string | null },
  ) {
    return this.permissions.createDelegation(userId, body);
  }

  /** CEO: revoke a grant. */
  @Patch('delegations/:id/revoke')
  revokeDelegation(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.permissions.revokeDelegation(userId, id);
  }
}
