import { CeoPermission } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare const CEO_PERMISSIONS: CeoPermission[];
export declare const CEO_PERMISSION_LABELS: Record<CeoPermission, string>;
export interface PermissionCheck {
    allowed: boolean;
    viaDelegation: boolean;
    delegatorId?: string;
    delegatorName?: string;
}
export declare class PermissionsService {
    private prisma;
    constructor(prisma: PrismaService);
    private getRawRole;
    private activeDelegationWhere;
    hasCeoPermission(userId: string, permission: CeoPermission): Promise<PermissionCheck>;
    assertCeoPermission(userId: string, permission: CeoPermission): Promise<PermissionCheck>;
    getActiveDelegatorIds(delegateeId: string, permission: CeoPermission): Promise<string[]>;
    getMyActiveDelegations(userId: string): Promise<{
        id: string;
        permission: import("@prisma/client").$Enums.CeoPermission;
        label: string;
        delegatorId: string;
        delegatorName: string;
        expiresAt: Date | null;
        grantedAt: Date;
    }[]>;
    listDelegations(ceoId: string): Promise<{
        id: string;
        permission: import("@prisma/client").$Enums.CeoPermission;
        label: string;
        delegateeId: string;
        delegateeName: string;
        delegateeRoleTitle: string;
        note: string | null;
        grantedAt: Date;
        expiresAt: Date | null;
        revokedAt: Date | null;
        active: boolean;
    }[]>;
    private assertIsCeo;
    createDelegation(ceoId: string, dto: {
        permission: CeoPermission;
        delegateeId: string;
        expiresAt?: string | null;
        note?: string | null;
    }): Promise<{
        id: string;
        delegatorId: string;
        permission: import("@prisma/client").$Enums.CeoPermission;
        delegateeId: string;
        grantedAt: Date;
        expiresAt: Date | null;
        revokedAt: Date | null;
        revokedById: string | null;
        note: string | null;
    }>;
    revokeDelegation(ceoId: string, id: string): Promise<{
        id: string;
        delegatorId: string;
        permission: import("@prisma/client").$Enums.CeoPermission;
        delegateeId: string;
        grantedAt: Date;
        expiresAt: Date | null;
        revokedAt: Date | null;
        revokedById: string | null;
        note: string | null;
    }>;
}
