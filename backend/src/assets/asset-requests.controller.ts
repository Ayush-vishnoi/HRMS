import { Body, Controller, ForbiddenException, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AssetsService } from './assets.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('asset-requests')
@UseGuards(AuthGuard('jwt'))
export class AssetRequestsController {
  constructor(private assetsService: AssetsService) {}

  /** HR queue of all employee asset requests. */
  @Get()
  findAll(@CurrentUser() user: any) {
    if (user.userRole !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return this.assetsService.findAssetRequests();
  }

  /** HR approves/rejects a request. Body: { id, decision: 'Approved' | 'Rejected', reviewNote? } */
  @Patch()
  review(@CurrentUser() user: any, @Body() body: any) {
    if (user.userRole !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return this.assetsService.reviewAssetRequest(user.id, body);
  }
}
