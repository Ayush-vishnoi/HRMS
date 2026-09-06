import { PrismaService } from '../prisma/prisma.service';
export declare class ChatService {
    private prisma;
    constructor(prisma: PrismaService);
    canUserMessageEmployee(senderId: string, receiverId: string): Promise<boolean>;
    getOrCreateConversation(user1Id: string, user2Id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        participant1Id: string;
        participant2Id: string;
    }>;
    getConversations(currentUserId: string): Promise<{
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
    }[]>;
    getMessages(currentUserId: string, targetEmployeeId?: string, conversationId?: string): Promise<{
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
    }>;
    sendMessage(senderId: string, receiverId: string, content: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.MessageStatus;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        receiverId: string;
        conversationId: string;
        senderId: string;
    }>;
    getUnreadCount(userId: string): Promise<{
        unreadCount: number;
    }>;
    markMessagesSeen(userId: string, conversationId: string): Promise<{
        success: boolean;
    }>;
}
