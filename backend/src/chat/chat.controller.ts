import { Controller, Get, Post, Body, Query, Res, Req, Headers, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response, Request } from 'express';
import { ChatService } from './chat.service';
import chatBus, { ChatEvent } from './chat-bus';

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  private resolveUserId(req: Request, headerUserId?: string): string {
    const user = (req as any).user;
    if (user?.id) return user.id;
    if (user?.sub) return user.sub;
    if (headerUserId) return headerUserId;
    return '';
  }

  @Get('conversations')
  @UseGuards(AuthGuard('jwt'))
  async getConversations(@Req() req: Request, @Headers('x-user-id') headerUserId?: string) {
    const userId = this.resolveUserId(req, headerUserId);
    if (!userId) return { success: false, error: 'Unauthorized' };
    const data = await this.chatService.getConversations(userId);
    return { success: true, data };
  }

  @Get('messages')
  @UseGuards(AuthGuard('jwt'))
  async getMessages(
    @Req() req: Request,
    @Query('employeeId') employeeId?: string,
    @Query('conversationId') conversationId?: string,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const userId = this.resolveUserId(req, headerUserId);
    if (!userId) return { success: false, error: 'Unauthorized' };
    const data = await this.chatService.getMessages(userId, employeeId, conversationId);
    return { success: true, data };
  }

  @Post('messages')
  @UseGuards(AuthGuard('jwt'))
  async sendMessage(
    @Req() req: Request,
    @Body() body: { receiverId: string; content: string },
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const userId = this.resolveUserId(req, headerUserId);
    if (!userId) return { success: false, error: 'Unauthorized' };
    const data = await this.chatService.sendMessage(userId, body.receiverId, body.content);
    return { success: true, data };
  }

  @Get('unread-count')
  @UseGuards(AuthGuard('jwt'))
  async getUnreadCount(@Req() req: Request, @Headers('x-user-id') headerUserId?: string) {
    const userId = this.resolveUserId(req, headerUserId);
    if (!userId) return { success: false, error: 'Unauthorized' };
    const data = await this.chatService.getUnreadCount(userId);
    return { success: true, ...data };
  }

  @Post('messages/seen')
  @UseGuards(AuthGuard('jwt'))
  async markMessagesSeen(
    @Req() req: Request,
    @Body() body: { conversationId: string },
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const userId = this.resolveUserId(req, headerUserId);
    if (!userId) return { success: false, error: 'Unauthorized' };
    await this.chatService.markMessagesSeen(userId, body.conversationId);
    return { success: true };
  }

  @Get('events')
  events(
    @Req() req: Request,
    @Res() res: Response,
    @Query('userId') queryUserId?: string,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const userId = this.resolveUserId(req, queryUserId || headerUserId);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    chatBus.userConnected(userId);

    const userChannel = `chat:user:${userId}`;
    const onUserEvent = (event: ChatEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    const onBroadcastEvent = (event: ChatEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    chatBus.on(userChannel, onUserEvent);
    chatBus.on('chat:broadcast', onBroadcastEvent);

    // Initial connected event
    res.write(`data: ${JSON.stringify({ type: 'connected', payload: { userId, onlineUsers: chatBus.getOnlineUsers() } })}\n\n`);

    const keepAlive = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      chatBus.removeListener(userChannel, onUserEvent);
      chatBus.removeListener('chat:broadcast', onBroadcastEvent);
      chatBus.userDisconnected(userId);
    });
  }
}

