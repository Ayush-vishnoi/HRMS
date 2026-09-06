import { EventEmitter } from 'node:events';
export interface ChatEvent {
    type: 'message:new' | 'message:seen' | 'message:delivered' | 'presence:update';
    payload: any;
}
declare class ChatBus extends EventEmitter {
    private onlineUsers;
    userConnected(userId: string): void;
    userDisconnected(userId: string): void;
    isUserOnline(userId: string): boolean;
    getOnlineUsers(): string[];
    sendToUser(userId: string, event: ChatEvent): void;
    broadcast(event: ChatEvent): void;
    private emitPresenceUpdate;
}
export declare const chatBus: ChatBus;
export default chatBus;
