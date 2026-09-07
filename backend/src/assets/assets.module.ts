import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { MyAssetsController } from './my-assets.controller';
import { AssetRequestsController } from './asset-requests.controller';

@Module({
  providers: [AssetsService],
  controllers: [AssetsController, MyAssetsController, AssetRequestsController],
})
export class AssetsModule {}
