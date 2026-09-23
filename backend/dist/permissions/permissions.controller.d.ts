import { CeoPermission } from '@prisma/client';
import { PermissionsService } from './permissions.service';
export declare class PermissionsController {
    private permissions;
    constructor(permissions: PermissionsService);
    catalog(): {
        permission: import("@prisma/client").$Enums.CeoPermission;
        label: string;
    }[];
    myDelegated(userId: string): Promise<{
        id: string;
        permission: import("@prisma/client").$Enums.CeoPermission;
        label: string;
        delegatorId: string;
        delegatorName: string;
        expiresAt: Date | null;
        grantedAt: Date;
    }[]>;
    listDelegations(userId: string): Promise<{
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
    createDelegation(userId: string, body: {
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
    revokeDelegation(userId: string, id: string): Promise<{
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
