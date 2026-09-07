"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeAssetRequest = exports.serializeAsset = exports.fromPrismaRequestType = exports.toPrismaRequestType = exports.fromPrismaAssetCondition = exports.toPrismaAssetCondition = exports.fromPrismaAssetCategory = exports.toPrismaAssetCategory = void 0;
const CATEGORY_TO_PRISMA = { 'Access Card': 'AccessCard' };
const CATEGORY_FROM_PRISMA = { AccessCard: 'Access Card' };
const CONDITION_TO_PRISMA = { 'Needs repair': 'NeedsRepair' };
const CONDITION_FROM_PRISMA = { NeedsRepair: 'Needs repair' };
const REQUEST_TYPE_TO_PRISMA = {
    'New Asset': 'NewAsset',
    'Issue Report': 'IssueReport',
};
const REQUEST_TYPE_FROM_PRISMA = {
    NewAsset: 'New Asset',
    IssueReport: 'Issue Report',
};
const toPrismaAssetCategory = (value) => (CATEGORY_TO_PRISMA[value] ?? value);
exports.toPrismaAssetCategory = toPrismaAssetCategory;
const fromPrismaAssetCategory = (value) => CATEGORY_FROM_PRISMA[value] ?? value;
exports.fromPrismaAssetCategory = fromPrismaAssetCategory;
const toPrismaAssetCondition = (value) => (CONDITION_TO_PRISMA[value] ?? value);
exports.toPrismaAssetCondition = toPrismaAssetCondition;
const fromPrismaAssetCondition = (value) => CONDITION_FROM_PRISMA[value] ?? value;
exports.fromPrismaAssetCondition = fromPrismaAssetCondition;
const toPrismaRequestType = (value) => (REQUEST_TYPE_TO_PRISMA[value] ?? value);
exports.toPrismaRequestType = toPrismaRequestType;
const fromPrismaRequestType = (value) => REQUEST_TYPE_FROM_PRISMA[value] ?? value;
exports.fromPrismaRequestType = fromPrismaRequestType;
const serializeAsset = (asset) => ({
    ...asset,
    category: asset?.category ? (0, exports.fromPrismaAssetCategory)(asset.category) : asset?.category,
    condition: asset?.condition ? (0, exports.fromPrismaAssetCondition)(asset.condition) : asset?.condition,
});
exports.serializeAsset = serializeAsset;
const serializeAssetRequest = (request) => ({
    ...request,
    type: request?.type ? (0, exports.fromPrismaRequestType)(request.type) : request?.type,
    category: request?.category ? (0, exports.fromPrismaAssetCategory)(request.category) : request?.category,
});
exports.serializeAssetRequest = serializeAssetRequest;
//# sourceMappingURL=asset-enums.js.map