"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const chat_bus_1 = __importDefault(require("./chat-bus"));
const MAX_MESSAGE_LENGTH = 2000;
let ChatService = class ChatService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async canUserMessageEmployee(senderId, receiverId) {
        if (senderId === receiverId)
            return false;
        const [sender, receiver] = await Promise.all([
            this.prisma.employee.findUnique({
                where: { id: senderId },
                select: { id: true, userRole: true, status: true },
            }),
            this.prisma.employee.findUnique({
                where: { id: receiverId },
                select: { id: true, userRole: true, status: true },
            }),
        ]);
        if (!sender || !receiver)
            return false;
        if (sender.status === 'Offboarded' || receiver.status === 'Offboarded')
            return false;
        return true;
    }
    async getOrCreateConversation(user1Id, user2Id) {
        const [p1, p2] = [user1Id, user2Id].sort();
        let conv = await this.prisma.conversation.findUnique({
            where: {
                participant1Id_participant2Id: {
                    participant1Id: p1,
                    participant2Id: p2,
                },
            },
        });
        if (!conv) {
            conv = await this.prisma.conversation.create({
                data: {
                    participant1Id: p1,
                    participant2Id: p2,
                },
            });
        }
        return conv;
    }
    async getConversations(currentUserId) {
        const conversations = await this.prisma.conversation.findMany({
            where: {
                OR: [
                    { participant1Id: currentUserId },
                    { participant2Id: currentUserId },
                ],
            },
            include: {
                participant1: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true,
                        roleTitle: true,
                        department: true,
                        userRole: true,
                    },
                },
                participant2: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true,
                        roleTitle: true,
                        department: true,
                        userRole: true,
                    },
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                        id: true,
                        content: true,
                        senderId: true,
                        receiverId: true,
                        status: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });
        const formatted = await Promise.all(conversations.map(async (conv) => {
            const otherParticipant = conv.participant1Id === currentUserId ? conv.participant2 : conv.participant1;
            const unreadCount = await this.prisma.message.count({
                where: {
                    conversationId: conv.id,
                    receiverId: currentUserId,
                    status: { in: ['SENT', 'DELIVERED'] },
                },
            });
            const lastMessage = conv.messages[0] || null;
            return {
                id: conv.id,
                employeeId: otherParticipant.id,
                name: otherParticipant.name,
                email: otherParticipant.email,
                avatar: otherParticipant.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
                role: otherParticipant.roleTitle,
                department: otherParticipant.department,
                userRole: otherParticipant.userRole,
                isOnline: chat_bus_1.default.isUserOnline(otherParticipant.id),
                unreadCount,
                lastMessage: lastMessage
                    ? {
                        id: lastMessage.id,
                        content: lastMessage.content,
                        senderId: lastMessage.senderId,
                        status: lastMessage.status,
                        createdAt: lastMessage.createdAt,
                    }
                    : null,
                updatedAt: conv.updatedAt,
            };
        }));
        return formatted;
    }
    async getMessages(currentUserId, targetEmployeeId, conversationId) {
        let targetConvId = conversationId;
        if (!targetConvId && targetEmployeeId) {
            const isAuthorized = await this.canUserMessageEmployee(currentUserId, targetEmployeeId);
            if (!isAuthorized) {
                throw new common_1.ForbiddenException('Access denied. You are not authorized to message this employee.');
            }
            const conv = await this.getOrCreateConversation(currentUserId, targetEmployeeId);
            targetConvId = conv.id;
        }
        if (!targetConvId) {
            throw new common_1.BadRequestException('employeeId or conversationId is required');
        }
        const conv = await this.prisma.conversation.findUnique({
            where: { id: targetConvId },
        });
        if (!conv || (conv.participant1Id !== currentUserId && conv.participant2Id !== currentUserId)) {
            throw new common_1.ForbiddenException('Access denied. Conversation not found or unauthorized.');
        }
        const messages = await this.prisma.message.findMany({
            where: { conversationId: targetConvId },
            orderBy: { createdAt: 'asc' },
            select: {
                id: true,
                conversationId: true,
                senderId: true,
                receiverId: true,
                content: true,
                status: true,
                createdAt: true,
            },
        });
        const otherParticipantId = conv.participant1Id === currentUserId ? conv.participant2Id : conv.participant1Id;
        const otherEmployee = await this.prisma.employee.findUnique({
            where: { id: otherParticipantId },
            select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                roleTitle: true,
                department: true,
                userRole: true,
            },
        });
        return {
            conversationId: targetConvId,
            targetEmployee: otherEmployee
                ? {
                    id: otherEmployee.id,
                    name: otherEmployee.name,
                    email: otherEmployee.email,
                    avatar: otherEmployee.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
                    role: otherEmployee.roleTitle,
                    department: otherEmployee.department,
                    userRole: otherEmployee.userRole,
                    isOnline: chat_bus_1.default.isUserOnline(otherEmployee.id),
                }
                : null,
            messages,
        };
    }
    async sendMessage(senderId, receiverId, content) {
        const trimmedContent = (content || '').trim();
        if (!trimmedContent) {
            throw new common_1.BadRequestException('Message content cannot be empty.');
        }
        if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
            throw new common_1.BadRequestException(`Message exceeds maximum allowed length of ${MAX_MESSAGE_LENGTH} characters.`);
        }
        const isAuthorized = await this.canUserMessageEmployee(senderId, receiverId);
        if (!isAuthorized) {
            throw new common_1.ForbiddenException('Access denied. You are not authorized to message this employee.');
        }
        const conversation = await this.getOrCreateConversation(senderId, receiverId);
        const isRecipientOnline = chat_bus_1.default.isUserOnline(receiverId);
        const initialStatus = isRecipientOnline ? 'DELIVERED' : 'SENT';
        const message = await this.prisma.message.create({
            data: {
                conversationId: conversation.id,
                senderId,
                receiverId,
                content: trimmedContent,
                status: initialStatus,
            },
        });
        await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
        });
        const senderInfo = await this.prisma.employee.findUnique({
            where: { id: senderId },
            select: { id: true, name: true, avatarUrl: true, roleTitle: true, department: true },
        });
        const realTimeMessagePayload = {
            id: message.id,
            conversationId: message.conversationId,
            senderId: message.senderId,
            senderName: senderInfo?.name || 'User',
            senderAvatar: senderInfo?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
            receiverId: message.receiverId,
            content: message.content,
            status: message.status,
            createdAt: message.createdAt,
        };
        chat_bus_1.default.sendToUser(receiverId, {
            type: 'message:new',
            payload: realTimeMessagePayload,
        });
        if (isRecipientOnline) {
            chat_bus_1.default.sendToUser(senderId, {
                type: 'message:delivered',
                payload: {
                    messageId: message.id,
                    conversationId: message.conversationId,
                },
            });
        }
        return message;
    }
    async getUnreadCount(userId) {
        const count = await this.prisma.message.count({
            where: {
                receiverId: userId,
                status: { in: ['SENT', 'DELIVERED'] },
            },
        });
        return { unreadCount: count };
    }
    async markMessagesSeen(userId, conversationId) {
        await this.prisma.message.updateMany({
            where: {
                conversationId,
                receiverId: userId,
                status: { in: ['SENT', 'DELIVERED'] },
            },
            data: { status: 'SEEN' },
        });
        const conv = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { participant1Id: true, participant2Id: true },
        });
        if (conv) {
            const senderId = conv.participant1Id === userId ? conv.participant2Id : conv.participant1Id;
            chat_bus_1.default.sendToUser(senderId, {
                type: 'message:seen',
                payload: { conversationId, seenBy: userId },
            });
        }
        return { success: true };
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ChatService);
//# sourceMappingURL=chat.service.js.map