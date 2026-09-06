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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const chat_service_1 = require("./chat.service");
const chat_bus_1 = __importDefault(require("./chat-bus"));
let ChatController = class ChatController {
    chatService;
    constructor(chatService) {
        this.chatService = chatService;
    }
    resolveUserId(req, headerUserId) {
        const user = req.user;
        if (user?.id)
            return user.id;
        if (user?.sub)
            return user.sub;
        if (headerUserId)
            return headerUserId;
        return '';
    }
    async getConversations(req, headerUserId) {
        const userId = this.resolveUserId(req, headerUserId);
        if (!userId)
            return { success: false, error: 'Unauthorized' };
        const data = await this.chatService.getConversations(userId);
        return { success: true, data };
    }
    async getMessages(req, employeeId, conversationId, headerUserId) {
        const userId = this.resolveUserId(req, headerUserId);
        if (!userId)
            return { success: false, error: 'Unauthorized' };
        const data = await this.chatService.getMessages(userId, employeeId, conversationId);
        return { success: true, data };
    }
    async sendMessage(req, body, headerUserId) {
        const userId = this.resolveUserId(req, headerUserId);
        if (!userId)
            return { success: false, error: 'Unauthorized' };
        const data = await this.chatService.sendMessage(userId, body.receiverId, body.content);
        return { success: true, data };
    }
    async getUnreadCount(req, headerUserId) {
        const userId = this.resolveUserId(req, headerUserId);
        if (!userId)
            return { success: false, error: 'Unauthorized' };
        const data = await this.chatService.getUnreadCount(userId);
        return { success: true, ...data };
    }
    async markMessagesSeen(req, body, headerUserId) {
        const userId = this.resolveUserId(req, headerUserId);
        if (!userId)
            return { success: false, error: 'Unauthorized' };
        await this.chatService.markMessagesSeen(userId, body.conversationId);
        return { success: true };
    }
    events(req, res, queryUserId, headerUserId) {
        const userId = this.resolveUserId(req, queryUserId || headerUserId);
        if (!userId) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();
        chat_bus_1.default.userConnected(userId);
        const userChannel = `chat:user:${userId}`;
        const onUserEvent = (event) => {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
        };
        const onBroadcastEvent = (event) => {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
        };
        chat_bus_1.default.on(userChannel, onUserEvent);
        chat_bus_1.default.on('chat:broadcast', onBroadcastEvent);
        res.write(`data: ${JSON.stringify({ type: 'connected', payload: { userId, onlineUsers: chat_bus_1.default.getOnlineUsers() } })}\n\n`);
        const keepAlive = setInterval(() => {
            res.write(': keepalive\n\n');
        }, 25000);
        req.on('close', () => {
            clearInterval(keepAlive);
            chat_bus_1.default.removeListener(userChannel, onUserEvent);
            chat_bus_1.default.removeListener('chat:broadcast', onBroadcastEvent);
            chat_bus_1.default.userDisconnected(userId);
        });
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Get)('conversations'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getConversations", null);
__decorate([
    (0, common_1.Get)('messages'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('employeeId')),
    __param(2, (0, common_1.Query)('conversationId')),
    __param(3, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Post)('messages'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Get)('unread-count'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getUnreadCount", null);
__decorate([
    (0, common_1.Post)('messages/seen'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "markMessagesSeen", null);
__decorate([
    (0, common_1.Get)('events'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Query)('userId')),
    __param(3, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "events", null);
exports.ChatController = ChatController = __decorate([
    (0, common_1.Controller)('chat'),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map