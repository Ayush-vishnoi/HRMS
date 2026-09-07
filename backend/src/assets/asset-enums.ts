import type { AssetCategory, AssetCondition, AssetRequestType } from '@prisma/client';

/**
 * Prisma stores mapped enum values in PostgreSQL (e.g. "Access Card") but the
 * Prisma client API uses the TypeScript member names (e.g. "AccessCard").
 * The UI works with human-readable display values, so these helpers convert
 * between the two at the API boundary.
 */

const CATEGORY_TO_PRISMA: Record<string, string> = { 'Access Card': 'AccessCard' };
const CATEGORY_FROM_PRISMA: Record<string, string> = { AccessCard: 'Access Card' };
const CONDITION_TO_PRISMA: Record<string, string> = { 'Needs repair': 'NeedsRepair' };
const CONDITION_FROM_PRISMA: Record<string, string> = { NeedsRepair: 'Needs repair' };
const REQUEST_TYPE_TO_PRISMA: Record<string, string> = {
  'New Asset': 'NewAsset',
  'Issue Report': 'IssueReport',
};
const REQUEST_TYPE_FROM_PRISMA: Record<string, string> = {
  NewAsset: 'New Asset',
  IssueReport: 'Issue Report',
};

export const toPrismaAssetCategory = (value: string): AssetCategory =>
  ((CATEGORY_TO_PRISMA[value] ?? value) as AssetCategory);
export const fromPrismaAssetCategory = (value: string): string =>
  CATEGORY_FROM_PRISMA[value] ?? value;

export const toPrismaAssetCondition = (value: string): AssetCondition =>
  ((CONDITION_TO_PRISMA[value] ?? value) as AssetCondition);
export const fromPrismaAssetCondition = (value: string): string =>
  CONDITION_FROM_PRISMA[value] ?? value;

export const toPrismaRequestType = (value: string): AssetRequestType =>
  ((REQUEST_TYPE_TO_PRISMA[value] ?? value) as AssetRequestType);
export const fromPrismaRequestType = (value: string): string =>
  REQUEST_TYPE_FROM_PRISMA[value] ?? value;

/** Serialize an Asset row for API responses (display enum values). */
export const serializeAsset = (asset: any): any => ({
  ...asset,
  category: asset?.category ? fromPrismaAssetCategory(asset.category) : asset?.category,
  condition: asset?.condition ? fromPrismaAssetCondition(asset.condition) : asset?.condition,
});

/** Serialize an AssetRequest row for API responses (display enum values). */
export const serializeAssetRequest = (request: any): any => ({
  ...request,
  type: request?.type ? fromPrismaRequestType(request.type) : request?.type,
  category: request?.category ? fromPrismaAssetCategory(request.category) : request?.category,
});
