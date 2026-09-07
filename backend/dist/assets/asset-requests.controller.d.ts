import { AssetsService } from './assets.service';
export declare class AssetRequestsController {
    private assetsService;
    constructor(assetsService: AssetsService);
    findAll(user: any): Promise<{
        requests: any[];
    }>;
    review(user: any, body: any): Promise<any>;
}
