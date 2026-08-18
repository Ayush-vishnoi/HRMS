import { AssetsService } from './assets.service';
export declare class AssetsController {
    private assetsService;
    constructor(assetsService: AssetsService);
    findAll(user: any): Promise<({
        assignedTo: {
            id: string;
            employeeCode: string;
            name: string;
            department: string;
        } | null;
    } & {
        id: string;
        name: string;
        status: import("@prisma/client").$Enums.AssetStatus;
        location: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        category: import("@prisma/client").$Enums.AssetCategory;
        assetTag: string;
        brand: string;
        model: string;
        serialNumber: string;
        purchaseDate: string;
        purchaseCost: string | null;
        warrantyUntil: string | null;
        assignedToId: string | null;
        condition: import("@prisma/client").$Enums.AssetCondition;
        lastChecked: string;
    })[]>;
    create(body: any): Promise<{
        assignedTo: {
            id: string;
            employeeCode: string;
            name: string;
            department: string;
        } | null;
    } & {
        id: string;
        name: string;
        status: import("@prisma/client").$Enums.AssetStatus;
        location: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        category: import("@prisma/client").$Enums.AssetCategory;
        assetTag: string;
        brand: string;
        model: string;
        serialNumber: string;
        purchaseDate: string;
        purchaseCost: string | null;
        warrantyUntil: string | null;
        assignedToId: string | null;
        condition: import("@prisma/client").$Enums.AssetCondition;
        lastChecked: string;
    }>;
    update(body: any): Promise<{
        assignedTo: {
            id: string;
            employeeCode: string;
            name: string;
            department: string;
        } | null;
    } & {
        id: string;
        name: string;
        status: import("@prisma/client").$Enums.AssetStatus;
        location: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        category: import("@prisma/client").$Enums.AssetCategory;
        assetTag: string;
        brand: string;
        model: string;
        serialNumber: string;
        purchaseDate: string;
        purchaseCost: string | null;
        warrantyUntil: string | null;
        assignedToId: string | null;
        condition: import("@prisma/client").$Enums.AssetCondition;
        lastChecked: string;
    }>;
}
