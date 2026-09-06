import { EventEmitter } from 'node:events';

export interface ChatEvent {
  type: 'message:new' | 'message:seen' | 'message:delivered' | 'presence:update';
  payload: any;
}

class ChatBus extends EventEmitter {
  private onlineUsers: Map<string, number> = new Map();

  userConnected(userId: string) {
    const current = this.onlineUsers.get(userId) || 0;
    this.onlineUsers.set(userId, current + 1);
    if (current === 0) {
      this.emitPresenceUpdate(userId, true);
    }
  }

  userDisconnected(userId: string) {
    const current = this.onlineUsers.get(userId) || 0;
    if (current <= 1) {
      this.onlineUsers.delete(userId);
      this.emitPresenceUpdate(userId, false);
    } else {
      this.onlineUsers.set(userId, current - 1);
    }
  }

  isUserOnline(userId: string): boolean {
    return (this.onlineUsers.get(userId) || 0) > 0;
  }

  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers.keys());
  }

  sendToUser(userId: string, event: ChatEvent) {
    this.emit(`chat:user:${userId}`, event);
  }

  broadcast(event: ChatEvent) {
    this.emit('chat:broadcast', event);
  }

  private emitPresenceUpdate(userId: string, isOnline: boolean) {
    this.broadcast({
      type: 'presence:update',
      payload: { userId, isOnline },
    });
  }
}

export const chatBus = new ChatBus();
export default chatBus;

