import { PrismaService } from '../prisma/prisma.service';
export declare class AssetsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(employeeId?: string, isAdmin?: boolean): Promise<({
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
        assetTag: string;
        category: import("@prisma/client").$Enums.AssetCategory;
        brand: string;
        model: string;
        serialNumber: string;
        purchaseDate: string;
        purchaseCost: string | null;
        warrantyUntil: string | null;
        assignedToId: string | null;
        condition: import("@prisma/client").$Enums.AssetCondition;
        lastChecked: string;
        notes: string | null;
    })[]>;
    create(data: any): Promise<{
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
        assetTag: string;
        category: import("@prisma/client").$Enums.AssetCategory;
        brand: string;
        model: string;
        serialNumber: string;
        purchaseDate: string;
        purchaseCost: string | null;
        warrantyUntil: string | null;
        assignedToId: string | null;
        condition: import("@prisma/client").$Enums.AssetCondition;
        lastChecked: string;
        notes: string | null;
    }>;
    update(id: string, data: any): Promise<{
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
        assetTag: string;
        category: import("@prisma/client").$Enums.AssetCategory;
        brand: string;
        model: string;
        serialNumber: string;
        purchaseDate: string;
        purchaseCost: string | null;
        warrantyUntil: string | null;
        assignedToId: string | null;
        condition: import("@prisma/client").$Enums.AssetCondition;
        lastChecked: string;
        notes: string | null;
    }>;
}
