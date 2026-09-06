import type { Response, Request } from 'express';
import { ChatService } from './chat.service';
export declare class ChatController {
    private chatService;
    constructor(chatService: ChatService);
    private resolveUserId;
    getConversations(req: Request, headerUserId?: string): Promise<{
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            id: string;
            employeeId: string;
            name: string;
            email: string;
            avatar: string;
            role: string;
            department: string;
            userRole: import("@prisma/client").$Enums.UserRole;
            isOnline: boolean;
            unreadCount: number;
            lastMessage: {
                id: string;
                content: string;
                senderId: string;
                status: import("@prisma/client").$Enums.MessageStatus;
                createdAt: Date;
            } | null;
            updatedAt: Date;
        }[];
        error?: undefined;
    }>;
    getMessages(req: Request, employeeId?: string, conversationId?: string, headerUserId?: string): Promise<{
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            conversationId: string;
            targetEmployee: {
                id: string;
                name: string;
                email: string;
                avatar: string;
                role: string;
                department: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                isOnline: boolean;
            } | null;
            messages: {
                id: string;
                status: import("@prisma/client").$Enums.MessageStatus;
                createdAt: Date;
                content: string;
                receiverId: string;
                conversationId: string;
                senderId: string;
            }[];
        };
        error?: undefined;
    }>;
    sendMessage(req: Request, body: {
        receiverId: string;
        content: string;
    }, headerUserId?: string): Promise<{
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            id: string;
            status: import("@prisma/client").$Enums.MessageStatus;
            createdAt: Date;
            updatedAt: Date;
            content: string;
            receiverId: string;
            conversationId: string;
            senderId: string;
        };
        error?: undefined;
    }>;
    getUnreadCount(req: Request, headerUserId?: string): Promise<{
        success: boolean;
        error: string;
    } | {
        unreadCount: number;
        success: boolean;
        error?: undefined;
    }>;
    markMessagesSeen(req: Request, body: {
        conversationId: string;
    }, headerUserId?: string): Promise<{
        success: boolean;
        error: string;
    } | {
        success: boolean;
        error?: undefined;
    }>;
    events(req: Request, res: Response, queryUserId?: string, headerUserId?: string): void;
}
