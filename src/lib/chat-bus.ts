import { EventEmitter } from 'events';

export interface ChatEvent {
  type: 'message:new' | 'message:delivered' | 'message:seen' | 'presence:online' | 'presence:offline';
  payload: any;
}

type SSEController = ReadableStreamDefaultController<Uint8Array>;

class ChatBus extends EventEmitter {
  private clients: Map<string, Set<SSEController>> = new Map();
  private onlineUsers: Set<string> = new Set();

  constructor() {
    super();
    this.setMaxListeners(200);
  }

  /**
   * Register a new SSE client stream controller for an employee.
   */
  public registerClient(employeeId: string, controller: SSEController) {
    if (!this.clients.has(employeeId)) {
      this.clients.set(employeeId, new Set());
    }
    this.clients.get(employeeId)!.add(controller);

    const wasOffline = !this.onlineUsers.has(employeeId);
    this.onlineUsers.add(employeeId);

    if (wasOffline) {
      this.broadcastPresence('presence:online', employeeId);
    }
  }

  /**
   * Unregister an SSE client stream controller when connection closes.
   */
  public unregisterClient(employeeId: string, controller: SSEController) {
    const userClients = this.clients.get(employeeId);
    if (userClients) {
      userClients.delete(controller);
      if (userClients.size === 0) {
        this.clients.delete(employeeId);
        this.onlineUsers.delete(employeeId);
        this.broadcastPresence('presence:offline', employeeId);
      }
    }
  }

  /**
   * Check if an employee is currently connected via SSE.
   */
  public isUserOnline(employeeId: string): boolean {
    return this.onlineUsers.has(employeeId);
  }

  /**
   * Get set of all currently online employee IDs.
   */
  public getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers);
  }

  /**
   * Send a real-time event to a specific target employee.
   */
  public sendToUser(employeeId: string, event: ChatEvent) {
    const userClients = this.clients.get(employeeId);
    if (!userClients || userClients.size === 0) return;

    const encoder = new TextEncoder();
    const formattedData = `event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`;
    const chunk = encoder.encode(formattedData);

    for (const controller of userClients) {
      try {
        controller.enqueue(chunk);
      } catch (err) {
        // Stream closed or error
        userClients.delete(controller);
      }
    }
  }

  /**
   * Broadcast presence status changes to all connected clients.
   */
  private broadcastPresence(type: 'presence:online' | 'presence:offline', employeeId: string) {
    const encoder = new TextEncoder();
    const formattedData = `event: ${type}\ndata: ${JSON.stringify({ employeeId })}\n\n`;
    const chunk = encoder.encode(formattedData);

    for (const userClients of this.clients.values()) {
      for (const controller of userClients) {
        try {
          controller.enqueue(chunk);
        } catch {
          // ignore broken stream
        }
      }
    }
  }
}

// Global singleton for Next.js dev server reloads
const globalForChatBus = globalThis as unknown as { chatBus: ChatBus | undefined };
export const chatBus = globalForChatBus.chatBus ?? new ChatBus();
if (process.env.NODE_ENV !== 'production') globalForChatBus.chatBus = chatBus;

export default chatBus;
