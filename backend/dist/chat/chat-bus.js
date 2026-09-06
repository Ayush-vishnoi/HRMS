"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatBus = void 0;
const node_events_1 = require("node:events");
class ChatBus extends node_events_1.EventEmitter {
    onlineUsers = new Map();
    userConnected(userId) {
        const current = this.onlineUsers.get(userId) || 0;
        this.onlineUsers.set(userId, current + 1);
        if (current === 0) {
            this.emitPresenceUpdate(userId, true);
        }
    }
    userDisconnected(userId) {
        const current = this.onlineUsers.get(userId) || 0;
        if (current <= 1) {
            this.onlineUsers.delete(userId);
            this.emitPresenceUpdate(userId, false);
        }
        else {
            this.onlineUsers.set(userId, current - 1);
        }
    }
    isUserOnline(userId) {
        return (this.onlineUsers.get(userId) || 0) > 0;
    }
    getOnlineUsers() {
        return Array.from(this.onlineUsers.keys());
    }
    sendToUser(userId, event) {
        this.emit(`chat:user:${userId}`, event);
    }
    broadcast(event) {
        this.emit('chat:broadcast', event);
    }
    emitPresenceUpdate(userId, isOnline) {
        this.broadcast({
            type: 'presence:update',
            payload: { userId, isOnline },
        });
    }
}
exports.chatBus = new ChatBus();
exports.default = exports.chatBus;
//# sourceMappingURL=chat-bus.js.map