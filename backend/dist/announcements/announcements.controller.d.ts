import type { Request } from 'express';
import { AnnouncementsService } from './announcements.service';
export declare class AnnouncementsController {
    private announcementsService;
    constructor(announcementsService: AnnouncementsService);
    private resolveUserId;
    findAll(req: Request, scope?: string, headerUserId?: string): Promise<{
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            id: any;
            title: any;
            body: any;
            category: any;
            postedByDepartment: any;
            postedByName: any;
            isPinned: any;
            publishedAt: string | null;
            expiresAt: string | null;
            targetAudience: any;
            targetDepartment: any;
            targetLocation: any;
            targetRole: any;
            isArchived: any;
            createdAt: string | null;
            updatedAt: string | null;
        }[];
        error?: undefined;
    }>;
    create(req: Request, body: any, headerUserId?: string): Promise<{
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            id: any;
            title: any;
            body: any;
            category: any;
            postedByDepartment: any;
            postedByName: any;
            isPinned: any;
            publishedAt: string | null;
            expiresAt: string | null;
            targetAudience: any;
            targetDepartment: any;
            targetLocation: any;
            targetRole: any;
            isArchived: any;
            createdAt: string | null;
            updatedAt: string | null;
        };
        error?: undefined;
    }>;
    update(req: Request, body: any, headerUserId?: string): Promise<{
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            id: any;
            title: any;
            body: any;
            category: any;
            postedByDepartment: any;
            postedByName: any;
            isPinned: any;
            publishedAt: string | null;
            expiresAt: string | null;
            targetAudience: any;
            targetDepartment: any;
            targetLocation: any;
            targetRole: any;
            isArchived: any;
            createdAt: string | null;
            updatedAt: string | null;
        };
        error?: undefined;
    }>;
    delete(req: Request, id: string, headerUserId?: string): Promise<{
        success: boolean;
        id: string;
    } | {
        success: boolean;
        error: string;
    }>;
}
