import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AssetsService } from './assets.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('my-assets')
@UseGuards(AuthGuard('jwt'))
export class MyAssetsController {
  constructor(private assetsService: AssetsService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.assetsService.findMyAssets(user.id);
  }

  /**
   * action: 'acknowledge' | 'request'
   *  - acknowledge: { action, assetId } → sets acknowledgedAt (Confirm Receipt)
   *  - request:    { action, type, assetId?, category?, reason, urgency? } → creates AssetRequest
   */
  @Post()
  handleAction(@CurrentUser() user: any, @Body() body: any) {
    if (body?.action === 'acknowledge') {
      return this.assetsService.acknowledgeAsset(user.id, body.assetId);
    }
    if (body?.action === 'request') {
      return this.assetsService.createAssetRequest(user, body);
    }
    throw new BadRequestException('Unknown action');
  }
}
