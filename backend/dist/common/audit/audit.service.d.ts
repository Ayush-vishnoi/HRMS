import { PrismaService } from '../../prisma/prisma.service';
export interface AuditInput {
    action: string;
    module: string;
    employeeId?: string | null;
    actorId?: string | null;
    onBehalfOfId?: string | null;
    severity?: 'info' | 'high';
    details?: unknown;
    ipAddress?: string | null;
}
export declare class AuditService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private buildData;
    record(input: AuditInput): Promise<void>;
    recordWith(tx: {
        auditLog: {
            create: (args: {
                data: ReturnType<AuditService['buildData']>;
            }) => Promise<unknown>;
        };
    }, input: AuditInput): Promise<void>;
}
