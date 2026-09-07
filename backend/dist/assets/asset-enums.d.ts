import type { AssetCategory, AssetCondition, AssetRequestType } from '@prisma/client';
export declare const toPrismaAssetCategory: (value: string) => AssetCategory;
export declare const fromPrismaAssetCategory: (value: string) => string;
export declare const toPrismaAssetCondition: (value: string) => AssetCondition;
export declare const fromPrismaAssetCondition: (value: string) => string;
export declare const toPrismaRequestType: (value: string) => AssetRequestType;
export declare const fromPrismaRequestType: (value: string) => string;
export declare const serializeAsset: (asset: any) => any;
export declare const serializeAssetRequest: (request: any) => any;
