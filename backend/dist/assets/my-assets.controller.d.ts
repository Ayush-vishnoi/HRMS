import { AssetsService } from './assets.service';
export declare class MyAssetsController {
    private assetsService;
    constructor(assetsService: AssetsService);
    findAll(user: any): Promise<{
        assets: any[];
        requests: any[];
    }>;
    handleAction(user: any, body: any): Promise<any>;
}
