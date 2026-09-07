import { AssetsService } from './assets.service';
export declare class AssetsController {
    private assetsService;
    constructor(assetsService: AssetsService);
    findAll(user: any): Promise<any[]>;
    create(user: any, body: any): Promise<any>;
    update(user: any, body: any): Promise<any>;
    remove(user: any, body: any, queryId?: string): Promise<{
        id: string;
    }>;
}
