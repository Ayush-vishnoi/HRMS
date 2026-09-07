import { PrismaService } from '../prisma/prisma.service';
import { NotifyService } from '../common/notifications/notify.service';
export declare class AssetsService {
    private prisma;
    private notify;
    constructor(prisma: PrismaService, notify: NotifyService);
    findAll(employeeId?: string, isAdmin?: boolean): Promise<any[]>;
    create(body: any): Promise<any>;
    update(id: string, body: any): Promise<any>;
    remove(id: string): Promise<{
        id: string;
    }>;
    findMyAssets(employeeId: string): Promise<{
        assets: any[];
        requests: any[];
    }>;
    acknowledgeAsset(employeeId: string, assetId: string): Promise<{
        id: string;
        acknowledgedAt: Date | null;
    } | {
        assetId: string;
        alreadyAcknowledged: boolean;
    }>;
    createAssetRequest(employee: {
        id: string;
        name: string;
    }, body: any): Promise<any>;
    findAssetRequests(): Promise<{
        requests: any[];
    }>;
    reviewAssetRequest(adminId: string, body: any): Promise<any>;
}
